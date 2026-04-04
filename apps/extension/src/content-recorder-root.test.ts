import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from 'vue';
import ContentRecorderApp from './components/ContentRecorderApp.vue';
import * as storage from './lib/storage';
import * as chromeHelpers from './lib/chrome';
import * as pendingCaptureMedia from './lib/pending-capture-media';

vi.mock('./lib/storage', () => ({
    clearSession: vi.fn(),
    getPendingCapture: vi.fn(),
    getRecordingState: vi.fn(),
    getReportingEnabled: vi.fn(),
    getSession: vi.fn(),
}));

vi.mock('./lib/chrome', () => ({
    sendRuntimeMessage: vi.fn(),
}));

vi.mock('./lib/pending-capture-media', () => ({
    deletePendingCaptureMedia: vi.fn(),
    writePendingCaptureMedia: vi.fn(),
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

function connectedSession() {
    return {
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
    };
}

describe('content recorder overlay', () => {
    const addStorageListener = vi.fn();
    const removeStorageListener = vi.fn();

    beforeEach(() => {
        vi.resetAllMocks();
        document.body.innerHTML = '<div id="app"></div>';
        document.documentElement.innerHTML = '<body><div id="app"></div></body>';
        vi.stubGlobal('chrome', {
            storage: {
                onChanged: {
                    addListener: addStorageListener,
                    removeListener: removeStorageListener,
                },
            },
        });

        vi.mocked(storage.getSession).mockResolvedValue(null);
        vi.mocked(storage.getReportingEnabled).mockResolvedValue(false);
        vi.mocked(storage.getPendingCapture).mockResolvedValue(null);
        vi.mocked(storage.getRecordingState).mockResolvedValue({ status: 'idle' });
        vi.mocked(storage.clearSession).mockResolvedValue();
        vi.mocked(chromeHelpers.sendRuntimeMessage).mockResolvedValue({ ok: true });
        vi.mocked(pendingCaptureMedia.writePendingCaptureMedia).mockResolvedValue('blob-key');
        vi.mocked(pendingCaptureMedia.deletePendingCaptureMedia).mockResolvedValue();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('renders the floating recorder when mounted with a connected reporting session', async () => {
        vi.mocked(storage.getSession).mockResolvedValue(connectedSession());
        vi.mocked(storage.getReportingEnabled).mockResolvedValue(true);

        const target = document.getElementById('app');
        expect(target).not.toBeNull();

        createApp(ContentRecorderApp).mount(target as HTMLElement);
        await flushUi();

        expect(document.querySelector('[data-testid="content-recorder-floating"]')).not.toBeNull();
        expect(document.querySelector('[data-testid="content-recorder-toggle"]')).not.toBeNull();
        const screenshotButton = document.querySelector('[data-testid="content-recorder-screenshot"]');
        expect(screenshotButton).not.toBeNull();
        expect(screenshotButton?.className).not.toContain('is-visible');

        const fabAnchor = document.querySelector('.snag-extension-fab-anchor');
        expect(fabAnchor).not.toBeNull();

        fabAnchor?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        await flushUi();

        expect(screenshotButton?.className).toContain('is-visible');
    });

    it('refreshes a mounted overlay into the visible state when reporting is enabled later', async () => {
        let reportingEnabled = false;
        vi.mocked(storage.getSession).mockResolvedValue(connectedSession());
        vi.mocked(storage.getReportingEnabled).mockImplementation(async () => reportingEnabled);

        const target = document.getElementById('app');
        expect(target).not.toBeNull();

        createApp(ContentRecorderApp).mount(target as HTMLElement);
        await flushUi();

        expect(document.querySelector('[data-testid="content-recorder-floating"]')).toBeNull();

        reportingEnabled = true;
        window.dispatchEvent(new CustomEvent('snag:overlay-refresh-state'));
        await flushUi();

        expect(document.querySelector('[data-testid="content-recorder-floating"]')).not.toBeNull();
        expect(document.querySelector('[data-testid="content-recorder-toggle"]')).not.toBeNull();
    });

    it('allows dismissing overlay notifications', async () => {
        vi.mocked(storage.getSession).mockResolvedValue(connectedSession());
        vi.mocked(storage.getReportingEnabled).mockResolvedValue(true);
        vi.mocked(chromeHelpers.sendRuntimeMessage).mockRejectedValue(new Error('Unable to capture the current tab.'));

        const target = document.getElementById('app');
        expect(target).not.toBeNull();

        createApp(ContentRecorderApp).mount(target as HTMLElement);
        await flushUi();

        const fabAnchor = document.querySelector('.snag-extension-fab-anchor');
        expect(fabAnchor).not.toBeNull();

        fabAnchor?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        await flushUi();

        const screenshotButton = document.querySelector('[data-testid="content-recorder-screenshot"]') as HTMLButtonElement | null;
        expect(screenshotButton).not.toBeNull();

        screenshotButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await flushUi();

        expect(document.querySelector('[data-testid="content-recorder-status"]')).not.toBeNull();

        const dismissButton = document.querySelector('[data-testid="content-recorder-status-dismiss"]') as HTMLButtonElement | null;
        expect(dismissButton).not.toBeNull();

        dismissButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await flushUi();

        expect(document.querySelector('[data-testid="content-recorder-status"]')).toBeNull();
    });
});
