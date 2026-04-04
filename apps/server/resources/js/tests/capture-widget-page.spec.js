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
        expect(wrapper.text()).toContain('A quieter room, a cleaner ritual');
        expect(wrapper.text()).toContain('Signature reserve layout with editorial breathing room');
        expect(wrapper.text()).toContain('Explore our curated categories and transform your living spaces');
        expect(wrapper.text()).toContain('Ready to get our new stuff?');
        expect(wrapper.findAll('img')).toHaveLength(0);
        expect(wrapper.html()).not.toContain('pexels.com');
        expect(wrapper.html()).not.toContain('images.pexels.com');
    });

    it('keeps the storefront free from inline widget demo ctas', () => {
        const wrapper = factory();

        expect(wrapper.text()).not.toContain('Report a bug');
        expect(wrapper.find('[data-testid="capture-widget-open"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="search-support"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="banner-support"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="footer-support"]').exists()).toBe(false);
        expect(wrapper.get('[data-testid="storefront-widget-bridge"]').attributes('data-open-signal')).toBe('0');
    });

    it('passes the expected storefront metadata into the shared widget bridge', () => {
        const wrapper = factory();
        const bridge = wrapper.get('[data-testid="storefront-widget-bridge"]');

        expect(bridge.attributes('data-site-name')).toBe('Air Supply Co.');
        expect(bridge.attributes('data-page-label')).toBe('Air Supply storefront');
    });
});
