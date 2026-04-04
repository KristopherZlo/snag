import {
    redactTelemetryAction,
    redactTelemetryContext,
    redactTelemetryLog,
    redactTelemetryNetworkRequest,
    redactUnknownValue,
} from './widget-telemetry-redaction.js';

const maxActions = 200;
const maxLogs = 150;
const maxNetworkRequests = 200;
const maxConsoleArgs = 4;
const maxSerializedLength = 280;
const interactiveSelector = 'a, button, input, textarea, select, summary, [role="button"], [type="button"], [type="submit"]';
const internalNetworkPathMatchers = [
    /\/api\/v1\/public\/capture\//,
    /\/api\/v1\/public\/widgets\//,
    /\/embed\/widget\.js(?:$|\?)/,
];
const allowedUserKeys = ['id', 'email', 'name', 'account_id', 'account_name', 'role', 'plan', 'segment'];
const xhrMetaKey = Symbol('snagWidgetXhrMeta');

let sharedRecorder = null;

function emptyTelemetrySnapshot() {
    return {
        context: null,
        actions: [],
        logs: [],
        network_requests: [],
    };
}

function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function trimCollection(collection, maxItems) {
    while (collection.length > maxItems) {
        collection.shift();
    }
}

function truncateText(value, maxLength = maxSerializedLength) {
    const normalized = String(value ?? '').trim();
    return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

function nowIso() {
    return new Date().toISOString();
}

function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}

function resolveUrl(value) {
    if (typeof value !== 'string' || value.trim() === '') {
        return '';
    }

    try {
        return new URL(value, window.location.href).toString();
    } catch {
        return value;
    }
}

function supportsHeaders(value) {
    return typeof Headers !== 'undefined' && value instanceof Headers;
}

function headerRecordFrom(value) {
    if (!value) {
        return undefined;
    }

    if (supportsHeaders(value)) {
        const output = {};

        value.forEach((entry, key) => {
            output[key] = truncateText(entry, 180);
        });

        return Object.keys(output).length ? output : undefined;
    }

    if (Array.isArray(value)) {
        return value.reduce((carry, entry) => {
            if (Array.isArray(entry) && entry.length >= 2) {
                carry[String(entry[0])] = truncateText(entry[1], 180);
            }

            return carry;
        }, {});
    }

    if (isRecord(value)) {
        return Object.entries(value).reduce((carry, [key, entry]) => {
            if (typeof entry === 'string') {
                carry[key] = truncateText(entry, 180);
            }

            return carry;
        }, {});
    }

    return undefined;
}

function parseRawHeaders(value) {
    if (typeof value !== 'string' || value.trim() === '') {
        return undefined;
    }

    return value
        .trim()
        .split(/\r?\n/)
        .reduce((carry, line) => {
            const separator = line.indexOf(':');

            if (separator === -1) {
                return carry;
            }

            const key = line.slice(0, separator).trim();
            const entry = line.slice(separator + 1).trim();

            if (key) {
                carry[key] = truncateText(entry, 180);
            }

            return carry;
        }, {});
}

function isWidgetElement(target) {
    if (!(target instanceof Element)) {
        return false;
    }

    if (target.closest('[data-snag-widget-host]')) {
        return true;
    }

    const root = typeof target.getRootNode === 'function' ? target.getRootNode() : null;
    const host = root && 'host' in root ? root.host : null;

    return host instanceof HTMLElement && Boolean(host.dataset?.snagWidgetHost);
}

function elementPathSegment(element) {
    const tagName = element.tagName.toLowerCase();
    const siblings = element.parentElement
        ? Array.from(element.parentElement.children).filter((entry) => entry.tagName === element.tagName)
        : [];
    const index = siblings.indexOf(element);

    return `${tagName}${index >= 0 ? `:nth-of-type(${index + 1})` : ''}`;
}

function buildSelector(element) {
    const segments = [];
    let current = element instanceof Element ? element : null;
    let depth = 0;

    while (current && depth < 4 && current !== document.body && current !== document.documentElement) {
        segments.unshift(elementPathSegment(current));
        current = current.parentElement;
        depth += 1;
    }

    return segments.join(' > ') || (element instanceof Element ? element.tagName.toLowerCase() : null);
}

function labelForElement(element, eventType) {
    if (!(element instanceof Element)) {
        return eventType === 'submit' ? 'Submitted form' : 'Interacted with page';
    }

    const tagName = element.tagName.toLowerCase();
    const inputType = tagName === 'input' ? (element.getAttribute('type') || 'text').toLowerCase() : null;

    if (eventType === 'submit') {
        return 'Submitted form';
    }

    if (tagName === 'a') {
        return 'Clicked link';
    }

    if (tagName === 'button' || element.getAttribute('role') === 'button') {
        return 'Clicked button';
    }

    if (tagName === 'select') {
        return 'Changed selection';
    }

    if (inputType === 'checkbox') {
        return 'Toggled checkbox';
    }

    if (inputType === 'radio') {
        return 'Selected option';
    }

    if (tagName === 'textarea' || tagName === 'input') {
        return eventType === 'input' ? 'Typed in field' : 'Changed field';
    }

    return eventType === 'click' ? `Clicked ${tagName}` : `Interacted with ${tagName}`;
}

function payloadForField(target) {
    if (!(target instanceof HTMLElement)) {
        return undefined;
    }

    const payload = {};
    const tagName = target.tagName.toLowerCase();

    payload.field_type = tagName === 'input'
        ? (target.getAttribute('type') || 'text').toLowerCase()
        : tagName;

    if ('value' in target && typeof target.value === 'string') {
        payload.field_length = target.value.length;
    }

    if ('checked' in target && typeof target.checked === 'boolean') {
        payload.checked = target.checked;
    }

    return payload;
}

function serializeConsoleValue(value, includeStack = false) {
    if (value instanceof Error) {
        return {
            name: value.name,
            message: truncateText(value.message || value.toString()),
            ...(includeStack && value.stack ? { stack: truncateText(value.stack, 1200) } : {}),
        };
    }

    if (typeof value === 'string') {
        return truncateText(value);
    }

    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
        return String(value);
    }

    if (typeof value === 'undefined') {
        return 'undefined';
    }

    if (value === null) {
        return 'null';
    }

    if (value instanceof Event) {
        return `[Event ${value.type}]`;
    }

    if (Array.isArray(value) || isRecord(value)) {
        try {
            return redactUnknownValue(JSON.parse(JSON.stringify(value)));
        } catch {
            return truncateText(String(value));
        }
    }

    return truncateText(String(value));
}

function durationMs(startedAt) {
    const finishedAt = typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();

    return Math.max(0, Math.round(finishedAt - startedAt));
}

export function normalizeWidgetUserContext(value) {
    if (!isRecord(value)) {
        return null;
    }

    const normalized = {};

    allowedUserKeys.forEach((key) => {
        const entry = value[key];

        if (typeof entry === 'string' && entry.trim() !== '') {
            normalized[key] = truncateText(entry.trim(), 160);
            return;
        }

        if (typeof entry === 'number' || typeof entry === 'boolean') {
            normalized[key] = entry;
        }
    });

    if (isRecord(value.traits)) {
        const traits = Object.entries(value.traits).reduce((carry, [key, entry]) => {
            if (typeof entry === 'string' && entry.trim() !== '') {
                carry[key] = truncateText(entry.trim(), 160);
                return carry;
            }

            if (typeof entry === 'number' || typeof entry === 'boolean') {
                carry[key] = entry;
            }

            return carry;
        }, {});

        if (Object.keys(traits).length) {
            normalized.traits = traits;
        }
    }

    return Object.keys(normalized).length ? redactUnknownValue(normalized) : null;
}

export class WebsiteWidgetTelemetryRecorder {
    constructor() {
        this.refCount = 0;
        this.installed = false;
        this.state = emptyTelemetrySnapshot();
        this.baseUrls = new Set();
        this.originalConsole = {};
        this.originalFetch = null;
        this.originalXhrOpen = null;
        this.originalXhrSend = null;
        this.originalXhrSetRequestHeader = null;
        this.originalHistoryPushState = null;
        this.originalHistoryReplaceState = null;
        this.boundHandleDocumentClick = this.handleDocumentClick.bind(this);
        this.boundHandleDocumentInput = this.handleDocumentInput.bind(this);
        this.boundHandleDocumentChange = this.handleDocumentChange.bind(this);
        this.boundHandleDocumentSubmit = this.handleDocumentSubmit.bind(this);
        this.boundHandleWindowError = this.handleWindowError.bind(this);
        this.boundHandleUnhandledRejection = this.handleUnhandledRejection.bind(this);
        this.boundHandlePopState = this.handlePopState.bind(this);
        this.boundHandleHashChange = this.handleHashChange.bind(this);
    }

    start(options = {}) {
        if (typeof options.baseUrl === 'string' && options.baseUrl.trim() !== '') {
            this.baseUrls.add(options.baseUrl.replace(/\/+$/, ''));
        }

        this.refCount += 1;

        if (!this.installed) {
            this.install();
        }

        this.syncContext();
    }

    stop() {
        this.refCount = Math.max(0, this.refCount - 1);

        if (this.refCount === 0 && this.installed) {
            this.uninstall();
        }
    }

    snapshot(reset = false) {
        this.syncContext();

        const snapshot = cloneJson(this.state);

        if (reset) {
            this.state = emptyTelemetrySnapshot();
        }

        return snapshot;
    }

    recordAction(action) {
        this.state.actions.push(redactTelemetryAction({
            ...action,
            happened_at: action?.happened_at || nowIso(),
        }));
        trimCollection(this.state.actions, maxActions);
    }

    recordLog(log) {
        this.state.logs.push(redactTelemetryLog({
            ...log,
            happened_at: log?.happened_at || nowIso(),
        }));
        trimCollection(this.state.logs, maxLogs);
    }

    recordNetworkRequest(request) {
        this.state.network_requests.push(redactTelemetryNetworkRequest({
            ...request,
            happened_at: request?.happened_at || nowIso(),
        }));
        trimCollection(this.state.network_requests, maxNetworkRequests);
    }

    resetForTests() {
        this.state = emptyTelemetrySnapshot();
        this.refCount = 0;

        if (this.installed) {
            this.uninstall();
        }

        this.baseUrls.clear();
    }

    install() {
        document.addEventListener('click', this.boundHandleDocumentClick, true);
        document.addEventListener('input', this.boundHandleDocumentInput, true);
        document.addEventListener('change', this.boundHandleDocumentChange, true);
        document.addEventListener('submit', this.boundHandleDocumentSubmit, true);
        window.addEventListener('error', this.boundHandleWindowError);
        window.addEventListener('unhandledrejection', this.boundHandleUnhandledRejection);
        window.addEventListener('popstate', this.boundHandlePopState);
        window.addEventListener('hashchange', this.boundHandleHashChange);
        this.installConsolePatch();
        this.installFetchPatch();
        this.installXhrPatch();
        this.installHistoryPatch();
        this.installed = true;
    }

    uninstall() {
        document.removeEventListener('click', this.boundHandleDocumentClick, true);
        document.removeEventListener('input', this.boundHandleDocumentInput, true);
        document.removeEventListener('change', this.boundHandleDocumentChange, true);
        document.removeEventListener('submit', this.boundHandleDocumentSubmit, true);
        window.removeEventListener('error', this.boundHandleWindowError);
        window.removeEventListener('unhandledrejection', this.boundHandleUnhandledRejection);
        window.removeEventListener('popstate', this.boundHandlePopState);
        window.removeEventListener('hashchange', this.boundHandleHashChange);

        if (this.originalFetch) {
            window.fetch = this.originalFetch;
            this.originalFetch = null;
        }

        if (this.originalXhrOpen && this.originalXhrSend && this.originalXhrSetRequestHeader && typeof XMLHttpRequest !== 'undefined') {
            XMLHttpRequest.prototype.open = this.originalXhrOpen;
            XMLHttpRequest.prototype.send = this.originalXhrSend;
            XMLHttpRequest.prototype.setRequestHeader = this.originalXhrSetRequestHeader;
            this.originalXhrOpen = null;
            this.originalXhrSend = null;
            this.originalXhrSetRequestHeader = null;
        }

        if (this.originalHistoryPushState && this.originalHistoryReplaceState) {
            window.history.pushState = this.originalHistoryPushState;
            window.history.replaceState = this.originalHistoryReplaceState;
            this.originalHistoryPushState = null;
            this.originalHistoryReplaceState = null;
        }

        ['log', 'info', 'warn', 'error'].forEach((level) => {
            if (this.originalConsole[level]) {
                console[level] = this.originalConsole[level];
                this.originalConsole[level] = null;
            }
        });

        this.installed = false;
    }

    syncContext() {
        this.state.context = redactTelemetryContext({
            ...(this.state.context ?? {}),
            url: window.location.href,
            title: document.title,
            user_agent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            locale: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
            },
            screen: {
                width: window.screen.width,
                height: window.screen.height,
            },
            referrer: document.referrer || null,
        });
    }

    shouldIgnoreNetworkUrl(url) {
        const normalizedUrl = resolveUrl(url);

        if (!normalizedUrl || /^(data|blob|javascript):/i.test(normalizedUrl)) {
            return true;
        }

        if (internalNetworkPathMatchers.some((pattern) => pattern.test(normalizedUrl))) {
            return true;
        }

        return Array.from(this.baseUrls).some((baseUrl) => normalizedUrl.startsWith(`${baseUrl}/embed/widget.js`));
    }

    handleDocumentClick(event) {
        const target = event.composedPath?.()[0] ?? event.target;

        if (!(target instanceof Element) || isWidgetElement(target)) {
            return;
        }

        const interactive = target.closest(interactiveSelector);

        if (!interactive) {
            return;
        }

        this.recordAction({
            type: 'click',
            label: labelForElement(interactive, 'click'),
            selector: buildSelector(interactive),
            value: interactive instanceof HTMLAnchorElement ? interactive.href : null,
            payload: {
                tag_name: interactive.tagName.toLowerCase(),
            },
        });
    }

    handleDocumentInput(event) {
        const target = event.composedPath?.()[0] ?? event.target;

        if (!(target instanceof HTMLElement) || isWidgetElement(target)) {
            return;
        }

        if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) {
            return;
        }

        this.recordAction({
            type: 'input',
            label: labelForElement(target, 'input'),
            selector: buildSelector(target),
            value: null,
            payload: payloadForField(target),
        });
    }

    handleDocumentChange(event) {
        const target = event.composedPath?.()[0] ?? event.target;

        if (!(target instanceof HTMLElement) || isWidgetElement(target)) {
            return;
        }

        if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) {
            return;
        }

        this.recordAction({
            type: 'change',
            label: labelForElement(target, 'change'),
            selector: buildSelector(target),
            value: null,
            payload: payloadForField(target),
        });
    }

    handleDocumentSubmit(event) {
        const target = event.composedPath?.()[0] ?? event.target;

        if (!(target instanceof HTMLFormElement) || isWidgetElement(target)) {
            return;
        }

        this.recordAction({
            type: 'submit',
            label: 'Submitted form',
            selector: buildSelector(target),
            value: null,
        });
    }

    handleWindowError(event) {
        this.recordLog({
            level: 'error',
            message: event.message || 'Unhandled window error',
            context: {
                source: event.filename || null,
                line: event.lineno || null,
                column: event.colno || null,
            },
        });
    }

    handleUnhandledRejection(event) {
        const reason = event.reason instanceof Error ? event.reason.message : truncateText(String(event.reason ?? 'Promise rejected'));

        this.recordLog({
            level: 'error',
            message: `Unhandled promise rejection: ${reason}`,
        });
    }

    handlePopState() {
        this.syncContext();
        this.recordAction({
            type: 'navigation',
            label: 'Navigated to page',
            selector: null,
            value: window.location.href,
            payload: {
                kind: 'popstate',
                title: document.title,
            },
        });
    }

    handleHashChange() {
        this.syncContext();
        this.recordAction({
            type: 'navigation',
            label: 'Navigated to page',
            selector: null,
            value: window.location.href,
            payload: {
                kind: 'hashchange',
                title: document.title,
            },
        });
    }

    installConsolePatch() {
        ['log', 'info', 'warn', 'error'].forEach((level) => {
            this.originalConsole[level] = console[level];
            const original = console[level].bind(console);

            console[level] = (...args) => {
                original(...args);

                const firstArg = serializeConsoleValue(args[0], true);
                const message = typeof firstArg === 'string'
                    ? firstArg
                    : (isRecord(firstArg) ? firstArg.message || JSON.stringify(firstArg) : String(firstArg ?? ''));

                if (String(message).startsWith('[Snag widget]')) {
                    return;
                }

                const contextArgs = args
                    .slice(1, 1 + maxConsoleArgs)
                    .map((entry) => serializeConsoleValue(entry, true))
                    .filter((entry) => typeof entry !== 'undefined');

                this.recordLog({
                    level,
                    message: truncateText(message, 600),
                    context: contextArgs.length ? { args: contextArgs } : undefined,
                });
            };
        });
    }

    installFetchPatch() {
        if (typeof window.fetch !== 'function') {
            return;
        }

        this.originalFetch = window.fetch.bind(window);
        const originalFetch = this.originalFetch;

        window.fetch = async (input, init) => {
            const request = input instanceof Request ? input : null;
            const url = resolveUrl(request?.url ?? (typeof input === 'string' ? input : ''));
            const method = String(init?.method || request?.method || 'GET').toUpperCase();

            if (this.shouldIgnoreNetworkUrl(url)) {
                return await originalFetch(input, init);
            }

            const startedAt = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
            const requestHeaders = headerRecordFrom(init?.headers) ?? headerRecordFrom(request?.headers);

            try {
                const response = await originalFetch(input, init);

                this.recordNetworkRequest({
                    method,
                    url,
                    status_code: response.status,
                    duration_ms: durationMs(startedAt),
                    request_headers: requestHeaders,
                    response_headers: headerRecordFrom(response.headers),
                    meta: {
                        transport: 'fetch',
                        ok: response.ok,
                        redirected: response.redirected,
                        type: response.type,
                    },
                });

                return response;
            } catch (error) {
                this.recordNetworkRequest({
                    method,
                    url,
                    status_code: null,
                    duration_ms: durationMs(startedAt),
                    request_headers: requestHeaders,
                    meta: {
                        transport: 'fetch',
                        failed: true,
                        error: error instanceof Error ? error.message : String(error),
                    },
                });

                throw error;
            }
        };
    }

    installXhrPatch() {
        if (typeof XMLHttpRequest === 'undefined') {
            return;
        }

        this.originalXhrOpen = XMLHttpRequest.prototype.open;
        this.originalXhrSend = XMLHttpRequest.prototype.send;
        this.originalXhrSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
        const recorder = this;

        XMLHttpRequest.prototype.open = function (method, url, ...rest) {
            this[xhrMetaKey] = {
                method: String(method || 'GET').toUpperCase(),
                url: resolveUrl(String(url || '')),
                request_headers: {},
            };

            return recorder.originalXhrOpen.call(this, method, url, ...rest);
        };

        XMLHttpRequest.prototype.setRequestHeader = function (key, value) {
            if (this[xhrMetaKey]) {
                this[xhrMetaKey].request_headers[key] = truncateText(value, 180);
            }

            return recorder.originalXhrSetRequestHeader.call(this, key, value);
        };

        XMLHttpRequest.prototype.send = function (body) {
            const meta = this[xhrMetaKey] ?? null;

            if (!meta || recorder.shouldIgnoreNetworkUrl(meta.url)) {
                return recorder.originalXhrSend.call(this, body);
            }

            const startedAt = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
            const handleLoadEnd = () => {
                recorder.recordNetworkRequest({
                    method: meta.method,
                    url: meta.url,
                    status_code: this.status || null,
                    duration_ms: durationMs(startedAt),
                    request_headers: Object.keys(meta.request_headers).length ? meta.request_headers : undefined,
                    response_headers: parseRawHeaders(this.getAllResponseHeaders?.()),
                    meta: {
                        transport: 'xhr',
                        response_type: this.responseType || 'text',
                    },
                });
            };

            this.addEventListener('loadend', handleLoadEnd, { once: true });

            return recorder.originalXhrSend.call(this, body);
        };
    }

    installHistoryPatch() {
        this.originalHistoryPushState = window.history.pushState.bind(window.history);
        this.originalHistoryReplaceState = window.history.replaceState.bind(window.history);

        window.history.pushState = (...args) => {
            const result = this.originalHistoryPushState(...args);
            this.syncContext();
            this.recordAction({
                type: 'navigation',
                label: 'Navigated to page',
                selector: null,
                value: window.location.href,
                payload: {
                    kind: 'pushState',
                    title: document.title,
                },
            });
            return result;
        };

        window.history.replaceState = (...args) => {
            const result = this.originalHistoryReplaceState(...args);
            this.syncContext();
            this.recordAction({
                type: 'navigation',
                label: 'Navigated to page',
                selector: null,
                value: window.location.href,
                payload: {
                    kind: 'replaceState',
                    title: document.title,
                },
            });
            return result;
        };
    }
}

export function getSharedWebsiteWidgetTelemetryRecorder() {
    if (!sharedRecorder) {
        sharedRecorder = new WebsiteWidgetTelemetryRecorder();
    }

    return sharedRecorder;
}

export function resetSharedWebsiteWidgetTelemetryRecorderForTests() {
    sharedRecorder?.resetForTests();
    sharedRecorder = null;
}
