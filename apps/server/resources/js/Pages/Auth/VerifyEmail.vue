<script setup>
import { computed } from 'vue';
import GuestLayout from '@/Layouts/GuestLayout.vue';
import { Head, Link, useForm } from '@inertiajs/vue3';
import Button from 'primevue/button';
import Message from 'primevue/message';

const props = defineProps({
    status: {
        type: String,
    },
});

const form = useForm({});

const submit = () => {
    form.post(route('verification.send'));
};

const verificationLinkSent = computed(() => props.status === 'verification-link-sent');
</script>

<template>
    <GuestLayout>
        <Head title="Email Verification" />

        <div class="auth-page-header">
            <div class="auth-page-eyebrow">Verify email</div>
            <h1>Confirm account ownership</h1>
            <p>Workspace access opens after email verification, so the identity boundary stays explicit.</p>
        </div>

        <p class="auth-note">
            Check your inbox and follow the verification link. If the original message did not arrive, send another one from here.
        </p>

        <Message v-if="verificationLinkSent" severity="success" size="small">
            A new verification link has been sent to the email address you provided during registration.
        </Message>

        <form @submit.prevent="submit">
            <div class="auth-actions">
                <Button label="Resend verification email" type="submit" :loading="form.processing" />
                <Link :href="route('logout')" method="post" as="button" class="auth-link">Log out</Link>
            </div>
        </form>
    </GuestLayout>
</template>
