<script setup>
import AppShell from '@/Layouts/AppShell.vue';
import { Head, Link, useForm, usePage } from '@inertiajs/vue3';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Tag from 'primevue/tag';
import { computed, ref } from 'vue';

const props = defineProps({
    mustVerifyEmail: {
        type: Boolean,
    },
    status: {
        type: String,
    },
});

const user = computed(() => usePage().props.auth.user);
const deleteDialogVisible = ref(false);

const profileForm = useForm({
    name: user.value.name,
    email: user.value.email,
});

const passwordForm = useForm({
    current_password: '',
    password: '',
    password_confirmation: '',
});

const deleteForm = useForm({
    password: '',
});

const contextItems = computed(() => [
    { label: 'Account', value: user.value.email },
    { label: 'Verification', value: user.value.email_verified_at ? 'Verified' : 'Pending' },
]);

const submitProfile = () => {
    profileForm.patch(route('profile.update'), {
        preserveScroll: true,
    });
};

const submitPassword = () => {
    passwordForm.put(route('password.update'), {
        preserveScroll: true,
        onSuccess: () => passwordForm.reset(),
    });
};

const closeDeleteDialog = () => {
    deleteDialogVisible.value = false;
    deleteForm.clearErrors();
    deleteForm.reset();
};

const submitDelete = () => {
    deleteForm.delete(route('profile.destroy'), {
        preserveScroll: true,
        onSuccess: () => closeDeleteDialog(),
        onFinish: () => deleteForm.reset(),
    });
};
</script>

<template>
    <Head title="Profile" />

    <AppShell
        title="Profile"
        description="Maintain personal account details, password hygiene, and destructive account actions without leaving the workspace shell."
        section="profile"
        :context-items="contextItems"
    >
        <div class="page-stack">
            <Card class="workspace-card">
                <template #content>
                    <div class="report-side-card">
                        <div class="section-head">
                            <div>
                                <h2>Profile information</h2>
                                <p>Update your account identity and primary email address.</p>
                            </div>
                        </div>

                        <Message
                            v-if="mustVerifyEmail && user.email_verified_at === null"
                            severity="warn"
                            size="small"
                        >
                            Your email address is unverified.
                            <Link :href="route('verification.send')" method="post" as="button" class="auth-link">
                                Resend verification email
                            </Link>
                        </Message>

                        <Message v-if="status === 'verification-link-sent'" severity="success" size="small">
                            A new verification link has been sent to your email address.
                        </Message>

                        <form class="auth-form" @submit.prevent="submitProfile">
                            <div class="field">
                                <label for="name">Name</label>
                                <InputText id="name" v-model="profileForm.name" type="text" required autofocus autocomplete="name" />
                                <p v-if="profileForm.errors.name" class="field-error">{{ profileForm.errors.name }}</p>
                            </div>

                            <div class="field">
                                <label for="email">Email</label>
                                <InputText id="email" v-model="profileForm.email" type="email" required autocomplete="username" />
                                <p v-if="profileForm.errors.email" class="field-error">{{ profileForm.errors.email }}</p>
                            </div>

                            <div class="auth-actions" style="justify-content: end;">
                                <Message v-if="profileForm.recentlySuccessful" severity="success" size="small">Saved.</Message>
                                <Button label="Save profile" type="submit" :loading="profileForm.processing" />
                            </div>
                        </form>
                    </div>
                </template>
            </Card>

            <Card class="workspace-card">
                <template #content>
                    <div class="report-side-card">
                        <div class="section-head">
                            <div>
                                <h2>Update password</h2>
                                <p>Use a long random password to keep account access secure.</p>
                            </div>
                        </div>

                        <form class="auth-form" @submit.prevent="submitPassword">
                            <div class="field">
                                <label for="current_password">Current password</label>
                                <InputText
                                    id="current_password"
                                    v-model="passwordForm.current_password"
                                    type="password"
                                    autocomplete="current-password"
                                />
                                <p v-if="passwordForm.errors.current_password" class="field-error">{{ passwordForm.errors.current_password }}</p>
                            </div>

                            <div class="field">
                                <label for="password">New password</label>
                                <InputText
                                    id="password"
                                    v-model="passwordForm.password"
                                    type="password"
                                    autocomplete="new-password"
                                />
                                <p v-if="passwordForm.errors.password" class="field-error">{{ passwordForm.errors.password }}</p>
                            </div>

                            <div class="field">
                                <label for="password_confirmation">Confirm password</label>
                                <InputText
                                    id="password_confirmation"
                                    v-model="passwordForm.password_confirmation"
                                    type="password"
                                    autocomplete="new-password"
                                />
                                <p v-if="passwordForm.errors.password_confirmation" class="field-error">{{ passwordForm.errors.password_confirmation }}</p>
                            </div>

                            <div class="auth-actions" style="justify-content: end;">
                                <Message v-if="passwordForm.recentlySuccessful" severity="success" size="small">Saved.</Message>
                                <Button label="Save password" type="submit" :loading="passwordForm.processing" />
                            </div>
                        </form>
                    </div>
                </template>
            </Card>

            <Card class="workspace-card">
                <template #content>
                    <div class="report-side-card">
                        <div class="section-head">
                            <div>
                                <h2>Delete account</h2>
                                <p>Permanently remove the account and every linked resource after password confirmation.</p>
                            </div>
                        </div>

                        <div class="surface-note">
                            This action cannot be undone. Download or transfer any data you need before deleting the account.
                        </div>

                        <div class="auth-actions" style="justify-content: end;">
                            <Button
                                label="Delete account"
                                severity="danger"
                                variant="outlined"
                                @click="deleteDialogVisible = true"
                            />
                        </div>
                    </div>
                </template>
            </Card>
        </div>

        <template #aside>
            <Card class="workspace-card workspace-card-tight">
                <template #content>
                    <div class="side-summary">
                        <h3>Account status</h3>
                        <dl class="key-value-list">
                            <div>
                                <dt>Email</dt>
                                <dd>{{ user.email }}</dd>
                            </div>
                            <div>
                                <dt>Verification</dt>
                                <dd>
                                    <Tag :value="user.email_verified_at ? 'verified' : 'pending'" severity="secondary" />
                                </dd>
                            </div>
                        </dl>
                    </div>
                </template>
            </Card>
        </template>
    </AppShell>

    <Dialog
        v-model:visible="deleteDialogVisible"
        modal
        header="Delete account"
        :style="{ width: 'min(32rem, calc(100vw - 2rem))' }"
        @hide="closeDeleteDialog"
    >
        <div class="page-stack">
            <p class="muted">
                Confirm your password before permanently deleting the account and all associated data.
            </p>

            <div class="field">
                <label for="delete-password">Password</label>
                <InputText
                    id="delete-password"
                    v-model="deleteForm.password"
                    type="password"
                    autocomplete="current-password"
                    @keyup.enter="submitDelete"
                />
                <p v-if="deleteForm.errors.password" class="field-error">{{ deleteForm.errors.password }}</p>
            </div>

            <div class="auth-actions" style="justify-content: end;">
                <Button label="Cancel" severity="secondary" variant="outlined" @click="closeDeleteDialog" />
                <Button label="Delete account" severity="danger" :loading="deleteForm.processing" @click="submitDelete" />
            </div>
        </div>
    </Dialog>
</template>
