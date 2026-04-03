import { flushPromises, mount } from '@vue/test-utils';
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const inertiaRouter = vi.hoisted(() => ({
    reload: vi.fn(),
}));
const redirectTo = vi.hoisted(() => vi.fn());

vi.mock('@inertiajs/vue3', async () => {
    const { defineComponent, h } = await import('vue');

    return {
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

vi.mock('axios', () => ({
    default: {
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock('@/Shared/browser', () => ({
    redirectTo,
}));

import SettingsIndex from '@/Pages/Settings/Index.vue';

const routes = {
    'settings.index': '/snag/settings',
    'settings.members': '/snag/settings/members',
    'settings.capture-keys': '/snag/settings/capture-keys',
    'settings.billing': '/snag/settings/billing',
    'settings.integrations': '/snag/settings/integrations',
    'settings.extension.connect': '/snag/settings/extension/connect',
    'settings.extension.captures': '/snag/settings/extension/captures',
    'profile.edit': '/snag/profile',
    'capture-keys.store': '/snag/api/v1/capture-keys',
    'capture-keys.update': (id) => `/snag/api/v1/capture-keys/${id}`,
    'invitations.store': '/snag/invitations',
    'invitations.destroy': (id) => `/snag/invitations/${id}`,
    'api.v1.integrations.store': '/snag/api/v1/integrations',
    'api.v1.billing.checkout': '/snag/api/v1/billing/checkout',
    'api.v1.billing.portal': '/snag/api/v1/billing/portal',
};

const createRouteMock = () =>
    vi.fn((name, parameter) => {
        if (typeof name === 'undefined') {
            return {
                current: () => false,
            };
        }

        const route = routes[name];

        return typeof route === 'function' ? route(parameter) : route;
    });

const factory = (props) =>
    mount(SettingsIndex, {
        props: {
            section: 'members',
            canManageCaptureKeys: true,
            canManageBilling: true,
            canManageIntegrations: true,
            members: [],
            captureKeys: [],
            invitations: [],
            billing: {
                enabled: true,
                entitlements: {
                    plan: 'free',
                    members: 3,
                    video_seconds: 0,
                    can_record_video: false,
                },
                subscription: null,
            },
            integrations: [],
            ...props,
        },
        global: {
            stubs: {
                AppShell: {
                    template: '<div><slot /></div>',
                },
                StatusBadge: {
                    template: '<span class="status-badge"><slot /></span>',
                },
            },
        },
    });

describe('Settings page', () => {
    beforeEach(() => {
        inertiaRouter.reload.mockReset();
        axios.post.mockReset();
        axios.put.mockReset();
        axios.delete.mockReset();
        redirectTo.mockReset();
        globalThis.route = createRouteMock();
    });

    it('submits invitations through the routed organization endpoint and reloads targeted props', async () => {
        axios.post.mockResolvedValue({ data: {} });

        const wrapper = factory({
            section: 'members',
        });

        await wrapper.get('#invite-email').setValue('member@example.com');
        await wrapper.get('[data-testid="invite-role-native"]').setValue('admin');
        await wrapper.get('form').trigger('submit.prevent');
        await flushPromises();

        expect(axios.post).toHaveBeenCalledWith('/snag/invitations', {
            email: 'member@example.com',
            role: 'admin',
        });
        expect(inertiaRouter.reload).toHaveBeenCalledWith({
            only: ['members', 'invitations'],
            preserveScroll: true,
        });
    });

    it('normalizes capture key origins and posts them through the routed API endpoint', async () => {
        axios.post.mockResolvedValue({ data: {} });

        const wrapper = factory({
            section: 'capture-keys',
        });

        await wrapper.get('#capture-key-name').setValue('Widget Key');
        await wrapper.get('#capture-key-origins').setValue('https://app.example.com, https://staging.example.com');
        await wrapper.get('form').trigger('submit.prevent');
        await flushPromises();

        expect(axios.post).toHaveBeenCalledWith('/snag/api/v1/capture-keys', {
            name: 'Widget Key',
            allowed_origins: ['https://app.example.com', 'https://staging.example.com'],
        });
        expect(inertiaRouter.reload).toHaveBeenCalledWith({
            only: ['captureKeys'],
            preserveScroll: true,
        });
    });

    it('explains that capture keys are for external upload surfaces, not extension connect', () => {
        const wrapper = factory({
            section: 'capture-keys',
        });

        expect(wrapper.text()).toContain('What a capture key is for');
        expect(wrapper.text()).toContain('Browser extension connect');
        expect(wrapper.text()).toContain('Create website key');
    });

    it('starts checkout through the routed billing endpoint and redirects to the returned checkout url', async () => {
        axios.post.mockResolvedValue({
            data: {
                checkout_url: 'https://billing.example.test/session',
            },
        });

        const wrapper = factory({
            section: 'billing',
        });

        await wrapper.findAll('button').find((button) => button.text() === 'Choose Pro').trigger('click');
        await flushPromises();

        expect(axios.post).toHaveBeenCalledWith('/snag/api/v1/billing/checkout', {
            plan: 'pro',
        });
        expect(redirectTo).toHaveBeenCalledWith('https://billing.example.test/session');
    });

    it('stores integration settings through the routed integrations endpoint', async () => {
        axios.post.mockResolvedValue({ data: {} });

        const wrapper = factory({
            section: 'integrations',
            integrations: [
                {
                    id: 4,
                    provider: 'jira',
                    is_enabled: false,
                    config: {
                        base_url: '',
                        email: '*********.com',
                        api_token: '********oken',
                        project_key: '',
                    },
                    config_has_values: {
                        base_url: false,
                        email: true,
                        api_token: true,
                        project_key: false,
                    },
                    has_sensitive_config: true,
                    has_webhook_secret: true,
                    webhook_secret_masked: '********ret-1',
                    webhook_url: 'https://snag.test/webhooks/jira',
                },
            ],
        });

        await wrapper.get('#jira-base_url').setValue('https://company.atlassian.net');
        await wrapper.get('#jira-email').setValue('qa@example.com');
        await wrapper.get('#jira-api_token').setValue('jira-token');
        await wrapper.get('#jira-project_key').setValue('BUG');
        await wrapper.findAll('button').filter((button) => button.text() === 'Save integration')[1].trigger('click');
        await flushPromises();

        expect(axios.post).toHaveBeenCalledWith('/snag/api/v1/integrations', {
            provider: 'jira',
            is_enabled: false,
            config: {
                base_url: 'https://company.atlassian.net',
                email: 'qa@example.com',
                api_token: 'jira-token',
                project_key: 'BUG',
            },
        });
        expect(inertiaRouter.reload).toHaveBeenCalledWith({
            only: ['integrations'],
            preserveScroll: true,
        });
    });
});
