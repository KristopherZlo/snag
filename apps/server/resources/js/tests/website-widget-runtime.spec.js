import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mountWebsiteWidget } from '../embed/runtime/widget-runtime.js';

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
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('shows the launcher, opens the intro modal, and arms the capture button after continue', async () => {
        const script = document.createElement('script');
        document.body.appendChild(script);

        const runtime = mountWebsiteWidget({
            script,
            bootstrap: createBootstrap(),
            baseUrl: 'https://snag.example.test',
        });

        const root = runtime.host.shadowRoot;

        expect(root.textContent).toContain('Report a bug');
        expect(root.querySelector('.snag-widget-launcher')).toBeTruthy();

        root.querySelector('[data-action="open-intro"]').click();
        await Promise.resolve();

        expect(root.textContent).toContain('Found something broken?');
        expect(root.textContent).toContain('We can send a screenshot of this page to our support team.');

        root.querySelector('[data-action="continue-intro"]').click();
        await Promise.resolve();

        expect(root.querySelector('.snag-widget-launcher')).toBeFalsy();
        expect(root.querySelector('.snag-widget-capture')).toBeTruthy();
        expect(root.textContent).toContain('Click the camera to take a screenshot of this page.');
    });
});
