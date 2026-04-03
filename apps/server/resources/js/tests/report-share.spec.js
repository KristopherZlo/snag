import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import ReportShare from '@/Pages/Reports/Share.vue';

describe('Public share page', () => {
    it('renders the safe public payload without internal-only framing', () => {
        const wrapper = mount(ReportShare, {
            props: {
                report: {
                    title: 'Checkout bug',
                    summary: 'Customer could not complete checkout.',
                    media_kind: 'screenshot',
                    artifacts: [
                        {
                            kind: 'screenshot',
                            url: 'https://storage.example.test/report.png',
                        },
                    ],
                    debugger: {
                        actions: [
                            {
                                sequence: 1,
                                type: 'click',
                                label: 'Click submit',
                                selector: null,
                            },
                        ],
                        logs: [],
                        network_requests: [
                            {
                                sequence: 1,
                                method: 'POST',
                                url: 'api.example.test/checkout',
                                status_code: 500,
                            },
                        ],
                    },
                },
            },
        });

        expect(wrapper.text()).toContain('Public report');
        expect(wrapper.text()).toContain('Checkout bug');
        expect(wrapper.text()).toContain('screenshot');
        expect(wrapper.text()).toContain('1 artifacts');
        expect(wrapper.text()).toContain('High-level interaction sequence only.');
        expect(wrapper.text()).toContain('Request metadata is truncated for public access.');
        expect(wrapper.text()).toContain('api.example.test/checkout');
        expect(wrapper.text()).not.toContain('https://');
    });
});
