import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';

const inertiaRouter = vi.hoisted(() => ({
    get: vi.fn(),
}));

vi.mock('axios', () => ({
    default: {
        patch: vi.fn(),
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

        if (name === 'reports.show') {
            return `/snag/reports/${parameter}`;
        }

        if (name === 'api.v1.reports.triage') {
            return `/snag/api/v1/reports/${parameter}/triage`;
        }

        return routes[name];
    });

const createReport = (id, overrides = {}) => ({
    id,
    title: `Report ${id}`,
    summary: `Summary ${id}`,
    status: 'ready',
    workflow_state: 'todo',
    urgency: 'medium',
    tag: 'unresolved',
    visibility: 'organization',
    media_kind: 'screenshot',
    created_at: '2026-03-31T12:00:00Z',
    share_url: null,
    preview: null,
    ...overrides,
});

describe('Bug backlog page', () => {
    beforeEach(() => {
        inertiaRouter.get.mockReset();
        axios.patch.mockReset();
        globalThis.route = createRouteMock('bugs.index');
    });

    it('renders trello-like not done and done columns with title tooltip hints', () => {
        const longTitle = 'Very long checkout failure title that should still expose the full text on hover';

        const wrapper = mount(BugsIndex, {
            props: {
                filters: {
                    search: '',
                },
                sections: {
                    todo: [createReport(1, { title: longTitle })],
                    done: [createReport(2, { workflow_state: 'done', tag: 'fixed' })],
                },
                summary: {
                    total: 2,
                    todo: 1,
                    done: 1,
                    critical: 0,
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

        expect(wrapper.get('[data-testid="bug-board-column-todo"]').text()).toContain('Not done');
        expect(wrapper.get('[data-testid="bug-board-column-done"]').text()).toContain('Done');
        expect(wrapper.get('a[href="/snag/reports/1"]').attributes('title')).toBe(longTitle);
    });

    it('moves a report to the done column after triage update', async () => {
        axios.patch.mockResolvedValue({
            data: {
                workflow_state: 'done',
                urgency: 'critical',
                tag: 'blocked',
            },
        });

        const wrapper = mount(BugsIndex, {
            props: {
                filters: {
                    search: '',
                },
                sections: {
                    todo: [createReport(1, { title: 'Needs fix now' })],
                    done: [],
                },
                summary: {
                    total: 1,
                    todo: 1,
                    done: 0,
                    critical: 0,
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

        await wrapper.find('#triage-workflow-1').setValue('done');
        await flushPromises();

        expect(axios.patch).toHaveBeenCalledWith('/snag/api/v1/reports/1/triage', {
            workflow_state: 'done',
            urgency: 'medium',
            tag: 'unresolved',
        });
        expect(wrapper.get('[data-testid="bug-board-column-todo"]').text()).not.toContain('Needs fix now');
        expect(wrapper.get('[data-testid="bug-board-column-done"]').text()).toContain('Needs fix now');
    });
});
