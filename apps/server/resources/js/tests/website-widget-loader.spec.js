import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetSharedWebsiteWidgetTelemetryRecorderForTests } from '../embed/runtime/widget-telemetry-runtime.js';

describe('website widget loader', () => {
    beforeEach(() => {
        vi.resetModules();
        document.body.innerHTML = '';
        window.SnagWebsiteWidget = undefined;
    });

    afterEach(() => {
        resetSharedWebsiteWidgetTelemetryRecorderForTests();
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

    it('applies explicit user context from the script tag and public API', async () => {
        const payload = {
            widget: { public_id: 'ww_test', name: 'Widget', status: 'active' },
            capture: { public_key: 'ck_test', mode: 'browser', media_kind: 'screenshot' },
            runtime: { position: 'bottom-right', screenshot_only: true, reopen_intro: false },
            config: { launcher: { label: 'Report a bug' }, meta: { site_label: 'Checkout' } },
        };

        window.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => payload,
        });

        const module = await import('../embed/widget.js');
        const script = document.createElement('script');
        script.src = 'https://snag.example.com/embed/widget.js';
        script.dataset.snagWidget = 'ww_test';
        script.dataset.snagBaseUrl = 'https://snag.example.com/snag';
        script.dataset.snagUser = JSON.stringify({
            id: 'usr_script',
            email: 'script@example.com',
        });
        document.body.appendChild(script);

        await module.bootstrapScript(script);

        expect(script._snagWidgetRuntime.debuggerPayload().meta.user).toEqual({
            id: 'usr_script',
            email: 'script@example.com',
        });

        module.setUserContext('ww_test', {
            name: 'Jane Customer',
            account_name: 'Acme Corp',
        });

        expect(script._snagWidgetRuntime.debuggerPayload().meta.user).toEqual({
            id: 'usr_script',
            email: 'script@example.com',
            name: 'Jane Customer',
            account_name: 'Acme Corp',
        });
    });
});
