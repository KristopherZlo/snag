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
            'api.v1.reports.issue': `/snag/api/v1/reports/${parameter}/issue`,
        };

        if (name === 'api.v1.issues.reports.destroy') {
            return `/snag/api/v1/issues/${parameter.bugIssue}/reports/${parameter.bugReport}`;
        }

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
        captured_at: '2026-04-04T10:11:12Z',
        share_url: null,
        has_public_share: false,
        linked_issue: null,
        video_poster: null,
        artifacts: [],
        debugger: {
            actions: [],
            logs: [],
            network_requests: [],
            ...(overrides.debugger ?? {}),
        },
        ...overrides,
    });

    it('renders the dedicated captured_at timestamp in the summary table', () => {
        const wrapper = mount(ReportShow, {
            props: {
                report: createReport({
                    captured_at: '2026-04-04T10:11:12Z',
                }),
            },
            global: {
                stubs: {
                    teleport: false,
                },
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

        expect(wrapper.text()).toContain('2026-04-04 10:11:12.000 UTC');
    });

    it('hides public sharing controls when the report is not public', () => {
        const wrapper = mount(ReportShow, {
            props: {
                report: createReport(),
            },
            global: {
                stubs: {
                    teleport: false,
                },
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

        expect(wrapper.text()).toContain('Public sharing disabled for this capture.');
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
                stubs: {
                    teleport: false,
                },
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

    it('opens screenshot captures inside the fullscreen lightbox', async () => {
        const wrapper = mount(ReportShow, {
            props: {
                report: createReport({
                    artifacts: [
                        {
                            kind: 'screenshot',
                            content_type: 'image/png',
                            url: 'https://storage.example.test/report.png',
                            placeholder: {
                                average_color: '#111827',
                                blur_data_url: 'data:image/png;base64,AAAA',
                            },
                        },
                    ],
                }),
            },
            global: {
                stubs: {
                    teleport: false,
                },
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
            attachTo: document.body,
        });

        await wrapper.get('[data-testid="zoomable-image-trigger"]').trigger('click');

        expect(document.body.textContent).toContain('Scroll to zoom. Drag to pan when zoomed in.');
        expect(document.body.querySelector('[data-testid="zoomable-image-dialog"]')).not.toBeNull();

        wrapper.unmount();
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
                stubs: {
                    teleport: false,
                },
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
                stubs: {
                    teleport: false,
                },
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
            attachTo: document.body,
        });

        const buttons = wrapper.findAll('button');
        const retryButton = buttons.find((button) => button.text() === 'Retry ingestion');
        const deleteButton = buttons.find((button) => button.text() === 'Delete capture');

        expect(retryButton).toBeDefined();
        expect(deleteButton).toBeDefined();

        await retryButton.trigger('click');
        await flushPromises();

        await wrapper.get('[data-testid="report-delete-trigger"]').trigger('click');
        await flushPromises();

        expect(document.body.textContent).toContain('Delete this report and schedule artifact cleanup?');
        expect(document.body.querySelector('[data-testid="report-delete-dialog"]')?.className).toContain('max-h-[calc(100vh-2rem)]');
        expect(document.body.querySelector('[data-testid="report-delete-dialog-summary"]')?.className).toContain('overflow-y-auto');

        const confirmButton = document.body.querySelector('[data-testid="report-delete-dialog-confirm"]');
        expect(confirmButton).not.toBeNull();
        confirmButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await flushPromises();

        expect(axios.post).toHaveBeenCalledWith('/snag/api/v1/reports/7/retry-ingestion');
        expect(axios.delete).toHaveBeenCalledWith('/snag/api/v1/reports/7');
        expect(inertiaRouter.reload).toHaveBeenCalled();
        expect(inertiaRouter.visit).toHaveBeenCalledWith('/snag/dashboard');

        wrapper.unmount();
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
                stubs: {
                    teleport: false,
                },
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

    it('shows create and link actions for an unlinked capture without external sync controls', async () => {
        axios.post.mockResolvedValueOnce({
            data: {
                issue: {
                    id: 21,
                    key: 'BUG-21',
                    title: 'Checkout failure',
                    workflow_state: 'triaged',
                    urgency: 'high',
                    resolution: 'unresolved',
                    issue_url: '/snag/bugs/21',
                    linked_reports_count: 1,
                    reporters_count: 1,
                    has_guest_share: false,
                    primary_external_link: null,
                    external_links: [],
                },
            },
        });

        const wrapper = mount(ReportShow, {
            props: {
                report: createReport({
                    id: 21,
                    title: 'Checkout capture',
                    summary: 'Needs ticket creation.',
                    linked_issue: null,
                }),
                availableIssues: [
                    {
                        id: 14,
                        key: 'BUG-14',
                        title: 'Existing checkout ticket',
                    },
                ],
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

        expect(wrapper.text()).toContain('Create ticket');
        expect(wrapper.text()).toContain('Link existing ticket');
        expect(wrapper.text()).not.toContain('Create Jira ticket');
        expect(wrapper.text()).not.toContain('Create GitHub issue');

        await wrapper.get('[data-testid="capture-ticket-create"]').trigger('click');
        await flushPromises();

        expect(axios.post).toHaveBeenCalledWith('/snag/api/v1/reports/21/issue', {
            title: 'Checkout capture',
            summary: 'Needs ticket creation.',
        });
        expect(wrapper.text()).toContain('BUG-21');
        expect(wrapper.text()).toContain('Open ticket');
    });

    it('shows open, change, and remove actions for a linked capture and can remove it from the ticket', async () => {
        axios.delete.mockResolvedValueOnce({ data: { issue: {} } });

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
                        linked_reports_count: 2,
                        reporters_count: 1,
                        has_guest_share: false,
                        primary_external_link: null,
                        external_links: [],
                    },
                }),
                availableIssues: [
                    {
                        id: 19,
                        key: 'BUG-19',
                        title: 'Another checkout ticket',
                    },
                ],
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

        expect(wrapper.text()).toContain('Open ticket');
        expect(wrapper.text()).toContain('Change ticket');
        expect(wrapper.text()).toContain('Remove from ticket');

        await wrapper.get('[data-testid="capture-ticket-remove"]').trigger('click');
        await flushPromises();

        expect(axios.delete).toHaveBeenCalledWith('/snag/api/v1/issues/18/reports/18');
        expect(wrapper.text()).toContain('Capture removed from ticket.');
        expect(wrapper.text()).toContain('Create ticket');
    });
});
