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

const eventSource = 'snag-page-bridge';
const recorder = new ContentTelemetryRecorder();

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
    if (document.documentElement.dataset.snagPageBridge === 'true') {
        return;
    }

    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('assets/page-bridge.js');
    script.async = false;
    script.dataset.snagPageBridge = 'true';
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
    document.documentElement.dataset.snagPageBridge = 'true';
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

injectPageBridge();
window.addEventListener('message', handlePageBridgeMessage);
if (diagnosticsBridgeNonce()) {
    window.addEventListener('message', handleDiagnosticsBridgeMessage);
}
window.addEventListener('click', captureAction, true);
window.addEventListener('input', captureAction, true);
window.addEventListener('change', captureAction, true);
window.addEventListener('submit', captureAction, true);

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

    return false;
});
