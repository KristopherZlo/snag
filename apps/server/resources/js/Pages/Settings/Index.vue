<script setup>
import AppShell from '@/Layouts/AppShell.vue';
import { redirectTo } from '@/Shared/browser';
import StatusBadge from '@/Shared/StatusBadge.vue';
import axios from 'axios';
import { Link, router } from '@inertiajs/vue3';
import { reactive, ref } from 'vue';

defineProps({
    section: {
        type: String,
        required: true,
    },
    members: {
        type: Array,
        required: true,
    },
    captureKeys: {
        type: Array,
        required: true,
    },
    billing: {
        type: Object,
        required: true,
    },
    invitations: {
        type: Array,
        default: () => [],
    },
});

const captureKeyForm = reactive({
    name: '',
    allowedOrigins: '',
});

const invitationForm = reactive({
    email: '',
    role: 'member',
});

const busy = ref(false);
const feedback = ref('');
const failure = ref('');

const normalizeOrigins = (value) =>
    value
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);

const refresh = (only = ['captureKeys', 'members', 'billing', 'invitations']) => {
    router.reload({ only, preserveScroll: true });
};

const createCaptureKey = async () => {
    busy.value = true;
    failure.value = '';

    try {
        await axios.post(route('capture-keys.store'), {
            name: captureKeyForm.name,
            allowed_origins: normalizeOrigins(captureKeyForm.allowedOrigins),
        });

        captureKeyForm.name = '';
        captureKeyForm.allowedOrigins = '';
        feedback.value = 'Capture key created.';
        refresh(['captureKeys']);
    } catch (error) {
        failure.value = error?.response?.data?.message ?? 'Unable to create capture key.';
    } finally {
        busy.value = false;
    }
};

const revokeCaptureKey = async (captureKey) => {
    busy.value = true;
    failure.value = '';

    try {
        await axios.put(route('capture-keys.update', captureKey.id), {
            name: captureKey.name,
            status: 'revoked',
            allowed_origins: captureKey.allowed_origins,
        });

        feedback.value = `Capture key "${captureKey.name}" revoked.`;
        refresh(['captureKeys']);
    } catch (error) {
        failure.value = error?.response?.data?.message ?? 'Unable to revoke key.';
    } finally {
        busy.value = false;
    }
};

const createInvitation = async () => {
    busy.value = true;
    failure.value = '';

    try {
        await axios.post(route('invitations.store'), {
            email: invitationForm.email,
            role: invitationForm.role,
        });

        invitationForm.email = '';
        invitationForm.role = 'member';
        feedback.value = 'Invitation sent.';
        refresh(['members', 'invitations']);
    } catch (error) {
        failure.value = error?.response?.data?.message ?? 'Unable to send invitation.';
    } finally {
        busy.value = false;
    }
};

const cancelInvitation = async (invitationId) => {
    busy.value = true;
    failure.value = '';

    try {
        await axios.delete(route('invitations.destroy', invitationId));
        feedback.value = 'Invitation revoked.';
        refresh(['invitations']);
    } catch (error) {
        failure.value = error?.response?.data?.message ?? 'Unable to revoke invitation.';
    } finally {
        busy.value = false;
    }
};

const startCheckout = async (plan) => {
    busy.value = true;
    failure.value = '';

    try {
        const response = await axios.post(route('api.v1.billing.checkout'), { plan });
        redirectTo(response.data.checkout_url);
    } catch (error) {
        failure.value = error?.response?.data?.message ?? 'Unable to start checkout.';
        busy.value = false;
    }
};

const openPortal = async () => {
    busy.value = true;
    failure.value = '';

    try {
        const response = await axios.post(route('api.v1.billing.portal'));
        redirectTo(response.data.portal_url);
    } catch (error) {
        failure.value = error?.response?.data?.message ?? 'Unable to open billing portal.';
        busy.value = false;
    }
};
</script>

<template>
    <AppShell
        title="Settings"
        description="Manage memberships, capture keys, billing, and extension access for the active organization."
    >
        <div class="page-stack">
            <nav class="tabs">
                <Link :class="{ 'is-active': section === 'profile' }" :href="route('settings.index')">Profile</Link>
                <Link :class="{ 'is-active': section === 'members' }" :href="route('settings.members')">Members</Link>
                <Link :class="{ 'is-active': section === 'capture-keys' }" :href="route('settings.capture-keys')">Capture Keys</Link>
                <Link :class="{ 'is-active': section === 'billing' }" :href="route('settings.billing')">Billing</Link>
                <Link :href="route('settings.extension.connect')">Extension</Link>
            </nav>

            <div v-if="feedback" class="alert-inline is-success">{{ feedback }}</div>
            <div v-if="failure" class="alert-inline is-danger">{{ failure }}</div>

            <section v-if="section === 'profile'" class="panel panel-pad">
                <div class="section-head">
                    <div>
                        <h2>User profile</h2>
                        <p>Core account fields are still edited through the built-in profile form.</p>
                    </div>
                </div>

                <div class="surface-note">
                    Open the full account editor at
                    <Link class="auth-link" :href="route('profile.edit')">Profile</Link>.
                </div>
            </section>

            <template v-if="section === 'members'">
                <section class="panel panel-pad">
                    <div class="section-head">
                        <div>
                            <h2>Invite member</h2>
                            <p>Role-based membership limits are enforced from the entitlement snapshot.</p>
                        </div>
                    </div>

                    <form class="form-grid" @submit.prevent="createInvitation">
                        <div class="field">
                            <label for="invite-email">Email</label>
                            <input id="invite-email" v-model="invitationForm.email" type="email" required />
                        </div>
                        <div class="field">
                            <label for="invite-role">Role</label>
                            <select id="invite-role" v-model="invitationForm.role">
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div class="actions-inline" style="grid-column: 1 / -1; justify-content: end;">
                            <button class="button button-primary" type="submit" :disabled="busy">
                                Send invitation
                            </button>
                        </div>
                    </form>
                </section>

                <section class="panel panel-pad">
                    <div class="section-head">
                        <div>
                            <h2>Current members</h2>
                            <p>{{ members.length }} active memberships</p>
                        </div>
                        <div class="muted">
                            Plan limit: {{ billing.entitlements.members }}
                        </div>
                    </div>

                    <div class="table-wrap">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Joined</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="member in members" :key="member.id">
                                    <td>{{ member.user?.name ?? 'Pending user' }}</td>
                                    <td>{{ member.user?.email ?? 'n/a' }}</td>
                                    <td>{{ member.role }}</td>
                                    <td>{{ member.joined_at ? new Date(member.joined_at).toLocaleDateString() : 'n/a' }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section class="panel panel-pad">
                    <div class="section-head">
                        <div>
                            <h2>Pending invitations</h2>
                            <p v-if="invitations.length">Outstanding invites can be revoked before acceptance.</p>
                            <p v-else>No pending invitations.</p>
                        </div>
                    </div>

                    <div v-if="invitations.length" class="stack">
                        <article v-for="invitation in invitations" :key="invitation.id" class="surface-note">
                            <div class="actions-inline" style="justify-content: space-between;">
                                <div>
                                    <div style="font-weight: 600;">{{ invitation.email }}</div>
                                    <div class="muted">
                                        {{ invitation.role }} · expires {{ new Date(invitation.expires_at).toLocaleDateString() }}
                                    </div>
                                </div>
                                <button class="button button-secondary" type="button" :disabled="busy" @click="cancelInvitation(invitation.id)">
                                    Revoke
                                </button>
                            </div>
                        </article>
                    </div>
                    <div v-else class="empty-state">
                        Invitations appear here until they are accepted or revoked.
                    </div>
                </section>
            </template>

            <template v-if="section === 'capture-keys'">
                <section class="panel panel-pad">
                    <div class="section-head">
                        <div>
                            <h2>Create capture key</h2>
                            <p>Public embed flows mint short-lived capture tokens from these keys.</p>
                        </div>
                    </div>

                    <form class="auth-form" @submit.prevent="createCaptureKey">
                        <div class="field">
                            <label for="capture-key-name">Key name</label>
                            <input id="capture-key-name" v-model="captureKeyForm.name" type="text" required />
                        </div>
                        <div class="field">
                            <label for="capture-key-origins">Allowed origins</label>
                            <textarea
                                id="capture-key-origins"
                                v-model="captureKeyForm.allowedOrigins"
                                placeholder="https://app.example.com&#10;https://staging.example.com"
                                required
                            />
                        </div>
                        <div class="actions-inline" style="justify-content: end;">
                            <button class="button button-primary" type="submit" :disabled="busy">
                                Create key
                            </button>
                        </div>
                    </form>
                </section>

                <section class="panel panel-pad">
                    <div class="section-head">
                        <div>
                            <h2>Issued keys</h2>
                            <p>All capture keys are organization-scoped and revocable.</p>
                        </div>
                    </div>

                    <div v-if="captureKeys.length" class="stack">
                        <article v-for="captureKey in captureKeys" :key="captureKey.id" class="surface-note">
                            <div class="actions-inline" style="justify-content: space-between;">
                                <div>
                                    <div style="font-weight: 600;">{{ captureKey.name }}</div>
                                    <div class="mono muted" style="font-size: 0.88rem;">{{ captureKey.public_key }}</div>
                                    <ul class="list-plain muted" style="margin-top: 10px;">
                                        <li v-for="origin in captureKey.allowed_origins" :key="origin">{{ origin }}</li>
                                    </ul>
                                </div>
                                <div class="actions-inline">
                                    <StatusBadge :value="captureKey.status" />
                                    <button
                                        v-if="captureKey.status !== 'revoked'"
                                        class="button button-secondary"
                                        type="button"
                                        :disabled="busy"
                                        @click="revokeCaptureKey(captureKey)"
                                    >
                                        Revoke
                                    </button>
                                </div>
                            </div>
                        </article>
                    </div>
                    <div v-else class="empty-state">
                        No capture keys have been created yet.
                    </div>
                </section>
            </template>

            <template v-if="section === 'billing'">
                <section class="panel panel-pad">
                    <div class="stats-grid" style="margin-bottom: 0;">
                        <div class="stat-card">
                            <p class="stat-label">Plan</p>
                            <p class="stat-value" style="text-transform: capitalize;">{{ billing.entitlements.plan }}</p>
                            <p class="stat-note">{{ billing.entitlements.can_record_video ? `Video up to ${billing.entitlements.video_seconds}s` : 'Screenshot only' }}</p>
                        </div>
                        <div class="stat-card">
                            <p class="stat-label">Member limit</p>
                            <p class="stat-value">{{ billing.entitlements.members }}</p>
                            <p class="stat-note">Organization seats available on the current plan.</p>
                        </div>
                        <div class="stat-card">
                            <p class="stat-label">Stripe mode</p>
                            <p class="stat-value">{{ billing.enabled ? 'Live' : 'Disabled' }}</p>
                            <p class="stat-note">Core product remains usable on free when billing is unavailable.</p>
                        </div>
                    </div>
                </section>

                <section class="panel panel-pad">
                    <div class="section-head">
                        <div>
                            <h2>Upgrade path</h2>
                            <p>Checkout starts only when Stripe keys are configured.</p>
                        </div>
                        <button
                            v-if="billing.enabled && billing.subscription?.stripe_status"
                            class="button button-secondary"
                            type="button"
                            :disabled="busy"
                            @click="openPortal"
                        >
                            Open billing portal
                        </button>
                    </div>

                    <div class="report-list">
                        <article class="report-card">
                            <div>
                                <h3 class="report-title">Free</h3>
                                <p class="report-summary">3 members, screenshot capture, no video recording.</p>
                            </div>
                            <div class="actions-inline">
                                <StatusBadge v-if="billing.entitlements.plan === 'free'" value="ready" />
                            </div>
                        </article>
                        <article class="report-card">
                            <div>
                                <h3 class="report-title">Pro</h3>
                                <p class="report-summary">10 members, video recording up to 300 seconds.</p>
                            </div>
                            <div class="actions-inline">
                                <button
                                    class="button button-primary"
                                    type="button"
                                    :disabled="busy || !billing.enabled"
                                    @click="startCheckout('pro')"
                                >
                                    Choose Pro
                                </button>
                            </div>
                        </article>
                        <article class="report-card">
                            <div>
                                <h3 class="report-title">Studio</h3>
                                <p class="report-summary">50 members, video recording up to 1800 seconds.</p>
                            </div>
                            <div class="actions-inline">
                                <button
                                    class="button button-primary"
                                    type="button"
                                    :disabled="busy || !billing.enabled"
                                    @click="startCheckout('studio')"
                                >
                                    Choose Studio
                                </button>
                            </div>
                        </article>
                    </div>
                </section>
            </template>
        </div>
    </AppShell>
</template>
