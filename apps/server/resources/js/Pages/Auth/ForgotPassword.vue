<script setup>
import GuestLayout from '@/Layouts/GuestLayout.vue';
import { Head, useForm } from '@inertiajs/vue3';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';

defineProps({
    status: {
        type: String,
    },
});

const form = useForm({
    email: '',
});

const submit = () => {
    form.post(route('password.email'));
};
</script>

<template>
    <GuestLayout>
        <Head title="Forgot Password" />

        <div class="auth-page-header">
            <div class="auth-page-eyebrow">Password reset</div>
            <h1>Recover account access</h1>
            <p>Send a reset link to the email tied to your workspace access.</p>
        </div>

        <p class="auth-note">
            Enter the account email and a password reset link will be sent so you can choose a new password.
        </p>

        <Message v-if="status" severity="success" size="small">{{ status }}</Message>

        <form class="auth-form" @submit.prevent="submit">
            <div class="field">
                <label for="email">Email</label>
                <InputText id="email" v-model="form.email" type="email" required autofocus autocomplete="username" />
                <p v-if="form.errors.email" class="field-error">{{ form.errors.email }}</p>
            </div>

            <div class="auth-actions" style="justify-content: end;">
                <Button label="Email reset link" type="submit" :loading="form.processing" />
            </div>
        </form>
    </GuestLayout>
</template>
