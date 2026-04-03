import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('website widget loader', () => {
    beforeEach(() => {
        vi.resetModules();
        document.body.innerHTML = '';
        window.SnagWebsiteWidget = undefined;
    });

    afterEach(() => {
        vi.restoreAllMocks();
        document.body.innerHTML = '';
        window.SnagWebsiteWidget = undefined;
    });

    it('builds the bootstrap url from the script base url and caches the payload on the script tag', async () => {
        const payload = {
            widget: { public_id: 'ww_test', name: 'Widget', status: 'active' },
            capture: { public_key: 'ck_test', mode: 'browser', media_kind: 'screenshot' },
            runtime: { position: 'bottom-right', screenshot_only: true, reopen_intro: false },
            config: { launcher: { label: 'Report a bug' } },
        };

        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => payload,
        });

        window.fetch = fetchMock;

        const module = await import('../embed/widget.js');
        const script = document.createElement('script');
        script.src = 'https://snag.example.com/embed/widget.js';
        script.dataset.snagWidget = 'ww_test';
        script.dataset.snagBaseUrl = 'https://snag.example.com/snag';
        document.body.appendChild(script);
        const bootstrapEvent = vi.fn();
        script.addEventListener('snag:widget-bootstrap', bootstrapEvent);

        const bootstrap = await module.bootstrapScript(script);

        expect(module.buildBootstrapUrl('https://snag.example.com/snag', 'ww_test')).toBe(
            'https://snag.example.com/snag/api/v1/public/widgets/ww_test/bootstrap',
        );
        expect(fetchMock).toHaveBeenCalledWith(
            'https://snag.example.com/snag/api/v1/public/widgets/ww_test/bootstrap',
            expect.objectContaining({
                headers: {
                    Accept: 'application/json',
                },
            }),
        );
        expect(bootstrap).toEqual(payload);
        expect(script._snagWidgetBootstrap).toEqual(payload);
        expect(script._snagWidgetRuntime).toBeTruthy();
        expect(bootstrapEvent).toHaveBeenCalledTimes(1);
    });
});
