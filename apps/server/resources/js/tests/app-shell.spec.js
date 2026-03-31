import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const inertiaRouter = vi.hoisted(() => ({
    get: vi.fn(),
}));

const pageState = vi.hoisted(() => ({
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
        usePage: () => pageState,
        router: inertiaRouter,
    };
});

import AppShell from '@/Layouts/AppShell.vue';

const routes = {
    dashboard: '/snag/dashboard',
    'bugs.index': '/snag/bugs',
    'settings.integrations': '/snag/settings/integrations',
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
        pageState.props = {
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
        };
        window.localStorage.clear();
        document.documentElement.classList.remove('dark');
        delete document.documentElement.dataset.theme;
        document.documentElement.style.colorScheme = '';
    });

    it('renders navigation against the routed base path and highlights the active item', () => {
        const route = createRouteMock('settings.members');
        globalThis.route = route;
        pageState.props.flash = {
            status: 'Saved.',
        };

        const wrapper = mount(AppShell, {
            props: {
                title: 'Settings',
                description: 'Manage organization settings.',
            },
            slots: {
                default: '<div class="page-content">Settings content</div>',
            },
        });

        const links = wrapper.find('[data-testid="workspace-sidebar"]').findAll('nav a');

        expect(links.map((link) => link.attributes('href'))).toEqual([
            '/snag/dashboard',
            '/snag/bugs',
            '/snag/settings/members',
            '/snag/settings/capture-keys',
            '/snag/settings/billing',
            '/snag/settings/integrations',
            '/snag/settings/extension/connect',
        ]);

        expect(links[2].attributes('aria-current')).toBe('page');
        expect(wrapper.text()).toContain('Acme QA');
        expect(wrapper.get('[data-testid="workspace-sidebar-user-menu"]').text()).toContain('owner@example.com');
        expect(wrapper.get('[data-testid="workspace-sidebar"]').classes()).toEqual(
            expect.arrayContaining(['lg:sticky', 'lg:top-0', 'lg:h-screen']),
        );
        expect(wrapper.text()).toContain('Saved.');
    });

    it('auto-dismisses flash status messages after a short delay', async () => {
        vi.useFakeTimers();
        globalThis.route = createRouteMock('dashboard');
        pageState.props.flash = {
            status: 'Capture discarded.',
        };

        const wrapper = mount(AppShell, {
            props: {
                title: 'Dashboard',
                description: 'Active queue',
            },
            slots: {
                default: '<div>Queue</div>',
            },
        });

        expect(wrapper.get('[data-testid=\"app-shell-flash-status\"]').text()).toContain('Capture discarded.');

        await vi.advanceTimersByTimeAsync(5000);

        expect(wrapper.find('[data-testid=\"app-shell-flash-status\"]').exists()).toBe(false);
        vi.useRealTimers();
    });

    it('routes quick jump searches back to the dashboard query flow', async () => {
        globalThis.route = createRouteMock('dashboard');

        const wrapper = mount(AppShell, {
            props: {
                title: 'Dashboard',
                description: 'Active queue',
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

    it('opens the sidebar account menu and toggles the dark theme', async () => {
        globalThis.route = createRouteMock('dashboard');

        const wrapper = mount(AppShell, {
            props: {
                title: 'Dashboard',
                description: 'Active queue',
            },
            slots: {
                default: '<div>Queue</div>',
            },
            attachTo: document.body,
        });

        await wrapper.get('[data-testid="workspace-sidebar-user-menu"] [data-testid="workspace-account-menu-trigger"]').trigger('click');

        expect(document.body.textContent).toContain('Profile settings');

        await wrapper.get('[data-testid="workspace-theme-switch"]').trigger('click');

        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(window.localStorage.getItem('snag-theme')).toBe('dark');

        wrapper.unmount();
    });

    it('collapses the desktop sidebar and persists the compact navigation state', async () => {
        globalThis.route = createRouteMock('dashboard');

        const wrapper = mount(AppShell, {
            props: {
                title: 'Dashboard',
                description: 'Active queue',
            },
            slots: {
                default: '<div>Queue</div>',
            },
        });

        await wrapper.get('[data-testid="workspace-sidebar-toggle"]').trigger('click');

        expect(wrapper.get('[data-testid="workspace-sidebar"]').classes()).toContain('w-16');
        expect(window.localStorage.getItem('snag-sidebar-collapsed')).toBe('true');
        expect(wrapper.find('[data-testid="active-organization-name"]').exists()).toBe(false);
        expect(wrapper.get('[data-testid="workspace-sidebar-user-menu"]').text()).not.toContain('owner@example.com');
        expect(wrapper.find('a[title="Reports"]').exists()).toBe(true);
    });
});
