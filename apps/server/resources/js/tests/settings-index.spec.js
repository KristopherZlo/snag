import { flushPromises, mount } from '@vue/test-utils';
import axios from 'axios';
import { defineComponent, h } from 'vue';
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
        patch: vi.fn(),
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
    'settings.workspace.update': '/snag/settings/workspace',
    'settings.capture-keys': '/snag/settings/capture-keys',
    'settings.billing': '/snag/settings/billing',
    'settings.integrations': '/snag/settings/integrations',
    'settings.extension.connect': '/snag/settings/extension/connect',
    'settings.extension.captures': '/snag/settings/extension/captures',
    'profile.edit': '/snag/profile',
    'capture-keys.store': '/snag/api/v1/capture-keys',
    'capture-keys.update': (id) => `/snag/api/v1/capture-keys/${id}`,
    'website-widgets.store': '/snag/api/v1/website-widgets',
    'website-widgets.update': (id) => `/snag/api/v1/website-widgets/${id}`,
    'website-widgets.destroy': (id) => `/snag/api/v1/website-widgets/${id}`,
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
            canManageWorkspace: true,
            canManageCaptureKeys: true,
            canManageBilling: true,
            canManageIntegrations: true,
            workspace: {
                id: 1,
                name: 'Acme QA',
                slug: 'acme-qa-abc123',
                billing_email: 'billing@example.com',
                owner: {
                    id: 1,
                    name: 'Owner User',
                    email: 'owner@example.com',
                },
                member_count: 2,
            },
            members: [],
            captureKeys: [],
            websiteWidgets: [],
            websiteWidgetDefaults: {
                launcher: {
                    label: 'Report a bug',
                },
                intro: {
                    title: 'Found something broken?',
                    body: 'We can send a screenshot of this page to our support team.',
                    continue_label: 'Continue',
                    cancel_label: 'Not now',
                },
                helper: {
                    text: 'Click the camera to take a screenshot of this page.',
                },
                review: {
                    title: 'Add a short note',
                    body: 'Tell us what you were trying to do and what went wrong.',
                    placeholder: 'For example: I clicked Pay, but nothing happened.',
                    send_label: 'Send report',
                    cancel_label: 'Cancel',
                    retake_label: 'Retake',
                },
                success: {
                    title: 'Thank you',
                    body: 'Your report was sent to our support team.',
                    done_label: 'Done',
                },
                meta: {
                    support_team_name: 'Support team',
                    site_label: 'Website',
                },
                theme: {
                    accent_color: '#d97706',
                    mode: 'auto',
                    offset_x: 20,
                    offset_y: 20,
                    icon_style: 'camera',
                },
            },
            widgetEmbedScriptUrl: 'https://snag.example.test/embed/widget.js',
            widgetEmbedBaseUrl: 'https://snag.example.test',
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
                Dialog: defineComponent({
                    props: {
                        open: {
                            type: Boolean,
                            default: false,
                        },
                    },
                    setup(props, { slots }) {
                        return () => (props.open ? h('div', slots.default?.()) : null);
                    },
                }),
                DialogContent: {
                    template: '<div><slot /></div>',
                },
                DialogHeader: {
                    template: '<div><slot /></div>',
                },
                DialogTitle: {
                    template: '<div><slot /></div>',
                },
                DialogDescription: {
                    template: '<div><slot /></div>',
                },
                DialogFooter: {
                    template: '<div><slot /></div>',
                },
            },
        },
    });

describe('Settings page', () => {
    beforeEach(() => {
        inertiaRouter.reload.mockReset();
        axios.post.mockReset();
        axios.patch.mockReset();
        axios.put.mockReset();
        axios.delete.mockReset();
        redirectTo.mockReset();
        globalThis.route = createRouteMock();
        Object.defineProperty(globalThis.navigator, 'clipboard', {
            value: {
                writeText: vi.fn(),
            },
            configurable: true,
        });
    });

    it('submits invitations through the routed organization endpoint and reloads targeted props', async () => {
        axios.post.mockResolvedValue({ data: {} });

        const wrapper = factory({
            section: 'members',
        });

        await wrapper.get('#invite-email').setValue('member@example.com');
        await wrapper.get('[data-testid="invite-role-native"]').setValue('admin');
        await wrapper.get('[data-testid="invite-form"]').trigger('submit.prevent');
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

    it('shows workspace controls inside the team settings section and saves them through the routed endpoint', async () => {
        axios.patch.mockResolvedValue({ data: {} });

        const wrapper = factory({
            section: 'members',
        });

        expect(wrapper.text()).toContain('Workspace settings');
        expect(wrapper.get('#workspace-slug').element.value).toBe('acme-qa-abc123');

        await wrapper.get('#workspace-name').setValue('Platform QA');
        await wrapper.get('#workspace-billing-email').setValue('finance@example.com');
        await wrapper.get('[data-testid="workspace-form"]').trigger('submit.prevent');
        await flushPromises();

        expect(axios.patch).toHaveBeenCalledWith('/snag/settings/workspace', {
            name: 'Platform QA',
            billing_email: 'finance@example.com',
        });
        expect(inertiaRouter.reload).toHaveBeenCalledWith({
            only: ['workspace'],
            preserveScroll: true,
        });
    });

    it('keeps workspace fields read-only for members without workspace edit access', () => {
        const wrapper = factory({
            section: 'members',
            canManageWorkspace: false,
        });

        expect(wrapper.text()).toContain('Only owners and admins can edit workspace settings.');
        expect(wrapper.get('#workspace-name').attributes('disabled')).toBeDefined();
        expect(wrapper.get('#workspace-billing-email').attributes('disabled')).toBeDefined();
        expect(wrapper.findAll('button').find((button) => button.text() === 'Save workspace').attributes('disabled')).toBeDefined();
    });

    it('normalizes capture key origins and posts them through the routed API endpoint', async () => {
        axios.post.mockResolvedValue({ data: {} });

        const wrapper = factory({
            section: 'capture-keys',
        });

        await wrapper.get('#capture-key-name').setValue('Widget Key');
        await wrapper.get('#capture-key-origins').setValue('https://app.example.com, https://staging.example.com');
        await wrapper.get('[data-testid="capture-key-form"]').trigger('submit.prevent');
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

        expect(wrapper.text()).toContain('Website widgets');
        expect(wrapper.text()).toContain('Advanced capture keys');
        expect(wrapper.text()).toContain('Create website key');
    });

    it('creates a website widget from the capture settings dialog', async () => {
        axios.post.mockResolvedValue({ data: {} });

        const wrapper = factory({
            section: 'capture-keys',
        });

        await wrapper.get('[data-testid="website-widget-create"]').trigger('click');
        await wrapper.get('#website-widget-name').setValue('Checkout support');
        await wrapper.get('#website-widget-origins').setValue('https://app.example.com\nhttps://checkout.example.com');
        await wrapper.get('#website-widget-launcher-label').setValue('Report checkout issue');
        await wrapper.get('#website-widget-intro-title').setValue('Found a checkout problem?');
        await wrapper.get('#website-widget-intro-body').setValue('Press Continue, then press the camera button and send the screenshot to our team.');
        await wrapper.get('#website-widget-form').trigger('submit.prevent');
        await flushPromises();

        expect(axios.post).toHaveBeenCalledWith('/snag/api/v1/website-widgets', expect.objectContaining({
            name: 'Checkout support',
            status: 'active',
            allowed_origins: ['https://app.example.com', 'https://checkout.example.com'],
            config: expect.objectContaining({
                launcher: expect.objectContaining({
                    label: 'Report checkout issue',
                }),
                intro: expect.objectContaining({
                    title: 'Found a checkout problem?',
                }),
            }),
        }));
        expect(inertiaRouter.reload).toHaveBeenCalledWith({
            only: ['websiteWidgets'],
            preserveScroll: true,
        });
    });

    it('copies the generated snippet and can delete an existing widget', async () => {
        axios.delete.mockResolvedValue({ data: { deleted: true } });

        const wrapper = factory({
            section: 'capture-keys',
            websiteWidgets: [
                {
                    id: 11,
                    public_id: 'ww_checkoutdemo',
                    name: 'Checkout widget',
                    status: 'active',
                    allowed_origins: ['https://app.example.com', 'https://checkout.example.com'],
                    config: {
                        launcher: { label: 'Report a bug' },
                        intro: {
                            title: 'Found something broken?',
                            body: 'We can send a screenshot of this page to our support team.',
                            continue_label: 'Continue',
                            cancel_label: 'Not now',
                        },
                        helper: { text: 'Click the camera to take a screenshot of this page.' },
                        review: {
                            title: 'Add a short note',
                            body: 'Tell us what you were trying to do and what went wrong.',
                            placeholder: 'For example: I clicked Pay, but nothing happened.',
                            send_label: 'Send report',
                            cancel_label: 'Cancel',
                            retake_label: 'Retake',
                        },
                        success: {
                            title: 'Thank you',
                            body: 'Your report was sent to our support team.',
                            done_label: 'Done',
                        },
                        meta: {
                            support_team_name: 'Support team',
                            site_label: 'Checkout',
                        },
                        theme: {
                            accent_color: '#d97706',
                            mode: 'auto',
                            offset_x: 20,
                            offset_y: 20,
                            icon_style: 'camera',
                        },
                    },
                    capture_key_public_key: 'ck_widgetdemo',
                    created_at: '2026-04-03T18:00:00+00:00',
                },
            ],
        });

        await wrapper.get('[data-testid="website-widget-copy-11"]').trigger('click');

        expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalledWith(
            '<script async src="https://snag.example.test/embed/widget.js" data-snag-widget="ww_checkoutdemo" data-snag-base-url="https://snag.example.test"></script>',
        );

        await wrapper.get('[data-testid="website-widget-delete-11"]').trigger('click');
        await wrapper.findAll('button').find((button) => button.text() === 'Delete widget').trigger('click');
        await flushPromises();

        expect(axios.delete).toHaveBeenCalledWith('/snag/api/v1/website-widgets/11');
        expect(inertiaRouter.reload).toHaveBeenCalledWith({
            only: ['websiteWidgets'],
            preserveScroll: true,
        });
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
                    one_time_secrets: {},
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
            rotate_webhook_secret: false,
        });
        expect(inertiaRouter.reload).toHaveBeenCalledWith({
            only: ['integrations'],
            preserveScroll: true,
        });
    });

    it('reveals a rotated webhook secret only in the current save response', async () => {
        axios.post.mockResolvedValue({
            data: {
                integration: {
                    id: 1,
                    provider: 'github',
                    is_enabled: true,
                    config: {
                        repository: 'acme/app',
                        token: '********1234',
                    },
                    config_has_values: {
                        repository: true,
                        token: true,
                    },
                    has_sensitive_config: true,
                    has_webhook_secret: true,
                    webhook_secret_masked: '********************************abcd',
                    one_time_secrets: {
                        webhook_secret: 'new-webhook-secret-value-1234567890abcd',
                    },
                    webhook_url: 'https://snag.test/api/v1/webhooks/github/1',
                },
            },
        });

        const wrapper = factory({
            section: 'integrations',
            integrations: [
                {
                    id: 1,
                    provider: 'github',
                    is_enabled: true,
                    config: {
                        repository: 'acme/app',
                        token: '********1234',
                    },
                    config_has_values: {
                        repository: true,
                        token: true,
                    },
                    has_sensitive_config: true,
                    has_webhook_secret: true,
                    webhook_secret_masked: '********ret-1',
                    one_time_secrets: {},
                    webhook_url: 'https://snag.test/api/v1/webhooks/github/1',
                },
            ],
        });

        await wrapper.findAll('button').find((button) => button.text() === 'Rotate webhook secret').trigger('click');
        await flushPromises();

        expect(axios.post).toHaveBeenCalledWith('/snag/api/v1/integrations', {
            provider: 'github',
            is_enabled: true,
            config: {
                repository: 'acme/app',
                token: '********1234',
            },
            rotate_webhook_secret: true,
        });
        expect(wrapper.text()).toContain('Copy this value now. It will not be shown again after this response.');
        expect(wrapper.get('#github-revealed-webhook-secret').element.value).toBe('new-webhook-secret-value-1234567890abcd');
    });
});
