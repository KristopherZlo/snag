<script setup>
import { Head, useForm } from '@inertiajs/vue3';
import GuestLayout from '@/Layouts/GuestLayout.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const props = defineProps({
    invitation: {
        type: Object,
        required: true,
    },
});

const acceptForm = useForm({});
const rejectForm = useForm({});

const accept = () => {
    acceptForm.post(route('invitations.accept', props.invitation.token));
};

const reject = () => {
    rejectForm.post(route('invitations.reject', props.invitation.token));
};
</script>

<template>
    <GuestLayout wide>
        <Head title="Invitation" />

        <div class="space-y-2">
            <h1 class="text-2xl font-semibold tracking-tight">Review organization access.</h1>
            <p class="text-sm text-muted-foreground">
                Accepting this invite adds your account to the organization and switches it to the active workspace.
            </p>
        </div>

        <div class="grid gap-6 xl:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle class="text-base">Invitation details</CardTitle>
                    <CardDescription>Validate organization, role, and expiry before accepting access.</CardDescription>
                </CardHeader>

                <CardContent>
                    <dl class="divide-y rounded-md border">
                        <div class="space-y-1 p-4">
                            <dt class="text-sm font-medium text-muted-foreground">Organization</dt>
                            <dd class="space-y-1">
                                <div>{{ invitation.organization.name }}</div>
                                <div class="font-mono text-sm text-muted-foreground">{{ invitation.organization.slug }}</div>
                            </dd>
                        </div>
                        <div class="space-y-1 p-4">
                            <dt class="text-sm font-medium text-muted-foreground">Invited email</dt>
                            <dd>{{ invitation.email }}</dd>
                        </div>
                        <div class="space-y-1 p-4">
                            <dt class="text-sm font-medium text-muted-foreground">Role</dt>
                            <dd><Badge variant="outline" class="capitalize">{{ invitation.role }}</Badge></dd>
                        </div>
                        <div class="space-y-1 p-4">
                            <dt class="text-sm font-medium text-muted-foreground">Invited by</dt>
                            <dd>{{ invitation.invited_by?.name || invitation.invited_by?.email || 'Organization admin' }}</dd>
                        </div>
                        <div class="space-y-1 p-4">
                            <dt class="text-sm font-medium text-muted-foreground">State</dt>
                            <dd><Badge variant="secondary" class="capitalize">{{ invitation.state }}</Badge></dd>
                        </div>
                        <div class="space-y-1 p-4">
                            <dt class="text-sm font-medium text-muted-foreground">Expires</dt>
                            <dd>{{ new Date(invitation.expires_at).toLocaleString() }}</dd>
                        </div>
                    </dl>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle class="text-base">Decision</CardTitle>
                    <CardDescription v-if="invitation.state === 'pending'">
                        You can respond once. Accept creates or confirms membership immediately.
                    </CardDescription>
                    <CardDescription v-else-if="invitation.state === 'accepted'">
                        This invitation has already been accepted.
                    </CardDescription>
                    <CardDescription v-else>This invitation can no longer be used.</CardDescription>
                </CardHeader>

                <CardContent>
                    <div v-if="invitation.state === 'pending'" class="flex flex-wrap gap-3">
                        <Button :disabled="rejectForm.processing" @click="accept">Accept invitation</Button>
                        <Button variant="outline" :disabled="acceptForm.processing" @click="reject">
                            Decline invitation
                        </Button>
                    </div>

                    <div v-else class="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                        Ask an organization admin to issue a new invitation if you still need access.
                    </div>
                </CardContent>
            </Card>
        </div>
    </GuestLayout>
</template>
