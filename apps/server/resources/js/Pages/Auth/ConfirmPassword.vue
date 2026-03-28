<script setup>
import GuestLayout from '@/Layouts/GuestLayout.vue';
import { Head, useForm } from '@inertiajs/vue3';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';

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

        <div class="auth-page-header">
            <div class="auth-page-eyebrow">Security check</div>
            <h1>Confirm your password</h1>
            <p>This secure step protects account and billing operations inside the workspace.</p>
        </div>

        <p class="auth-note">
            Re-enter your password before continuing to this sensitive action.
        </p>

        <form class="auth-form" @submit.prevent="submit">
            <div class="field">
                <label for="password">Password</label>
                <InputText
                    id="password"
                    v-model="form.password"
                    type="password"
                    required
                    autocomplete="current-password"
                    autofocus
                />
                <p v-if="form.errors.password" class="field-error">{{ form.errors.password }}</p>
            </div>

            <div class="auth-actions" style="justify-content: end;">
                <Button label="Confirm" type="submit" :loading="form.processing" />
            </div>
        </form>
    </GuestLayout>
</template>
