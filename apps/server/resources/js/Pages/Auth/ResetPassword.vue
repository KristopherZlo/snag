<script setup>
import { Head, useForm } from '@inertiajs/vue3';
import GuestLayout from '@/Layouts/GuestLayout.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

        <div class="space-y-2">
            <h1 class="text-2xl font-semibold tracking-tight">Choose a new password.</h1>
            <p class="text-sm text-muted-foreground">
                Finish the recovery flow and return to the workspace with updated credentials.
            </p>
        </div>

        <form class="space-y-4" @submit.prevent="submit">
            <div class="space-y-2">
                <Label for="email">Email</Label>
                <Input id="email" v-model="form.email" type="email" required autofocus autocomplete="username" />
                <p v-if="form.errors.email" class="text-sm text-destructive">{{ form.errors.email }}</p>
            </div>

            <div class="space-y-2">
                <Label for="password">Password</Label>
                <Input id="password" v-model="form.password" type="password" required autocomplete="new-password" />
                <p v-if="form.errors.password" class="text-sm text-destructive">{{ form.errors.password }}</p>
            </div>

            <div class="space-y-2">
                <Label for="password_confirmation">Confirm password</Label>
                <Input
                    id="password_confirmation"
                    v-model="form.password_confirmation"
                    type="password"
                    required
                    autocomplete="new-password"
                />
                <p v-if="form.errors.password_confirmation" class="text-sm text-destructive">
                    {{ form.errors.password_confirmation }}
                </p>
            </div>

            <div class="flex justify-end">
                <Button type="submit" :disabled="form.processing">Reset password</Button>
            </div>
        </form>
    </GuestLayout>
</template>
