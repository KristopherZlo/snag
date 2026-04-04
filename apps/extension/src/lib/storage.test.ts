import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./pending-capture-media', () => ({
    deletePendingCaptureMedia: vi.fn(),
    clearPendingCaptureMediaStore: vi.fn(),
    pendingCaptureMediaTtlMs: 2 * 60 * 60 * 1000,
}));

import {
    appendOverlayDebugEntry,
    clearSession,
    getOverlayDebugEntries,
    getPendingCapture,
    getSession,
    setSession,
} from './storage';
import { clearPendingCaptureMediaStore, deletePendingCaptureMedia } from './pending-capture-media';

describe('extension storage normalization', () => {
    const storageContextOverrideKey = '__SNAG_EXTENSION_STORAGE_CONTEXT__' as const;
    const localGet = vi.fn<() => Promise<Record<string, unknown>>>();
    const localSet = vi.fn<() => Promise<void>>();
    const localRemove = vi.fn<() => Promise<void>>();
    const sessionGet = vi.fn<() => Promise<Record<string, unknown>>>();
    const sessionSet = vi.fn<() => Promise<void>>();
    const sessionRemove = vi.fn<() => Promise<void>>();
    const runtimeSendMessage = vi.fn<() => Promise<unknown>>();

    beforeEach(() => {
        localGet.mockReset();
        localSet.mockReset();
        localRemove.mockReset();
        sessionGet.mockReset();
        sessionSet.mockReset();
        sessionRemove.mockReset();
        runtimeSendMessage.mockReset();
        localGet.mockResolvedValue({});
        localSet.mockResolvedValue();
        localRemove.mockResolvedValue();
        sessionGet.mockResolvedValue({});
        sessionSet.mockResolvedValue();
        sessionRemove.mockResolvedValue();
        vi.mocked(deletePendingCaptureMedia).mockResolvedValue();
        vi.mocked(clearPendingCaptureMediaStore).mockResolvedValue();
        vi.stubGlobal('chrome', {
            storage: {
                local: {
                    get: localGet,
                    set: localSet,
                    remove: localRemove,
                },
                session: {
                    get: sessionGet,
                    set: sessionSet,
                    remove: sessionRemove,
                },
            },
            runtime: {
                id: 'extension-id',
                sendMessage: runtimeSendMessage,
                getURL: vi.fn((path = '') => `chrome-extension://extension-id/${String(path).replace(/^\/+/, '')}`),
            },
        });
        window.localStorage.clear();
        (globalThis as typeof globalThis & {
            [storageContextOverrideKey]?: 'web-page-content' | 'extension-page';
        })[storageContextOverrideKey] = 'extension-page';
    });

    afterEach(() => {
        vi.clearAllMocks();
        delete (globalThis as typeof globalThis & {
            [storageContextOverrideKey]?: 'web-page-content' | 'extension-page';
        })[storageContextOverrideKey];
        vi.unstubAllGlobals();
    });

    it('normalizes legacy screenshot captures that were saved before the kind field existed', async () => {
        localGet.mockResolvedValue({
            pendingCapture: {
                dataUrl: 'data:image/png;base64,Zm9v',
                title: 'Legacy screenshot',
                url: 'https://example.com/orders/1',
                capturedAt: '2099-03-31T12:00:00Z',
                telemetry: {
                    context: {
                        url: 'https://example.com/orders/1',
                        title: 'Legacy screenshot',
                        user_agent: 'Mozilla/5.0',
                        platform: 'MacIntel',
                        language: 'en-US',
                        timezone: 'Europe/Helsinki',
                        viewport: { width: 1200, height: 800 },
                        screen: { width: 1440, height: 900 },
                        referrer: null,
                    },
                    actions: [],
                    logs: [],
                    network_requests: [],
                },
            },
        });

        await expect(getPendingCapture()).resolves.toEqual({
            kind: 'screenshot',
            dataUrl: 'data:image/png;base64,Zm9v',
            title: 'Legacy screenshot',
            url: 'https://example.com/orders/1',
            capturedAt: '2099-03-31T12:00:00Z',
            telemetry: {
                context: {
                    url: 'https://example.com/orders/1',
                    title: 'Legacy screenshot',
                    user_agent: 'Mozilla/5.0',
                    platform: 'MacIntel',
                    language: 'en-US',
                    timezone: 'Europe/Helsinki',
                    viewport: { width: 1200, height: 800 },
                    screen: { width: 1440, height: 900 },
                    referrer: null,
                    selection: undefined,
                },
                actions: [],
                logs: [],
                network_requests: [],
            },
        });
    });

    it('falls back to session storage when local storage is unavailable', async () => {
        vi.stubGlobal('chrome', {
            storage: {
                session: {
                    get: sessionGet,
                    set: sessionSet,
                    remove: sessionRemove,
                },
            },
            runtime: {
                id: 'extension-id',
                sendMessage: runtimeSendMessage,
            },
        });

        sessionGet.mockResolvedValue({
            pendingCapture: {
                kind: 'screenshot',
                dataUrl: 'data:image/png;base64,Zm9v',
                title: 'Session screenshot',
                url: 'https://example.com/fallback',
                capturedAt: '2099-03-31T12:00:00Z',
                telemetry: null,
            },
        });

        await expect(getPendingCapture()).resolves.toEqual({
            kind: 'screenshot',
            dataUrl: 'data:image/png;base64,Zm9v',
            title: 'Session screenshot',
            url: 'https://example.com/fallback',
            capturedAt: '2099-03-31T12:00:00Z',
            telemetry: null,
        });
    });

    it('proxies storage reads through the background runtime when chrome.storage is unavailable in the popup context', async () => {
        vi.stubGlobal('chrome', {
            runtime: {
                id: 'extension-id',
                sendMessage: runtimeSendMessage,
            },
        });

        runtimeSendMessage.mockResolvedValue({
            ok: true,
            values: {
                session: {
                    apiBaseUrl: 'http://localhost/snag',
                    token: 'token-1',
                    device_name: 'Chrome Recorder',
                    expires_at: '2099-04-10T09:00:00.000Z',
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
                },
            },
        });

        await expect(getSession()).resolves.toEqual({
            apiBaseUrl: 'http://localhost/snag',
            token: 'token-1',
            device_name: 'Chrome Recorder',
            expires_at: '2099-04-10T09:00:00.000Z',
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
        expect(runtimeSendMessage).toHaveBeenCalledWith({
            type: 'storage:get',
            key: 'session',
        });
    });

    it('prefers the runtime proxy when direct storage access is blocked in the content context', async () => {
        (globalThis as typeof globalThis & {
            [storageContextOverrideKey]?: 'web-page-content' | 'extension-page';
        })[storageContextOverrideKey] = 'web-page-content';
        sessionGet.mockRejectedValue(new Error('Access to storage is not allowed from this context.'));
        runtimeSendMessage.mockResolvedValue({
            ok: true,
            values: {
                session: {
                    apiBaseUrl: 'http://localhost/snag',
                    token: 'token-proxy',
                    device_name: 'Proxy Recorder',
                    expires_at: '2099-04-10T09:00:00.000Z',
                    organization: {
                        id: 4,
                        name: 'Proxy Org',
                        slug: 'proxy-org',
                    },
                    user: {
                        id: 8,
                        email: 'proxy@example.test',
                        name: 'Proxy User',
                    },
                },
            },
        });

        await expect(getSession()).resolves.toEqual({
            apiBaseUrl: 'http://localhost/snag',
            token: 'token-proxy',
            device_name: 'Proxy Recorder',
            expires_at: '2099-04-10T09:00:00.000Z',
            organization: {
                id: 4,
                name: 'Proxy Org',
                slug: 'proxy-org',
            },
            user: {
                id: 8,
                email: 'proxy@example.test',
                name: 'Proxy User',
            },
        });

        expect(runtimeSendMessage).toHaveBeenCalledWith({
            type: 'storage:get',
            key: 'session',
        });
        expect(sessionGet).not.toHaveBeenCalled();
    });

    it('does not touch chrome.storage directly on regular web pages when the runtime proxy fails', async () => {
        (globalThis as typeof globalThis & {
            [storageContextOverrideKey]?: 'web-page-content' | 'extension-page';
        })[storageContextOverrideKey] = 'web-page-content';
        runtimeSendMessage.mockRejectedValue(new Error('The message port closed before a response was received.'));
        sessionGet.mockRejectedValue(new Error('Access to storage is not allowed from this context.'));

        await expect(getSession()).resolves.toBeNull();
        expect(runtimeSendMessage).toHaveBeenCalledWith({
            type: 'storage:get',
            key: 'session',
        });
        expect(sessionGet).not.toHaveBeenCalled();
    });

    it('falls back to in-memory storage when neither chrome.storage nor runtime proxy is available', async () => {
        vi.unstubAllGlobals();
        await clearSession();

        await setSession({
            apiBaseUrl: 'http://localhost/snag',
            token: 'token-2',
            device_name: 'Local Recorder',
            expires_at: '2099-04-10T09:00:00.000Z',
            organization: {
                id: 9,
                name: 'Local Org',
                slug: 'local-org',
            },
            user: {
                id: 13,
                email: 'local@test.mail',
                name: 'Local User',
            },
        });

        await expect(getSession()).resolves.toEqual({
            apiBaseUrl: 'http://localhost/snag',
            token: 'token-2',
            device_name: 'Local Recorder',
            expires_at: '2099-04-10T09:00:00.000Z',
            organization: {
                id: 9,
                name: 'Local Org',
                slug: 'local-org',
            },
            user: {
                id: 13,
                email: 'local@test.mail',
                name: 'Local User',
            },
        });
        expect(window.localStorage.getItem('session')).toBeNull();

        await clearSession();
    });

    it('drops expired sessions from extension storage', async () => {
        sessionGet.mockResolvedValue({
            session: {
                apiBaseUrl: 'http://localhost/snag',
                token: 'token-expired',
                device_name: 'Old Recorder',
                expires_at: '2000-04-01T09:00:00.000Z',
                organization: {
                    id: 9,
                    name: 'Local Org',
                    slug: 'local-org',
                },
                user: {
                    id: 13,
                    email: 'local@test.mail',
                    name: 'Local User',
                },
            },
        });

        await expect(getSession()).resolves.toBeNull();
        expect(sessionRemove).toHaveBeenCalledWith('session');
    });

    it('drops insecure remote-http sessions from extension storage', async () => {
        sessionGet.mockResolvedValue({
            session: {
                apiBaseUrl: 'http://example.com/snag',
                token: 'token-insecure',
                device_name: 'Remote Recorder',
                expires_at: '2099-04-10T09:00:00.000Z',
                organization: {
                    id: 9,
                    name: 'Local Org',
                    slug: 'local-org',
                },
                user: {
                    id: 13,
                    email: 'local@test.mail',
                    name: 'Local User',
                },
            },
        });

        await expect(getSession()).resolves.toBeNull();
        expect(sessionRemove).toHaveBeenCalledWith('session');
    });

    it('migrates sensitive values from legacy local storage into session storage', async () => {
        localGet.mockResolvedValue({
            session: {
                apiBaseUrl: 'http://localhost/snag',
                token: 'token-migrated',
                device_name: 'Migrated Recorder',
                expires_at: '2099-04-10T09:00:00.000Z',
                organization: {
                    id: 9,
                    name: 'Local Org',
                    slug: 'local-org',
                },
                user: {
                    id: 13,
                    email: 'local@test.mail',
                    name: 'Local User',
                },
            },
        });

        await expect(getSession()).resolves.toEqual(expect.objectContaining({
            token: 'token-migrated',
        }));
        expect(sessionSet).toHaveBeenCalledWith(expect.objectContaining({
            session: expect.objectContaining({
                token: 'token-migrated',
            }),
        }));
        expect(localRemove).toHaveBeenCalledWith('session');
    });

    it('drops expired pending captures and removes their stored media blob', async () => {
        sessionGet.mockResolvedValue({
            pendingCapture: {
                kind: 'video',
                blobKey: 'expired-blob-1',
                mimeType: 'video/webm',
                byteSize: 12,
                durationSeconds: 3,
                title: 'Expired capture',
                url: 'https://example.com/orders/1',
                capturedAt: '2000-03-31T12:00:00Z',
                telemetry: null,
            },
        });

        await expect(getPendingCapture()).resolves.toBeNull();
        expect(deletePendingCaptureMedia).toHaveBeenCalledWith('expired-blob-1');
        expect(sessionRemove).toHaveBeenCalledWith('pendingCapture');
    });

    it('clears session-scoped state and pending capture media on disconnect', async () => {
        sessionGet.mockImplementation(async (key?: string) => {
            if (key === 'pendingCapture') {
                return {
                    pendingCapture: {
                        kind: 'video',
                        blobKey: 'video-blob-1',
                        mimeType: 'video/webm',
                        byteSize: 12,
                        durationSeconds: 3,
                        title: 'Video capture',
                        url: 'https://example.com/orders/1',
                        capturedAt: '2099-03-31T12:00:00Z',
                        telemetry: null,
                    },
                };
            }

            return {};
        });

        await clearSession();

        expect(sessionRemove).toHaveBeenCalledWith('session');
        expect(sessionRemove).toHaveBeenCalledWith('pendingCapture');
        expect(sessionRemove).toHaveBeenCalledWith('captureAccessGrants');
        expect(sessionRemove).toHaveBeenCalledWith('overlayDebugEntries');
        expect(sessionSet).toHaveBeenCalledWith({
            recordingState: {
                status: 'idle',
            },
        });
        expect(deletePendingCaptureMedia).toHaveBeenCalledWith('video-blob-1');
        expect(clearPendingCaptureMediaStore).toHaveBeenCalled();
    });

    it('stores and normalizes overlay debug entries', async () => {
        sessionGet
            .mockResolvedValueOnce({
                overlayDebugEntries: [{
                    event: 'overlay:mounted',
                    level: 'info',
                    source: 'content',
                    url: 'https://example.com/orders/1',
                    payload: {
                        host: true,
                    },
                }],
            })
            .mockResolvedValueOnce({
                overlayDebugEntries: [{
                    event: 'overlay:mounted',
                    level: 'info',
                    source: 'content',
                    url: 'https://example.com/orders/1',
                    payload: {
                        host: true,
                    },
                }],
            });

        await expect(getOverlayDebugEntries()).resolves.toEqual([
            expect.objectContaining({
                event: 'overlay:mounted',
                level: 'info',
                source: 'content',
                url: 'https://example.com/orders/1',
            }),
        ]);

        await appendOverlayDebugEntry({
            source: 'popup',
            level: 'error',
            event: 'overlay:snapshot-failed',
            url: 'https://example.com/orders/1',
            tabId: 41,
            payload: {
                reason: 'No content-script response.',
            },
        });

        expect(sessionSet).toHaveBeenCalledWith(expect.objectContaining({
            overlayDebugEntries: expect.arrayContaining([
                expect.objectContaining({
                    event: 'overlay:snapshot-failed',
                    level: 'error',
                    source: 'popup',
                    tabId: 41,
                }),
            ]),
        }));
    });
});
