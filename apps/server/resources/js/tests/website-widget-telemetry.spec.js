import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    WebsiteWidgetTelemetryRecorder,
    normalizeWidgetUserContext,
    resetSharedWebsiteWidgetTelemetryRecorderForTests,
} from '../embed/runtime/widget-telemetry-runtime.js';

describe('website widget telemetry recorder', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <form id="checkout-form">
                <button type="button">Pay now</button>
                <input id="email-input" type="email" />
            </form>
        `;
    });

    afterEach(() => {
        resetSharedWebsiteWidgetTelemetryRecorderForTests();
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it('captures recent user actions, console output, and safe network metadata', async () => {
        const recorder = new WebsiteWidgetTelemetryRecorder();
        const fetchMock = vi.fn().mockResolvedValue({
            ok: false,
            status: 504,
            redirected: false,
            type: 'basic',
            headers: new Headers({
                authorization: 'Bearer hidden-token',
                'content-type': 'application/json',
            }),
        });

        window.fetch = fetchMock;
        recorder.start({ baseUrl: 'https://snag.example.test' });

        document.querySelector('button').click();

        const input = document.querySelector('input');
        input.value = 'customer@example.com';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        console.error('Checkout request failed', { token: '[redacted-test-key]' });

        await window.fetch('https://api.example.test/checkout?token=very-secret-token', {
            method: 'POST',
            headers: {
                authorization: 'Bearer top-secret-token',
            },
        });

        await window.fetch('https://snag.example.test/api/v1/public/capture/tokens', {
            method: 'POST',
        });

        const snapshot = recorder.snapshot();

        expect(snapshot.actions.some((action) => action.label === 'Clicked button')).toBe(true);
        expect(snapshot.actions.some((action) => action.type === 'input' && action.value === null)).toBe(true);
        expect(snapshot.logs).toEqual(expect.arrayContaining([
            expect.objectContaining({
                level: 'error',
                message: 'Checkout request failed',
                context: expect.objectContaining({
                    args: expect.arrayContaining([
                        expect.objectContaining({
                            token: '[redacted]',
                        }),
                    ]),
                }),
            }),
        ]));
        expect(snapshot.network_requests).toHaveLength(1);
        expect(snapshot.network_requests[0]).toMatchObject({
            method: 'POST',
            url: 'https://api.example.test/checkout?token=%5Bredacted%5D',
            status_code: 504,
            request_headers: {
                authorization: '[redacted]',
            },
            response_headers: {
                authorization: '[redacted]',
                'content-type': 'application/json',
            },
        });

        recorder.stop();
    });

    it('normalizes explicit user context down to safe fields', () => {
        expect(normalizeWidgetUserContext({
            id: 'usr_123',
            email: 'customer@example.com',
            name: 'Jane Customer',
            account_name: 'Acme',
            plan: 'enterprise',
            secret: 'should-not-pass',
            traits: {
                locale: 'en-US',
                seats: 42,
                authToken: 'hidden',
            },
        })).toEqual({
            id: 'usr_123',
            email: 'customer@example.com',
            name: 'Jane Customer',
            account_name: 'Acme',
            plan: 'enterprise',
            traits: {
                locale: 'en-US',
                seats: 42,
                authToken: '[redacted]',
            },
        });
    });
});
