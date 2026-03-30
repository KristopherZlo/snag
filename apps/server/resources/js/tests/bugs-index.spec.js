import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';

const inertiaRouter = vi.hoisted(() => ({
    get: vi.fn(),
    visit: vi.fn(),
}));

vi.mock('axios', () => ({
    default: {
        patch: vi.fn(),
        post: vi.fn(),
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
        usePage: () => ({
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
        }),
        router: inertiaRouter,
    };
});

import BugsIndex from '@/Pages/Bugs/Index.vue';

const routes = {
    dashboard: '/snag/dashboard',
    'bugs.index': '/snag/bugs',
    'settings.members': '/snag/settings/members',
    'settings.billing': '/snag/settings/billing',
    'settings.capture-keys': '/snag/settings/capture-keys',
    'settings.integrations': '/snag/settings/integrations',
    'settings.extension.connect': '/snag/settings/extension/connect',
    'profile.edit': '/snag/profile',
};

const createRouteMock = (currentRoute = 'bugs.index') =>
    vi.fn((name, parameter) => {
        if (typeof name === 'undefined') {
            return {
                current: (candidate) => candidate === currentRoute,
            };
        }

        if (name === 'api.v1.issues.update') {
            return `/snag/api/v1/issues/${parameter}`;
        }

        if (name === 'api.v1.issues.store') {
            return '/snag/api/v1/issues';
        }

        return routes[name];
    });

const createIssue = (id, overrides = {}) => ({
    id,
    key: `BUG-${id}`,
    title: `Issue ${id}`,
    summary: `Summary ${id}`,
    workflow_state: 'inbox',
    urgency: 'medium',
    resolution: 'unresolved',
    linked_reports_count: 1,
    reporters_count: 1,
    first_seen_at: '2026-04-01T10:00:00Z',
    last_seen_at: '2026-04-01T12:00:00Z',
    preview: null,
    assignee: null,
    latest_report: {
        media_kind: 'screenshot',
        debugger_summary: {
            steps_count: 3,
            console_count: 1,
            network_count: 2,
        },
    },
    external_links: [],
    primary_external_link: null,
    issue_url: `/snag/bugs/${id}`,
    guest_share_url: null,
    ...overrides,
});

const createPointerEvent = (type, options = {}) => {
    const event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        button: options.button ?? 0,
        buttons: options.buttons ?? 1,
        clientX: options.clientX ?? 0,
        clientY: options.clientY ?? 0,
    });

    Object.defineProperties(event, {
        pointerId: {
            configurable: true,
            value: options.pointerId ?? 1,
        },
        pointerType: {
            configurable: true,
            value: options.pointerType ?? 'mouse',
        },
        isPrimary: {
            configurable: true,
            value: options.isPrimary ?? true,
        },
    });

    return event;
};

const factory = (props = {}) =>
    mount(BugsIndex, {
        props: {
            filters: {
                search: '',
                view: 'board',
                workflow_state: '',
                resolution: '',
                assignee: '',
            },
            issues: [],
            summary: {
                total: 0,
                inbox: 0,
                triaged: 0,
                in_progress: 0,
                ready_to_verify: 0,
                done: 0,
                critical: 0,
                linked: 0,
                shared: 0,
            },
            members: [],
            ...props,
        },
    });

describe('Bug backlog page', () => {
    beforeEach(() => {
        inertiaRouter.get.mockReset();
        inertiaRouter.visit.mockReset();
        axios.patch.mockReset();
        axios.post.mockReset();
        globalThis.route = createRouteMock('bugs.index');
    });

    it('renders issue-centric workflow columns and titles', () => {
        const wrapper = factory({
            issues: [
                createIssue(1, { title: 'Long checkout failure title for the inbox', workflow_state: 'inbox' }),
                createIssue(2, { title: 'Ready to verify item', workflow_state: 'ready_to_verify', resolution: 'fixed' }),
            ],
            summary: {
                total: 2,
                inbox: 1,
                triaged: 0,
                in_progress: 0,
                ready_to_verify: 1,
                done: 0,
                critical: 0,
                linked: 0,
                shared: 0,
            },
        });

        expect(wrapper.get('[data-testid="issue-board-column-inbox"]').text()).toContain('Inbox');
        expect(wrapper.get('[data-testid="issue-board-column-ready_to_verify"]').text()).toContain('Ready to verify');
        expect(wrapper.text()).toContain('Long checkout failure title for the inbox');
    });

    it('updates issue triage through the issue API endpoint', async () => {
        axios.patch.mockResolvedValue({
            data: {
                issue: createIssue(3, {
                    workflow_state: 'triaged',
                    urgency: 'critical',
                    resolution: 'blocked',
                }),
            },
        });

        const wrapper = factory({
            issues: [createIssue(3)],
            summary: {
                total: 1,
                inbox: 1,
                triaged: 0,
                in_progress: 0,
                ready_to_verify: 0,
                done: 0,
                critical: 0,
                linked: 0,
                shared: 0,
            },
        });

        await wrapper.get('[data-testid="issue-workflow-3-native"]').setValue('triaged');
        await flushPromises();

        expect(axios.patch).toHaveBeenCalledWith('/snag/api/v1/issues/3', {
            workflow_state: 'triaged',
            urgency: 'medium',
            resolution: 'unresolved',
        });
        expect(wrapper.get('[data-testid="issue-board-column-triaged"]').text()).toContain('Issue 3');
    });

    it('supports pointer drag between workflow columns', async () => {
        axios.patch.mockResolvedValue({
            data: {
                issue: createIssue(4, { workflow_state: 'in_progress' }),
            },
        });

        const wrapper = factory({
            issues: [createIssue(4)],
            summary: {
                total: 1,
                inbox: 1,
                triaged: 0,
                in_progress: 0,
                ready_to_verify: 0,
                done: 0,
                critical: 0,
                linked: 0,
                shared: 0,
            },
        });

        const issueCard = wrapper.get('[data-issue-id="4"]');
        const inProgressDropzone = wrapper.get('[data-testid="issue-board-dropzone-in_progress"]');
        const originalElementFromPoint = document.elementFromPoint;

        issueCard.element.getBoundingClientRect = vi.fn(() => ({
            width: 320,
            height: 220,
            left: 80,
            top: 120,
            right: 400,
            bottom: 340,
            x: 80,
            y: 120,
            toJSON: () => ({}),
        }));

        document.elementFromPoint = vi.fn((clientX) => (clientX >= 500 ? inProgressDropzone.element : issueCard.element));

        issueCard.element.dispatchEvent(
            createPointerEvent('pointerdown', {
                pointerId: 7,
                pointerType: 'mouse',
                clientX: 160,
                clientY: 180,
            }),
        );

        window.dispatchEvent(
            createPointerEvent('pointermove', {
                pointerId: 7,
                pointerType: 'mouse',
                clientX: 620,
                clientY: 180,
                buttons: 1,
            }),
        );

        await new Promise((resolve) => setTimeout(resolve, 24));

        window.dispatchEvent(
            createPointerEvent('pointerup', {
                pointerId: 7,
                pointerType: 'mouse',
                clientX: 620,
                clientY: 180,
                buttons: 0,
            }),
        );
        await flushPromises();

        document.elementFromPoint = originalElementFromPoint;

        expect(axios.patch).toHaveBeenCalledWith('/snag/api/v1/issues/4', {
            workflow_state: 'in_progress',
            resolution: 'unresolved',
        });
        expect(wrapper.get('[data-testid="issue-board-column-in_progress"]').text()).toContain('Issue 4');
    });

    it('creates a new issue and opens its workspace', async () => {
        axios.post.mockResolvedValue({
            data: {
                issue: createIssue(20, {
                    issue_url: '/snag/bugs/20',
                }),
            },
        });

        const wrapper = factory();

        await wrapper.get('#issue-create-title').setValue('Create from board');
        await wrapper.get('#issue-create-summary').setValue('Quick summary');
        await wrapper.findAll('button').find((button) => button.text() === 'Create issue').trigger('click');
        await flushPromises();

        expect(axios.post).toHaveBeenCalledWith('/snag/api/v1/issues', {
            title: 'Create from board',
            summary: 'Quick summary',
            urgency: 'medium',
        });
        expect(inertiaRouter.visit).toHaveBeenCalledWith('/snag/bugs/20');
    });
});
