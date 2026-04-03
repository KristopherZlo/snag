import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';

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
            'api.v1.issues.update': `/snag/api/v1/issues/${parameter}`,
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
        globalThis.route = createRouteMock();
    });

    it('saves issue fields through the issue update endpoint', async () => {
        axios.patch.mockResolvedValue({
            data: {
                issue: createIssue({
                    title: 'Updated title',
                    resolution: 'fixed',
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
        await wrapper.get('[data-testid="issue-resolution-native"]').setValue('fixed');
        await wrapper.findAll('button').find((button) => button.text() === 'Save issue').trigger('click');
        await flushPromises();

        expect(axios.patch).toHaveBeenCalledWith('/snag/api/v1/issues/12', {
            title: 'Updated title',
            summary: 'Issue summary',
            workflow_state: 'triaged',
            urgency: 'high',
            resolution: 'fixed',
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
});
