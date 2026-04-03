<script setup>
import { computed } from 'vue';
import { Head, useForm } from '@inertiajs/vue3';
import { CircleCheckBig } from 'lucide-vue-next';
import GuestLayout from '@/Layouts/GuestLayout.vue';
import TextLink from '@/Shared/TextLink.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

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

        <div class="space-y-2">
            <h1 class="text-2xl font-semibold tracking-tight">Confirm account ownership.</h1>
            <p class="text-sm text-muted-foreground">
                Workspace access opens after email verification, so the identity boundary stays explicit.
            </p>
        </div>

        <p class="text-sm text-muted-foreground">
            Check your inbox and follow the verification link. If the original message did not arrive, send another one from here.
        </p>

        <Alert v-if="verificationLinkSent" class="border-primary/25 bg-primary/10 text-foreground">
            <CircleCheckBig class="size-4" />
            <AlertDescription>
                A new verification link has been sent to the email address you provided during registration.
            </AlertDescription>
        </Alert>

        <form @submit.prevent="submit">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <Button type="submit" :disabled="form.processing">Resend verification email</Button>
                <TextLink :href="route('logout')" method="post" as="button" class="text-sm font-medium text-primary hover:underline">
                    Log out
                </TextLink>
            </div>
        </form>
    </GuestLayout>
</template>
