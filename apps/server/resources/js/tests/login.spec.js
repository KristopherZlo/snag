import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const formMock = vi.hoisted(() => ({
    email: '',
    password: '',
    remember: false,
    errors: {},
    processing: false,
    post: vi.fn(),
    reset: vi.fn(),
}));

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
        useForm: vi.fn(() => formMock),
    };
});

import Login from '@/Pages/Auth/Login.vue';

const routes = {
    login: '/snag/login',
    'password.request': '/snag/forgot-password',
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

describe('Login page', () => {
    beforeEach(() => {
        formMock.post.mockReset();
        formMock.reset.mockReset();
    });

    it('submits credentials through the routed login endpoint and renders routed auth links', async () => {
        const route = createRouteMock();
        globalThis.route = route;

        const wrapper = mount(Login, {
            props: {
                canResetPassword: true,
                status: 'Reset your password.',
            },
            global: {
                stubs: {
                    GuestLayout: defineComponent({
                        setup(_, { slots }) {
                            return () => h('div', slots.default?.());
                        },
                    }),
                    Checkbox: defineComponent({
                        props: ['modelValue', 'id'],
                        emits: ['update:modelValue'],
                        setup() {
                            return () => h('input', { type: 'checkbox' });
                        },
                    }),
                    Button: defineComponent({
                        setup(_, { slots }) {
                            return () => h('button', { type: 'submit' }, slots.default?.());
                        },
                    }),
                    Input: defineComponent({
                        props: ['modelValue'],
                        emits: ['update:modelValue'],
                        setup(props, { emit }) {
                            return () =>
                                h('input', {
                                    value: props.modelValue,
                                    onInput: (event) => emit('update:modelValue', event.target.value),
                                });
                        },
                    }),
                    Alert: defineComponent({
                        setup(_, { slots }) {
                            return () => h('div', slots.default?.());
                        },
                    }),
                    AlertDescription: defineComponent({
                        setup(_, { slots }) {
                            return () => h('div', slots.default?.());
                        },
                    }),
                },
            },
        });

        await wrapper.find('form').trigger('submit.prevent');

        expect(formMock.post).toHaveBeenCalledTimes(1);
        expect(formMock.post).toHaveBeenCalledWith('/snag/login', expect.objectContaining({
            onFinish: expect.any(Function),
        }));

        const onFinish = formMock.post.mock.calls[0][1].onFinish;
        onFinish();

        expect(formMock.reset).toHaveBeenCalledWith('password');
        expect(wrapper.find('a[href="/snag/forgot-password"]').exists()).toBe(true);
    });
});
