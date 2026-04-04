import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/vue3', async () => {
    const { defineComponent, h } = await import('vue');

    return {
        Head: defineComponent({
            name: 'HeadStub',
            props: {
                title: {
                    type: String,
                    default: '',
                },
            },
            setup(props) {
                return () => h('div', { 'data-head-title': props.title });
            },
        }),
    };
});

vi.mock('@/Pages/Diagnostics/Partials/AirStorefrontWidgetBridge.vue', async () => {
    const { defineComponent, h } = await import('vue');

    return {
        default: defineComponent({
            name: 'AirStorefrontWidgetBridgeStub',
            props: {
                apiBaseUrl: {
                    type: String,
                    required: true,
                },
                prefillPublicKey: {
                    type: String,
                    default: '',
                },
                siteName: {
                    type: String,
                    default: '',
                },
                pageLabel: {
                    type: String,
                    default: '',
                },
                openSignal: {
                    type: Number,
                    default: 0,
                },
            },
            setup(props) {
                return () => h('div', {
                    'data-testid': 'storefront-widget-bridge',
                    'data-open-signal': String(props.openSignal),
                    'data-site-name': props.siteName,
                    'data-page-label': props.pageLabel,
                });
            },
        }),
    };
});

import CaptureWidget from '@/Pages/Diagnostics/CaptureWidget.vue';

const factory = () => mount(CaptureWidget, {
    props: {
        apiBaseUrl: 'http://localhost/snag',
        docsUrl: 'http://localhost/snag/docs/capture',
        prefillPublicKey: 'ck_airdemo',
    },
});

describe('CaptureWidget diagnostics storefront page', () => {
    it('renders a believable storefront skeleton without external media dependencies', () => {
        const wrapper = factory();

        expect(wrapper.text()).toContain('Air Supply Co.');
        expect(wrapper.text()).toContain('Give All You Need');
        expect(wrapper.text()).toContain('When your home wants a cleaner mood');
        expect(wrapper.text()).toContain('Signature reserve layout for real retail pages');
        expect(wrapper.text()).toContain('Explore our curated categories and transform your living spaces');
        expect(wrapper.text()).toContain('Ready to get our new stuff?');
        expect(wrapper.findAll('img')).toHaveLength(0);
        expect(wrapper.html()).not.toContain('pexels.com');
        expect(wrapper.html()).not.toContain('images.pexels.com');
    });

    it('wires contextual support entry points to the shared widget bridge', async () => {
        const wrapper = factory();

        const readOpenSignal = () => wrapper.get('[data-testid="storefront-widget-bridge"]').attributes('data-open-signal');

        expect(readOpenSignal()).toBe('0');

        await wrapper.get('[data-testid="capture-widget-open"]').trigger('click');
        expect(readOpenSignal()).toBe('1');

        await wrapper.get('[data-testid="search-support"]').trigger('click');
        expect(readOpenSignal()).toBe('2');

        await wrapper.get('[data-testid="banner-support"]').trigger('click');
        expect(readOpenSignal()).toBe('3');

        await wrapper.get('[data-testid="footer-support"]').trigger('click');
        expect(readOpenSignal()).toBe('4');
    });

    it('passes the expected storefront metadata into the shared widget bridge', () => {
        const wrapper = factory();
        const bridge = wrapper.get('[data-testid="storefront-widget-bridge"]');

        expect(bridge.attributes('data-site-name')).toBe('Air Supply Co.');
        expect(bridge.attributes('data-page-label')).toBe('Air Supply storefront');
    });
});
