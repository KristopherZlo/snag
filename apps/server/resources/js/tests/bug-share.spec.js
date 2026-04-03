import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

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

import BugShare from '@/Pages/Bugs/Share.vue';

describe('Guest issue share page', () => {
    it('shows only masked external reference metadata', () => {
        const wrapper = mount(BugShare, {
            props: {
                issue: {
                    id: 12,
                    key: 'BUG-12',
                    title: 'Checkout issue',
                    summary: 'Share-safe handoff summary',
                    workflow_state: 'triaged',
                    urgency: 'high',
                    resolution: 'unresolved',
                    labels: ['checkout'],
                    preview: null,
                    shared_at: '2026-04-03T10:00:00Z',
                    external_links: [
                        {
                            provider: 'jira',
                            external_key: 'BUG-201',
                        },
                    ],
                    reports: [
                        {
                            id: 7,
                            title: 'Primary report',
                            summary: 'Evidence summary',
                            media_kind: 'screenshot',
                            created_at: '2026-04-03T09:55:00Z',
                            preview: null,
                            reporter: null,
                            debugger_summary: {
                                platform: 'macOS',
                                steps_count: 4,
                                console_count: 1,
                                network_count: 2,
                            },
                        },
                    ],
                },
            },
            global: {
                stubs: {
                    ArtifactPreview: true,
                    BrandMark: true,
                    StatusBadge: true,
                },
            },
        });

        expect(wrapper.text()).toContain('Checkout issue');
        expect(wrapper.text()).toContain('BUG-201');
        expect(wrapper.text()).toContain('Destination URLs stay private to organization members.');
        expect(wrapper.text()).toContain('Reporter: Anonymous');
        expect(wrapper.find('a[href="https://jira.example.test/browse/BUG-201"]').exists()).toBe(false);
    });
});
