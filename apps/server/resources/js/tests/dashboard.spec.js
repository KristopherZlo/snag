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
        usePage: () => ({
            props: {
                auth: {
                    user: {
                        name: 'Owner User',
                        email: 'owner@example.com',
                    },
                },
            },
        }),
        router: inertiaRouter,
    };
});

import Dashboard from '@/Pages/Dashboard.vue';

const routes = {
    dashboard: '/snag/dashboard',
    'bugs.index': '/snag/bugs',
    'settings.members': '/snag/settings/members',
    'settings.billing': '/snag/settings/billing',
    'settings.capture-keys': '/snag/settings/capture-keys',
    'settings.extension.connect': '/snag/settings/extension/connect',
    'profile.edit': '/snag/profile',
    'reports.show': '/snag/reports/1',
};

const createRouteMock = (currentRoute = 'dashboard') =>
    vi.fn((name, parameter) => {
        if (typeof name === 'undefined') {
            return {
                current: (candidate) => candidate === currentRoute,
            };
        }

        if (name === 'reports.show') {
            return `/snag/reports/${parameter}`;
        }

        return routes[name];
    });

describe('Dashboard page', () => {
    beforeEach(() => {
        inertiaRouter.get.mockReset();
    });

    it('renders the public view link only for reports with a public share url', () => {
        globalThis.route = createRouteMock();

        const wrapper = mount(Dashboard, {
            props: {
                filters: {
                    search: '',
                    status: '',
                    sort: 'newest',
                    view: 'cards',
                },
                reports: {
                    data: [
                        {
                            id: 1,
                            title: 'Organization report',
                            summary: 'Visible only inside the org.',
                            status: 'ready',
                            workflow_state: 'todo',
                            urgency: 'medium',
                            tag: 'unresolved',
                            visibility: 'organization',
                            media_kind: 'screenshot',
                            created_at: '2026-03-31T12:00:00Z',
                            share_url: null,
                        },
                        {
                            id: 2,
                            title: 'Public report',
                            summary: 'Visible to everyone.',
                            status: 'ready',
                            workflow_state: 'done',
                            urgency: 'high',
                            tag: 'fixed',
                            visibility: 'public',
                            media_kind: 'screenshot',
                            created_at: '2026-03-31T12:05:00Z',
                            share_url: '/snag/share/public-token',
                        },
                    ],
                    from: 1,
                    to: 2,
                    total: 2,
                },
                membersCount: 1,
                entitlements: {
                    plan: 'free',
                    members: 3,
                    video_seconds: 0,
                    can_record_video: false,
                },
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
                            flash: {},
                        },
                    },
                },
            },
        });

        const publicViewLinks = wrapper.findAll('a').filter((link) => link.text() === 'Public view');

        expect(publicViewLinks).toHaveLength(1);
        expect(publicViewLinks[0].attributes('href')).toBe('/snag/share/public-token');
        expect(wrapper.text()).toContain('Organization report');
        expect(wrapper.text()).toContain('Public report');
    });

    it('submits queue filters through the dashboard route without dropping state', async () => {
        globalThis.route = createRouteMock();

        const wrapper = mount(Dashboard, {
            props: {
                filters: {
                    search: '',
                    status: '',
                    sort: 'newest',
                    view: 'cards',
                },
                reports: {
                    data: [],
                    from: 0,
                    to: 0,
                    total: 0,
                },
                membersCount: 2,
                entitlements: {
                    plan: 'pro',
                    members: 10,
                    video_seconds: 300,
                    can_record_video: true,
                },
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
        });

        await wrapper.find('#report-search').setValue('checkout');
        await wrapper.findAll('button').find((button) => button.text() === 'Apply').trigger('click');

        expect(inertiaRouter.get).toHaveBeenCalledWith(
            '/snag/dashboard',
            {
                search: 'checkout',
                status: '',
                sort: 'newest',
                view: 'cards',
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    });

    it('renders reports in a compact table when the compact view mode is active', () => {
        globalThis.route = createRouteMock();

        const wrapper = mount(Dashboard, {
            props: {
                filters: {
                    search: '',
                    status: '',
                    sort: 'newest',
                    view: 'compact',
                },
                reports: {
                    data: [
                        {
                            id: 3,
                            title: 'Compact row report',
                            summary: 'Needs a denser row layout.',
                            status: 'ready',
                            workflow_state: 'todo',
                            urgency: 'critical',
                            tag: 'blocked',
                            visibility: 'organization',
                            media_kind: 'screenshot',
                            created_at: '2026-03-31T12:10:00Z',
                            share_url: null,
                        },
                    ],
                    from: 1,
                    to: 1,
                    total: 1,
                },
                membersCount: 3,
                entitlements: {
                    plan: 'pro',
                    members: 10,
                    video_seconds: 300,
                    can_record_video: true,
                },
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
        });

        expect(wrapper.find('table').exists()).toBe(true);
        expect(wrapper.text()).toContain('Compact row report');
        expect(wrapper.text()).toContain('blocked');
    });
});
