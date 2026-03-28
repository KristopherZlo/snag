<script setup>
import GuestLayout from '@/Layouts/GuestLayout.vue';
import { Head, Link, useForm } from '@inertiajs/vue3';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';

defineProps({
    canResetPassword: {
        type: Boolean,
    },
    status: {
        type: String,
    },
});

const form = useForm({
    email: '',
    password: '',
    remember: false,
});

const submit = () => {
    form.post(route('login'), {
        onFinish: () => form.reset('password'),
    });
};
</script>

<template>
    <GuestLayout>
        <Head title="Log in" />

        <div class="auth-page-header">
            <div class="auth-page-eyebrow">Sign in</div>
            <h1>Open the active workspace</h1>
            <p>Use your account to reach the report queue, organization settings, and extension connect flow.</p>
        </div>

        <Message v-if="status" severity="success" size="small">{{ status }}</Message>

        <form class="auth-form" @submit.prevent="submit">
            <div class="field">
                <label for="email">Email</label>
                <InputText
                    id="email"
                    v-model="form.email"
                    type="email"
                    required
                    autofocus
                    autocomplete="username"
                />
                <p v-if="form.errors.email" class="field-error">{{ form.errors.email }}</p>
            </div>

            <div class="field">
                <label for="password">Password</label>
                <InputText
                    id="password"
                    v-model="form.password"
                    type="password"
                    required
                    autocomplete="current-password"
                />
                <p v-if="form.errors.password" class="field-error">{{ form.errors.password }}</p>
            </div>

            <label class="auth-checkbox-row">
                <Checkbox v-model="form.remember" binary input-id="remember" />
                <span>Remember me on this device</span>
            </label>

            <div class="auth-actions">
                <Link v-if="canResetPassword" :href="route('password.request')" class="auth-link">
                    Forgot your password?
                </Link>

                <Button label="Log in" type="submit" :loading="form.processing" />
            </div>
        </form>
    </GuestLayout>
</template>
