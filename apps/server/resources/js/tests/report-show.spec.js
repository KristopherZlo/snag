import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';

const inertiaRouter = vi.hoisted(() => ({
    reload: vi.fn(),
    visit: vi.fn(),
}));

vi.mock('axios', () => ({
    default: {
        patch: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
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

import ReportShow from '@/Pages/Reports/Show.vue';

const createRouteMock = (currentRoute = 'dashboard') =>
    vi.fn((name, parameter) => {
        if (typeof name === 'undefined') {
            return {
                current: (candidate) => candidate === currentRoute,
            };
        }

        const routes = {
            dashboard: '/snag/dashboard',
            'api.v1.reports.triage': `/snag/api/v1/reports/${parameter}/triage`,
            'api.v1.reports.retry': `/snag/api/v1/reports/${parameter}/retry-ingestion`,
            'api.v1.reports.destroy': `/snag/api/v1/reports/${parameter}`,
            'api.v1.issues.external-links.store': `/snag/api/v1/issues/${parameter}/external-links`,
        };

        return routes[name] ?? `/snag/${name}`;
    });

describe('Report detail page', () => {
    beforeEach(() => {
        inertiaRouter.reload.mockReset();
        inertiaRouter.visit.mockReset();
        axios.patch.mockReset();
        axios.post.mockReset();
        axios.delete.mockReset();
        axios.patch.mockResolvedValue({ data: { workflow_state: 'todo', urgency: 'medium', tag: 'unresolved' } });
        axios.post.mockResolvedValue({ data: {} });
        axios.delete.mockResolvedValue({ data: {} });
        globalThis.route = createRouteMock('reports.show');
        globalThis.navigator.clipboard = {
            writeText: vi.fn(),
        };
        globalThis.window.confirm = vi.fn(() => true);
    });

    const createReport = (overrides = {}) => ({
        id: 1,
        title: 'Organization report',
        summary: 'Internal visibility only.',
        status: 'ready',
        workflow_state: 'todo',
        urgency: 'medium',
        tag: 'unresolved',
        visibility: 'organization',
        media_kind: 'screenshot',
        share_url: null,
        has_public_share: false,
        linked_issue: null,
        artifacts: [],
        debugger: {
            actions: [],
            logs: [],
            network_requests: [],
            ...(overrides.debugger ?? {}),
        },
        ...overrides,
    });

    it('hides public sharing controls when the report is not public', () => {
        const wrapper = mount(ReportShow, {
            props: {
                report: createReport(),
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

        expect(wrapper.text()).toContain('Public sharing disabled for this report.');
        expect(wrapper.findAll('button').some((button) => button.text() === 'Copy share link')).toBe(false);
        expect(wrapper.findAll('a').some((link) => link.text() === 'Open public view')).toBe(false);
    });

    it('renders the primary artifact as a video player for video reports', () => {
        const wrapper = mount(ReportShow, {
            props: {
                report: createReport({
                    id: 2,
                    title: 'Video report',
                    summary: 'Playback should stay available to internal viewers.',
                    media_kind: 'video',
                    artifacts: [
                        {
                            kind: 'video',
                            content_type: 'video/webm',
                            url: 'https://storage.example.test/report.webm',
                        },
                    ],
                    debugger: {
                        actions: [
                            {
                                sequence: 1,
                                type: 'navigation',
                                label: 'Navigate to /checkout',
                                selector: null,
                                value: 'https://example.com/checkout',
                                happened_at: '2026-03-31T12:00:01Z',
                            },
                        ],
                        logs: [
                            {
                                sequence: 1,
                                level: 'warn',
                                message: 'Slow checkout render.',
                                happened_at: '2026-03-31T12:00:02Z',
                            },
                        ],
                        network_requests: [
                            {
                                sequence: 1,
                                method: 'GET',
                                url: 'https://api.example.test/checkout',
                                status_code: 200,
                                duration_ms: 188,
                                meta: { host: 'api.example.test' },
                                happened_at: '2026-03-31T12:00:03Z',
                            },
                        ],
                    },
                }),
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

        const video = wrapper.find('video');

        expect(video.exists()).toBe(true);
        expect(video.attributes('src')).toBe('https://storage.example.test/report.webm');
    });

    it('renders absolute timestamps for debugger steps, console logs, and network requests', async () => {
        const wrapper = mount(ReportShow, {
            props: {
                report: createReport({
                    id: 9,
                    title: 'Timestamped report',
                    summary: 'Debugger timestamps should stay visible.',
                    media_kind: 'video',
                    artifacts: [],
                    debugger: {
                        actions: [
                            {
                                sequence: 1,
                                type: 'click',
                                label: 'Click button',
                                selector: '#submit',
                                value: null,
                                happened_at: '2026-03-31T12:00:01Z',
                            },
                        ],
                        logs: [
                            {
                                sequence: 1,
                                level: 'error',
                                message: 'Checkout exploded.',
                                happened_at: '2026-03-31T12:00:02Z',
                            },
                        ],
                        network_requests: [
                            {
                                sequence: 1,
                                method: 'POST',
                                url: 'https://api.example.test/checkout',
                                status_code: 500,
                                duration_ms: 241,
                                request_headers: { 'content-type': 'application/json' },
                                response_headers: { 'x-trace-id': 'trace-123' },
                                meta: { host: 'api.example.test' },
                                happened_at: '2026-03-31T12:00:03Z',
                            },
                        ],
                    },
                }),
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

        const stepsButton = wrapper.findAll('button').find((button) => button.text() === 'Steps');
        const consoleButton = wrapper.findAll('button').find((button) => button.text() === 'Console');
        const networkButton = wrapper.findAll('button').find((button) => button.text() === 'Network');

        expect(stepsButton).toBeDefined();
        expect(consoleButton).toBeDefined();
        expect(networkButton).toBeDefined();

        await stepsButton.trigger('click');
        expect(wrapper.find('time[datetime="2026-03-31T12:00:01Z"]').text()).toContain('2026-03-31 12:00:01.000 UTC');

        await consoleButton.trigger('click');
        expect(wrapper.find('time[datetime="2026-03-31T12:00:02Z"]').text()).toContain('2026-03-31 12:00:02.000 UTC');

        await networkButton.trigger('click');
        expect(wrapper.find('time[datetime="2026-03-31T12:00:03Z"]').text()).toContain('2026-03-31 12:00:03.000 UTC');
    });

    it('uses routed API URLs for retry and delete actions under the xampp subpath', async () => {
        const wrapper = mount(ReportShow, {
            props: {
                report: createReport({
                    id: 7,
                    title: 'Retryable report',
                    summary: 'Queue the ingestion job again.',
                    status: 'failed',
                }),
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

        const buttons = wrapper.findAll('button');
        const retryButton = buttons.find((button) => button.text() === 'Retry ingestion');
        const deleteButton = buttons.find((button) => button.text() === 'Delete');

        expect(retryButton).toBeDefined();
        expect(deleteButton).toBeDefined();

        await retryButton.trigger('click');
        await deleteButton.trigger('click');

        expect(axios.post).toHaveBeenCalledWith('/snag/api/v1/reports/7/retry-ingestion');
        expect(axios.delete).toHaveBeenCalledWith('/snag/api/v1/reports/7');
        expect(inertiaRouter.reload).toHaveBeenCalled();
        expect(inertiaRouter.visit).toHaveBeenCalledWith('/snag/dashboard');
    });

    it('updates triage fields through the routed triage endpoint', async () => {
        axios.patch.mockResolvedValue({
            data: {
                workflow_state: 'done',
                urgency: 'critical',
                tag: 'blocked',
            },
        });

        const wrapper = mount(ReportShow, {
            props: {
                report: createReport({ id: 11 }),
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

        await wrapper.get('[data-testid="triage-workflow-11-native"]').setValue('done');
        await flushPromises();

        expect(axios.patch).toHaveBeenCalledWith('/snag/api/v1/reports/11/triage', {
            workflow_state: 'done',
            urgency: 'medium',
            tag: 'unresolved',
        });
    });

    it('can create a Jira ticket from the linked issue handoff panel', async () => {
        axios.post.mockResolvedValueOnce({
            data: {
                issue: {
                    id: 18,
                    key: 'BUG-18',
                    title: 'Checkout failure',
                    workflow_state: 'triaged',
                    urgency: 'high',
                    resolution: 'unresolved',
                    issue_url: '/snag/bugs/18',
                    linked_reports_count: 1,
                    reporters_count: 1,
                    has_guest_share: false,
                    primary_external_link: {
                        provider: 'jira',
                        external_key: 'BUG-201',
                        external_url: 'https://jira.example.test/browse/BUG-201',
                    },
                    external_links: [
                        {
                            id: 91,
                            provider: 'jira',
                            external_key: 'BUG-201',
                            external_url: 'https://jira.example.test/browse/BUG-201',
                            is_primary: true,
                        },
                    ],
                },
            },
        });

        const wrapper = mount(ReportShow, {
            props: {
                report: createReport({
                    id: 18,
                    linked_issue: {
                        id: 18,
                        key: 'BUG-18',
                        title: 'Checkout failure',
                        workflow_state: 'triaged',
                        urgency: 'high',
                        resolution: 'unresolved',
                        issue_url: '/snag/bugs/18',
                        linked_reports_count: 1,
                        reporters_count: 1,
                        has_guest_share: false,
                        primary_external_link: null,
                        external_links: [],
                    },
                }),
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

        const createJiraButton = wrapper.findAll('button').find((button) => button.text() === 'Create Jira ticket');

        expect(createJiraButton).toBeDefined();

        await createJiraButton.trigger('click');
        await flushPromises();

        expect(axios.post).toHaveBeenCalledWith('/snag/api/v1/issues/18/external-links', {
            provider: 'jira',
            action: 'create',
            is_primary: true,
        });
        expect(wrapper.text()).toContain('BUG-201');
    });
});
