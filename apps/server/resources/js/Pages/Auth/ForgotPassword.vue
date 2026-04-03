<script setup>
import { Head, useForm } from '@inertiajs/vue3';
import { CircleCheckBig } from 'lucide-vue-next';
import GuestLayout from '@/Layouts/GuestLayout.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

        <div class="space-y-2">
            <h1 class="text-2xl font-semibold tracking-tight">Recover account access.</h1>
            <p class="text-sm text-muted-foreground">
                Send a reset link to the email tied to your workspace membership.
            </p>
        </div>

        <p class="text-sm text-muted-foreground">
            Enter the account email and a password reset link will be sent so you can choose a new password.
        </p>

        <Alert v-if="status" class="border-primary/25 bg-primary/10 text-foreground">
            <CircleCheckBig class="size-4" />
            <AlertDescription>{{ status }}</AlertDescription>
        </Alert>

        <form class="space-y-4" @submit.prevent="submit">
            <div class="space-y-2">
                <Label for="email">Email</Label>
                <Input id="email" v-model="form.email" type="email" required autofocus autocomplete="username" />
                <p v-if="form.errors.email" class="text-sm text-destructive">{{ form.errors.email }}</p>
            </div>

            <div class="flex justify-end">
                <Button type="submit" :disabled="form.processing">Email reset link</Button>
            </div>
        </form>
    </GuestLayout>
</template>
