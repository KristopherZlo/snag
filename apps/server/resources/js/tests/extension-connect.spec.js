import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

globalThis.route = vi.fn((name) => {
    const routes = {
        'settings.extension.connect': '/snag/settings/extension/connect',
        'settings.extension.captures': '/snag/settings/extension/captures',
        'settings.extension.sessions.destroy': '/snag/settings/extension/sessions/41',
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
        router: {
            delete: vi.fn(),
        },
    };
});

import ExtensionConnect from '@/Pages/Extension/Connect.vue';

describe('Extension connect page', () => {
    it('documents where the extension build lives and why one-click install is unavailable', () => {
        const wrapper = mount(ExtensionConnect, {
            props: {
                code: 'ABC123',
                expiresInMinutes: 10,
                tokenExpiresInMinutes: 10080,
                apiBaseUrl: 'http://localhost/snag',
                sessions: [{
                    id: 41,
                    device_name: 'Chrome Recorder',
                    created_at: '2026-04-03T08:00:00.000Z',
                    last_used_at: '2026-04-03T09:00:00.000Z',
                    expires_at: '2026-04-10T09:00:00.000Z',
                }],
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
        expect(wrapper.text()).toContain('Active device sessions');
        expect(wrapper.text()).toContain('Chrome Recorder');
        expect(wrapper.get('[data-testid="connect-step-code-2"]').classes()).toContain('break-all');
        expect(wrapper.get('[data-testid="connect-step-code-5"]').text()).toContain('http://localhost/snag/api/v1/extension/tokens/exchange');
    });
});
