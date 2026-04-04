import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountWebsiteWidget } from '../embed/runtime/widget-runtime.js';
import { resetSharedWebsiteWidgetTelemetryRecorderForTests } from '../embed/runtime/widget-telemetry-runtime.js';

const createBootstrap = () => ({
    widget: {
        public_id: 'ww_runtime_demo',
        name: 'Checkout widget',
        status: 'active',
    },
    capture: {
        public_key: 'ck_runtime_demo',
        mode: 'browser',
        media_kind: 'screenshot',
    },
    runtime: {
        position: 'bottom-right',
        screenshot_only: true,
        reopen_intro: false,
    },
    config: {
        launcher: {
            label: 'Report a bug',
        },
        intro: {
            title: 'Found something broken?',
            body: 'We can send a screenshot of this page to our support team. First click Continue. Then click the camera button. After that you can add a short note and send it.',
            continue_label: 'Continue',
            cancel_label: 'Not now',
        },
        helper: {
            text: 'Click the camera to take a screenshot of this page.',
        },
        review: {
            title: 'Screenshot ready',
            body: 'Add context before sending this capture to Snag.',
            placeholder: 'Describe what happened, what you expected, and whether the issue is stable.',
            send_label: 'Continue',
            cancel_label: 'Keep draft',
            retake_label: 'Discard',
        },
        success: {
            title: 'Feedback sent',
            body: 'Your report was sent to our support team.',
            done_label: 'Done',
        },
        meta: {
            support_team_name: 'Support team',
            site_label: 'Checkout page',
        },
        theme: {
            accent_color: '#d97706',
            mode: 'auto',
            offset_x: 20,
            offset_y: 20,
            icon_style: 'camera',
        },
    },
});

const flushAsync = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

describe('website widget submit flow', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        vi.stubGlobal('fetch', vi.fn());
        vi.stubGlobal('requestAnimationFrame', (callback) => setTimeout(() => callback(0), 0));
        vi.stubGlobal('navigator', {
            ...window.navigator,
            language: 'en-US',
            userAgent: 'WidgetBrowser/1.0',
            platform: 'Win32',
        });

        if (typeof URL.createObjectURL !== 'function') {
            URL.createObjectURL = vi.fn(() => 'blob:widget-preview');
        } else {
            vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:widget-preview');
        }

        if (typeof URL.revokeObjectURL !== 'function') {
            URL.revokeObjectURL = vi.fn();
        } else {
            vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
        }
    });

    afterEach(() => {
        resetSharedWebsiteWidgetTelemetryRecorderForTests();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it('captures a screenshot, opens the review modal, and submits an organization-only widget report', async () => {
        const captureScreenshot = vi.fn().mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
        const telemetryRecorder = {
            start: vi.fn(),
            stop: vi.fn(),
            recordAction: vi.fn(),
            snapshot: vi.fn(() => ({
                context: {
                    url: 'https://shop.example.test/checkout?order=123',
                    title: 'Checkout page',
                    language: 'en-US',
                    timezone: 'Europe/Helsinki',
                    viewport: { width: 1440, height: 900 },
                    screen: { width: 1440, height: 900 },
                    referrer: 'https://shop.example.test/cart',
                    user_agent: 'WidgetBrowser/1.0',
                    platform: 'Win32',
                },
                actions: [
                    {
                        type: 'click',
                        label: 'Clicked button',
                        selector: 'button:nth-of-type(1)',
                        value: null,
                        happened_at: '2026-04-04T10:00:00Z',
                    },
                ],
                logs: [
                    {
                        level: 'error',
                        message: 'Checkout request failed',
                        happened_at: '2026-04-04T10:00:01Z',
                    },
                ],
                network_requests: [
                    {
                        method: 'POST',
                        url: 'https://api.example.test/checkout?token=[redacted]',
                        status_code: 504,
                        duration_ms: 1880,
                        happened_at: '2026-04-04T10:00:02Z',
                    },
                ],
            })),
        };
        const captureClient = {
            issuePublicCaptureToken: vi.fn()
                .mockResolvedValueOnce({ capture_token: 'create-token' })
                .mockResolvedValueOnce({ capture_token: 'finalize-token' }),
            createPublicUploadSession: vi.fn().mockResolvedValue({
                upload_session_token: 'upload-session',
                finalize_token: 'session-finalize',
                expires_at: '2026-04-03T10:00:00Z',
                artifacts: [
                    { kind: 'screenshot', key: 'org/demo/capture.png', upload: { method: 'PUT', url: 'https://upload.test/screenshot', headers: {} } },
                    { kind: 'debugger', key: 'org/demo/debugger.json', upload: { method: 'PUT', url: 'https://upload.test/debugger', headers: {} } },
                ],
            }),
            uploadArtifacts: vi.fn().mockResolvedValue(undefined),
            finalizePublicReport: vi.fn().mockResolvedValue({
                report: {
                    id: 21,
                    status: 'processing',
                    report_url: null,
                    share_url: null,
                },
            }),
        };
        const createCaptureClient = vi.fn(() => captureClient);
        const script = document.createElement('script');
        document.body.appendChild(script);

        const runtime = mountWebsiteWidget({
            script,
            bootstrap: createBootstrap(),
            baseUrl: 'https://snag.example.test',
            captureScreenshot,
            createCaptureClient,
            telemetryRecorder,
            initialUserContext: {
                id: 'usr_123',
                email: 'customer@example.com',
                name: 'Jane Customer',
                account_name: 'Acme Corp',
            },
        });

        const root = runtime.host.shadowRoot;

        root.querySelector('[data-action="launch-capture"]').click();
        await flushAsync();
        await vi.waitFor(() => {
            expect(root.querySelector('.snag-widget-title')?.textContent).toContain('Screenshot ready');
        });

        expect(captureScreenshot).toHaveBeenCalledWith({
            excludeElement: runtime.host,
        });
        expect(root.querySelector('.snag-widget-copy')?.textContent).toContain('Add context before sending this capture');
        expect(root.querySelector('.snag-widget-editor-image')?.getAttribute('src')).toBe('blob:widget-preview');

        const textarea = root.querySelector('[data-field="review-comment"]');
        textarea.value = 'I clicked Pay, but nothing happened.';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        await flushAsync();

        root.querySelector('[data-action="continue-review"]').click();
        await flushAsync();
        await vi.waitFor(() => {
            expect(root.querySelector('.snag-widget-title')?.textContent).toContain('Send this feedback?');
        });

        const debuggerPayload = runtime.debuggerPayload();
        expect(Object.keys(debuggerPayload).sort()).toEqual(['actions', 'context', 'logs', 'meta', 'network_requests']);
        expect(debuggerPayload.actions).toEqual([
            expect.objectContaining({
                type: 'click',
                label: 'Clicked button',
            }),
        ]);
        expect(debuggerPayload.logs).toEqual([
            expect.objectContaining({
                level: 'error',
                message: 'Checkout request failed',
            }),
        ]);
        expect(debuggerPayload.network_requests).toEqual([
            expect.objectContaining({
                method: 'POST',
                url: 'https://api.example.test/checkout?token=[redacted]',
            }),
        ]);
        expect(debuggerPayload.context).toMatchObject({
            url: 'https://shop.example.test/checkout?order=123',
            user: {
                id: 'usr_123',
                email: 'customer@example.com',
                name: 'Jane Customer',
                account_name: 'Acme Corp',
            },
        });
        expect(debuggerPayload.meta).toMatchObject({
            source: 'website_widget',
            website_widget_id: 'ww_runtime_demo',
            user_comment: 'I clicked Pay, but nothing happened.',
            user: {
                id: 'usr_123',
                email: 'customer@example.com',
                name: 'Jane Customer',
                account_name: 'Acme Corp',
            },
        });
        expect(debuggerPayload.meta.annotation_count).toBe(0);
        expect(debuggerPayload.meta.cookies).toBeUndefined();
        expect(debuggerPayload.meta.localStorage).toBeUndefined();

        root.querySelector('[data-action="send-feedback"]').click();
        await flushAsync();
        await vi.waitFor(() => {
            expect(captureClient.finalizePublicReport).toHaveBeenCalledTimes(1);
        });

        expect(createCaptureClient).toHaveBeenCalledWith({
            baseUrl: 'https://snag.example.test',
        });
        expect(captureClient.issuePublicCaptureToken).toHaveBeenNthCalledWith(1, {
            public_key: 'ck_runtime_demo',
            origin: window.location.origin,
            mode: 'browser',
            action: 'create',
        });
        expect(captureClient.createPublicUploadSession).toHaveBeenCalledWith(expect.objectContaining({
            public_key: 'ck_runtime_demo',
            capture_token: 'create-token',
            origin: window.location.origin,
            mode: 'browser',
            media_kind: 'screenshot',
            meta: expect.objectContaining({
                source: 'website_widget',
                website_widget_id: 'ww_runtime_demo',
                site_label: 'Checkout page',
                user: expect.objectContaining({
                    id: 'usr_123',
                    email: 'customer@example.com',
                }),
            }),
        }));
        expect(captureClient.uploadArtifacts).toHaveBeenCalledTimes(1);

        const [, artifacts] = captureClient.uploadArtifacts.mock.calls[0];
        expect(artifacts[0]).toMatchObject({ kind: 'screenshot' });
        expect(artifacts[0].body).toBeInstanceOf(Blob);
        expect(artifacts[1]).toMatchObject({ kind: 'debugger' });
        expect(artifacts[1].body).toBeInstanceOf(Blob);

        expect(captureClient.issuePublicCaptureToken).toHaveBeenNthCalledWith(2, {
            public_key: 'ck_runtime_demo',
            origin: window.location.origin,
            mode: 'browser',
            action: 'finalize',
        });
        expect(captureClient.finalizePublicReport).toHaveBeenCalledWith(expect.objectContaining({
            public_key: 'ck_runtime_demo',
            capture_token: 'finalize-token',
            upload_session_token: 'upload-session',
            finalize_token: 'session-finalize',
            visibility: 'organization',
            origin: window.location.origin,
            mode: 'browser',
            meta: expect.objectContaining({
                source: 'website_widget',
                website_widget_id: 'ww_runtime_demo',
                user_comment: 'I clicked Pay, but nothing happened.',
                user: expect.objectContaining({
                    id: 'usr_123',
                    email: 'customer@example.com',
                }),
            }),
        }));

        expect(root.querySelector('.snag-widget-title')?.textContent).toContain('Feedback sent');
        expect(root.querySelector('.snag-widget-copy')?.textContent).toContain('Your report was sent to our support team.');
        expect(root.querySelector('a')).toBeNull();
    });

    it('shows a plain-language error when screenshot capture fails', async () => {
        const script = document.createElement('script');
        document.body.appendChild(script);

        const runtime = mountWebsiteWidget({
            script,
            bootstrap: createBootstrap(),
            baseUrl: 'https://snag.example.test',
            captureScreenshot: vi.fn().mockRejectedValue(new Error('capture exploded')),
            createCaptureClient: vi.fn(),
        });

        const root = runtime.host.shadowRoot;

        root.querySelector('[data-action="launch-capture"]').click();
        await flushAsync();

        expect(root.textContent).toContain('We could not take a screenshot of this page. Please try again.');
    });
});
