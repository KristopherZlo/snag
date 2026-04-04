import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createAppMock = vi.fn();

vi.mock('vue', () => ({
    createApp: createAppMock,
}));

vi.mock('./components/ContentRecorderApp.vue', () => ({
    default: {},
}));

vi.mock('./lib/storage', () => ({
    appendOverlayDebugEntry: vi.fn().mockResolvedValue(undefined),
    getOverlayDebugEntries: vi.fn().mockResolvedValue([]),
    getPendingCapture: vi.fn().mockResolvedValue(null),
    getRecordingState: vi.fn().mockResolvedValue({ status: 'idle' }),
    getReportingEnabled: vi.fn().mockResolvedValue(false),
    getSession: vi.fn().mockResolvedValue(null),
}));

describe('content runtime bootstrap', () => {
    const addMessageListener = vi.fn();

    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        document.documentElement.innerHTML = '<body><main>Test page</main></body>';

        createAppMock.mockReturnValue({
            config: {},
            mount: () => {
                throw new Error('Mount exploded');
            },
        });

        vi.stubGlobal('chrome', {
            runtime: {
                getURL: vi.fn((value: string) => `chrome-extension://test/${value}`),
                onMessage: {
                    addListener: addMessageListener,
                },
            },
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('keeps the content script message bridge alive when overlay mount fails', async () => {
        await expect(import('./content')).resolves.toBeDefined();

        expect(addMessageListener).toHaveBeenCalledTimes(1);
        expect(document.getElementById('snag-extension-overlay-host')).not.toBeNull();
    });
});
