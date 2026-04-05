import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/vue3', async () => {
    const { defineComponent, h } = await import('vue');

    return {
        Link: defineComponent({
            name: 'LinkStub',
            props: {
                href: {
                    type: String,
                    required: true,
                },
                method: {
                    type: String,
                    required: false,
                },
                as: {
                    type: String,
                    required: false,
                },
            },
            setup(props, { slots, attrs }) {
                return () =>
                    h(
                        props.as === 'button' ? 'button' : 'a',
                        {
                            href: props.href,
                            'data-method': props.method,
                            ...attrs,
                        },
                        slots.default?.(),
                    );
            },
        }),
    };
});

vi.mock('@/lib/theme', () => ({
    useThemePreference: () => ({
        isDarkTheme: { value: false },
        setTheme: vi.fn(),
    }),
}));

import WorkspaceAccountMenu from '@/Shared/WorkspaceAccountMenu.vue';

const routes = {
    'profile.edit': '/snag/profile',
    logout: '/snag/logout',
};

const createRouteMock = () =>
    vi.fn((name) => {
        if (typeof name === 'undefined') {
            return {
                current: () => false,
            };
        }

        return routes[name];
    });

describe('Workspace account menu', () => {
    beforeEach(() => {
        globalThis.route = createRouteMock();
    });

    it('renders profile and logout actions in the dropdown menu', () => {
        const wrapper = mount(WorkspaceAccountMenu, {
            props: {
                initial: 'A',
                name: 'Account Owner',
                email: 'owner@example.com',
            },
            global: {
                stubs: {
                    DropdownMenu: { template: '<div><slot /></div>' },
                    DropdownMenuTrigger: { template: '<div><slot /></div>' },
                    DropdownMenuContent: { template: '<div><slot /></div>' },
                    DropdownMenuItem: { template: '<div><slot /></div>' },
                    DropdownMenuLabel: { template: '<div><slot /></div>' },
                    DropdownMenuSeparator: { template: '<div />' },
                    Avatar: { template: '<div><slot /></div>' },
                    AvatarFallback: { template: '<div><slot /></div>' },
                    Switch: { template: '<button type="button" />' },
                },
            },
        });

        expect(wrapper.text()).toContain('Profile settings');
        expect(wrapper.text()).toContain('Log out');

        const logoutButton = wrapper.get('button[data-method="post"]');
        expect(logoutButton.attributes('href')).toBe('/snag/logout');
        expect(logoutButton.text()).toContain('Log out');
    });
});
