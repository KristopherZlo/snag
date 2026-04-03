const xamppDefaultBaseUrl = 'http://localhost/snag';
const rememberedBaseUrlKey = 'snag:last-api-base-url';
const allowedInsecureHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

function isPrivateIpv4Host(hostname: string): boolean {
    return /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})$/.test(hostname);
}

function shouldUseXamppSubpath(url: URL, normalizedPath: string): boolean {
    return normalizedPath === ''
        && url.port === ''
        && (
            allowedInsecureHosts.has(url.hostname)
            || isPrivateIpv4Host(url.hostname)
        );
}

function isAllowedInsecureHost(hostname: string): boolean {
    return allowedInsecureHosts.has(hostname.toLowerCase());
}

export function defaultApiBaseUrl(): string {
    if (typeof window === 'undefined') {
        return xamppDefaultBaseUrl;
    }

    const remembered = window.localStorage.getItem(rememberedBaseUrlKey);

    if (!remembered) {
        return xamppDefaultBaseUrl;
    }

    try {
        return assertSecureApiBaseUrl(remembered);
    } catch {
        window.localStorage.removeItem(rememberedBaseUrlKey);

        return xamppDefaultBaseUrl;
    }
}

export function rememberApiBaseUrl(value: string): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(rememberedBaseUrlKey, assertSecureApiBaseUrl(value));
    } catch {
        window.localStorage.removeItem(rememberedBaseUrlKey);
    }
}

export function normalizeApiBaseUrl(value: string): string {
    const trimmed = value.trim();

    if (trimmed === '') {
        return xamppDefaultBaseUrl;
    }

    try {
        const url = new URL(trimmed);
        const normalizedPath = url.pathname === '/' ? '' : url.pathname.replace(/\/+$/, '');

        if (shouldUseXamppSubpath(url, normalizedPath)) {
            return `${url.origin}/snag`;
        }

        return `${url.origin}${normalizedPath}`;
    } catch {
        return trimmed.replace(/\/+$/, '');
    }
}

export function assertSecureApiBaseUrl(value: string): string {
    const normalized = normalizeApiBaseUrl(value);
    let url: URL;

    try {
        url = new URL(normalized);
    } catch {
        throw new Error('Enter a valid Snag base URL. Use https:// for remote hosts. Plain http:// is allowed only for localhost during local development.');
    }

    if (url.protocol === 'https:' || (url.protocol === 'http:' && isAllowedInsecureHost(url.hostname))) {
        return normalized;
    }

    throw new Error('Use https:// for the API base URL. Plain http:// is allowed only for localhost during local development.');
}

export function buildApiUrl(baseUrl: string, path: string): string {
    return new URL(path.replace(/^\/+/, ''), `${normalizeApiBaseUrl(baseUrl)}/`).toString();
}

export async function readApiError(response: Response, baseUrl: string): Promise<string> {
    const body = await response.text();
    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('text/html') || /<html[\s>]|<!doctype html/i.test(body)) {
        return `Snag API not found at ${normalizeApiBaseUrl(baseUrl)}. Use your HTTPS Snag URL, or http://localhost during local development.`;
    }

    return body || `Request failed with status ${response.status}.`;
}
