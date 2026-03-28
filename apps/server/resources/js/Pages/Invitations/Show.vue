<script setup>
import { Head, useForm } from '@inertiajs/vue3';

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
    <Head title="Invitation" />

    <div class="auth-wrap">
        <div class="auth-card auth-card-wide">
            <div class="auth-brand">
                <a href="/">Snag</a>
                <p>Review the organization invitation bound to your current signed-in email address.</p>
            </div>

            <div class="split">
                <section class="panel panel-pad">
                    <div class="section-head">
                        <div>
                            <h2>Invitation details</h2>
                            <p>Accepting this invite adds your account to the organization and makes it active immediately.</p>
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
                            <div>{{ invitation.role }}</div>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Invited by</span>
                            <div>{{ invitation.invited_by?.name || invitation.invited_by?.email || 'Organization admin' }}</div>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">State</span>
                            <div>{{ invitation.state }}</div>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Expires</span>
                            <div>{{ new Date(invitation.expires_at).toLocaleString() }}</div>
                        </div>
                    </div>
                </section>

                <section class="panel panel-pad">
                    <div class="section-head">
                        <div>
                            <h2>Decision</h2>
                            <p v-if="invitation.state === 'pending'">You can respond once. The accept path creates or confirms membership and switches the active organization.</p>
                            <p v-else-if="invitation.state === 'accepted'">This invitation was already accepted.</p>
                            <p v-else>This invitation can no longer be used.</p>
                        </div>
                    </div>

                    <div v-if="invitation.state === 'pending'" class="stack">
                        <button
                            class="button button-primary"
                            type="button"
                            :disabled="acceptForm.processing || rejectForm.processing"
                            @click="accept"
                        >
                            Accept invitation
                        </button>
                        <button
                            class="button button-secondary"
                            type="button"
                            :disabled="acceptForm.processing || rejectForm.processing"
                            @click="reject"
                        >
                            Decline invitation
                        </button>
                    </div>

                    <div v-else class="surface-note">
                        Ask an organization admin to issue a new invitation if you still need access.
                    </div>
                </section>
            </div>
        </div>
    </div>
</template>
