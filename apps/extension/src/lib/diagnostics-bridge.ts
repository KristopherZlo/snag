export const diagnosticsEventSource = 'snag-extension-recorder-diagnostics';
export const diagnosticsBridgeMetaName = 'snag-extension-recorder-nonce';

const allowedDiagnosticsHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

export interface DiagnosticsBridgeMessage {
    source: typeof diagnosticsEventSource;
    type: string;
    nonce: string;
    payload?: Record<string, unknown>;
}

export function isTrustedDiagnosticsOrigin(origin: string): boolean {
    try {
        const url = new URL(origin);

        return (url.protocol === 'http:' || url.protocol === 'https:')
            && allowedDiagnosticsHosts.has(url.hostname.toLowerCase());
    } catch {
        return false;
    }
}

export function readDiagnosticsBridgeNonce(documentRef: Pick<Document, 'querySelector'>): string | null {
    const rawNonce = documentRef
        .querySelector(`meta[name="${diagnosticsBridgeMetaName}"]`)
        ?.getAttribute('content')
        ?.trim();

    return rawNonce && /^[A-Za-z0-9_-]{20,}$/.test(rawNonce)
        ? rawNonce
        : null;
}

export function resolveDiagnosticsBridgeNonce(
    origin: string,
    documentRef: Pick<Document, 'querySelector'>,
): string | null {
    if (!isTrustedDiagnosticsOrigin(origin)) {
        return null;
    }

    return readDiagnosticsBridgeNonce(documentRef);
}

export function createDiagnosticsBridgeMessage(
    type: string,
    nonce: string,
    payload?: Record<string, unknown>,
): DiagnosticsBridgeMessage {
    return {
        source: diagnosticsEventSource,
        type,
        nonce,
        payload,
    };
}

export function isTrustedDiagnosticsBridgeMessage(
    value: unknown,
    expectedNonce: string,
): value is DiagnosticsBridgeMessage {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const message = value as Partial<DiagnosticsBridgeMessage>;

    return message.source === diagnosticsEventSource
        && typeof message.type === 'string'
        && message.nonce === expectedNonce;
}
