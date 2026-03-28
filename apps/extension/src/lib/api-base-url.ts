const xamppDefaultBaseUrl = 'http://localhost/snag';
const rememberedBaseUrlKey = 'snag:last-api-base-url';

function isPrivateIpv4Host(hostname: string): boolean {
    return /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})$/.test(hostname);
}

function shouldUseXamppSubpath(url: URL, normalizedPath: string): boolean {
    return normalizedPath === ''
        && url.port === ''
        && (
            ['localhost', '127.0.0.1'].includes(url.hostname)
            || isPrivateIpv4Host(url.hostname)
        );
}

export function defaultApiBaseUrl(): string {
    if (typeof window === 'undefined') {
        return xamppDefaultBaseUrl;
    }

    const remembered = window.localStorage.getItem(rememberedBaseUrlKey);

    return remembered ? normalizeApiBaseUrl(remembered) : xamppDefaultBaseUrl;
}

export function rememberApiBaseUrl(value: string): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(rememberedBaseUrlKey, normalizeApiBaseUrl(value));
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

export function buildApiUrl(baseUrl: string, path: string): string {
    return new URL(path.replace(/^\/+/, ''), `${normalizeApiBaseUrl(baseUrl)}/`).toString();
}

export async function readApiError(response: Response, baseUrl: string): Promise<string> {
    const body = await response.text();
    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('text/html') || /<html[\s>]|<!doctype html/i.test(body)) {
        return `Snag API not found at ${normalizeApiBaseUrl(baseUrl)}. In XAMPP use the LAN URL printed by php artisan snag:xampp.`;
    }

    return body || `Request failed with status ${response.status}.`;
}
