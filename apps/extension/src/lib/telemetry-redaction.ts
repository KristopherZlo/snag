import type {
    CaptureTelemetryAction,
    CaptureTelemetryContext,
    CaptureTelemetryLog,
    CaptureTelemetryNetworkRequest,
} from './capture-telemetry';

const redactedValue = '[redacted]';
const sensitiveKeyPattern = /(authorization|cookie|set-cookie|token|secret|password|passwd|pwd|session|api[-_]?key|auth|csrf|xsrf|code)/i;
const bearerTokenPattern = /\bBearer\s+[A-Za-z0-9\-._~+/]+=*\b/gi;
const jwtPattern = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const opaqueTokenPattern = /\b[A-Za-z0-9_-]{24,}\b/;

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isLikelyOpaqueToken(value: string): boolean {
    return opaqueTokenPattern.test(value) && /[A-Za-z]/.test(value) && /\d/.test(value);
}

function sanitizeString(value: string): string {
    const sanitizedUrl = sanitizeUrl(value);
    const source = sanitizedUrl ?? value;

    return source
        .replace(bearerTokenPattern, `Bearer ${redactedValue}`)
        .replace(jwtPattern, redactedValue)
        .replace(/\b[A-Za-z0-9_-]{24,}\b/g, (candidate) => (isLikelyOpaqueToken(candidate) ? redactedValue : candidate));
}

function shouldRedactKey(key: string): boolean {
    return sensitiveKeyPattern.test(key);
}

export function sanitizeUrl(value: string): string | null {
    try {
        const url = new URL(value);

        for (const [key, rawValue] of url.searchParams.entries()) {
            if (shouldRedactKey(key) || isLikelyOpaqueToken(rawValue) || /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/.test(rawValue)) {
                url.searchParams.set(key, redactedValue);
            }
        }

        return url.toString();
    } catch {
        return null;
    }
}

export function redactStringRecord(record: Record<string, string> | undefined): Record<string, string> | undefined {
    if (!record) {
        return undefined;
    }

    return Object.entries(record).reduce<Record<string, string>>((carry, [key, value]) => {
        carry[key] = shouldRedactKey(key) ? redactedValue : sanitizeString(value);

        return carry;
    }, {});
}

export function redactUnknownValue(value: unknown, keyHint?: string): unknown {
    if (typeof value === 'string') {
        return keyHint && shouldRedactKey(keyHint) ? redactedValue : sanitizeString(value);
    }

    if (Array.isArray(value)) {
        return value.map((entry) => redactUnknownValue(entry, keyHint));
    }

    if (isRecord(value)) {
        return Object.fromEntries(
            Object.entries(value).map(([key, entry]) => [
                key,
                shouldRedactKey(key) ? redactedValue : redactUnknownValue(entry, key),
            ]),
        );
    }

    return value;
}

export function redactTelemetryContext(context: Partial<CaptureTelemetryContext>): Partial<CaptureTelemetryContext> {
    return {
        ...context,
        url: typeof context.url === 'string' ? sanitizeUrl(context.url) ?? context.url : context.url,
        referrer: typeof context.referrer === 'string' ? sanitizeUrl(context.referrer) ?? context.referrer : context.referrer,
        selection: undefined,
    };
}

export function redactTelemetryAction(action: CaptureTelemetryAction): CaptureTelemetryAction {
    return {
        ...action,
        value: action.type === 'input'
            ? null
            : (typeof action.value === 'string' ? sanitizeUrl(action.value) ?? sanitizeString(action.value) : action.value),
        payload: isRecord(action.payload) ? redactUnknownValue(action.payload) as Record<string, unknown> : action.payload,
    };
}

export function redactTelemetryLog(log: CaptureTelemetryLog): CaptureTelemetryLog {
    return {
        ...log,
        message: sanitizeString(log.message),
        context: isRecord(log.context) ? redactUnknownValue(log.context) as Record<string, unknown> : log.context,
    };
}

export function redactTelemetryNetworkRequest(request: CaptureTelemetryNetworkRequest): CaptureTelemetryNetworkRequest {
    return {
        ...request,
        url: sanitizeUrl(request.url) ?? request.url,
        request_headers: redactStringRecord(request.request_headers),
        response_headers: redactStringRecord(request.response_headers),
        meta: isRecord(request.meta) ? redactUnknownValue(request.meta) as Record<string, unknown> : request.meta,
    };
}
