import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';

const inertiaRouter = vi.hoisted(() => ({
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
        router: inertiaRouter,
    };
});

import BugShow from '@/Pages/Bugs/Show.vue';

const createRouteMock = () =>
    vi.fn((name, parameter) => {
        if (typeof name === 'undefined') {
            return {
                current: () => false,
            };
        }

        const routes = {
            'bugs.index': '/snag/bugs',
            'api.v1.issues.update': `/snag/api/v1/issues/${parameter}`,
            'api.v1.issues.destroy': `/snag/api/v1/issues/${parameter}`,
            'api.v1.issues.reports.store': `/snag/api/v1/issues/${parameter}/reports`,
            'api.v1.issues.share-links.store': `/snag/api/v1/issues/${parameter}/share-links`,
        };

        if (name === 'api.v1.issues.reports.destroy') {
            return `/snag/api/v1/issues/${parameter.bugIssue}/reports/${parameter.bugReport}`;
        }

        if (name === 'api.v1.issues.share-links.destroy') {
            return `/snag/api/v1/issues/${parameter.bugIssue}/share-links/${parameter.shareToken}`;
        }

        if (name === 'api.v1.issues.external-links.store') {
            return `/snag/api/v1/issues/${parameter}/external-links`;
        }

        if (name === 'api.v1.issues.external-links.sync') {
            return `/snag/api/v1/issues/${parameter.bugIssue}/external-links/${parameter.externalLink}/sync`;
        }

        if (name === 'api.v1.issues.external-links.destroy') {
            return `/snag/api/v1/issues/${parameter.bugIssue}/external-links/${parameter.externalLink}`;
        }

        return routes[name] ?? `/snag/${name}`;
    });

const createIssue = (overrides = {}) => ({
    id: 12,
    key: 'BUG-12',
    title: 'Checkout breaks on save',
    summary: 'Issue summary',
    workflow_state: 'triaged',
    urgency: 'high',
    resolution: 'unresolved',
    assignee: null,
    labels: ['checkout'],
    linked_reports_count: 1,
    reporters_count: 1,
    first_seen_at: '2026-04-01T10:00:00Z',
    last_seen_at: '2026-04-01T12:00:00Z',
    preview: null,
    latest_report: null,
    reports: [
        {
            id: 7,
            title: 'Primary report',
            summary: 'Linked evidence',
            media_kind: 'screenshot',
            is_primary: true,
            created_at: '2026-04-01T11:00:00Z',
            report_url: '/snag/reports/7',
            preview: null,
            reporter: { name: 'QA User' },
            debugger_summary: {
                url: 'https://example.test/checkout',
                platform: 'macOS',
                steps_count: 4,
                console_count: 1,
                network_count: 3,
            },
        },
    ],
    activities: [],
    share_tokens: [],
    verification_checklist: {
        reproduced: false,
        fix_linked: false,
        verified: false,
    },
    handoff_urls: {
        markdown: '/snag/bugs/12/handoff?format=markdown',
        text: '/snag/bugs/12/handoff?format=text',
        json: '/snag/bugs/12/handoff?format=json',
    },
    external_links: [],
    primary_external_link: null,
    issue_url: '/snag/bugs/12',
    ...overrides,
});

const createAvailableReport = (overrides = {}) => ({
    id: 21,
    title: 'Guest checkout capture',
    summary: 'Checkout button stops responding after the form is filled.',
    status: 'ready',
    media_kind: 'screenshot',
    visibility: 'organization',
    is_primary: false,
    created_at: '2026-04-02T08:00:00Z',
    report_url: '/snag/reports/21',
    has_public_share: false,
    preview: null,
    reporter: { name: 'Support visitor', email: 'visitor@example.test' },
    debugger_summary: {
        url: 'https://example.test/checkout',
        platform: 'Windows',
        language: 'en-US',
        viewport: { width: 1440, height: 900 },
        steps_count: 6,
        console_count: 2,
        network_count: 4,
    },
    ...overrides,
});

const factory = (props = {}) =>
    mount(BugShow, {
        props: {
            issue: createIssue(),
            availableReports: [],
            members: [],
            ...props,
        },
        global: {
            stubs: {
                AppShell: {
                    template: '<div><slot /><slot name="aside" /></div>',
                },
            },
        },
    });

describe('Bug issue detail page', () => {
    beforeEach(() => {
        axios.patch.mockReset();
        axios.post.mockReset();
        axios.delete.mockReset();
        inertiaRouter.visit.mockReset();
        globalThis.route = createRouteMock();
    });

    it('saves issue fields through the issue update endpoint', async () => {
        axios.patch.mockResolvedValue({
            data: {
                issue: createIssue({
                    title: 'Updated title',
                    verification_checklist: {
                        reproduced: true,
                        fix_linked: true,
                        verified: false,
                    },
                }),
            },
        });

        const wrapper = factory();

        await wrapper.get('#issue-title').setValue('Updated title');
        await wrapper.get('#issue-labels').setValue('checkout, regression');
        await wrapper.findAll('button').find((button) => button.text() === 'Save ticket').trigger('click');
        await flushPromises();

        expect(axios.patch).toHaveBeenCalledWith('/snag/api/v1/issues/12', {
            title: 'Updated title',
            summary: 'Issue summary',
            workflow_state: 'triaged',
            urgency: 'high',
            resolution: 'unresolved',
            assignee_id: null,
            labels: ['checkout', 'regression'],
            verification_checklist: {
                reproduced: false,
                fix_linked: false,
                verified: false,
            },
        });
    });

    it('creates a guest share link through the issue share API', async () => {
        axios.post.mockResolvedValue({
            data: {
                issue: createIssue({
                    share_tokens: [
                        {
                            id: 30,
                            name: 'QA handoff',
                            expires_at: null,
                            revoked_at: null,
                        },
                    ],
                    has_guest_share: true,
                }),
                share: {
                    id: 30,
                    url: '/snag/bugs/share/share-token',
                },
            },
        });

        const wrapper = factory();

        await wrapper.get('#share-name').setValue('QA handoff');
        await wrapper.findAll('button').find((button) => button.text() === 'Create guest share link').trigger('click');
        await flushPromises();

        expect(axios.post).toHaveBeenCalledWith('/snag/api/v1/issues/12/share-links', {
            name: 'QA handoff',
            expires_at: null,
        });
        expect(wrapper.text()).toContain('QA handoff');
        expect(wrapper.text()).toContain('Open newest share');
    });

    it('shows evidence-focused copy and removes captures from the ticket', async () => {
        axios.delete.mockResolvedValue({
            data: {
                issue: createIssue({
                    linked_reports_count: 0,
                    reports: [],
                }),
            },
        });

        const wrapper = factory();

        expect(wrapper.text()).toContain('Ticket overview');
        expect(wrapper.text()).toContain('Ticket evidence');
        expect(wrapper.text()).toContain('Evidence');
        expect(wrapper.get('[data-testid="issue-evidence-summary"]').text()).toContain('Primary evidence: Primary report.');
        expect(wrapper.text()).toContain('Primary evidence');

        await wrapper.get('[data-testid="issue-remove-capture-7"]').trigger('click');
        await flushPromises();

        expect(axios.delete).toHaveBeenCalledWith('/snag/api/v1/issues/12/reports/7');
        expect(wrapper.text()).toContain('Capture removed from the ticket.');
        expect(wrapper.get('[data-testid="issue-evidence-summary"]').text()).toContain('No captures are linked yet.');
    });

    it('adds evidence through a compact modal picker with search and multi-select', async () => {
        const existingReport = createIssue().reports[0];
        const availableReport = createAvailableReport();
        const secondaryReport = createAvailableReport({
            id: 22,
            title: 'Profile settings issue',
            summary: 'Avatar fails to save on profile form.',
            reporter: { name: 'Another visitor', email: 'another@example.test' },
            debugger_summary: {
                url: 'https://example.test/profile',
                platform: 'macOS',
                language: 'en-US',
                viewport: { width: 1512, height: 982 },
                steps_count: 3,
                console_count: 0,
                network_count: 1,
            },
        });

        axios.post
            .mockResolvedValueOnce({
                data: {
                    issue: createIssue({
                        linked_reports_count: 2,
                        reports: [
                            existingReport,
                            {
                                ...availableReport,
                                is_primary: false,
                            },
                        ],
                    }),
                },
            })
            .mockResolvedValueOnce({
                data: {
                    issue: createIssue({
                        linked_reports_count: 3,
                        reports: [
                            existingReport,
                            {
                                ...availableReport,
                                is_primary: false,
                            },
                            {
                                ...secondaryReport,
                                is_primary: false,
                            },
                        ],
                    }),
                },
            });

        const wrapper = mount(BugShow, {
            props: {
                issue: createIssue(),
                availableReports: [
                    createAvailableReport({
                        id: 7,
                        title: 'Already linked capture',
                    }),
                    availableReport,
                    secondaryReport,
                ],
                members: [],
            },
            attachTo: document.body,
            global: {
                stubs: {
                    AppShell: {
                        template: '<div><slot /><slot name="aside" /></div>',
                    },
                    teleport: false,
                },
            },
        });

        await wrapper.get('[data-testid="issue-open-evidence-picker"]').trigger('click');
        await flushPromises();

        expect(document.body.textContent).toContain('Add evidence');
        expect(document.body.querySelector('[data-testid="issue-report-card-7"]')).toBeNull();

        const searchInput = document.body.querySelector('[data-testid="issue-report-search"]');
        searchInput.value = 'profile';
        searchInput.dispatchEvent(new Event('input'));
        await flushPromises();

        expect(document.body.querySelector('[data-testid="issue-report-card-21"]')).toBeNull();
        expect(document.body.querySelector('[data-testid="issue-report-card-22"]')).not.toBeNull();

        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
        await flushPromises();

        document.body.querySelector('[data-testid="issue-report-card-21"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        document.body.querySelector('[data-testid="issue-report-card-22"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await flushPromises();

        expect(document.body.querySelector('[data-testid="issue-report-card-check-21"]')).not.toBeNull();
        expect(document.body.querySelector('[data-testid="issue-report-card-check-22"]')).not.toBeNull();

        document.body.querySelector('[data-testid="issue-confirm-add-captures"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await flushPromises();

        expect(axios.post).toHaveBeenNthCalledWith(1, '/snag/api/v1/issues/12/reports', {
            report_id: 21,
            is_primary: false,
        });
        expect(axios.post).toHaveBeenNthCalledWith(2, '/snag/api/v1/issues/12/reports', {
            report_id: 22,
            is_primary: false,
        });
        expect(wrapper.text()).toContain('2 captures added to the ticket.');

        wrapper.unmount();
    });

    it('confirms ticket deletion through a dialog and returns to backlog', async () => {
        axios.delete.mockResolvedValue({
            data: {
                deleted: true,
            },
        });

        const wrapper = mount(BugShow, {
            props: {
                issue: createIssue({
                    id: 33,
                    key: 'BUG-33',
                    title: 'Delete this ticket',
                    linked_reports_count: 2,
                    reporters_count: 2,
                }),
                availableReports: [],
                members: [],
            },
            attachTo: document.body,
            global: {
                stubs: {
                    AppShell: {
                        template: '<div><slot /><slot name="aside" /></div>',
                    },
                    teleport: false,
                },
            },
        });

        await wrapper.get('[data-testid="issue-delete-trigger"]').trigger('click');
        await flushPromises();

        const summary = document.body.querySelector('[data-testid="issue-delete-dialog-summary"]');

        expect(document.body.textContent).toContain('Delete this ticket and its remaining links?');
        expect(summary?.textContent).toContain('BUG-33');
        expect(summary?.textContent).toContain('Delete this ticket');
        expect(summary?.textContent).toContain('2 captures / 2 reporters');

        const confirmButton = document.body.querySelector('[data-testid="issue-delete-dialog-confirm"]');
        expect(confirmButton).not.toBeNull();

        confirmButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await flushPromises();

        expect(axios.delete).toHaveBeenCalledWith('/snag/api/v1/issues/33');
        expect(inertiaRouter.visit).toHaveBeenCalledWith('/snag/bugs');

        wrapper.unmount();
    });
});
