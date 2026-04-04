import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mountWebsiteWidget = vi.hoisted(() => vi.fn());
const runtimeDestroy = vi.hoisted(() => vi.fn());
const runtimeOpenIntro = vi.hoisted(() => vi.fn());

vi.mock('@/embed/runtime/widget-runtime.js', () => ({
    mountWebsiteWidget,
}));

import AirStorefrontWidgetBridge from '@/Pages/Diagnostics/Partials/AirStorefrontWidgetBridge.vue';

describe('Air storefront website widget bridge', () => {
    beforeEach(() => {
        mountWebsiteWidget.mockReset();
        runtimeDestroy.mockReset();
        runtimeOpenIntro.mockReset();
        mountWebsiteWidget.mockReturnValue({
            openIntro: runtimeOpenIntro,
            destroy: runtimeDestroy,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('mounts the shared website widget runtime with the storefront bootstrap payload', () => {
        mount(AirStorefrontWidgetBridge, {
            props: {
                apiBaseUrl: 'http://localhost/snag',
                prefillPublicKey: 'ck_airdemo',
                siteName: 'Air Supply Co.',
                pageLabel: 'Air Supply storefront',
            },
        });

        expect(mountWebsiteWidget).toHaveBeenCalledTimes(1);
        expect(mountWebsiteWidget).toHaveBeenCalledWith(expect.objectContaining({
            baseUrl: 'http://localhost/snag',
            script: expect.objectContaining({
                dataset: expect.objectContaining({
                    snagPublicKey: 'ck_airdemo',
                }),
            }),
            bootstrap: expect.objectContaining({
                widget: expect.objectContaining({
                    public_id: 'ww_air_supply_storefront_demo',
                    status: 'active',
                }),
                capture: expect.objectContaining({
                    public_key: 'ck_airdemo',
                    mode: 'browser',
                    media_kind: 'screenshot',
                }),
                config: expect.objectContaining({
                    launcher: expect.objectContaining({
                        label: 'Report a bug',
                    }),
                    meta: expect.objectContaining({
                        site_label: 'Air Supply storefront',
                        support_team_name: 'Air Supply Co. support',
                    }),
                    theme: expect.objectContaining({
                        accent_color: '#182c45',
                        mode: 'light',
                    }),
                }),
            }),
        }));
    });

    it('falls back to the diagnostics demo key when the page prop is blank', () => {
        mount(AirStorefrontWidgetBridge, {
            props: {
                apiBaseUrl: 'http://localhost/snag',
                prefillPublicKey: '',
            },
        });

        expect(mountWebsiteWidget).toHaveBeenCalledWith(expect.objectContaining({
            script: expect.objectContaining({
                dataset: expect.objectContaining({
                    snagPublicKey: 'ck_wnz6f0axnoqbsz0f0bonhvm3haelxyxl',
                }),
            }),
            bootstrap: expect.objectContaining({
                capture: expect.objectContaining({
                    public_key: 'ck_wnz6f0axnoqbsz0f0bonhvm3haelxyxl',
                }),
            }),
        }));
    });

    it('opens the widget intro when the storefront asks for support', async () => {
        const wrapper = mount(AirStorefrontWidgetBridge, {
            props: {
                apiBaseUrl: 'http://localhost/snag',
                prefillPublicKey: 'ck_airdemo',
                openSignal: 0,
            },
        });

        await wrapper.setProps({
            openSignal: 1,
        });

        expect(runtimeOpenIntro).toHaveBeenCalledTimes(1);
    });

    it('destroys the runtime when the storefront page unmounts', () => {
        const wrapper = mount(AirStorefrontWidgetBridge, {
            props: {
                apiBaseUrl: 'http://localhost/snag',
                prefillPublicKey: 'ck_airdemo',
            },
        });

        wrapper.unmount();

        expect(runtimeDestroy).toHaveBeenCalledTimes(1);
    });
});
