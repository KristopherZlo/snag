import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

globalThis.route = vi.fn((name) => {
    const routes = {
        'settings.extension.connect': '/snag/settings/extension/connect',
        'settings.extension.captures': '/snag/settings/extension/captures',
    };

    return routes[name];
});

vi.mock('@inertiajs/vue3', async () => {
    const { defineComponent, h } = await import('vue');

    return {
        Head: defineComponent({
            name: 'HeadStub',
            setup() {
                return () => h('div');
            },
        }),
        Link: defineComponent({
            name: 'LinkStub',
            props: {
                href: {
                    type: String,
                    required: true,
                },
            },
            setup(props, { slots, attrs }) {
                return () => h('a', { href: props.href, ...attrs }, slots.default?.());
            },
        }),
    };
});

import ExtensionConnect from '@/Pages/Extension/Connect.vue';

describe('Extension connect page', () => {
    it('documents where the extension build lives and why one-click install is unavailable', () => {
        const wrapper = mount(ExtensionConnect, {
            props: {
                code: 'ABC123',
                expiresInMinutes: 10,
                apiBaseUrl: 'http://localhost/snag',
            },
            global: {
                stubs: {
                    AppShell: {
                        template: '<div><slot /><slot name="aside" /></div>',
                    },
                },
            },
        });

        expect(wrapper.text()).toContain('apps/extension/dist');
        expect(wrapper.text()).toContain('chrome://extensions');
        expect(wrapper.text()).toContain('One-click install is not available');
        expect(wrapper.text()).toContain('pnpm --dir apps/extension build');
        expect(wrapper.text()).toContain('http://localhost/snag');
        expect(wrapper.text()).toContain('http://localhost/snag/api/v1/extension/tokens/exchange');
        expect(wrapper.text()).toContain('Capture keys are not part of this flow');
    });
});
