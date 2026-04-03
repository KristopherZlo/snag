<script setup>
import { Head, useForm } from '@inertiajs/vue3';
import { CircleCheckBig } from 'lucide-vue-next';
import GuestLayout from '@/Layouts/GuestLayout.vue';
import TextLink from '@/Shared/TextLink.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

        <div class="space-y-2">
            <h1 class="text-2xl font-semibold tracking-tight">Open the active workspace.</h1>
            <p class="text-sm text-muted-foreground">
                Use your account to get back to the queue, organization settings, and extension connect flow.
            </p>
        </div>

        <Alert v-if="status" class="border-primary/25 bg-primary/10 text-foreground">
            <CircleCheckBig class="size-4" />
            <AlertDescription>{{ status }}</AlertDescription>
        </Alert>

        <form class="space-y-4" @submit.prevent="submit">
            <div class="space-y-2">
                <Label for="email">Email</Label>
                <Input
                    id="email"
                    v-model="form.email"
                    type="email"
                    required
                    autofocus
                    autocomplete="username"
                />
                <p v-if="form.errors.email" class="text-sm text-destructive">{{ form.errors.email }}</p>
            </div>

            <div class="space-y-2">
                <Label for="password">Password</Label>
                <Input
                    id="password"
                    v-model="form.password"
                    type="password"
                    required
                    autocomplete="current-password"
                />
                <p v-if="form.errors.password" class="text-sm text-destructive">{{ form.errors.password }}</p>
            </div>

            <div class="flex items-center gap-3">
                <Checkbox v-model="form.remember" id="remember" />
                <Label for="remember" class="cursor-pointer text-sm font-normal text-muted-foreground">
                    Remember this device
                </Label>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3">
                <TextLink
                    v-if="canResetPassword"
                    :href="route('password.request')"
                    class="text-sm font-medium text-primary hover:underline"
                >
                    Forgot your password?
                </TextLink>

                <Button type="submit" :disabled="form.processing">
                    Log in
                </Button>
            </div>
        </form>
    </GuestLayout>
</template>
