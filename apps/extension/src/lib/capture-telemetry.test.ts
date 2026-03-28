import { describe, expect, it } from 'vitest';
import { normalizeTelemetrySnapshot } from './capture-telemetry';

describe('telemetry normalization', () => {
    it('drops invalid fields and keeps the stable snapshot shape', () => {
        const snapshot = normalizeTelemetrySnapshot({
            context: {
                url: 'https://example.com/orders/1',
                title: 'Orders',
                user_agent: 'Mozilla/5.0',
                platform: 'MacIntel',
                language: 'en-US',
                timezone: 'Europe/Helsinki',
                viewport: { width: 1200, height: 800 },
                screen: { width: 1440, height: 900 },
                referrer: null,
            },
            actions: [
                { type: 'click', selector: '#submit' },
                { nope: true },
            ],
            logs: [
                { level: 'error', message: 'Boom' },
                { level: 'info' },
            ],
            network_requests: [
                {
                    method: 'GET',
                    url: 'https://api.example.test/orders',
                    request_headers: {
                        accept: 'application/json',
                        invalid: 1,
                    },
                },
                { url: 'https://invalid.example.test' },
            ],
        });

        expect(snapshot).toEqual({
            context: expect.objectContaining({
                url: 'https://example.com/orders/1',
                viewport: { width: 1200, height: 800 },
            }),
            actions: [
                expect.objectContaining({
                    type: 'click',
                    selector: '#submit',
                }),
            ],
            logs: [
                expect.objectContaining({
                    level: 'error',
                    message: 'Boom',
                }),
            ],
            network_requests: [
                expect.objectContaining({
                    method: 'GET',
                    request_headers: { accept: 'application/json' },
                }),
            ],
        });
    });
});
