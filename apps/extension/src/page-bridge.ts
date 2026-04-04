const eventSource = 'snag-page-bridge';
const pageBridgeWindowFlag = '__snagPageBridgeActive__';

type TelemetryMessage =
    | {
          source: typeof eventSource;
          type: 'context';
          payload: Record<string, unknown>;
      }
    | {
          source: typeof eventSource;
          type: 'action';
          payload: Record<string, unknown>;
      }
    | {
          source: typeof eventSource;
          type: 'log';
          payload: Record<string, unknown>;
      }
    | {
          source: typeof eventSource;
          type: 'network';
          payload: Record<string, unknown>;
      };

function post(type: TelemetryMessage['type'], payload: Record<string, unknown>): void {
    window.postMessage({
        source: eventSource,
        type,
        payload,
    } satisfies TelemetryMessage, window.location.origin);
}

function nowIsoString(): string {
    return new Date().toISOString();
}

function serialize(value: unknown): unknown {
    if (value instanceof Error) {
        return {
            name: value.name,
            message: value.message,
            stack: value.stack,
        };
    }

    if (Array.isArray(value)) {
        return value.map((item) => serialize(item));
    }

    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, entry]) => [key, serialize(entry)]),
        );
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
        return value;
    }

    return String(value);
}

function contextPayload(): Record<string, unknown> {
    return {
        url: window.location.href,
        title: document.title,
        user_agent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
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
        happened_at: nowIsoString(),
    };
}

function normalizeHeaders(headers: Headers | Record<string, string>): Record<string, string> {
    if (headers instanceof Headers) {
        return Object.fromEntries(headers.entries());
    }

    return headers;
}

function normalizeUrl(input: RequestInfo | URL): string {
    if (typeof input === 'string') {
        return new URL(input, window.location.href).toString();
    }

    if (input instanceof URL) {
        return input.toString();
    }

    if ('url' in input) {
        return new URL(input.url, window.location.href).toString();
    }

    return window.location.href;
}

function instrumentRuntimeErrors(): void {
    window.addEventListener('error', (event) => {
        post('log', {
            level: 'error',
            message: event.message,
            context: {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
            },
            happened_at: nowIsoString(),
        });
    });

    window.addEventListener('unhandledrejection', (event) => {
        post('log', {
            level: 'error',
            message: event.reason instanceof Error ? event.reason.message : String(event.reason),
            context: {
                reason: serialize(event.reason),
            },
            happened_at: nowIsoString(),
        });
    });
}

function instrumentFetch(): void {
    const originalFetch = window.fetch;

    window.fetch = async function instrumentedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        const startedAt = performance.now();
        const happenedAt = nowIsoString();
        const url = normalizeUrl(input);
        const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
        const requestHeaders = init?.headers
            ? normalizeHeaders(new Headers(init.headers))
            : (input instanceof Request ? normalizeHeaders(input.headers) : {});

        try {
            const response = await originalFetch.apply(this, [input, init]);
            const normalizedUrl = new URL(url);

            post('network', {
                method,
                url,
                status_code: response.status,
                duration_ms: Math.round(performance.now() - startedAt),
                request_headers: requestHeaders,
                response_headers: normalizeHeaders(response.headers),
                meta: {
                    host: normalizedUrl.host,
                    pathname: normalizedUrl.pathname,
                    query: Object.fromEntries(normalizedUrl.searchParams.entries()),
                },
                happened_at: happenedAt,
            });

            return response;
        } catch (error) {
            const normalizedUrl = new URL(url);

            post('network', {
                method,
                url,
                status_code: null,
                duration_ms: Math.round(performance.now() - startedAt),
                request_headers: requestHeaders,
                response_headers: {},
                meta: {
                    error: serialize(error),
                    host: normalizedUrl.host,
                    pathname: normalizedUrl.pathname,
                    query: Object.fromEntries(normalizedUrl.searchParams.entries()),
                },
                happened_at: happenedAt,
            });

            throw error;
        }
    };
}

function instrumentXmlHttpRequest(): void {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

    XMLHttpRequest.prototype.open = function patchedOpen(
        method: string,
        url: string | URL,
        async?: boolean,
        username?: string | null,
        password?: string | null,
    ): void {
        Reflect.set(this, '__snagMethod', method);
        Reflect.set(this, '__snagUrl', new URL(String(url), window.location.href).toString());
        Reflect.set(this, '__snagHeaders', {});
        Reflect.set(this, '__snagStartedAt', performance.now());
        Reflect.set(this, '__snagHappenedAt', nowIsoString());

        originalOpen.call(this, method, url, async ?? true, username ?? undefined, password ?? undefined);
    };

    XMLHttpRequest.prototype.setRequestHeader = function patchedSetRequestHeader(name: string, value: string): void {
        const headers = (Reflect.get(this, '__snagHeaders') as Record<string, string> | undefined) ?? {};
        headers[name.toLowerCase()] = value;
        Reflect.set(this, '__snagHeaders', headers);

        originalSetRequestHeader.call(this, name, value);
    };

    XMLHttpRequest.prototype.send = function patchedSend(body?: Document | XMLHttpRequestBodyInit | null): void {
        this.addEventListener('loadend', () => {
            const url = Reflect.get(this, '__snagUrl') as string | undefined;

            if (!url) {
                return;
            }

            const requestHeaders = (Reflect.get(this, '__snagHeaders') as Record<string, string> | undefined) ?? {};
            const startedAt = Number(Reflect.get(this, '__snagStartedAt') ?? performance.now());
            const responseHeaders = this.getAllResponseHeaders()
                .trim()
                .split(/[\r\n]+/)
                .filter(Boolean)
                .reduce<Record<string, string>>((carry, line) => {
                    const separatorIndex = line.indexOf(':');

                    if (separatorIndex === -1) {
                        return carry;
                    }

                    const key = line.slice(0, separatorIndex).trim().toLowerCase();
                    const value = line.slice(separatorIndex + 1).trim();
                    carry[key] = value;

                    return carry;
                }, {});
            const normalizedUrl = new URL(url);

            post('network', {
                method: Reflect.get(this, '__snagMethod') ?? 'GET',
                url,
                status_code: this.status || null,
                duration_ms: Math.round(performance.now() - startedAt),
                request_headers: requestHeaders,
                response_headers: responseHeaders,
                meta: {
                    body_type: body instanceof FormData ? 'form-data' : typeof body,
                    host: normalizedUrl.host,
                    pathname: normalizedUrl.pathname,
                    query: Object.fromEntries(normalizedUrl.searchParams.entries()),
                },
                happened_at: Reflect.get(this, '__snagHappenedAt') ?? nowIsoString(),
            });
        }, { once: true });

        originalSend.call(this, body as XMLHttpRequestBodyInit | null | undefined);
    };
}

function instrumentNavigation(): void {
    const pushState = history.pushState;
    const replaceState = history.replaceState;

    const emitNavigation = (mode: 'pushState' | 'replaceState' | 'popstate') => {
        post('action', {
            type: 'navigation',
            label: `Navigate to ${window.location.pathname || '/'}`,
            selector: null,
            value: window.location.href,
            payload: {
                title: document.title,
                mode,
            },
            happened_at: nowIsoString(),
        });
        post('context', contextPayload());
    };

    history.pushState = function patchedPushState(...args) {
        pushState.apply(this, args);
        emitNavigation('pushState');
    };

    history.replaceState = function patchedReplaceState(...args) {
        replaceState.apply(this, args);
        emitNavigation('replaceState');
    };

    window.addEventListener('popstate', () => emitNavigation('popstate'));
}

const pageBridgeWindowState = window as unknown as Record<string, unknown>;

if (pageBridgeWindowState[pageBridgeWindowFlag] !== true) {
    pageBridgeWindowState[pageBridgeWindowFlag] = true;
    post('context', contextPayload());
    instrumentRuntimeErrors();
    instrumentFetch();
    instrumentXmlHttpRequest();
    instrumentNavigation();
}
