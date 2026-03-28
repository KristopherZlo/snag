import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useFormMock = vi.hoisted(() => vi.fn());

vi.mock('@inertiajs/vue3', async () => {
    const { defineComponent, h } = await import('vue');

    return {
        Head: defineComponent({
            name: 'HeadStub',
            setup() {
                return () => h('div');
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
        useForm: useFormMock,
        usePage: () => ({
            props: {
                auth: {
                    user: {
                        name: 'Owner User',
                        email: 'owner@example.com',
                        email_verified_at: null,
                    },
                },
            },
        }),
    };
});

import ProfileEdit from '@/Pages/Profile/Edit.vue';

const routes = {
    dashboard: '/snag/dashboard',
    'settings.members': '/snag/settings/members',
    'settings.capture-keys': '/snag/settings/capture-keys',
    'settings.billing': '/snag/settings/billing',
    'settings.extension.connect': '/snag/settings/extension/connect',
    'profile.edit': '/snag/profile',
    'profile.update': '/snag/profile',
    'password.update': '/snag/password',
    'profile.destroy': '/snag/profile',
    'verification.send': '/snag/email/verification-notification',
};

const createRouteMock = () =>
    vi.fn((name) => {
        if (typeof name === 'undefined') {
            return {
                current: () => false,
            };
        }

        return routes[name];
    });

describe('Profile page', () => {
    beforeEach(() => {
        const profileForm = {
            name: 'Owner User',
            email: 'owner@example.com',
            errors: {},
            processing: false,
            recentlySuccessful: false,
            patch: vi.fn(),
        };
        const passwordForm = {
            current_password: '',
            password: '',
            password_confirmation: '',
            errors: {},
            processing: false,
            recentlySuccessful: false,
            put: vi.fn(),
            reset: vi.fn(),
        };
        const deleteForm = {
            password: '',
            errors: {},
            processing: false,
            delete: vi.fn(),
            clearErrors: vi.fn(),
            reset: vi.fn(),
        };

        useFormMock.mockReset();
        useFormMock
            .mockImplementationOnce(() => profileForm)
            .mockImplementationOnce(() => passwordForm)
            .mockImplementationOnce(() => deleteForm);

        globalThis.route = createRouteMock();
    });

    it('keeps verification messaging visible and submits profile updates through the routed endpoint', async () => {
        const wrapper = mount(ProfileEdit, {
            props: {
                mustVerifyEmail: true,
                status: 'verification-link-sent',
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

        expect(wrapper.text()).toContain('Your email address is unverified.');
        expect(wrapper.text()).toContain('Resend verification email');

        await wrapper.findAll('form')[0].trigger('submit.prevent');

        const profileForm = useFormMock.mock.results[0].value;
        expect(profileForm.patch).toHaveBeenCalledWith('/snag/profile', {
            preserveScroll: true,
        });
    });
});
