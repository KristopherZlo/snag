<script setup>
import { Head, useForm } from '@inertiajs/vue3';
import GuestLayout from '@/Layouts/GuestLayout.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const form = useForm({
    password: '',
});

const submit = () => {
    form.post(route('password.confirm'), {
        onFinish: () => form.reset(),
    });
};
</script>

<template>
    <GuestLayout>
        <Head title="Confirm Password" />

        <div class="space-y-2">
            <h1 class="text-2xl font-semibold tracking-tight">Confirm your password.</h1>
            <p class="text-sm text-muted-foreground">
                This check protects sensitive account and billing actions inside the workspace.
            </p>
        </div>

        <form class="space-y-4" @submit.prevent="submit">
            <div class="space-y-2">
                <Label for="password">Password</Label>
                <Input
                    id="password"
                    v-model="form.password"
                    type="password"
                    required
                    autocomplete="current-password"
                    autofocus
                />
                <p v-if="form.errors.password" class="text-sm text-destructive">{{ form.errors.password }}</p>
            </div>

            <div class="flex justify-end">
                <Button type="submit" :disabled="form.processing">Confirm</Button>
            </div>
        </form>
    </GuestLayout>
</template>
