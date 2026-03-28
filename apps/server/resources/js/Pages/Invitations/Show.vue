<script setup>
import GuestLayout from '@/Layouts/GuestLayout.vue';
import { Head, useForm } from '@inertiajs/vue3';
import Button from 'primevue/button';
import Tag from 'primevue/tag';

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

        <div class="auth-page-header">
            <div class="auth-page-eyebrow">Invitation</div>
            <h1>Review organization access</h1>
            <p>Accepting this invite adds your current account to the organization and switches it to the active workspace.</p>
        </div>

        <div class="split">
            <section class="surface-note">
                <div class="section-head">
                    <div>
                        <h2>Invitation details</h2>
                        <p>Use this summary to validate organization, role, and expiry before accepting access.</p>
                    </div>
                </div>

                <div class="detail-list">
                    <div class="detail-item">
                        <span class="detail-label">Organization</span>
                        <div>{{ invitation.organization.name }}</div>
                        <div class="muted mono">{{ invitation.organization.slug }}</div>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Invited email</span>
                        <div>{{ invitation.email }}</div>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Role</span>
                        <div><Tag :value="invitation.role" severity="contrast" /></div>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Invited by</span>
                        <div>{{ invitation.invited_by?.name || invitation.invited_by?.email || 'Organization admin' }}</div>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">State</span>
                        <div><Tag :value="invitation.state" severity="secondary" /></div>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Expires</span>
                        <div>{{ new Date(invitation.expires_at).toLocaleString() }}</div>
                    </div>
                </div>
            </section>

            <section class="surface-note">
                <div class="section-head">
                    <div>
                        <h2>Decision</h2>
                        <p v-if="invitation.state === 'pending'">You can respond once. Accept creates or confirms membership immediately.</p>
                        <p v-else-if="invitation.state === 'accepted'">This invitation has already been accepted.</p>
                        <p v-else>This invitation can no longer be used.</p>
                    </div>
                </div>

                <div v-if="invitation.state === 'pending'" class="report-actions">
                    <Button
                        label="Accept invitation"
                        :loading="acceptForm.processing"
                        :disabled="rejectForm.processing"
                        @click="accept"
                    />
                    <Button
                        label="Decline invitation"
                        severity="secondary"
                        variant="outlined"
                        :loading="rejectForm.processing"
                        :disabled="acceptForm.processing"
                        @click="reject"
                    />
                </div>

                <div v-else class="surface-note">
                    Ask an organization admin to issue a new invitation if you still need access.
                </div>
            </section>
        </div>
    </GuestLayout>
</template>
