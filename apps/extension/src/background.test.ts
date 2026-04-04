import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as chromeApi from './lib/chrome';
import * as pendingCaptureMedia from './lib/pending-capture-media';
import * as reportSubmit from './lib/report-submit';
import * as storage from './lib/storage';

vi.mock('./lib/chrome', () => ({
    queryActiveTab: vi.fn(),
    getTab: vi.fn(),
    captureVisibleTab: vi.fn(),
    requestTabMediaStreamId: vi.fn(),
    requestTelemetrySnapshot: vi.fn(),
    startTelemetrySession: vi.fn(),
}));

vi.mock('./lib/storage', () => ({
    setPendingCapture: vi.fn(),
    clearPendingCapture: vi.fn(),
    clearCaptureAccessGrant: vi.fn(),
    getCaptureAccessGrant: vi.fn(),
    getPendingCapture: vi.fn(),
    getRecordingState: vi.fn(),
    getSession: vi.fn(),
    readExtensionStorage: vi.fn(),
    writeExtensionStorage: vi.fn(),
    removeExtensionStorage: vi.fn(),
}));

vi.mock('./lib/pending-capture-media', () => ({
    readPendingCaptureMedia: vi.fn(),
    deletePendingCaptureMedia: vi.fn(),
    writePendingCaptureMedia: vi.fn(),
}));

vi.mock('./lib/report-submit', () => ({
    submitPendingCapture: vi.fn(),
}));

function flushPromises(): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
}

describe('extension background capture flow', () => {
    let commandListener: ((command: string) => void) | null = null;
    let messageListener:
        | ((message: unknown, sender: chrome.runtime.MessageSender, sendResponse: (response: unknown) => void) => boolean)
        | null = null;

    const runtimeSendMessage = vi.fn();
    const getContexts = vi.fn();
    const createOffscreenDocument = vi.fn();
    const closeOffscreenDocument = vi.fn();

    beforeEach(() => {
        commandListener = null;
        messageListener = null;
        runtimeSendMessage.mockReset();
        getContexts.mockReset();
        createOffscreenDocument.mockReset();
        closeOffscreenDocument.mockReset();

        getContexts.mockResolvedValue([]);
        vi.mocked(storage.getCaptureAccessGrant).mockResolvedValue({
            tabId: 31,
            url: 'http://127.0.0.1:8010/_diagnostics/extension-recorder',
            origin: 'http://127.0.0.1:8010',
            grantedAt: '2026-04-01T08:00:00Z',
        });
        vi.mocked(storage.getSession).mockResolvedValue(null);
        vi.mocked(storage.getPendingCapture).mockResolvedValue(null);
        vi.mocked(pendingCaptureMedia.readPendingCaptureMedia).mockResolvedValue(null);
        vi.mocked(pendingCaptureMedia.deletePendingCaptureMedia).mockResolvedValue();
        vi.mocked(reportSubmit.submitPendingCapture).mockReset();

        vi.stubGlobal('chrome', {
            commands: {
                onCommand: {
                    addListener: vi.fn((listener) => {
                        commandListener = listener;
                    }),
                },
            },
            offscreen: {
                createDocument: createOffscreenDocument,
                closeDocument: closeOffscreenDocument,
            },
            runtime: {
                getContexts,
                getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
                sendMessage: runtimeSendMessage,
                onMessage: {
                    addListener: vi.fn((listener) => {
                        messageListener = listener;
                    }),
                },
            },
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it('responds to the popup screenshot message and stores a pending capture', async () => {
        vi.mocked(chromeApi.queryActiveTab).mockResolvedValue({
            id: 17,
            windowId: 7,
            title: 'Broken modal',
            url: 'https://example.com/orders/1',
        } as chrome.tabs.Tab);
        vi.mocked(chromeApi.captureVisibleTab).mockResolvedValue('data:image/png;base64,Zm9v');
        vi.mocked(chromeApi.requestTelemetrySnapshot).mockResolvedValue({
            context: null,
            actions: [],
            logs: [],
            network_requests: [],
        });
        vi.mocked(storage.setPendingCapture).mockResolvedValue();

        await import('./background');

        expect(messageListener).not.toBeNull();

        const sendResponse = vi.fn();
        const keepChannelOpen = messageListener?.(
            { type: 'capture-current-tab' },
            {} as chrome.runtime.MessageSender,
            sendResponse,
        );

        await flushPromises();

        expect(keepChannelOpen).toBe(true);
        expect(storage.setPendingCapture).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: 'screenshot',
                title: 'Broken modal',
                url: 'https://example.com/orders/1',
                dataUrl: 'data:image/png;base64,Zm9v',
                telemetry: expect.objectContaining({
                    actions: [],
                    logs: [],
                    network_requests: [],
                }),
            }),
        );
        expect(sendResponse).toHaveBeenCalledWith(
            expect.objectContaining({
                ok: true,
                capture: expect.objectContaining({
                    title: 'Broken modal',
                }),
            }),
        );
    });

    it('uses the sender tab when a screenshot is captured from the content overlay', async () => {
        vi.mocked(chromeApi.getTab).mockResolvedValue({
            id: 33,
            windowId: 9,
            title: 'Overlay target',
            url: 'https://example.com/profile',
        } as chrome.tabs.Tab);
        vi.mocked(chromeApi.captureVisibleTab).mockResolvedValue('data:image/png;base64,cGF0aA==');
        vi.mocked(chromeApi.requestTelemetrySnapshot).mockResolvedValue({
            context: null,
            actions: [],
            logs: [],
            network_requests: [],
        });
        vi.mocked(storage.setPendingCapture).mockResolvedValue();

        await import('./background');

        const sendResponse = vi.fn();
        const keepChannelOpen = messageListener?.(
            { type: 'capture-current-tab' },
            { tab: { id: 33, windowId: 9 } } as chrome.runtime.MessageSender,
            sendResponse,
        );

        await flushPromises();

        expect(keepChannelOpen).toBe(true);
        expect(chromeApi.getTab).toHaveBeenCalledWith(33);
        expect(chromeApi.queryActiveTab).not.toHaveBeenCalled();
        expect(chromeApi.captureVisibleTab).toHaveBeenCalledWith(9);
        expect(sendResponse).toHaveBeenCalledWith(
            expect.objectContaining({
                ok: true,
                capture: expect.objectContaining({
                    title: 'Overlay target',
                    url: 'https://example.com/profile',
                }),
            }),
        );
    });

    it('returns a guided screenshot message when Chrome blocks direct tab capture', async () => {
        vi.mocked(chromeApi.queryActiveTab).mockResolvedValue({
            id: 17,
            windowId: 7,
            title: 'Blocked target',
            url: 'https://example.com/orders/1',
        } as chrome.tabs.Tab);
        vi.mocked(chromeApi.captureVisibleTab).mockRejectedValue(new Error('This page cannot be captured.'));

        await import('./background');

        const sendResponse = vi.fn();
        const keepChannelOpen = messageListener?.(
            { type: 'capture-current-tab' },
            {} as chrome.runtime.MessageSender,
            sendResponse,
        );

        await flushPromises();

        expect(keepChannelOpen).toBe(true);
        expect(sendResponse).toHaveBeenCalledWith(
            expect.objectContaining({
                ok: false,
                message: expect.stringContaining('Open the Snag extension popup once on this page'),
            }),
        );
    });

    it('proxies popup storage operations through the background worker', async () => {
        vi.mocked(storage.readExtensionStorage).mockResolvedValue({
            token: 'token-1',
        });
        vi.mocked(storage.writeExtensionStorage).mockResolvedValue();
        vi.mocked(storage.removeExtensionStorage).mockResolvedValue();

        await import('./background');

        expect(messageListener).not.toBeNull();

        const readResponse = vi.fn();
        const keepReadChannelOpen = messageListener?.(
            { type: 'storage:get', key: 'session' },
            {} as chrome.runtime.MessageSender,
            readResponse,
        );

        await flushPromises();

        expect(keepReadChannelOpen).toBe(true);
        expect(storage.readExtensionStorage).toHaveBeenCalledWith('session');
        expect(readResponse).toHaveBeenCalledWith({
            ok: true,
            values: {
                session: {
                    token: 'token-1',
                },
            },
        });

        const writeResponse = vi.fn();
        const keepWriteChannelOpen = messageListener?.(
            { type: 'storage:set', values: { session: { token: 'token-2' } } },
            {} as chrome.runtime.MessageSender,
            writeResponse,
        );

        await flushPromises();

        expect(keepWriteChannelOpen).toBe(true);
        expect(storage.writeExtensionStorage).toHaveBeenCalledWith({
            session: {
                token: 'token-2',
            },
        });
        expect(writeResponse).toHaveBeenCalledWith({ ok: true });

        const removeResponse = vi.fn();
        const keepRemoveChannelOpen = messageListener?.(
            { type: 'storage:remove', key: 'session' },
            {} as chrome.runtime.MessageSender,
            removeResponse,
        );

        await flushPromises();

        expect(keepRemoveChannelOpen).toBe(true);
        expect(storage.removeExtensionStorage).toHaveBeenCalledWith('session');
        expect(removeResponse).toHaveBeenCalledWith({ ok: true });
    });

    it('starts video recording through the offscreen recorder bridge', async () => {
        vi.mocked(chromeApi.queryActiveTab).mockResolvedValue({
            id: 19,
            title: 'Checkout failure',
            url: 'https://example.com/checkout',
        } as chrome.tabs.Tab);
        vi.mocked(chromeApi.requestTabMediaStreamId).mockResolvedValue('stream-id-1');
        vi.mocked(chromeApi.startTelemetrySession).mockResolvedValue({
            context: null,
            actions: [],
            logs: [],
            network_requests: [],
        });
        runtimeSendMessage
            .mockResolvedValueOnce({ ok: true })
            .mockResolvedValueOnce({
                ok: true,
                recordingState: {
                    status: 'recording',
                    title: 'Checkout failure',
                },
            });

        await import('./background');

        expect(messageListener).not.toBeNull();

        const sendResponse = vi.fn();
        const keepChannelOpen = messageListener?.(
            { type: 'start-video-recording' },
            {} as chrome.runtime.MessageSender,
            sendResponse,
        );

        await flushPromises();

        expect(keepChannelOpen).toBe(true);
        expect(chromeApi.startTelemetrySession).toHaveBeenCalledWith(19);
        expect(createOffscreenDocument).toHaveBeenCalledWith(
            expect.objectContaining({
                url: 'offscreen.html',
            }),
        );
        expect(chromeApi.requestTabMediaStreamId).toHaveBeenCalledWith(19);
        expect(runtimeSendMessage).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                type: 'offscreen:reset-video-recording',
            }),
        );
        expect(runtimeSendMessage).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                type: 'offscreen:start-video-recording',
                payload: expect.objectContaining({
                    streamId: 'stream-id-1',
                    title: 'Checkout failure',
                }),
            }),
        );
        expect(sendResponse).toHaveBeenCalledWith(
            expect.objectContaining({
                ok: true,
                recordingState: expect.objectContaining({
                    status: 'recording',
                }),
            }),
        );
    });

    it('can start video recording for an explicit tab id from the diagnostics page', async () => {
        vi.mocked(chromeApi.getTab).mockResolvedValue({
            id: 29,
            title: 'Smoke target',
            url: 'http://127.0.0.1:8010/_diagnostics/extension-recorder',
        } as chrome.tabs.Tab);
        vi.mocked(chromeApi.requestTabMediaStreamId).mockResolvedValue('stream-id-explicit');
        vi.mocked(chromeApi.startTelemetrySession).mockResolvedValue({
            context: null,
            actions: [],
            logs: [],
            network_requests: [],
        });
        runtimeSendMessage
            .mockResolvedValueOnce({ ok: true })
            .mockResolvedValueOnce({
                ok: true,
                recordingState: {
                    status: 'recording',
                    title: 'Smoke target',
                },
            });

        await import('./background');

        const sendResponse = vi.fn();
        const keepChannelOpen = messageListener?.(
            { type: 'start-video-recording', tabId: 29 },
            {} as chrome.runtime.MessageSender,
            sendResponse,
        );

        await flushPromises();

        expect(keepChannelOpen).toBe(true);
        expect(chromeApi.getTab).toHaveBeenCalledWith(29);
        expect(chromeApi.queryActiveTab).not.toHaveBeenCalled();
        expect(chromeApi.requestTabMediaStreamId).toHaveBeenCalledWith(29);
        expect(sendResponse).toHaveBeenCalledWith(
            expect.objectContaining({
                ok: true,
                recordingState: expect.objectContaining({
                    status: 'recording',
                }),
            }),
        );
    });

    it('uses the sender tab id when live recording is started from a content script bridge', async () => {
        vi.mocked(chromeApi.getTab).mockResolvedValue({
            id: 31,
            title: 'Bridge target',
            url: 'http://127.0.0.1:8010/_diagnostics/extension-recorder',
        } as chrome.tabs.Tab);
        vi.mocked(chromeApi.requestTabMediaStreamId).mockResolvedValue('stream-id-bridge');
        vi.mocked(chromeApi.startTelemetrySession).mockResolvedValue({
            context: null,
            actions: [],
            logs: [],
            network_requests: [],
        });
        runtimeSendMessage
            .mockResolvedValueOnce({ ok: true })
            .mockResolvedValueOnce({
                ok: true,
                recordingState: {
                    status: 'recording',
                    title: 'Bridge target',
                },
            });

        await import('./background');

        const sendResponse = vi.fn();
        const keepChannelOpen = messageListener?.(
            { type: 'start-video-recording' },
            { tab: { id: 31 } } as chrome.runtime.MessageSender,
            sendResponse,
        );

        await flushPromises();

        expect(keepChannelOpen).toBe(true);
        expect(chromeApi.getTab).toHaveBeenCalledWith(31);
        expect(chromeApi.queryActiveTab).not.toHaveBeenCalled();
        expect(chromeApi.requestTabMediaStreamId).toHaveBeenCalledWith(31);
        expect(sendResponse).toHaveBeenCalledWith(
            expect.objectContaining({
                ok: true,
                recordingState: expect.objectContaining({
                    status: 'recording',
                }),
            }),
        );
    });

    it('returns a guided message when recording is started from the page without priming the tab via popup', async () => {
        vi.mocked(storage.getCaptureAccessGrant).mockResolvedValue(null);
        vi.mocked(chromeApi.getTab).mockResolvedValue({
            id: 31,
            title: 'Bridge target',
            url: 'https://example.com/orders/1',
        } as chrome.tabs.Tab);

        await import('./background');

        const sendResponse = vi.fn();
        const keepChannelOpen = messageListener?.(
            { type: 'start-video-recording' },
            { tab: { id: 31 } } as chrome.runtime.MessageSender,
            sendResponse,
        );

        await flushPromises();

        expect(keepChannelOpen).toBe(true);
        expect(chromeApi.requestTabMediaStreamId).not.toHaveBeenCalled();
        expect(sendResponse).toHaveBeenCalledWith(
            expect.objectContaining({
                ok: false,
                message: expect.stringContaining('Open the Snag extension popup once on this tab'),
            }),
        );
    });

    it('stops video recording through the offscreen recorder bridge', async () => {
        getContexts
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([{}]);
        vi.mocked(storage.getRecordingState).mockResolvedValue({
            status: 'recording',
            tabId: 23,
        });
        vi.mocked(chromeApi.requestTelemetrySnapshot).mockResolvedValue({
            context: {
                url: 'https://example.com/checkout',
                title: 'Checkout failure',
                user_agent: 'Mozilla/5.0',
                platform: 'MacIntel',
                language: 'en-US',
                timezone: 'Europe/Helsinki',
                viewport: { width: 1440, height: 900 },
                screen: { width: 1440, height: 900 },
                referrer: null,
            },
            actions: [{
                type: 'click',
                label: 'Click button',
                selector: '#submit',
                happened_at: '2026-03-31T12:00:01Z',
            }],
            logs: [{
                level: 'error',
                message: 'Checkout exploded.',
                happened_at: '2026-03-31T12:00:02Z',
            }],
            network_requests: [{
                method: 'POST',
                url: 'https://api.example.test/checkout',
                status_code: 500,
                duration_ms: 188,
                happened_at: '2026-03-31T12:00:03Z',
            }],
        });
        vi.mocked(storage.setPendingCapture).mockResolvedValue();
        runtimeSendMessage.mockResolvedValue({
            ok: true,
            capture: {
                kind: 'video',
                blobKey: 'blob-1',
                title: 'Checkout failure',
                url: 'https://example.com/checkout',
                capturedAt: '2026-03-31T12:00:00Z',
                mimeType: 'video/webm',
                byteSize: 128,
                durationSeconds: 12,
                telemetry: null,
            },
        });

        await import('./background');

        const sendResponse = vi.fn();
        const keepChannelOpen = messageListener?.(
            { type: 'stop-video-recording' },
            {} as chrome.runtime.MessageSender,
            sendResponse,
        );

        await flushPromises();

        expect(keepChannelOpen).toBe(true);
        expect(createOffscreenDocument).toHaveBeenCalled();
        expect(runtimeSendMessage).toHaveBeenCalledWith({ type: 'offscreen:stop-video-recording' });
        expect(closeOffscreenDocument).toHaveBeenCalled();
        expect(chromeApi.requestTelemetrySnapshot).toHaveBeenCalledWith(23, true);
        expect(storage.setPendingCapture).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: 'video',
                blobKey: 'blob-1',
                telemetry: expect.objectContaining({
                    actions: [expect.objectContaining({ selector: '#submit' })],
                    logs: [expect.objectContaining({ message: 'Checkout exploded.' })],
                    network_requests: [expect.objectContaining({ url: 'https://api.example.test/checkout' })],
                }),
            }),
        );
        expect(sendResponse).toHaveBeenCalledWith(
            expect.objectContaining({
                ok: true,
                capture: expect.objectContaining({
                    kind: 'video',
                    telemetry: expect.objectContaining({
                        actions: [expect.objectContaining({ selector: '#submit' })],
                        logs: [expect.objectContaining({ message: 'Checkout exploded.' })],
                        network_requests: [expect.objectContaining({ url: 'https://api.example.test/checkout' })],
                    }),
                }),
            }),
        );
    });

    it('clears the pending capture on request', async () => {
        vi.mocked(storage.clearPendingCapture).mockResolvedValue();

        await import('./background');

        const sendResponse = vi.fn();
        const keepChannelOpen = messageListener?.(
            { type: 'discard-pending-capture' },
            {} as chrome.runtime.MessageSender,
            sendResponse,
        );

        await flushPromises();

        expect(keepChannelOpen).toBe(true);
        expect(storage.clearPendingCapture).toHaveBeenCalled();
        expect(sendResponse).toHaveBeenCalledWith({ ok: true });
    });

    it('submits a pending capture through the background worker to avoid page CORS', async () => {
        vi.mocked(storage.getSession).mockResolvedValue({
            apiBaseUrl: 'http://localhost/snag',
            token: 'token-1',
            organizationId: 1,
            organizationSlug: 'acme',
        });
        vi.mocked(storage.getPendingCapture).mockResolvedValue({
            kind: 'screenshot',
            dataUrl: 'data:image/png;base64,Zm9v',
            title: 'Broken modal',
            url: 'https://funpay.com/orders/1',
            capturedAt: '2026-04-01T08:00:00Z',
            telemetry: null,
        });
        vi.mocked(reportSubmit.submitPendingCapture).mockResolvedValue({
            report: {
                id: 42,
                share_url: 'http://localhost/snag/reports/share/abc',
                report_url: 'http://localhost/snag/reports/42',
            },
        } as never);

        await import('./background');

        const sendResponse = vi.fn();
        const keepChannelOpen = messageListener?.(
            {
                type: 'report:submit',
                payload: {
                    summary: 'Modal border is missing.',
                    screenshotOverrideDataUrl: 'data:image/png;base64,ZWQ=',
                    fallbackContext: {
                        url: 'https://funpay.com/orders/1',
                    },
                },
            },
            { tab: { id: 31 } } as chrome.runtime.MessageSender,
            sendResponse,
        );

        await flushPromises();

        expect(keepChannelOpen).toBe(true);
        const submitCall = vi.mocked(reportSubmit.submitPendingCapture).mock.calls[0]?.[0];
        expect(submitCall).toBeDefined();
        expect(submitCall?.session).toEqual(expect.objectContaining({
            apiBaseUrl: 'http://localhost/snag',
        }));
        expect(submitCall?.pendingCapture).toEqual(expect.objectContaining({
            kind: 'screenshot',
            title: 'Broken modal',
        }));
        expect(submitCall?.summary).toBe('Modal border is missing.');
        expect(submitCall?.fallbackContext).toEqual({
            url: 'https://funpay.com/orders/1',
        });
        expect(submitCall?.screenshotOverride).toEqual(expect.objectContaining({
            type: 'image/png',
            size: 2,
        }));
        expect(sendResponse).toHaveBeenCalledWith(
            expect.objectContaining({
                ok: true,
                result: expect.objectContaining({
                    report: expect.objectContaining({
                        share_url: 'http://localhost/snag/reports/share/abc',
                    }),
                }),
            }),
        );
    });

    it('submits an edited screenshot data url through the background worker', async () => {
        vi.mocked(storage.getSession).mockResolvedValue({
            apiBaseUrl: 'http://localhost/snag',
            token: 'token-1',
            organizationId: 1,
            organizationSlug: 'acme',
        });
        vi.mocked(storage.getPendingCapture).mockResolvedValue({
            kind: 'screenshot',
            dataUrl: 'data:image/png;base64,Zm9v',
            title: 'Broken modal',
            url: 'https://funpay.com/orders/1',
            capturedAt: '2026-04-01T08:00:00Z',
            telemetry: null,
        });
        vi.mocked(reportSubmit.submitPendingCapture).mockResolvedValue({
            report: {
                id: 42,
                share_url: 'http://localhost/snag/reports/share/abc',
                report_url: 'http://localhost/snag/reports/42',
            },
        } as never);

        await import('./background');

        const sendResponse = vi.fn();
        const keepChannelOpen = messageListener?.(
            {
                type: 'report:submit',
                payload: {
                    summary: 'Modal border is missing.',
                    screenshotOverrideDataUrl: 'data:image/png;base64,ZWQ=',
                    fallbackContext: {
                        url: 'https://funpay.com/orders/1',
                    },
                },
            },
            { tab: { id: 31 } } as chrome.runtime.MessageSender,
            sendResponse,
        );

        await flushPromises();

        expect(keepChannelOpen).toBe(true);
        const submitCall = vi.mocked(reportSubmit.submitPendingCapture).mock.calls[0]?.[0];
        expect(submitCall).toBeDefined();
        expect(submitCall?.screenshotOverride).toEqual(expect.objectContaining({
            type: 'image/png',
            size: 2,
        }));
        expect(sendResponse).toHaveBeenCalledWith(
            expect.objectContaining({
                ok: true,
            }),
        );
    });

    it('toggles video recording from the keyboard command', async () => {
        vi.mocked(storage.getRecordingState)
            .mockResolvedValueOnce({ status: 'idle' })
            .mockResolvedValueOnce({ status: 'recording', tabId: 23 })
            .mockResolvedValueOnce({ status: 'recording', tabId: 23 });
        vi.mocked(chromeApi.queryActiveTab).mockResolvedValue({
            id: 23,
            title: 'Command recording',
            url: 'https://example.com/settings',
        } as chrome.tabs.Tab);
        vi.mocked(chromeApi.requestTabMediaStreamId).mockResolvedValue('stream-id-2');
        vi.mocked(chromeApi.startTelemetrySession).mockResolvedValue({
            context: null,
            actions: [],
            logs: [],
            network_requests: [],
        });
        vi.mocked(chromeApi.requestTelemetrySnapshot).mockResolvedValue({
            context: null,
            actions: [],
            logs: [],
            network_requests: [],
        });
        runtimeSendMessage
            .mockResolvedValueOnce({ ok: true })
            .mockResolvedValueOnce({ ok: true, recordingState: { status: 'recording' } })
            .mockResolvedValueOnce({ ok: true, capture: { kind: 'video', blobKey: 'blob-2', telemetry: null } });

        await import('./background');

        expect(commandListener).not.toBeNull();

        commandListener?.('toggle-video-recording');
        await flushPromises();
        commandListener?.('toggle-video-recording');
        await flushPromises();

        expect(runtimeSendMessage).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                type: 'offscreen:reset-video-recording',
            }),
        );
        expect(runtimeSendMessage).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                type: 'offscreen:start-video-recording',
            }),
        );
        expect(runtimeSendMessage).toHaveBeenNthCalledWith(3, { type: 'offscreen:stop-video-recording' });
    });
});
