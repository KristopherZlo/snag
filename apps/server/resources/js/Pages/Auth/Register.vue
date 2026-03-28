<script setup>
import GuestLayout from '@/Layouts/GuestLayout.vue';
import { Head, Link, useForm } from '@inertiajs/vue3';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';

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

        <div class="auth-page-header">
            <div class="auth-page-eyebrow">Create account</div>
            <h1>Start a new workspace</h1>
            <p>Create your user account first. Organization selection happens immediately after registration.</p>
        </div>

        <form class="auth-form" @submit.prevent="submit">
            <div class="field">
                <label for="name">Name</label>
                <InputText id="name" v-model="form.name" type="text" required autofocus autocomplete="name" />
                <p v-if="form.errors.name" class="field-error">{{ form.errors.name }}</p>
            </div>

            <div class="field">
                <label for="email">Email</label>
                <InputText id="email" v-model="form.email" type="email" required autocomplete="username" />
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

            <div class="auth-actions">
                <Link :href="route('login')" class="auth-link">Already registered?</Link>
                <Button label="Register" type="submit" :loading="form.processing" />
            </div>
        </form>
    </GuestLayout>
</template>
