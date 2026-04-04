import { createApp } from 'vue';
import ContentRecorderApp from './components/ContentRecorderApp.vue';
import {
    normalizeTelemetryAction,
    normalizeTelemetryLog,
    normalizeTelemetryNetworkRequest,
    type CaptureTelemetryContext,
    type CaptureTelemetrySnapshot,
} from './lib/capture-telemetry';
import { ContentTelemetryRecorder } from './lib/content-telemetry-recorder';
import {
    createDiagnosticsBridgeMessage,
    diagnosticsEventSource,
    isTrustedDiagnosticsBridgeMessage,
    resolveDiagnosticsBridgeNonce,
} from './lib/diagnostics-bridge';
import {
    appendOverlayDebugEntry,
    getOverlayDebugEntries,
    getPendingCapture,
    getRecordingState,
    getReportingEnabled,
    getSession,
} from './lib/storage';
import contentThemeStyles from './style.css?inline';
import contentOverlayStyles from './content/overlay.css?inline';

const eventSource = 'snag-page-bridge';
const recorder = new ContentTelemetryRecorder();
const overlayHostId = 'snag-extension-overlay-host';
const runtimeWindowFlag = '__snagContentRuntimeActive__';
const overlayRefreshEvent = 'snag:overlay-refresh-state';
let overlayHost: HTMLElement | null = null;
let overlayShadowRoot: ShadowRoot | null = null;

function normalizeInlineAssetUrls(css: string): string {
    return css.replace(/url\((['"]?)\/(assets\/[^)'"]+)\1\)/g, (_match, quote: string, assetPath: string) => {
        const url = chrome.runtime.getURL(assetPath);

        return `url(${quote}${url}${quote})`;
    });
}

function selectorFor(target: Element | null): string | null {
    if (!target) {
        return null;
    }

    if (target.id) {
        return `#${target.id}`;
    }

    const className = typeof target.className === 'string'
        ? target.className
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .join('.')
        : '';

    if (className !== '') {
        return `${target.tagName.toLowerCase()}.${className}`;
    }

    return target.tagName.toLowerCase();
}

function labelFor(target: Element | null): string {
    if (!target) {
        return 'Interact with element';
    }

    if (target instanceof HTMLButtonElement) {
        return 'Click button';
    }

    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        return target.type === 'checkbox' || target.type === 'radio'
            ? 'Toggle field'
            : 'Type into field';
    }

    if (target instanceof HTMLAnchorElement) {
        return 'Click link';
    }

    return 'Click element';
}

function inputValueFor(target: EventTarget | null): string | null {
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
        if (target instanceof HTMLInputElement && target.type === 'password') {
            return `${target.value.length} characters`;
        }

        return target.value;
    }

    return null;
}

function injectPageBridge(): void {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('assets/page-bridge.js');
    script.async = false;
    script.onerror = () => {
        recordOverlayDebug('page-bridge:load-error', 'error', {
            src: script.src,
        });
    };
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
    recordOverlayDebug('page-bridge:injected', 'info', {
        src: script.src,
        readyState: document.readyState,
    });
}

function mountOverlayApp(): void {
    const existingHost = document.getElementById(overlayHostId);

    if (existingHost) {
        recordOverlayDebug('overlay:stale-host-replaced', 'warn', {
            readyState: document.readyState,
        });
        existingHost.remove();
    }

    const host = document.createElement('div');
    host.id = overlayHostId;
    host.style.setProperty('all', 'initial', 'important');
    host.style.setProperty('position', 'fixed', 'important');
    host.style.setProperty('inset', '0', 'important');
    host.style.setProperty('display', 'block', 'important');
    host.style.setProperty('z-index', '2147483646', 'important');
    host.style.setProperty('pointer-events', 'none', 'important');
    host.style.setProperty('contain', 'layout style paint', 'important');
    host.style.setProperty('isolation', 'isolate', 'important');
    host.style.setProperty('transform', 'none', 'important');
    host.style.setProperty('filter', 'none', 'important');
    host.style.setProperty('backdrop-filter', 'none', 'important');
    host.style.setProperty('opacity', '1', 'important');
    host.style.setProperty('zoom', '1', 'important');
    host.style.setProperty('font-size', '16px', 'important');
    host.style.setProperty('line-height', '1.5', 'important');
    host.style.setProperty('font-family', 'Inter, Noto Sans, sans-serif', 'important');
    host.style.setProperty('letter-spacing', 'normal', 'important');
    host.style.setProperty('text-transform', 'none', 'important');
    host.style.setProperty('direction', 'ltr', 'important');
    host.style.setProperty('color-scheme', 'light', 'important');

    const shadowRoot = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `${normalizeInlineAssetUrls(contentThemeStyles)}\n${contentOverlayStyles}`;

    const mountPoint = document.createElement('div');
    document.documentElement.appendChild(host);
    overlayHost = host;
    overlayShadowRoot = shadowRoot;
    shadowRoot.append(style, mountPoint);

    const app = createApp(ContentRecorderApp);
    app.config.errorHandler = (error, _instance, info) => {
        recordOverlayDebug('overlay:vue-error', 'error', {
            info,
            error: normalizeErrorPayload(error),
        });
    };

    try {
        app.mount(mountPoint);
        recordOverlayDebug('overlay:mounted', 'info', overlaySummary());
        window.requestAnimationFrame(() => {
            recordOverlayDebug('overlay:layout-snapshot', 'info', overlaySummary());
        });
    } catch (error) {
        recordOverlayDebug('overlay:mount-error', 'error', {
            error: normalizeErrorPayload(error),
        });
    }
}

function runtimeWindowState(): Record<string, unknown> {
    return window as unknown as Record<string, unknown>;
}

function contextFromPayload(payload: Record<string, unknown>): Partial<CaptureTelemetryContext> {
    const viewport = typeof payload.viewport === 'object' && payload.viewport !== null
        ? payload.viewport as CaptureTelemetryContext['viewport']
        : {
            width: window.innerWidth,
            height: window.innerHeight,
        };
    const screen = typeof payload.screen === 'object' && payload.screen !== null
        ? payload.screen as CaptureTelemetryContext['screen']
        : {
            width: window.screen.width,
            height: window.screen.height,
        };

    return {
        url: typeof payload.url === 'string' ? payload.url : window.location.href,
        title: typeof payload.title === 'string' ? payload.title : document.title,
        user_agent: typeof payload.user_agent === 'string' ? payload.user_agent : navigator.userAgent,
        platform: typeof payload.platform === 'string' ? payload.platform : navigator.platform,
        language: typeof payload.language === 'string' ? payload.language : navigator.language,
        timezone: typeof payload.timezone === 'string' ? payload.timezone : Intl.DateTimeFormat().resolvedOptions().timeZone,
        viewport,
        screen,
        referrer: typeof payload.referrer === 'string' ? payload.referrer : null,
    };
}

function handlePageBridgeMessage(event: MessageEvent<Record<string, unknown>>): void {
    if (event.source !== window || event.origin !== window.location.origin) {
        return;
    }

    const message = event.data;

    if (!message || message.source !== eventSource || typeof message.type !== 'string' || typeof message.payload !== 'object') {
        return;
    }

    const payload = message.payload as Record<string, unknown>;

    if (message.type === 'context') {
        recorder.updateContext(contextFromPayload(payload));
        return;
    }

    if (message.type === 'action') {
        const action = normalizeTelemetryAction(payload);

        if (action) {
            recorder.recordAction(action);
        }

        return;
    }

    if (message.type === 'log') {
        const log = normalizeTelemetryLog(payload);

        if (log) {
            recorder.recordLog(log);
        }

        return;
    }

    if (message.type === 'network') {
        const request = normalizeTelemetryNetworkRequest(payload);

        if (request) {
            recorder.recordNetworkRequest(request);
        }
    }
}

function captureAction(event: Event): void {
    const target = event.target instanceof Element
        ? event.target.closest('button, a, input, textarea, select, [role="button"], [data-testid]') ?? event.target
        : null;
    const selector = selectorFor(target);

    if (event.type === 'input') {
        const value = inputValueFor(event.target);

        recorder.recordAction({
            type: 'input',
            label: labelFor(target),
            selector,
            value,
            payload: {
                field_length: value?.length ?? 0,
                event_count: 1,
            },
            happened_at: new Date().toISOString(),
        });

        return;
    }

    recorder.recordAction({
        type: event.type,
        label: labelFor(target),
        selector,
        value: inputValueFor(event.target),
        payload: {
            tag_name: target?.tagName.toLowerCase() ?? null,
        },
        happened_at: new Date().toISOString(),
    });
}

function snapshot(reset: boolean): CaptureTelemetrySnapshot {
    return recorder.snapshot(reset);
}

function diagnosticsBridgeNonce(): string | null {
    return resolveDiagnosticsBridgeNonce(window.location.origin, document);
}

function postDiagnosticsResponse(type: string, payload: Record<string, unknown>): void {
    const nonce = diagnosticsBridgeNonce();

    if (!nonce) {
        return;
    }

    window.postMessage(
        createDiagnosticsBridgeMessage(type, nonce, payload),
        window.location.origin,
    );
}

function normalizeErrorPayload(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack ?? null,
        };
    }

    return {
        message: String(error),
    };
}

function rectSnapshot(element: Element | null): Record<string, number> | null {
    if (!element) {
        return null;
    }

    const rect = element.getBoundingClientRect();

    return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: Math.round(rect.top),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
        left: Math.round(rect.left),
    };
}

function styleSnapshot(element: Element | null): Record<string, string> | null {
    if (!element) {
        return null;
    }

    const style = window.getComputedStyle(element);
    const properties = [
        'display',
        'position',
        'inset',
        'z-index',
        'pointer-events',
        'visibility',
        'opacity',
        'transform',
        'filter',
        'backdrop-filter',
        'zoom',
        'font-size',
        'line-height',
        'font-family',
        'letter-spacing',
        'text-transform',
        'color',
        'background-color',
        'width',
        'height',
    ];

    return Object.fromEntries(properties.map((property) => [property, style.getPropertyValue(property)]));
}

function elementSnapshot(element: Element | null): Record<string, unknown> {
    if (!element) {
        return {
            present: false,
        };
    }

    return {
        present: true,
        tag: element.tagName.toLowerCase(),
        id: element.id || null,
        className: typeof (element as HTMLElement).className === 'string' ? (element as HTMLElement).className : null,
        rect: rectSnapshot(element),
        styles: styleSnapshot(element),
    };
}

function overlaySummary(): Record<string, unknown> {
    const host = overlayHost ?? document.getElementById(overlayHostId);
    const shadowRoot = host?.shadowRoot ?? overlayShadowRoot;
    const floating = shadowRoot?.querySelector('[data-testid="content-recorder-floating"]') ?? null;
    const toggle = shadowRoot?.querySelector('[data-testid="content-recorder-toggle"]') ?? null;

    return {
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
            scrollX: Math.round(window.scrollX),
            scrollY: Math.round(window.scrollY),
            devicePixelRatio: window.devicePixelRatio,
        },
        host: elementSnapshot(host),
        floating: elementSnapshot(floating),
        toggle: elementSnapshot(toggle),
        documentElement: {
            rect: rectSnapshot(document.documentElement),
            styles: styleSnapshot(document.documentElement),
        },
        body: {
            rect: rectSnapshot(document.body),
            styles: styleSnapshot(document.body),
        },
    };
}

function recordOverlayDebug(
    event: string,
    level: 'info' | 'warn' | 'error',
    payload: Record<string, unknown>,
): void {
    void appendOverlayDebugEntry({
        source: 'content',
        level,
        event,
        url: window.location.href,
        tabId: null,
        payload,
    }).catch(() => undefined);
}

async function collectOverlayDiagnosticsSnapshot(): Promise<Record<string, unknown>> {
    const host = overlayHost ?? document.getElementById(overlayHostId);
    const shadowRoot = host?.shadowRoot ?? overlayShadowRoot;
    const [session, reportingEnabled, pendingCapture, recordingState, debugEntries] = await Promise.all([
        getSession(),
        getReportingEnabled(),
        getPendingCapture(),
        getRecordingState(),
        getOverlayDebugEntries(),
    ]);

    return {
        collected_at: new Date().toISOString(),
        page: {
            url: window.location.href,
            title: document.title,
            readyState: document.readyState,
            visibilityState: document.visibilityState,
            referrer: document.referrer || null,
            dir: document.dir || null,
            lang: document.documentElement.lang || null,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
                scrollX: Math.round(window.scrollX),
                scrollY: Math.round(window.scrollY),
                devicePixelRatio: window.devicePixelRatio,
            },
            visualViewport: window.visualViewport
                ? {
                    width: Math.round(window.visualViewport.width),
                    height: Math.round(window.visualViewport.height),
                    scale: window.visualViewport.scale,
                    offsetLeft: Math.round(window.visualViewport.offsetLeft),
                    offsetTop: Math.round(window.visualViewport.offsetTop),
                }
                : null,
        },
        extension: {
            connected: Boolean(session),
            reportingEnabled,
            recordingState,
            pendingCaptureKind: pendingCapture?.kind ?? null,
        },
        overlay: {
            host: elementSnapshot(host),
            root: elementSnapshot(shadowRoot?.querySelector('[data-testid="content-recorder-root"]') ?? null),
            floating: elementSnapshot(shadowRoot?.querySelector('[data-testid="content-recorder-floating"]') ?? null),
            toggle: elementSnapshot(shadowRoot?.querySelector('[data-testid="content-recorder-toggle"]') ?? null),
            screenshot: elementSnapshot(shadowRoot?.querySelector('[data-testid="content-recorder-screenshot"]') ?? null),
            status: elementSnapshot(shadowRoot?.querySelector('[data-testid="content-recorder-status"]') ?? null),
            timer: elementSnapshot(shadowRoot?.querySelector('[data-testid="content-recorder-timer"]') ?? null),
            captureModal: elementSnapshot(shadowRoot?.querySelector('[data-testid="content-recorder-capture-modal"]') ?? null),
            confirmModal: elementSnapshot(shadowRoot?.querySelector('[data-testid="content-recorder-confirm-modal"]') ?? null),
            shareModal: elementSnapshot(shadowRoot?.querySelector('[data-testid="content-recorder-share-modal"]') ?? null),
            shadowChildCount: shadowRoot?.childNodes.length ?? 0,
        },
        documentElement: {
            rect: rectSnapshot(document.documentElement),
            styles: styleSnapshot(document.documentElement),
        },
        body: {
            rect: rectSnapshot(document.body),
            styles: styleSnapshot(document.body),
        },
        recentEvents: debugEntries.filter((entry) => entry.url === window.location.href).slice(-12),
    };
}

function handleDiagnosticsBridgeMessage(event: MessageEvent<Record<string, unknown>>): void {
    if (event.source !== window || event.origin !== window.location.origin) {
        return;
    }

    const nonce = diagnosticsBridgeNonce();

    if (!nonce || !isTrustedDiagnosticsBridgeMessage(event.data, nonce)) {
        return;
    }

    const message = event.data;

    if (message.type === 'start-live-recording') {
        chrome.runtime.sendMessage({ type: 'start-video-recording' }, (response) => {
            const error = chrome.runtime.lastError;

            postDiagnosticsResponse('start-live-recording:response', error
                ? { ok: false, message: error.message }
                : (response ?? { ok: false, message: 'Unable to start live recording.' }));
        });

        return;
    }

    if (message.type === 'stop-live-recording') {
        chrome.runtime.sendMessage({ type: 'stop-video-recording' }, (response) => {
            const error = chrome.runtime.lastError;

            postDiagnosticsResponse('stop-live-recording:response', error
                ? { ok: false, message: error.message }
                : (response ?? { ok: false, message: 'Unable to stop live recording.' }));
        });
    }
}

function bootstrapContentRuntime(): void {
    if (runtimeWindowState()[runtimeWindowFlag] === true) {
        recordOverlayDebug('content-script:duplicate-bootstrap', 'warn', {
            readyState: document.readyState,
            url: window.location.href,
        });
        return;
    }

    runtimeWindowState()[runtimeWindowFlag] = true;
    recordOverlayDebug('content-script:init', 'info', {
        readyState: document.readyState,
        url: window.location.href,
    });
    injectPageBridge();
    mountOverlayApp();
    window.addEventListener('message', handlePageBridgeMessage);
    if (diagnosticsBridgeNonce()) {
        window.addEventListener('message', handleDiagnosticsBridgeMessage);
    }
    window.addEventListener('click', captureAction, true);
    window.addEventListener('input', captureAction, true);
    window.addEventListener('change', captureAction, true);
    window.addEventListener('submit', captureAction, true);
}

function startContentRuntime(): void {
    if (document.body) {
        bootstrapContentRuntime();
        return;
    }

    recordOverlayDebug('content-script:await-body', 'info', {
        readyState: document.readyState,
    });

    const handleReady = () => {
        if (!document.body) {
            return;
        }

        document.removeEventListener('DOMContentLoaded', handleReady);
        window.removeEventListener('load', handleReady);
        bootstrapContentRuntime();
    };

    document.addEventListener('DOMContentLoaded', handleReady);
    window.addEventListener('load', handleReady);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'page-context') {
        sendResponse({
            ...snapshot(false).context,
            selection: '',
        });

        return true;
    }

    if (message?.type === 'telemetry:start-session') {
        sendResponse({
            ok: true,
            snapshot: recorder.startSession(),
        });

        return true;
    }

    if (message?.type === 'telemetry:snapshot') {
        sendResponse({
            ok: true,
            snapshot: snapshot(Boolean(message.reset)),
        });

        return true;
    }

    if (message?.type === 'overlay:debug-snapshot') {
        void collectOverlayDiagnosticsSnapshot()
            .then((overlaySnapshot) => {
                sendResponse({
                    ok: true,
                    snapshot: overlaySnapshot,
                });
            })
            .catch((error) => {
                sendResponse({
                    ok: false,
                    message: error instanceof Error ? error.message : 'Unable to collect overlay diagnostics.',
                });
            });

        return true;
    }

    if (message?.type === 'overlay:refresh-state') {
        window.dispatchEvent(new CustomEvent(overlayRefreshEvent));
        sendResponse({ ok: true });

        return true;
    }

    return false;
});

startContentRuntime();
