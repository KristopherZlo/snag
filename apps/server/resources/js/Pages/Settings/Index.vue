<script setup>
import AppShell from '@/Layouts/AppShell.vue';
import { redirectTo } from '@/Shared/browser';
import StatusBadge from '@/Shared/StatusBadge.vue';
import axios from 'axios';
import { Link, router } from '@inertiajs/vue3';
import Button from 'primevue/button';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';
import { computed, reactive, ref } from 'vue';

const props = defineProps({
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

const sectionConfigMap = {
    profile: {
        title: 'Profile',
        description: 'Personal account controls that remain visible without losing the organization workspace context.',
        shellSection: 'profile',
    },
    members: {
        title: 'Team',
        description: 'Invite members, review current seats, and keep pending access requests visible to workspace owners.',
        shellSection: 'team',
    },
    'capture-keys': {
        title: 'Capture',
        description: 'Issue and revoke organization-scoped capture keys for embedded or public collection flows.',
        shellSection: 'capture',
    },
    billing: {
        title: 'Billing',
        description: 'Keep plan limits, Stripe availability, and upgrade paths explicit for decision makers.',
        shellSection: 'billing',
    },
};

const sectionConfig = computed(() => sectionConfigMap[props.section] ?? sectionConfigMap.profile);

const settingsLinks = computed(() => [
    { key: 'profile', label: 'Profile', href: route('settings.index') },
    { key: 'members', label: 'Members', href: route('settings.members') },
    { key: 'capture-keys', label: 'Capture Keys', href: route('settings.capture-keys') },
    { key: 'billing', label: 'Billing', href: route('settings.billing') },
    { key: 'extension', label: 'Extension', href: route('settings.extension.connect') },
]);

const contextItems = computed(() => [
    { label: 'Plan', value: props.billing.entitlements.plan },
    { label: 'Seat limit', value: props.billing.entitlements.members },
    { label: 'Pending invites', value: props.invitations.length },
]);

const invitationRoleOptions = [
    { label: 'Member', value: 'member' },
    { label: 'Admin', value: 'admin' },
];

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
        :title="sectionConfig.title"
        :description="sectionConfig.description"
        :section="sectionConfig.shellSection"
        :context-items="contextItems"
    >
        <div class="page-stack">
            <Card class="workspace-card">
                <template #content>
                    <div class="settings-subnav">
                        <div class="settings-subnav-copy">
                            <h2>Workspace setup</h2>
                            <p>Separate operational triage from governance, capture configuration, and billing decisions.</p>
                        </div>

                        <nav class="settings-subnav-links">
                            <Link
                                v-for="item in settingsLinks"
                                :key="item.key"
                                :href="item.href"
                                class="settings-subnav-link"
                                :class="{ 'is-active': section === item.key }"
                            >
                                {{ item.label }}
                            </Link>
                        </nav>
                    </div>
                </template>
            </Card>

            <Message v-if="feedback" severity="success" size="small">{{ feedback }}</Message>
            <Message v-if="failure" severity="error" size="small">{{ failure }}</Message>

            <section v-if="section === 'profile'" class="page-stack">
                <Card class="workspace-card">
                    <template #content>
                        <div class="report-side-card">
                            <div class="section-head">
                                <div>
                                    <h2>User profile</h2>
                                    <p>Account edits still flow through the dedicated profile editor, but the entry point stays visible here.</p>
                                </div>
                            </div>

                            <div class="surface-note">
                                Open the full account editor at
                                <Link class="auth-link" :href="route('profile.edit')">Profile</Link>.
                            </div>
                        </div>
                    </template>
                </Card>
            </section>

            <template v-if="section === 'members'">
                <Card class="workspace-card">
                    <template #content>
                        <div class="report-side-card">
                            <div class="section-head">
                                <div>
                                    <h2>Invite member</h2>
                                    <p>Role-based membership limits are enforced from the entitlement snapshot.</p>
                                </div>
                            </div>

                            <form class="settings-form-grid" @submit.prevent="createInvitation">
                                <div class="field">
                                    <label for="invite-email">Email</label>
                                    <InputText id="invite-email" v-model="invitationForm.email" type="email" required />
                                </div>
                                <div class="field">
                                    <label for="invite-role">Role</label>
                                    <Select
                                        id="invite-role"
                                        v-model="invitationForm.role"
                                        :options="invitationRoleOptions"
                                        option-label="label"
                                        option-value="value"
                                    />
                                </div>
                                <div class="settings-actions-row">
                                    <Button label="Send invitation" type="submit" :loading="busy" />
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
                                    <h2>Current members</h2>
                                    <p>{{ members.length }} active memberships</p>
                                </div>
                                <Tag :value="`Plan limit: ${billing.entitlements.members}`" severity="secondary" />
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
                                            <td><Tag :value="member.role" severity="contrast" /></td>
                                            <td>{{ member.joined_at ? new Date(member.joined_at).toLocaleDateString() : 'n/a' }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </template>
                </Card>

                <Card class="workspace-card">
                    <template #content>
                        <div class="report-side-card">
                            <div class="section-head">
                                <div>
                                    <h2>Pending invitations</h2>
                                    <p v-if="invitations.length">Outstanding invites can be revoked before acceptance.</p>
                                    <p v-else>Invitations appear here until they are accepted or revoked.</p>
                                </div>
                            </div>

                            <div v-if="invitations.length" class="artifact-list">
                                <article v-for="invitation in invitations" :key="invitation.id" class="artifact-item">
                                    <div class="artifact-item-head">
                                        <div>
                                            <div class="artifact-kind">{{ invitation.email }}</div>
                                            <div class="muted">{{ invitation.role }} · expires {{ new Date(invitation.expires_at).toLocaleDateString() }}</div>
                                        </div>
                                        <Button
                                            label="Revoke"
                                            severity="secondary"
                                            variant="outlined"
                                            :loading="busy"
                                            @click="cancelInvitation(invitation.id)"
                                        />
                                    </div>
                                </article>
                            </div>
                            <div v-else class="empty-state">
                                Invitations appear here until they are accepted or revoked.
                            </div>
                        </div>
                    </template>
                </Card>
            </template>

            <template v-if="section === 'capture-keys'">
                <Card class="workspace-card">
                    <template #content>
                        <div class="report-side-card">
                            <div class="section-head">
                                <div>
                                    <h2>Create capture key</h2>
                                    <p>Public embed flows mint short-lived capture tokens from these organization-scoped keys.</p>
                                </div>
                            </div>

                            <form class="page-stack" @submit.prevent="createCaptureKey">
                                <div class="field">
                                    <label for="capture-key-name">Key name</label>
                                    <InputText id="capture-key-name" v-model="captureKeyForm.name" type="text" required />
                                </div>
                                <div class="field">
                                    <label for="capture-key-origins">Allowed origins</label>
                                    <Textarea
                                        id="capture-key-origins"
                                        v-model="captureKeyForm.allowedOrigins"
                                        auto-resize
                                        rows="4"
                                        placeholder="https://app.example.com&#10;https://staging.example.com"
                                        required
                                    />
                                </div>
                                <div class="settings-actions-row">
                                    <Button label="Create key" type="submit" :loading="busy" />
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
                                    <h2>Issued keys</h2>
                                    <p>All capture keys are private to the active organization and remain revocable.</p>
                                </div>
                            </div>

                            <div v-if="captureKeys.length" class="artifact-list">
                                <article v-for="captureKey in captureKeys" :key="captureKey.id" class="artifact-item">
                                    <div class="artifact-item-head">
                                        <div class="page-stack" style="gap: 10px;">
                                            <div>
                                                <div class="artifact-kind">{{ captureKey.name }}</div>
                                                <div class="mono muted">{{ captureKey.public_key }}</div>
                                            </div>
                                            <ul class="list-plain muted">
                                                <li v-for="origin in captureKey.allowed_origins" :key="origin">{{ origin }}</li>
                                            </ul>
                                        </div>
                                        <div class="page-stack" style="gap: 10px; justify-items: end;">
                                            <StatusBadge :value="captureKey.status" />
                                            <Button
                                                v-if="captureKey.status !== 'revoked'"
                                                label="Revoke"
                                                severity="secondary"
                                                variant="outlined"
                                                :loading="busy"
                                                @click="revokeCaptureKey(captureKey)"
                                            />
                                        </div>
                                    </div>
                                </article>
                            </div>
                            <div v-else class="empty-state">
                                No capture keys have been created yet.
                            </div>
                        </div>
                    </template>
                </Card>
            </template>

            <template v-if="section === 'billing'">
                <div class="settings-billing-grid">
                    <Card class="workspace-card">
                        <template #content>
                            <div class="side-summary">
                                <h3>Current plan</h3>
                                <div class="stat-value" style="text-transform: capitalize;">{{ billing.entitlements.plan }}</div>
                                <p class="muted">{{ billing.entitlements.can_record_video ? `Video up to ${billing.entitlements.video_seconds}s` : 'Screenshot only' }}</p>
                            </div>
                        </template>
                    </Card>

                    <Card class="workspace-card">
                        <template #content>
                            <div class="side-summary">
                                <h3>Member limit</h3>
                                <div class="stat-value">{{ billing.entitlements.members }}</div>
                                <p class="muted">Organization seats available on the current plan.</p>
                            </div>
                        </template>
                    </Card>

                    <Card class="workspace-card">
                        <template #content>
                            <div class="side-summary">
                                <h3>Stripe mode</h3>
                                <div class="stat-value">{{ billing.enabled ? 'Live' : 'Disabled' }}</div>
                                <p class="muted">Core product remains usable on free when billing is unavailable.</p>
                            </div>
                        </template>
                    </Card>
                </div>

                <Card class="workspace-card">
                    <template #content>
                        <div class="report-side-card">
                            <div class="section-head">
                                <div>
                                    <h2>Upgrade path</h2>
                                    <p>Checkout starts only when Stripe keys are configured.</p>
                                </div>
                                <Button
                                    v-if="billing.enabled && billing.subscription?.stripe_status"
                                    label="Open billing portal"
                                    severity="secondary"
                                    :loading="busy"
                                    @click="openPortal"
                                />
                            </div>

                            <div class="artifact-list">
                                <article class="artifact-item">
                                    <div class="artifact-item-head">
                                        <div>
                                            <div class="artifact-kind">Free</div>
                                            <div class="muted">3 members, screenshot capture, no video recording.</div>
                                        </div>
                                        <StatusBadge v-if="billing.entitlements.plan === 'free'" value="ready" />
                                    </div>
                                </article>

                                <article class="artifact-item">
                                    <div class="artifact-item-head">
                                        <div>
                                            <div class="artifact-kind">Pro</div>
                                            <div class="muted">10 members, video recording up to 300 seconds.</div>
                                        </div>
                                        <Button
                                            label="Choose Pro"
                                            :disabled="!billing.enabled"
                                            :loading="busy"
                                            @click="startCheckout('pro')"
                                        />
                                    </div>
                                </article>

                                <article class="artifact-item">
                                    <div class="artifact-item-head">
                                        <div>
                                            <div class="artifact-kind">Studio</div>
                                            <div class="muted">50 members, video recording up to 1800 seconds.</div>
                                        </div>
                                        <Button
                                            label="Choose Studio"
                                            :disabled="!billing.enabled"
                                            :loading="busy"
                                            @click="startCheckout('studio')"
                                        />
                                    </div>
                                </article>
                            </div>
                        </div>
                    </template>
                </Card>
            </template>
        </div>

        <template #aside>
            <Card class="workspace-card workspace-card-tight">
                <template #content>
                    <div class="side-summary">
                        <h3>Governance snapshot</h3>
                        <dl class="key-value-list">
                            <div>
                                <dt>Current plan</dt>
                                <dd style="text-transform: capitalize;">{{ billing.entitlements.plan }}</dd>
                            </div>
                            <div>
                                <dt>Seat usage</dt>
                                <dd>{{ members.length }} of {{ billing.entitlements.members }}</dd>
                            </div>
                            <div>
                                <dt>Pending invites</dt>
                                <dd>{{ invitations.length }}</dd>
                            </div>
                            <div>
                                <dt>Capture keys</dt>
                                <dd>{{ captureKeys.length }}</dd>
                            </div>
                        </dl>
                    </div>
                </template>
            </Card>

            <Card class="workspace-card workspace-card-tight">
                <template #content>
                    <div class="side-summary">
                        <h3>Setup shortcuts</h3>
                        <p class="muted">Keep implementation paths one click away for admins and buyers.</p>
                        <div class="stack">
                            <Link :href="route('settings.extension.connect')" class="table-inline-link is-strong">
                                Open extension connect
                            </Link>
                            <Link :href="route('settings.capture-keys')" class="table-inline-link">
                                Manage capture keys
                            </Link>
                            <Link :href="route('profile.edit')" class="table-inline-link">
                                Open full profile editor
                            </Link>
                        </div>
                    </div>
                </template>
            </Card>
        </template>
    </AppShell>
</template>
