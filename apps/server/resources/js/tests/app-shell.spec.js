import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const inertiaRouter = vi.hoisted(() => ({
    get: vi.fn(),
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
    'profile.edit': '/snag/profile',
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
        inertiaRouter.get.mockReset();
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
                                    name: 'Owner User',
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

        const links = wrapper.find('.workspace-sidebar').findAll('a');

        expect(links.map((link) => link.attributes('href'))).toEqual([
            '/snag/dashboard',
            '/snag/settings/members',
            '/snag/settings/capture-keys',
            '/snag/settings/billing',
            '/snag/settings/extension/connect',
            '/snag/profile',
        ]);

        expect(links[1].classes()).toContain('is-active');
        expect(wrapper.text()).toContain('Acme QA');
        expect(wrapper.text()).toContain('owner@example.com');
        expect(wrapper.text()).toContain('Profile');
        expect(wrapper.text()).toContain('Saved.');
    });

    it('routes quick jump searches back to the dashboard query flow', async () => {
        globalThis.route = createRouteMock('dashboard');

        const wrapper = mount(AppShell, {
            props: {
                title: 'Dashboard',
                description: 'Active queue',
            },
            global: {
                mocks: {
                    $page: {
                        props: {
                            auth: {
                                user: {
                                    name: 'Owner User',
                                    email: 'owner@example.com',
                                },
                            },
                            organization: {
                                name: 'Acme QA',
                            },
                            flash: {},
                        },
                    },
                },
            },
            slots: {
                default: '<div>Queue</div>',
            },
        });

        await wrapper.find('input[placeholder="Quick jump to a report"]').setValue('checkout');
        await wrapper.find('input[placeholder="Quick jump to a report"]').trigger('keydown.enter');

        expect(inertiaRouter.get).toHaveBeenCalledWith(
            '/snag/dashboard',
            { search: 'checkout' },
            {
                preserveScroll: false,
                preserveState: false,
            },
        );
    });
});
