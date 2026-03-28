import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./pending-capture-media', () => ({
    deletePendingCaptureMedia: vi.fn(),
}));

import { getPendingCapture, getSession, setSession } from './storage';

describe('extension storage normalization', () => {
    const localGet = vi.fn<() => Promise<Record<string, unknown>>>();
    const localSet = vi.fn<() => Promise<void>>();
    const sessionGet = vi.fn<() => Promise<Record<string, unknown>>>();
    const runtimeSendMessage = vi.fn<() => Promise<unknown>>();

    beforeEach(() => {
        localGet.mockReset();
        localSet.mockReset();
        sessionGet.mockReset();
        runtimeSendMessage.mockReset();
        vi.stubGlobal('chrome', {
            storage: {
                local: {
                    get: localGet,
                    set: localSet,
                },
                session: {
                    get: sessionGet,
                },
            },
            runtime: {
                id: 'extension-id',
                sendMessage: runtimeSendMessage,
            },
        });
        window.localStorage.clear();
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.unstubAllGlobals();
    });

    it('normalizes legacy screenshot captures that were saved before the kind field existed', async () => {
        localGet.mockResolvedValue({
            pendingCapture: {
                dataUrl: 'data:image/png;base64,Zm9v',
                title: 'Legacy screenshot',
                url: 'https://example.com/orders/1',
                capturedAt: '2026-03-31T12:00:00Z',
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
            capturedAt: '2026-03-31T12:00:00Z',
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
                capturedAt: '2026-03-31T12:00:00Z',
                telemetry: null,
            },
        });

        await expect(getPendingCapture()).resolves.toEqual({
            kind: 'screenshot',
            dataUrl: 'data:image/png;base64,Zm9v',
            title: 'Session screenshot',
            url: 'https://example.com/fallback',
            capturedAt: '2026-03-31T12:00:00Z',
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
                    apiBaseUrl: 'http://192.168.43.122/snag',
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
                },
            },
        });

        await expect(getSession()).resolves.toEqual({
            apiBaseUrl: 'http://192.168.43.122/snag',
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
        expect(runtimeSendMessage).toHaveBeenCalledWith({
            type: 'storage:get',
            key: 'session',
        });
    });

    it('falls back to window localStorage when neither chrome.storage nor runtime proxy is available', async () => {
        vi.unstubAllGlobals();
        window.localStorage.clear();

        await setSession({
            apiBaseUrl: 'http://192.168.43.122/snag',
            token: 'token-2',
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
            apiBaseUrl: 'http://192.168.43.122/snag',
            token: 'token-2',
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
        expect(JSON.parse(window.localStorage.getItem('session') ?? '{}')).toMatchObject({
            apiBaseUrl: 'http://192.168.43.122/snag',
            token: 'token-2',
        });
    });
});
