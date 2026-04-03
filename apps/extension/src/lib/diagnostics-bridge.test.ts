import { describe, expect, it } from 'vitest';

import {
    createDiagnosticsBridgeMessage,
    diagnosticsBridgeMetaName,
    diagnosticsEventSource,
    isTrustedDiagnosticsBridgeMessage,
    isTrustedDiagnosticsOrigin,
    readDiagnosticsBridgeNonce,
    resolveDiagnosticsBridgeNonce,
} from './diagnostics-bridge';

describe('diagnostics bridge security guardrails', () => {
    it('accepts only localhost-style diagnostics origins', () => {
        expect(isTrustedDiagnosticsOrigin('http://localhost:8010')).toBe(true);
        expect(isTrustedDiagnosticsOrigin('https://127.0.0.1:9443')).toBe(true);
        expect(isTrustedDiagnosticsOrigin('https://example.com')).toBe(false);
        expect(isTrustedDiagnosticsOrigin('chrome-extension://abcdef')).toBe(false);
    });

    it('requires a strong nonce from the diagnostics page metadata', () => {
        const documentRef = {
            querySelector: () => ({
                getAttribute: () => 'diag_nonce_1234567890abcdef',
            }),
        } as unknown as Document;

        expect(readDiagnosticsBridgeNonce(documentRef)).toBe('diag_nonce_1234567890abcdef');
        expect(resolveDiagnosticsBridgeNonce('http://localhost:8010', documentRef)).toBe('diag_nonce_1234567890abcdef');
        expect(resolveDiagnosticsBridgeNonce('https://example.com', documentRef)).toBeNull();
    });

    it('rejects messages without the negotiated nonce', () => {
        const message = createDiagnosticsBridgeMessage('start-live-recording', 'diag_nonce_1234567890abcdef');

        expect(message).toEqual({
            source: diagnosticsEventSource,
            type: 'start-live-recording',
            nonce: 'diag_nonce_1234567890abcdef',
            payload: undefined,
        });
        expect(diagnosticsBridgeMetaName).toBe('snag-extension-recorder-nonce');
        expect(isTrustedDiagnosticsBridgeMessage(message, 'diag_nonce_1234567890abcdef')).toBe(true);
        expect(isTrustedDiagnosticsBridgeMessage(message, 'wrong_nonce_1234567890abcdef')).toBe(false);
        expect(isTrustedDiagnosticsBridgeMessage({ source: diagnosticsEventSource, type: 'start-live-recording' }, 'diag_nonce_1234567890abcdef')).toBe(false);
    });
});
