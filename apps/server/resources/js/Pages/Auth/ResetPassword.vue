<script setup>
import GuestLayout from '@/Layouts/GuestLayout.vue';
import { Head, useForm } from '@inertiajs/vue3';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';

const props = defineProps({
    email: {
        type: String,
        required: true,
    },
    token: {
        type: String,
        required: true,
    },
});

const form = useForm({
    token: props.token,
    email: props.email,
    password: '',
    password_confirmation: '',
});

const submit = () => {
    form.post(route('password.store'), {
        onFinish: () => form.reset('password', 'password_confirmation'),
    });
};
</script>

<template>
    <GuestLayout>
        <Head title="Reset Password" />

        <div class="auth-page-header">
            <div class="auth-page-eyebrow">Reset password</div>
            <h1>Choose a new password</h1>
            <p>Finish the recovery flow and re-enter the workspace with updated credentials.</p>
        </div>

        <form class="auth-form" @submit.prevent="submit">
            <div class="field">
                <label for="email">Email</label>
                <InputText id="email" v-model="form.email" type="email" required autofocus autocomplete="username" />
                <p v-if="form.errors.email" class="field-error">{{ form.errors.email }}</p>
            </div>

            <div class="field">
                <label for="password">Password</label>
                <InputText id="password" v-model="form.password" type="password" required autocomplete="new-password" />
                <p v-if="form.errors.password" class="field-error">{{ form.errors.password }}</p>
            </div>

            <div class="field">
                <label for="password_confirmation">Confirm password</label>
                <InputText
                    id="password_confirmation"
                    v-model="form.password_confirmation"
                    type="password"
                    required
                    autocomplete="new-password"
                />
                <p v-if="form.errors.password_confirmation" class="field-error">{{ form.errors.password_confirmation }}</p>
            </div>

            <div class="auth-actions" style="justify-content: end;">
                <Button label="Reset password" type="submit" :loading="form.processing" />
            </div>
        </form>
    </GuestLayout>
</template>
