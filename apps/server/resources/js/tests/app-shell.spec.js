import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const inertiaRouter = vi.hoisted(() => ({
    reload: vi.fn(),
}));

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
        router: inertiaRouter,
    };
});

import AppShell from '@/Layouts/AppShell.vue';

const routes = {
    dashboard: '/snag/dashboard',
    'settings.members': '/snag/settings/members',
    'settings.billing': '/snag/settings/billing',
    'settings.capture-keys': '/snag/settings/capture-keys',
    'settings.extension.connect': '/snag/settings/extension/connect',
};

const createRouteMock = (currentRoute = 'dashboard') =>
    vi.fn((name) => {
        if (typeof name === 'undefined') {
            return {
                current: (candidate) => candidate === currentRoute,
            };
        }

        return routes[name];
    });

describe('AppShell', () => {
    beforeEach(() => {
        inertiaRouter.reload.mockReset();
    });

    it('renders navigation against the routed base path and highlights the active item', () => {
        const route = createRouteMock('settings.members');
        globalThis.route = route;

        const wrapper = mount(AppShell, {
            props: {
                title: 'Settings',
                description: 'Manage organization settings.',
            },
            global: {
                mocks: {
                    $page: {
                        props: {
                            auth: {
                                user: {
                                    email: 'owner@example.com',
                                },
                            },
                            organization: {
                                name: 'Acme QA',
                            },
                            flash: {
                                status: 'Saved.',
                            },
                        },
                    },
                },
            },
            slots: {
                default: '<div class="page-content">Settings content</div>',
            },
        });

        const links = wrapper.findAll('a');

        expect(links.map((link) => link.attributes('href'))).toEqual([
            '/snag/dashboard',
            '/snag/settings/members',
            '/snag/settings/billing',
            '/snag/settings/capture-keys',
            '/snag/settings/extension/connect',
        ]);

        expect(links[1].classes()).toContain('is-active');
        expect(wrapper.text()).toContain('Acme QA');
        expect(wrapper.text()).toContain('owner@example.com');
        expect(wrapper.text()).toContain('Saved.');
    });
});
