const redactedValue = '[redacted]';
const sensitiveKeyPattern = /(authorization|cookie|set-cookie|token|secret|password|passwd|pwd|session|api[-_]?key|auth|csrf|xsrf|otp|passcode|verification[-_]?code|auth[-_]?code|reset[-_]?code)/i;
const bearerTokenPattern = /\bBearer\s+[A-Za-z0-9\-._~+/]+=*\b/gi;
const jwtPattern = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const opaqueTokenPattern = /\b[A-Za-z0-9_-]{24,}\b/g;

function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isLikelyOpaqueToken(value) {
    return typeof value === 'string'
        && value.length >= 24
        && /^[A-Za-z0-9_-]+$/.test(value)
        && /[A-Za-z]/.test(value)
        && /\d/.test(value);
}

function shouldRedactKey(key) {
    return sensitiveKeyPattern.test(String(key || ''));
}

export function sanitizeUrl(value) {
    if (typeof value !== 'string' || value.trim() === '') {
        return null;
    }

    if (!/^https?:\/\//i.test(value)) {
        return null;
    }

    try {
        const url = new URL(value);

        for (const [key, rawValue] of url.searchParams.entries()) {
            if (shouldRedactKey(key) || isLikelyOpaqueToken(rawValue) || jwtPattern.test(rawValue)) {
                url.searchParams.set(key, redactedValue);
            }
        }

        return url.toString();
    } catch {
        return null;
    }
}

function sanitizeString(value) {
    const sanitizedUrl = sanitizeUrl(value);
    const source = sanitizedUrl ?? String(value ?? '');

    return source
        .replace(bearerTokenPattern, `Bearer ${redactedValue}`)
        .replace(jwtPattern, redactedValue)
        .replace(opaqueTokenPattern, (candidate) => (isLikelyOpaqueToken(candidate) ? redactedValue : candidate));
}

export function redactUnknownValue(value, keyHint = null) {
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

export function redactStringRecord(record) {
    if (!isRecord(record)) {
        return undefined;
    }

    return Object.entries(record).reduce((carry, [key, value]) => {
        if (typeof value !== 'string') {
            return carry;
        }

        carry[key] = shouldRedactKey(key) ? redactedValue : sanitizeString(value);
        return carry;
    }, {});
}

export function redactTelemetryContext(context) {
    if (!isRecord(context)) {
        return null;
    }

    const redacted = redactUnknownValue(context);

    if (!isRecord(redacted)) {
        return null;
    }

    if (typeof redacted.url === 'string') {
        redacted.url = sanitizeUrl(redacted.url) ?? redacted.url;
    }

    if (typeof redacted.referrer === 'string') {
        redacted.referrer = sanitizeUrl(redacted.referrer) ?? redacted.referrer;
    }

    delete redacted.selection;

    return redacted;
}

export function redactTelemetryAction(action) {
    if (!isRecord(action)) {
        return action;
    }

    return {
        ...action,
        value: action.type === 'input'
            ? null
            : (typeof action.value === 'string' ? sanitizeUrl(action.value) ?? sanitizeString(action.value) : action.value),
        payload: isRecord(action.payload) ? redactUnknownValue(action.payload) : action.payload,
    };
}

export function redactTelemetryLog(log) {
    if (!isRecord(log)) {
        return log;
    }

    return {
        ...log,
        message: sanitizeString(String(log.message ?? '')),
        context: isRecord(log.context) ? redactUnknownValue(log.context) : log.context,
    };
}

export function redactTelemetryNetworkRequest(request) {
    if (!isRecord(request)) {
        return request;
    }

    return {
        ...request,
        url: typeof request.url === 'string' ? (sanitizeUrl(request.url) ?? request.url) : request.url,
        request_headers: redactStringRecord(request.request_headers),
        response_headers: redactStringRecord(request.response_headers),
        meta: isRecord(request.meta) ? redactUnknownValue(request.meta) : request.meta,
    };
}
