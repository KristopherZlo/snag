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
    'settings.integrations': '/snag/settings/integrations',
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

    it('marks reports that still have an active public share without rereading the raw url', () => {
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
                            has_public_share: false,
                            linked_issue: null,
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
                            share_url: null,
                            has_public_share: true,
                            linked_issue: {
                                id: 9,
                                key: 'BUG-9',
                                title: 'Linked issue',
                                workflow_state: 'triaged',
                                urgency: 'high',
                                resolution: 'unresolved',
                                linked_reports_count: 2,
                                reporters_count: 1,
                                issue_url: '/snag/bugs/9',
                                primary_external_link: null,
                                has_guest_share: false,
                            },
                        },
                    ],
                    from: 1,
                    to: 2,
                    total: 2,
                    current_page: 1,
                    last_page: 1,
                },
                openIssues: [],
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

        expect(wrapper.text()).toContain('Organization report');
        expect(wrapper.text()).toContain('Public report');
        expect(wrapper.text()).toContain('Public share active');
        expect(wrapper.text()).toContain('BUG-9');
    });

    it('applies report search automatically after a short debounce', async () => {
        vi.useFakeTimers();
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
                    current_page: 1,
                    last_page: 1,
                },
                openIssues: [],
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
        await vi.advanceTimersByTimeAsync(250);

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

        vi.useRealTimers();
    });

    it('shows a clear control for active filters and clears the current status in place', async () => {
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
                    current_page: 1,
                    last_page: 1,
                },
                openIssues: [],
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

        await wrapper.get('[data-testid="report-status-native"]').setValue('ready');
        inertiaRouter.get.mockClear();

        const clearControl = wrapper.get('[data-testid="report-status-clear"]');

        expect(clearControl.classes()).toContain('cursor-pointer');

        await clearControl.trigger('click');

        expect(inertiaRouter.get).toHaveBeenCalledWith(
            '/snag/dashboard',
            {
                search: '',
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
        const longCompactTitle = 'shadcn-vue.com/create?theme=amber&radius=large&item=command-menu&baseColor=stone&template=vite';

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
                            title: longCompactTitle,
                            summary: 'Needs a denser row layout.',
                            status: 'ready',
                            workflow_state: 'todo',
                            urgency: 'critical',
                            tag: 'blocked',
                            visibility: 'organization',
                            media_kind: 'screenshot',
                            created_at: '2026-03-31T12:10:00Z',
                            share_url: null,
                            has_public_share: false,
                            linked_issue: {
                                id: 3,
                                key: 'BUG-3',
                                title: 'Compact issue',
                                workflow_state: 'in_progress',
                                urgency: 'critical',
                                resolution: 'blocked',
                                linked_reports_count: 1,
                                reporters_count: 1,
                                issue_url: '/snag/bugs/3',
                                primary_external_link: null,
                                has_guest_share: false,
                            },
                        },
                    ],
                    from: 1,
                    to: 1,
                    total: 1,
                    current_page: 1,
                    last_page: 1,
                },
                openIssues: [],
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
        expect(wrapper.text()).toContain(longCompactTitle);
        expect(wrapper.text()).toContain('blocked');
        expect(wrapper.get('[data-testid="compact-report-title-3"]').attributes('title')).toBe(longCompactTitle);
        expect(wrapper.get('[data-testid="compact-report-title-3"]').classes()).toContain('truncate');
    });

    it('shows ticket status in the compact issue column without inline linking controls', () => {
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
                            id: 4,
                            title: 'Needs issue actions',
                            summary: 'Unlinked compact report.',
                            status: 'ready',
                            workflow_state: 'todo',
                            urgency: 'medium',
                            tag: 'unresolved',
                            visibility: 'organization',
                            media_kind: 'screenshot',
                            created_at: '2026-03-31T12:10:00Z',
                            share_url: null,
                            has_public_share: false,
                            linked_issue: null,
                        },
                    ],
                    from: 1,
                    to: 1,
                    total: 1,
                    current_page: 1,
                    last_page: 1,
                },
                openIssues: [
                    {
                        id: 14,
                        key: 'BUG-14',
                        title: 'Existing issue',
                    },
                ],
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

        expect(wrapper.text()).toContain('Not in ticket');
        expect(wrapper.text()).toContain('Open capture');
        expect(wrapper.text()).not.toContain('Create issue');
        expect(wrapper.text()).not.toContain('Attach to existing issue');
    });

    it('navigates to a specific reports page without dropping active filters', async () => {
        globalThis.route = createRouteMock();

        const wrapper = mount(Dashboard, {
            props: {
                filters: {
                    search: 'checkout',
                    status: 'ready',
                    sort: 'newest',
                    view: 'cards',
                },
                reports: {
                    data: [],
                    from: 13,
                    to: 24,
                    total: 36,
                    current_page: 2,
                    last_page: 3,
                    prev_page_url: '/snag/dashboard?page=1',
                    next_page_url: '/snag/dashboard?page=3',
                },
                openIssues: [],
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

        await wrapper.get('[data-testid="reports-page-3"]').trigger('click');

        expect(inertiaRouter.get).toHaveBeenCalledWith(
            '/snag/dashboard',
            {
                search: 'checkout',
                status: 'ready',
                sort: 'newest',
                view: 'cards',
                page: 3,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    });
});
