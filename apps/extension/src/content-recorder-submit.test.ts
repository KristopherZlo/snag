import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h } from 'vue';
import * as storage from './lib/storage';
import * as chromeHelpers from './lib/chrome';

const exportedBlob = new Blob(['edited-screenshot'], { type: 'image/png' });

vi.mock('./components/ContentScreenshotEditor.vue', () => ({
    default: defineComponent({
        name: 'MockContentScreenshotEditor',
        setup(_props, { expose }) {
            expose({
                exportBlob: vi.fn().mockResolvedValue(exportedBlob),
            });

            return () => h('div', { 'data-testid': 'mock-screenshot-editor' }, 'editor');
        },
    }),
}));

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

describe('content recorder submit flow', () => {
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

        vi.mocked(storage.getSession).mockResolvedValue(connectedSession());
        vi.mocked(storage.getReportingEnabled).mockResolvedValue(true);
        vi.mocked(storage.getPendingCapture).mockResolvedValue(null);
        vi.mocked(storage.getRecordingState).mockResolvedValue({ status: 'idle' });
        vi.mocked(storage.clearSession).mockResolvedValue();
        vi.mocked(chromeHelpers.sendRuntimeMessage).mockImplementation(async (message: { type: string; payload?: Record<string, unknown> }) => {
            if (message.type === 'capture-current-tab') {
                return {
                    ok: true,
                    capture: {
                        kind: 'screenshot',
                        dataUrl: 'data:image/png;base64,Zm9v',
                        title: 'Broken modal',
                        url: 'https://github.com/openai/openai',
                        capturedAt: '2026-04-04T20:00:00.000Z',
                        telemetry: null,
                    },
                };
            }

            if (message.type === 'report:submit') {
                return {
                    ok: true,
                    result: {
                        report: {
                            report_url: 'http://localhost/snag/reports/42',
                        },
                    },
                };
            }

            if (message.type === 'discard-pending-capture') {
                return { ok: true };
            }

            return { ok: true };
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('submits the edited screenshot blob instead of the original image', async () => {
        const { default: ContentRecorderApp } = await import('./components/ContentRecorderApp.vue');
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

        const continueButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Continue'));
        expect(continueButton).toBeDefined();
        continueButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await flushUi();

        const sendButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Send feedback'));
        expect(sendButton).toBeDefined();
        sendButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await flushUi();

        expect(chromeHelpers.sendRuntimeMessage).toHaveBeenCalledWith(expect.objectContaining({
            type: 'report:submit',
            payload: expect.objectContaining({
                screenshotOverrideDataUrl: expect.stringMatching(/^data:image\/png;base64,/),
            }),
        }));
    });
});
