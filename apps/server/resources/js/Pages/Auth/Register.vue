<script setup>
import { Head, useForm } from '@inertiajs/vue3';
import GuestLayout from '@/Layouts/GuestLayout.vue';
import TextLink from '@/Shared/TextLink.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const form = useForm({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
});

const submit = () => {
    form.post(route('register'), {
        onFinish: () => form.reset('password', 'password_confirmation'),
    });
};
</script>

<template>
    <GuestLayout>
        <Head title="Register" />

        <div class="space-y-2">
            <h1 class="text-2xl font-semibold tracking-tight">Create your account.</h1>
            <p class="text-sm text-muted-foreground">
                Start with an account, then continue into workspace setup.
            </p>
        </div>

        <form class="space-y-4" @submit.prevent="submit">
            <div class="space-y-2">
                <Label for="name">Name</Label>
                <Input id="name" v-model="form.name" type="text" required autofocus autocomplete="name" />
                <p v-if="form.errors.name" class="text-sm text-destructive">{{ form.errors.name }}</p>
            </div>

            <div class="space-y-2">
                <Label for="email">Email</Label>
                <Input id="email" v-model="form.email" type="email" required autocomplete="username" />
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

            <div class="flex flex-wrap items-center justify-between gap-3">
                <TextLink :href="route('login')" class="text-sm font-medium text-primary hover:underline">
                    Already registered?
                </TextLink>
                <Button type="submit" :disabled="form.processing">Register</Button>
            </div>
        </form>
    </GuestLayout>
</template>
