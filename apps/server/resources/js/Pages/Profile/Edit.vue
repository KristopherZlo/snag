<script setup>
import { computed, ref } from 'vue';
import { Head, useForm, usePage } from '@inertiajs/vue3';
import { CircleAlert, CircleCheckBig } from 'lucide-vue-next';
import AppShell from '@/Layouts/AppShell.vue';
import TextLink from '@/Shared/TextLink.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

const handleDeleteDialogChange = (value) => {
    deleteDialogVisible.value = value;

    if (!value) {
        closeDeleteDialog();
    }
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
        description="Maintain account details, password hygiene, and destructive actions without leaving the workspace shell."
        section="profile"
        :context-items="contextItems"
    >
        <div class="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Profile information</CardTitle>
                    <CardDescription>Update your account identity and primary email address.</CardDescription>
                </CardHeader>

                <CardContent class="space-y-4">
                    <Alert
                        v-if="mustVerifyEmail && user.email_verified_at === null"
                        class="border-amber-200 bg-amber-50 text-amber-950"
                    >
                        <CircleAlert class="size-4" />
                        <AlertDescription>
                            Your email address is unverified.
                            <TextLink :href="route('verification.send')" method="post" as="button" class="ml-2 font-medium text-primary">
                                Resend verification email
                            </TextLink>
                        </AlertDescription>
                    </Alert>

                    <Alert v-if="status === 'verification-link-sent'" class="border-primary/25 bg-primary/10 text-foreground">
                        <CircleCheckBig class="size-4" />
                        <AlertDescription>A new verification link has been sent to your email address.</AlertDescription>
                    </Alert>

                    <form class="space-y-4" @submit.prevent="submitProfile">
                        <div class="space-y-2">
                            <Label for="name">Name</Label>
                            <Input id="name" v-model="profileForm.name" type="text" required autofocus autocomplete="name" />
                            <p v-if="profileForm.errors.name" class="text-sm text-destructive">{{ profileForm.errors.name }}</p>
                        </div>

                        <div class="space-y-2">
                            <Label for="email">Email</Label>
                            <Input id="email" v-model="profileForm.email" type="email" required autocomplete="username" />
                            <p v-if="profileForm.errors.email" class="text-sm text-destructive">{{ profileForm.errors.email }}</p>
                        </div>

                        <div class="flex items-center justify-end gap-3">
                            <span v-if="profileForm.recentlySuccessful" class="text-sm text-muted-foreground">Saved.</span>
                            <Button type="submit" :disabled="profileForm.processing">Save profile</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Update password</CardTitle>
                    <CardDescription>Use a long random password to keep account access secure.</CardDescription>
                </CardHeader>

                <CardContent>
                    <form class="space-y-4" @submit.prevent="submitPassword">
                        <div class="space-y-2">
                            <Label for="current_password">Current password</Label>
                            <Input
                                id="current_password"
                                v-model="passwordForm.current_password"
                                type="password"
                                autocomplete="current-password"
                            />
                            <p v-if="passwordForm.errors.current_password" class="text-sm text-destructive">
                                {{ passwordForm.errors.current_password }}
                            </p>
                        </div>

                        <div class="space-y-2">
                            <Label for="password">New password</Label>
                            <Input id="password" v-model="passwordForm.password" type="password" autocomplete="new-password" />
                            <p v-if="passwordForm.errors.password" class="text-sm text-destructive">{{ passwordForm.errors.password }}</p>
                        </div>

                        <div class="space-y-2">
                            <Label for="password_confirmation">Confirm password</Label>
                            <Input
                                id="password_confirmation"
                                v-model="passwordForm.password_confirmation"
                                type="password"
                                autocomplete="new-password"
                            />
                            <p v-if="passwordForm.errors.password_confirmation" class="text-sm text-destructive">
                                {{ passwordForm.errors.password_confirmation }}
                            </p>
                        </div>

                        <div class="flex items-center justify-end gap-3">
                            <span v-if="passwordForm.recentlySuccessful" class="text-sm text-muted-foreground">Saved.</span>
                            <Button type="submit" :disabled="passwordForm.processing">Save password</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Delete account</CardTitle>
                    <CardDescription>
                        Permanently remove the account and every linked resource after password confirmation.
                    </CardDescription>
                </CardHeader>

                <CardContent class="space-y-4">
                    <div class="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                        This action cannot be undone. Download or transfer any data you need before deleting the account.
                    </div>

                    <div class="flex justify-end">
                        <Button variant="destructive" @click="deleteDialogVisible = true">Delete account</Button>
                    </div>
                </CardContent>
            </Card>
        </div>

        <template #aside>
            <Card>
                <CardHeader>
                    <CardTitle class="text-base">Account status</CardTitle>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div class="space-y-1">
                        <div class="text-sm font-medium">Email</div>
                        <div class="text-sm text-muted-foreground">{{ user.email }}</div>
                    </div>
                    <div class="space-y-1">
                        <div class="text-sm font-medium">Verification</div>
                        <Badge variant="outline" class="capitalize">
                            {{ user.email_verified_at ? 'verified' : 'pending' }}
                        </Badge>
                    </div>
                </CardContent>
            </Card>
        </template>
    </AppShell>

    <Dialog :open="deleteDialogVisible" @update:open="handleDeleteDialogChange">
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Delete account</DialogTitle>
                <DialogDescription>
                    Confirm your password before permanently deleting the account and all associated data.
                </DialogDescription>
            </DialogHeader>

            <div class="space-y-2">
                <Label for="delete-password">Password</Label>
                <Input
                    id="delete-password"
                    v-model="deleteForm.password"
                    type="password"
                    autocomplete="current-password"
                    @keyup.enter="submitDelete"
                />
                <p v-if="deleteForm.errors.password" class="text-sm text-destructive">{{ deleteForm.errors.password }}</p>
            </div>

            <DialogFooter class="gap-2 sm:justify-end">
                <Button variant="outline" @click="closeDeleteDialog">Cancel</Button>
                <Button variant="destructive" :disabled="deleteForm.processing" @click="submitDelete">
                    Delete account
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
