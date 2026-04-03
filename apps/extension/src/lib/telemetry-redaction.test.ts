import { describe, expect, it } from 'vitest';
import {
    redactStringRecord,
    redactTelemetryAction,
    redactTelemetryContext,
    redactTelemetryLog,
    redactTelemetryNetworkRequest,
    sanitizeUrl,
} from './telemetry-redaction';

describe('telemetry redaction', () => {
    it('removes sensitive query parameters from urls', () => {
        expect(sanitizeUrl('https://example.com/orders/1?token=abc123456789012345678901&foo=bar')).toBe(
            'https://example.com/orders/1?token=%5Bredacted%5D&foo=bar',
        );
    });

    it('redacts input action values while keeping aggregate payload', () => {
        expect(redactTelemetryAction({
            type: 'input',
            selector: '#email',
            value: 'john@example.com',
            payload: {
                field_length: 16,
                event_count: 1,
            },
            happened_at: '2026-04-03T10:00:00Z',
        })).toEqual(expect.objectContaining({
            type: 'input',
            selector: '#email',
            value: null,
            payload: {
                field_length: 16,
                event_count: 1,
            },
        }));
    });

    it('drops text selection from captured context', () => {
        expect(redactTelemetryContext({
            url: 'https://example.com/orders/1?invite_token=abcd1234abcd1234abcd1234',
            referrer: 'https://example.com/dashboard?session=abcd1234abcd1234abcd1234',
            selection: 'copied password here',
        })).toEqual({
            url: 'https://example.com/orders/1?invite_token=%5Bredacted%5D',
            referrer: 'https://example.com/dashboard?session=%5Bredacted%5D',
            selection: undefined,
        });
    });

    it('redacts secret-bearing headers', () => {
        expect(redactStringRecord({
            authorization: 'Bearer super-secret-token',
            cookie: 'snag_session=abc',
            accept: 'application/json',
        })).toEqual({
            authorization: '[redacted]',
            cookie: '[redacted]',
            accept: 'application/json',
        });
    });

    it('redacts token-like values inside logs and nested context', () => {
        expect(redactTelemetryLog({
            level: 'error',
            message: 'Authorization Bearer abcdefghijklmnopqrstuvwx123456 failed',
            context: {
                apiKey: 'super-secret-key-value-123456',
                url: 'https://example.com/callback?code=abc123456789012345678901',
            },
            happened_at: '2026-04-03T10:00:00Z',
        })).toEqual(expect.objectContaining({
            message: 'Authorization Bearer [redacted] failed',
            context: {
                apiKey: '[redacted]',
                url: 'https://example.com/callback?code=%5Bredacted%5D',
            },
        }));
    });

    it('redacts headers and query metadata inside network entries', () => {
        expect(redactTelemetryNetworkRequest({
            method: 'GET',
            url: 'https://api.example.test/orders?authToken=abcdefghijklmnopqrstuvwxyz12',
            request_headers: {
                authorization: 'Bearer abcdefghijklmnopqrstuvwx123456',
                accept: 'application/json',
            },
            response_headers: {
                'set-cookie': 'sid=abc',
                server: 'nginx',
            },
            meta: {
                query: {
                    authToken: 'abcdefghijklmnopqrstuvwxyz12',
                    page: '1',
                },
            },
        })).toEqual(expect.objectContaining({
            url: 'https://api.example.test/orders?authToken=%5Bredacted%5D',
            request_headers: {
                authorization: '[redacted]',
                accept: 'application/json',
            },
            response_headers: {
                'set-cookie': '[redacted]',
                server: 'nginx',
            },
            meta: {
                query: {
                    authToken: '[redacted]',
                    page: '1',
                },
            },
        }));
    });
});
