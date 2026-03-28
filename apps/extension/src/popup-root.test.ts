import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountPopup } from './popup-root';
import * as chromeApi from './lib/chrome';
import * as pendingCaptureMedia from './lib/pending-capture-media';
import * as storage from './lib/storage';

vi.mock('./lib/chrome', () => ({
    queryActiveTab: vi.fn(),
    requestPageContext: vi.fn(),
    sendRuntimeMessage: vi.fn(),
}));

vi.mock('./lib/pending-capture-media', () => ({
    readPendingCaptureMedia: vi.fn(),
}));

vi.mock('./lib/storage', () => ({
    getSession: vi.fn(),
    setSession: vi.fn(),
    clearSession: vi.fn(),
    getPendingCapture: vi.fn(),
    getRecordingState: vi.fn(),
}));

function flushPromises(): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
}

async function flushUi(): Promise<void> {
    await flushPromises();
    await flushPromises();
}

describe('popup root', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        document.head.innerHTML = '';
        document.body.innerHTML = '<div id="app"></div>';
        window.localStorage.clear();
        vi.stubGlobal('fetch', vi.fn());

        vi.mocked(storage.getSession).mockResolvedValue(null);
        vi.mocked(storage.getPendingCapture).mockResolvedValue(null);
        vi.mocked(storage.getRecordingState).mockResolvedValue({ status: 'idle' });
        vi.mocked(chromeApi.sendRuntimeMessage).mockResolvedValue({ ok: true });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('mounts without throwing and injects shared styles into document head', async () => {
        const target = document.getElementById('app');

        expect(target).not.toBeNull();
        expect(() => mountPopup(target as HTMLElement)).not.toThrow();

        await flushUi();

        const style = document.head.querySelector('style[data-snag-ui-styles="true"]');
        const shell = document.querySelector('.ck-popup-shell');

        expect(style).not.toBeNull();
        expect(shell).not.toBeNull();
        expect(Array.from(document.childNodes).some((node) => node.nodeName === 'STYLE')).toBe(false);
        expect(document.querySelectorAll('.ck-field')).toHaveLength(4);
        expect((document.querySelector('input[placeholder="http://192.168.x.x/snag"]') as HTMLInputElement | null)?.value).toBe(
            'http://localhost/snag',
        );
        expect(document.body.textContent).toContain('Connect the extension and capture the current tab.');
        expect(document.body.textContent).toContain('Use the LAN URL shown by php artisan snag:xampp.');
    });

    it('renders stored session and screenshot capture details after hydration', async () => {
        vi.mocked(storage.getSession).mockResolvedValue({
            apiBaseUrl: 'http://localhost/snag',
            token: 'token-1',
            organization: {
                id: 7,
                name: 'Studio Org',
                slug: 'studio-org',
            },
            user: {
                id: 11,
                email: 'test@mail.com',
                name: 'Test User',
            },
        });
        vi.mocked(storage.getPendingCapture).mockResolvedValue({
            kind: 'screenshot',
            dataUrl: 'data:image/png;base64,Zm9v',
            title: 'Broken modal',
            url: 'https://example.com/orders/1',
            capturedAt: '2026-03-31T12:00:00Z',
            telemetry: null,
        });

        const target = document.getElementById('app');

        mountPopup(target as HTMLElement);
        await flushUi();
        await flushUi();

        const bodyText = document.body.textContent ?? '';
        const apiInput = document.querySelector('input[placeholder="http://192.168.x.x/snag"]') as HTMLInputElement | null;
        const summaryField = document.querySelector('textarea.ck-textarea') as HTMLTextAreaElement | null;

        expect(apiInput?.value).toBe('http://localhost/snag');
        expect(summaryField).not.toBeNull();
        expect(bodyText).toContain('Studio Org');
        expect(bodyText).toContain('test@mail.com');
        expect(bodyText).toContain('Broken modal');
        expect(bodyText).toContain('https://example.com/orders/1');
        expect(bodyText).toContain('Capture type');
    });

    it('uses the normalized xampp base url when exchanging the one-time code', async () => {
        vi.mocked(storage.setSession).mockResolvedValue();
        vi.mocked(storage.getSession).mockResolvedValueOnce(null).mockResolvedValueOnce({
            apiBaseUrl: 'http://localhost/snag',
            token: 'token-1',
            organization: {
                id: 7,
                name: 'Studio Org',
                slug: 'studio-org',
            },
            user: {
                id: 11,
                email: 'test@mail.com',
                name: 'Test User',
            },
        });

        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({
                token: 'token-1',
                organization: {
                    id: 7,
                    name: 'Studio Org',
                    slug: 'studio-org',
                },
                user: {
                    id: 11,
                    email: 'test@mail.com',
                    name: 'Test User',
                },
            }),
        } as Response);

        const target = document.getElementById('app');

        mountPopup(target as HTMLElement);
        await flushUi();

        const baseUrlInput = document.querySelector('input[placeholder="http://192.168.x.x/snag"]') as HTMLInputElement;
        const codeInput = document.querySelector('input[placeholder="Paste code from settings"]') as HTMLInputElement;
        const exchangeButton = Array.from(document.querySelectorAll('button')).find((button) =>
            button.textContent?.includes('Exchange code'),
        ) as HTMLButtonElement | undefined;

        baseUrlInput.value = 'http://localhost/';
        baseUrlInput.dispatchEvent(new Event('input', { bubbles: true }));
        codeInput.value = 'ABC123';
        codeInput.dispatchEvent(new Event('input', { bubbles: true }));
        await flushUi();

        expect(exchangeButton).toBeDefined();
        expect(exchangeButton?.disabled).toBe(false);

        exchangeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        await flushUi();

        expect(fetchMock).toHaveBeenCalledWith(
            'http://localhost/snag/api/v1/extension/tokens/exchange',
            expect.objectContaining({
                method: 'POST',
            }),
        );
        expect(storage.setSession).toHaveBeenCalledWith(
            expect.objectContaining({
                apiBaseUrl: 'http://localhost/snag',
            }),
        );
    });

    it('starts video recording and reflects the recording recovery state', async () => {
        vi.mocked(storage.getRecordingState)
            .mockResolvedValueOnce({ status: 'idle' })
            .mockResolvedValueOnce({
                status: 'recording',
                title: 'Checkout failure',
                url: 'https://example.com/checkout',
                capturedAt: '2026-03-31T12:00:00Z',
                startedAt: '2026-03-31T12:00:05Z',
            });

        const target = document.getElementById('app');

        mountPopup(target as HTMLElement);
        await flushUi();

        const startButton = Array.from(document.querySelectorAll('button')).find((button) =>
            button.textContent?.includes('Start video recording'),
        ) as HTMLButtonElement | undefined;

        expect(startButton).toBeDefined();

        startButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await flushUi();

        expect(chromeApi.sendRuntimeMessage).toHaveBeenCalledWith({ type: 'start-video-recording' });
        expect(document.body.textContent).toContain('In progress');
        expect(document.body.textContent).toContain('Checkout failure');
        expect(Array.from(document.querySelectorAll('button')).some((button) => button.textContent?.includes('Stop video recording'))).toBe(true);
    });

    it('submits a pending screenshot without losing the fetch context', async () => {
        vi.mocked(storage.getSession).mockResolvedValue({
            apiBaseUrl: 'http://localhost/snag',
            token: 'token-1',
            organization: {
                id: 7,
                name: 'Studio Org',
                slug: 'studio-org',
            },
            user: {
                id: 11,
                email: 'test@mail.com',
                name: 'Test User',
            },
        });
        vi.mocked(storage.getPendingCapture)
            .mockResolvedValue({
                kind: 'screenshot',
                dataUrl: 'data:image/png;base64,Zm9v',
                title: 'Broken modal',
                url: 'https://example.com/orders/1',
                capturedAt: '2026-03-31T12:00:00Z',
                telemetry: {
                    context: {
                        url: 'https://example.com/orders/1',
                        title: 'Broken modal',
                        user_agent: 'Mozilla/5.0',
                        platform: 'MacIntel',
                        language: 'en-US',
                        timezone: 'Europe/Helsinki',
                        viewport: { width: 1440, height: 900 },
                        screen: { width: 1440, height: 900 },
                        referrer: null,
                        selection: 'Selected text',
                    },
                    actions: [
                        {
                            type: 'click',
                            label: 'Click button',
                            selector: '#submit',
                            value: null,
                            happened_at: '2026-03-31T12:00:01Z',
                        },
                    ],
                    logs: [
                        {
                            level: 'error',
                            message: 'Broken modal',
                            happened_at: '2026-03-31T12:00:02Z',
                        },
                    ],
                    network_requests: [
                        {
                            method: 'POST',
                            url: 'https://api.example.test/reports',
                            status_code: 500,
                            duration_ms: 241,
                            request_headers: { 'content-type': 'application/json' },
                            response_headers: { 'x-trace-id': 'trace-123' },
                            meta: { host: 'api.example.test' },
                            happened_at: '2026-03-31T12:00:03Z',
                        },
                    ],
                },
            });
        vi.mocked(chromeApi.queryActiveTab).mockResolvedValue({ id: 42 } as chrome.tabs.Tab);
        vi.mocked(chromeApi.requestPageContext).mockResolvedValue({
            selection: 'Selected text',
        });
        vi.mocked(chromeApi.sendRuntimeMessage).mockImplementation(async (message) => {
            if ((message as { type?: string }).type === 'discard-pending-capture') {
                return { ok: true };
            }

            return { ok: true };
        });

        const observedThis: unknown[] = [];
        const fetchMock = vi.fn(async function (this: unknown, input: RequestInfo | URL, init?: RequestInit) {
            observedThis.push(this);

            const url = String(input);

            if (url.startsWith('data:image/png')) {
                return new Response(new Blob(['png']), { status: 200 });
            }

            if (url.endsWith('/api/v1/reports/upload-sessions')) {
                return new Response(
                    JSON.stringify({
                        upload_session_token: 'session-token',
                        finalize_token: 'finalize-token',
                        expires_at: new Date().toISOString(),
                        artifacts: [
                            {
                                kind: 'screenshot',
                                key: 'org/1/uploads/session/capture.png',
                                content_type: 'image/png',
                                upload: {
                                    method: 'PUT',
                                    url: 'https://uploads.test/capture.png',
                                    headers: {},
                                },
                            },
                            {
                                kind: 'debugger',
                                key: 'org/1/uploads/session/debugger.json',
                                content_type: 'application/json',
                                upload: {
                                    method: 'PUT',
                                    url: 'https://uploads.test/debugger.json',
                                    headers: {},
                                },
                            },
                        ],
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } },
                );
            }

            if (url === 'https://uploads.test/capture.png' || url === 'https://uploads.test/debugger.json') {
                if (url === 'https://uploads.test/debugger.json') {
                    const debuggerPayload = init?.body instanceof Blob
                        ? JSON.parse(await init.body.text())
                        : JSON.parse(String(init?.body));

                    expect(debuggerPayload).toMatchObject({
                        context: expect.objectContaining({
                            url: 'https://example.com/orders/1',
                        }),
                        actions: [expect.objectContaining({ selector: '#submit' })],
                        logs: [expect.objectContaining({ message: 'Broken modal' })],
                        network_requests: [expect.objectContaining({ status_code: 500 })],
                    });
                }

                return new Response(null, { status: 200 });
            }

            if (url.endsWith('/api/v1/reports/finalize')) {
                expect(JSON.parse(String(init?.body))).toMatchObject({
                    visibility: 'organization',
                });

                return new Response(
                    JSON.stringify({
                        report: {
                            id: 99,
                            status: 'ready',
                            report_url: 'http://localhost/snag/reports/99',
                            visibility: 'organization',
                            share_token: 'share-token',
                            share_url: null,
                        },
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } },
                );
            }

            throw new Error(`Unexpected fetch call: ${url}`);
        });

        vi.stubGlobal('fetch', fetchMock as typeof fetch);

        const target = document.getElementById('app');

        mountPopup(target as HTMLElement);
        await flushUi();

        const submitButton = Array.from(document.querySelectorAll('button')).find((button) =>
            button.textContent?.includes('Submit screenshot'),
        ) as HTMLButtonElement | undefined;

        expect(submitButton).toBeDefined();
        expect(submitButton?.disabled).toBe(false);

        submitButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        await flushUi();
        await flushUi();
        await flushUi();
        await flushUi();

        const uploadSessionCall = fetchMock.mock.calls.find((call) =>
            String(call[0]).endsWith('/api/v1/reports/upload-sessions'),
        );

        expect(String(uploadSessionCall?.[0])).toBe('http://localhost/snag/api/v1/reports/upload-sessions');
        expect(new Headers(uploadSessionCall?.[1]?.headers).get('Authorization')).toBe('Bearer token-1');
        expect(JSON.parse(String(uploadSessionCall?.[1]?.body ?? '{}'))).toMatchObject({
            media_kind: 'screenshot',
        });
        expect(fetchMock.mock.calls.some((call) => String(call[0]) === 'https://uploads.test/capture.png')).toBe(true);
        expect(fetchMock.mock.calls.some((call) => String(call[0]) === 'https://uploads.test/debugger.json')).toBe(true);
        expect(observedThis).toContain(globalThis);
    });

    it('submits a pending video capture with duration metadata', async () => {
        vi.mocked(storage.getSession).mockResolvedValue({
            apiBaseUrl: 'http://localhost/snag',
            token: 'token-1',
            organization: {
                id: 7,
                name: 'Studio Org',
                slug: 'studio-org',
            },
            user: {
                id: 11,
                email: 'test@mail.com',
                name: 'Test User',
            },
        });
        vi.mocked(storage.getPendingCapture)
            .mockResolvedValue({
                kind: 'video',
                blobKey: 'blob-1',
                mimeType: 'video/webm',
                byteSize: 128,
                durationSeconds: 14,
                title: 'Video capture',
                url: 'https://example.com/video',
                capturedAt: '2026-03-31T12:00:00Z',
                telemetry: null,
            });
        vi.mocked(pendingCaptureMedia.readPendingCaptureMedia).mockResolvedValue(
            new Blob(['video'], { type: 'video/webm' }),
        );
        vi.mocked(chromeApi.queryActiveTab).mockResolvedValue({ id: 42 } as chrome.tabs.Tab);
        vi.mocked(chromeApi.requestPageContext).mockResolvedValue({});
        vi.mocked(chromeApi.sendRuntimeMessage).mockResolvedValue({ ok: true });

        const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);

            if (url.endsWith('/api/v1/reports/upload-sessions')) {
                return new Response(
                    JSON.stringify({
                        upload_session_token: 'session-token',
                        finalize_token: 'finalize-token',
                        expires_at: new Date().toISOString(),
                        artifacts: [
                            {
                                kind: 'video',
                                key: 'org/1/uploads/session/capture.webm',
                                content_type: 'video/webm',
                                upload: {
                                    method: 'PUT',
                                    url: 'https://uploads.test/capture.webm',
                                    headers: {},
                                },
                            },
                            {
                                kind: 'debugger',
                                key: 'org/1/uploads/session/debugger.json',
                                content_type: 'application/json',
                                upload: {
                                    method: 'PUT',
                                    url: 'https://uploads.test/debugger.json',
                                    headers: {},
                                },
                            },
                        ],
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } },
                );
            }

            if (url === 'https://uploads.test/capture.webm' || url === 'https://uploads.test/debugger.json') {
                return new Response(null, { status: 200 });
            }

            if (url.endsWith('/api/v1/reports/finalize')) {
                expect(JSON.parse(String(init?.body))).toMatchObject({
                    media_duration_seconds: 14,
                    visibility: 'organization',
                });

                return new Response(
                    JSON.stringify({
                        report: {
                            id: 101,
                            status: 'ready',
                            report_url: 'http://localhost/snag/reports/101',
                            share_url: null,
                        },
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } },
                );
            }

            return new Response(null, { status: 200 });
        });

        vi.stubGlobal('fetch', fetchMock as typeof fetch);

        const target = document.getElementById('app');

        mountPopup(target as HTMLElement);
        await flushUi();
        await flushUi();
        await flushUi();
        await flushUi();

        expect(document.body.textContent).toContain('Video capture');

        const submitButton = Array.from(document.querySelectorAll('button')).find((button) =>
            button.textContent?.includes('Submit'),
        ) as HTMLButtonElement | undefined;

        expect(submitButton).toBeDefined();

        submitButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await flushUi();
        await flushUi();
        await flushUi();
        await flushUi();

        const uploadSessionCall = fetchMock.mock.calls.find((call) =>
            String(call[0]).endsWith('/api/v1/reports/upload-sessions'),
        );

        expect(JSON.parse(String(uploadSessionCall?.[1]?.body ?? '{}'))).toMatchObject({
            media_kind: 'video',
        });
        expect(pendingCaptureMedia.readPendingCaptureMedia).toHaveBeenCalledWith('blob-1');
        expect(document.body.textContent).toContain('http://localhost/snag/reports/101');
    });

    it('clears the stored extension session after an unauthenticated submit response', async () => {
        vi.mocked(storage.getSession)
            .mockResolvedValueOnce({
                apiBaseUrl: 'http://localhost/snag',
                token: 'token-1',
                organization: {
                    id: 7,
                    name: 'Studio Org',
                    slug: 'studio-org',
                },
                user: {
                    id: 11,
                    email: 'test@mail.com',
                    name: 'Test User',
                },
            })
            .mockResolvedValueOnce(null);
        vi.mocked(storage.getPendingCapture).mockResolvedValue({
            kind: 'screenshot',
            dataUrl: 'data:image/png;base64,Zm9v',
            title: 'Broken modal',
            url: 'https://example.com/orders/1',
            capturedAt: '2026-03-31T12:00:00Z',
            telemetry: null,
        });
        vi.mocked(chromeApi.queryActiveTab).mockResolvedValue({ id: 42 } as chrome.tabs.Tab);
        vi.mocked(chromeApi.requestPageContext).mockResolvedValue({});
        vi.mocked(chromeApi.sendRuntimeMessage).mockResolvedValue({ ok: true });
        vi.mocked(storage.clearSession).mockResolvedValue();

        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input);

            if (url.startsWith('data:image/png')) {
                return new Response(new Blob(['png']), { status: 200 });
            }

            return new Response(
                JSON.stringify({
                    message: 'Unauthenticated.',
                }),
                { status: 401, headers: { 'Content-Type': 'application/json' } },
            );
        });

        vi.stubGlobal('fetch', fetchMock as typeof fetch);

        const target = document.getElementById('app');

        mountPopup(target as HTMLElement);
        await flushUi();
        await flushUi();

        const submitButton = Array.from(document.querySelectorAll('button')).find((button) =>
            button.textContent?.includes('Submit screenshot'),
        ) as HTMLButtonElement | undefined;

        submitButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await flushUi();
        await flushUi();

        expect(storage.clearSession).toHaveBeenCalled();
        expect(document.body.textContent).toContain('Exchange a new one-time code');
    });

    it('shows a controlled status when extension storage is unavailable during hydration', async () => {
        vi.mocked(storage.getSession).mockRejectedValue(new Error('Chrome extension storage is unavailable.'));

        const target = document.getElementById('app');

        mountPopup(target as HTMLElement);
        await flushUi();

        expect(document.body.textContent).toContain('Chrome extension storage is unavailable.');
    });
});
