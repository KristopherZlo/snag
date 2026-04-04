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
        theme: {
            accent_color: '#d97706',
            mode: 'auto',
            offset_x: 20,
            offset_y: 20,
            icon_style: 'camera',
        },
    },
});

describe('website widget runtime', () => {
    beforeEach(() => {
        document.body.innerHTML = '';

        if (typeof URL.createObjectURL !== 'function') {
            URL.createObjectURL = vi.fn(() => 'blob:widget-runtime-preview');
        } else {
            vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:widget-runtime-preview');
        }

        if (typeof URL.revokeObjectURL !== 'function') {
            URL.revokeObjectURL = vi.fn();
        } else {
            vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
        }
    });

    afterEach(() => {
        resetSharedWebsiteWidgetTelemetryRecorderForTests();
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it('shows the launcher, captures immediately, and opens the editor review modal', async () => {
        const script = document.createElement('script');
        document.body.appendChild(script);
        const captureScreenshot = vi.fn().mockResolvedValue(new Blob(['png'], { type: 'image/png' }));

        const runtime = mountWebsiteWidget({
            script,
            bootstrap: createBootstrap(),
            baseUrl: 'https://snag.example.test',
            captureScreenshot,
        });

        const root = runtime.host.shadowRoot;

        expect(root.textContent).toContain('Report a bug');
        expect(root.querySelector('.snag-widget-launcher')).toBeTruthy();

        root.querySelector('[data-action="launch-capture"]').click();
        await Promise.resolve();
        await Promise.resolve();
        await vi.waitFor(() => {
            expect(root.querySelector('.snag-widget-title')?.textContent).toContain('Screenshot ready');
        });

        expect(captureScreenshot).toHaveBeenCalledWith({
            excludeElement: runtime.host,
        });
        expect(root.querySelector('.snag-widget-launcher')).toBeTruthy();
        expect(root.querySelector('[data-editor-frame]')).toBeTruthy();
        expect(root.querySelector('[data-action="editor-tool"][data-editor-tool="arrow"]')).toBeTruthy();
        expect(root.querySelector('[data-action="continue-review"]')?.textContent).toContain('Continue');
    });
});
