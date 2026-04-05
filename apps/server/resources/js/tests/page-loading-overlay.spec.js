import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const pageState = vi.hoisted(() => ({
    component: 'Dashboard',
    props: {
        auth: {
            user: {
                name: 'Owner User',
                email: 'owner@example.com',
            },
        },
    },
}));

vi.mock('@inertiajs/vue3', () => ({
    usePage: () => pageState,
}));

import PageLoadingOverlay from '@/Shared/PageLoadingOverlay.vue';
import { setPageLoadingState } from '@/lib/runtime/page-loading';

describe('PageLoadingOverlay', () => {
    beforeEach(() => {
        setPageLoadingState(false);
        pageState.component = 'Dashboard';
        pageState.props = {
            auth: {
                user: {
                    name: 'Owner User',
                    email: 'owner@example.com',
                },
            },
        };
    });

    afterEach(() => {
        setPageLoadingState(false);
    });

    it('renders a dashboard-specific skeleton for authenticated dashboard loads', () => {
        setPageLoadingState(true);

        const wrapper = mount(PageLoadingOverlay);

        expect(wrapper.get('[data-testid="global-page-loading-overlay"]').exists()).toBe(true);
        expect(wrapper.find('aside').exists()).toBe(true);
        expect(wrapper.find('[data-testid="page-loading-dashboard"]').exists()).toBe(true);
    });

    it('renders a report-detail skeleton for report pages during loading', () => {
        pageState.component = 'Reports/Show';
        setPageLoadingState(true);

        const wrapper = mount(PageLoadingOverlay);

        expect(wrapper.find('[data-testid="page-loading-report"]').exists()).toBe(true);
    });

    it('renders the compact guest shell for auth pages during loading', () => {
        pageState.component = 'Auth/Login';
        pageState.props = {
            auth: {
                user: null,
            },
        };
        setPageLoadingState(true);

        const wrapper = mount(PageLoadingOverlay);

        expect(wrapper.get('[data-testid="global-page-loading-overlay"]').exists()).toBe(true);
        expect(wrapper.find('aside').exists()).toBe(false);
        expect(wrapper.find('[data-testid="page-loading-auth"]').exists()).toBe(true);
    });

    it('switches to the destination skeleton when navigating from a report to backlog', () => {
        pageState.component = 'Reports/Show';
        setPageLoadingState(true, {
            targetUrl: 'http://localhost/snag/bugs',
        });

        const wrapper = mount(PageLoadingOverlay);

        expect(wrapper.find('[data-testid="page-loading-report"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="page-loading-bugs-index"]').exists()).toBe(true);
    });
});
