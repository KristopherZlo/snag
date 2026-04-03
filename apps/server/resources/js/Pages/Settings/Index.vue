<script setup>
import { computed, reactive, ref, watch } from 'vue';
import axios from 'axios';
import { Link, router } from '@inertiajs/vue3';
import { CircleAlert, CircleCheckBig } from 'lucide-vue-next';
import AppShell from '@/Layouts/AppShell.vue';
import { redirectTo } from '@/Shared/browser';
import ChipSelect from '@/Shared/ChipSelect.vue';
import StatusBadge from '@/Shared/StatusBadge.vue';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { Badge } from '@/Components/ui/badge';
import { buttonVariants, Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Switch } from '@/Components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Textarea } from '@/Components/ui/textarea';
import { integrationProviderDefinitions } from '@/lib/bug-issues';
import { cn } from '@/lib/utils';

const props = defineProps({
    section: {
        type: String,
        required: true,
    },
    canManageCaptureKeys: {
        type: Boolean,
        default: true,
    },
    canManageBilling: {
        type: Boolean,
        default: true,
    },
    canManageIntegrations: {
        type: Boolean,
        default: true,
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
    integrations: {
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
        description: 'Personal account controls stay visible without losing the organization workspace context.',
        shellSection: 'profile',
    },
    members: {
        title: 'Team',
        description: 'Invite members, review current seats, and keep pending access requests visible to workspace owners.',
        shellSection: 'team',
    },
    'capture-keys': {
        title: 'Capture',
        description: 'Create website capture keys for widgets, public forms, and server-side upload flows outside the signed-in workspace.',
        shellSection: 'capture',
    },
    billing: {
        title: 'Billing',
        description: 'Keep plan limits, Stripe availability, and upgrade paths explicit for decision makers.',
        shellSection: 'billing',
    },
    integrations: {
        title: 'Integrations',
        description: 'Connect Jira and GitHub as delivery systems while Snag stays the source of evidence and verification.',
        shellSection: 'integrations',
    },
};

const sectionConfig = computed(() => sectionConfigMap[props.section] ?? sectionConfigMap.profile);

const settingsLinks = computed(() =>
    [
        { key: 'profile', label: 'Profile', href: route('settings.index') },
        { key: 'members', label: 'Members', href: route('settings.members') },
        props.canManageCaptureKeys ? { key: 'capture-keys', label: 'Capture Keys', href: route('settings.capture-keys') } : null,
        props.canManageBilling ? { key: 'billing', label: 'Billing', href: route('settings.billing') } : null,
        props.canManageIntegrations ? { key: 'integrations', label: 'Integrations', href: route('settings.integrations') } : null,
        { key: 'extension', label: 'Extension', href: route('settings.extension.connect') },
        { key: 'extension-captures', label: 'Sent Captures', href: route('settings.extension.captures') },
    ].filter(Boolean),
);

const contextItems = computed(() => [
    { label: 'Plan', value: props.billing.entitlements.plan },
    { label: 'Seat limit', value: props.billing.entitlements.members },
    { label: 'Pending invites', value: props.invitations.length },
    { label: 'Integrations', value: props.integrations.filter((integration) => integration.is_enabled).length },
]);

const invitationRoleOptions = [
    { label: 'Member', value: 'member' },
    { label: 'Admin', value: 'admin' },
];

const integrationForms = reactive(
    Object.fromEntries(
        integrationProviderDefinitions.map((provider) => [
            provider.value,
            {
                is_enabled: false,
                config: Object.fromEntries(provider.configFields.map((field) => [field.key, ''])),
            },
        ]),
    ),
);
const integrationBusy = ref('');
const integrationSecrets = reactive({});

const syncIntegrationForms = () => {
    integrationProviderDefinitions.forEach((provider) => {
        const existing = props.integrations.find((integration) => integration.provider === provider.value);
        integrationForms[provider.value].is_enabled = existing?.is_enabled ?? false;

        provider.configFields.forEach((field) => {
            integrationForms[provider.value].config[field.key] = existing?.config?.[field.key] ?? '';
        });
    });
};

watch(
    () => props.integrations,
    () => {
        syncIntegrationForms();
    },
    { immediate: true, deep: true },
);

const integrationCards = computed(() =>
    integrationProviderDefinitions.map((provider) => {
        const existing = props.integrations.find((integration) => integration.provider === provider.value);

        return {
            ...provider,
            record: existing ?? null,
            form: integrationForms[provider.value],
        };
    }),
);

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

const saveIntegration = async (provider, options = {}) => {
    integrationBusy.value = provider;
    failure.value = '';

    try {
        const { data } = await axios.post(route('api.v1.integrations.store'), {
            provider,
            is_enabled: integrationForms[provider].is_enabled,
            config: { ...integrationForms[provider].config },
            rotate_webhook_secret: options.rotateWebhookSecret ?? false,
        });
        integrationSecrets[provider] = data.integration?.one_time_secrets ?? {};

        feedback.value = `${provider === 'jira' ? 'Jira' : provider === 'github' ? 'GitHub' : 'Trello'} integration saved.`;
        refresh(['integrations']);
    } catch (error) {
        failure.value = error?.response?.data?.message ?? 'Unable to save integration settings.';
    } finally {
        integrationBusy.value = '';
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
        <div class="space-y-6">
            <div class="border-b pb-4">
                <nav class="flex flex-wrap gap-2">
                    <Link
                        v-for="item in settingsLinks"
                        :key="item.key"
                        :href="item.href"
                        :class="cn(buttonVariants({ variant: section === item.key ? 'secondary' : 'outline', size: 'sm' }), 'rounded-md')"
                    >
                        {{ item.label }}
                    </Link>
                </nav>
            </div>

            <Alert v-if="feedback" class="border-primary/25 bg-primary/10 text-foreground">
                <CircleCheckBig class="size-4" />
                <AlertDescription>{{ feedback }}</AlertDescription>
            </Alert>

            <Alert v-if="failure" class="border-rose-200 bg-rose-50 text-rose-950">
                <CircleAlert class="size-4" />
                <AlertDescription>{{ failure }}</AlertDescription>
            </Alert>

            <template v-if="section === 'profile'">
                <Card>
                    <CardHeader>
                        <CardTitle>User profile</CardTitle>
                        <CardDescription>Open the dedicated profile editor for identity, password, and account deletion.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link :href="route('profile.edit')" :class="buttonVariants({ variant: 'outline' })">
                            Open profile editor
                        </Link>
                    </CardContent>
                </Card>
            </template>

            <template v-if="section === 'members'">
                <Card>
                    <CardHeader>
                        <CardTitle>Invite member</CardTitle>
                        <CardDescription>Invite a user and assign the workspace role before they join.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-end" @submit.prevent="createInvitation">
                            <div class="space-y-2">
                                <Label for="invite-email">Email</Label>
                                <Input id="invite-email" v-model="invitationForm.email" type="email" required />
                            </div>

                            <div class="space-y-2">
                                <Label for="invite-role">Role</Label>
                                <ChipSelect
                                    id="invite-role"
                                    :model-value="invitationForm.role"
                                    :options="invitationRoleOptions"
                                    trigger-class="h-10 w-full justify-between rounded-lg px-3"
                                    content-class="min-w-[12rem]"
                                    test-id-prefix="invite-role"
                                    @update:model-value="invitationForm.role = $event"
                                />
                            </div>

                            <div class="flex justify-end">
                                <Button type="submit" :disabled="busy">Send invitation</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle>Current members</CardTitle>
                                <CardDescription>{{ members.length }} active memberships</CardDescription>
                            </div>
                            <Badge variant="outline">Plan limit: {{ billing.entitlements.members }}</Badge>
                        </div>
                    </CardHeader>

                    <CardContent>
                        <div class="overflow-x-auto">
                            <Table class="min-w-[640px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Joined</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow v-for="member in members" :key="member.id">
                                        <TableCell>{{ member.user?.name ?? 'Pending user' }}</TableCell>
                                        <TableCell>{{ member.user?.email ?? 'n/a' }}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" class="capitalize">{{ member.role }}</Badge>
                                        </TableCell>
                                        <TableCell>{{ member.joined_at ? new Date(member.joined_at).toLocaleDateString() : 'n/a' }}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Pending invitations</CardTitle>
                        <CardDescription>Outstanding invitations can be revoked before they are accepted.</CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div v-if="invitations.length" class="overflow-x-auto">
                            <Table class="min-w-[640px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Expires</TableHead>
                                        <TableHead class="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow v-for="invitation in invitations" :key="invitation.id">
                                        <TableCell>{{ invitation.email }}</TableCell>
                                        <TableCell class="capitalize">{{ invitation.role }}</TableCell>
                                        <TableCell>{{ new Date(invitation.expires_at).toLocaleDateString() }}</TableCell>
                                        <TableCell class="text-right">
                                            <Button variant="outline" size="sm" :disabled="busy" @click="cancelInvitation(invitation.id)">
                                                Revoke
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>

                        <div v-else class="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                            Invitations appear here until they are accepted or revoked.
                        </div>
                    </CardContent>
                </Card>
            </template>

            <template v-if="section === 'capture-keys'">
                <Card>
                    <CardHeader>
                        <CardTitle>What a capture key is for</CardTitle>
                        <CardDescription>Use these keys only when another surface needs to send reports into Snag without a logged-in workspace session.</CardDescription>
                    </CardHeader>

                    <CardContent class="grid gap-4 md:grid-cols-3">
                        <div class="rounded-md border p-4">
                            <div class="text-sm font-medium">Use it for</div>
                            <p class="mt-2 text-sm text-muted-foreground">Website widgets, public bug forms, embedded feedback buttons, or server-driven upload flows.</p>
                        </div>
                        <div class="rounded-md border p-4">
                            <div class="text-sm font-medium">Do not use it for</div>
                            <p class="mt-2 text-sm text-muted-foreground">Browser extension connect. The extension uses its own one-time exchange code, not capture keys.</p>
                        </div>
                        <div class="rounded-md border p-4">
                            <div class="text-sm font-medium">How it works</div>
                            <p class="mt-2 text-sm text-muted-foreground">Your external app presents this key to mint short-lived upload sessions scoped to allowed origins.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Create website capture key</CardTitle>
                        <CardDescription>Name the external surface that will create upload sessions, then restrict which origins may use it.</CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form class="space-y-4" @submit.prevent="createCaptureKey">
                            <div class="space-y-2">
                                <Label for="capture-key-name">Key name</Label>
                                <Input id="capture-key-name" v-model="captureKeyForm.name" type="text" placeholder="Marketing site widget" required />
                            </div>

                            <div class="space-y-2">
                                <Label for="capture-key-origins">Allowed origins</Label>
                                <Textarea
                                    id="capture-key-origins"
                                    v-model="captureKeyForm.allowedOrigins"
                                    rows="4"
                                    placeholder="https://app.example.com&#10;https://staging.example.com"
                                    required
                                />
                            </div>

                            <div class="flex justify-end">
                                <Button type="submit" :disabled="busy">Create website key</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Issued keys</CardTitle>
                        <CardDescription>Keys stay private to the active organization and can be revoked at any time.</CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div v-if="captureKeys.length" class="overflow-x-auto">
                            <Table class="min-w-[760px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Public key</TableHead>
                                        <TableHead>Allowed origins</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead class="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow v-for="captureKey in captureKeys" :key="captureKey.id">
                                        <TableCell>{{ captureKey.name }}</TableCell>
                                        <TableCell class="font-mono text-sm">{{ captureKey.public_key }}</TableCell>
                                        <TableCell>
                                            <div class="space-y-1 text-sm text-muted-foreground">
                                                <div v-for="origin in captureKey.allowed_origins" :key="origin">{{ origin }}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge :value="captureKey.status" />
                                        </TableCell>
                                        <TableCell class="text-right">
                                            <Button
                                                v-if="captureKey.status !== 'revoked'"
                                                variant="outline"
                                                size="sm"
                                                :disabled="busy"
                                                @click="revokeCaptureKey(captureKey)"
                                            >
                                                Revoke
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>

                        <div v-else class="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                            No capture keys have been created yet.
                        </div>
                    </CardContent>
                </Card>
            </template>

            <template v-if="section === 'integrations'">
                <Card class="rounded-lg shadow-none">
                    <CardHeader class="border-b pb-4">
                        <CardTitle>Sync strategy</CardTitle>
                        <CardDescription>Snag keeps evidence and verification. External trackers keep delivery ownership.</CardDescription>
                    </CardHeader>
                    <CardContent class="grid gap-0 pt-4 lg:grid-cols-3">
                        <div class="space-y-1 border-b px-1 py-3 lg:border-b-0 lg:border-r lg:px-4 lg:py-0">
                            <div class="text-sm font-medium">Push from Snag</div>
                            <p class="text-sm text-muted-foreground">Title, summary, urgency, linked evidence, and canonical Snag URLs.</p>
                        </div>
                        <div class="space-y-1 border-b px-1 py-3 lg:border-b-0 lg:border-r lg:px-4 lg:py-0">
                            <div class="text-sm font-medium">Pull from tracker</div>
                            <p class="text-sm text-muted-foreground">Assignee, delivery state, and final resolution changes arrive via webhooks.</p>
                        </div>
                        <div class="space-y-1 px-1 py-3 lg:px-4 lg:py-0">
                            <div class="text-sm font-medium">Guest sharing</div>
                            <p class="text-sm text-muted-foreground">Share links stay in Snag, with private debugger payloads hidden by default.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card v-for="provider in integrationCards" :key="provider.value" class="rounded-lg shadow-none">
                    <CardHeader class="border-b pb-4">
                        <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div class="space-y-2">
                                <div class="flex flex-wrap items-center gap-2">
                                    <CardTitle>{{ provider.label }}</CardTitle>
                                    <Badge variant="outline" class="rounded-md">
                                        {{ provider.record?.is_enabled ? 'Enabled' : 'Disabled' }}
                                    </Badge>
                                </div>
                                <CardDescription>{{ provider.description }}</CardDescription>
                            </div>

                            <div class="flex items-center gap-3 rounded-lg border px-3 py-2">
                                <div class="text-right">
                                    <div class="text-sm font-medium">Sync enabled</div>
                                    <div class="text-xs text-muted-foreground">Controls outbound create and webhook processing.</div>
                                </div>
                                <Switch
                                    v-model="provider.form.is_enabled"
                                    :disabled="integrationBusy !== '' && integrationBusy !== provider.value"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent class="space-y-4 pt-4">
                        <div class="grid gap-4 lg:grid-cols-2">
                            <div v-for="field in provider.configFields" :key="field.key" class="space-y-2">
                                <Label :for="`${provider.value}-${field.key}`">{{ field.label }}</Label>
                                <Input
                                    :id="`${provider.value}-${field.key}`"
                                    v-model="provider.form.config[field.key]"
                                    :type="field.type ?? 'text'"
                                    :placeholder="field.placeholder"
                                    :disabled="integrationBusy !== '' && integrationBusy !== provider.value"
                                />
                            </div>
                        </div>

                        <div v-if="provider.record?.webhook_url" class="grid gap-4 rounded-lg border bg-muted/40 p-4 lg:grid-cols-2">
                            <div class="space-y-2">
                                <Label :for="`${provider.value}-webhook-url`">Webhook URL</Label>
                                <Input
                                    :id="`${provider.value}-webhook-url`"
                                    :model-value="provider.record.webhook_url"
                                    readonly
                                />
                            </div>

                            <div class="space-y-2">
                                <Label :for="`${provider.value}-webhook-secret`">Webhook secret</Label>
                                <Input
                                    :id="`${provider.value}-webhook-secret`"
                                    :model-value="provider.record.webhook_secret_masked || (provider.record.has_webhook_secret ? 'Stored securely' : 'Not generated yet')"
                                    readonly
                                />
                            </div>
                        </div>

                        <div
                            v-if="integrationSecrets[provider.value]?.webhook_secret"
                            class="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-4"
                        >
                            <Label :for="`${provider.value}-revealed-webhook-secret`">New webhook secret</Label>
                            <Input
                                :id="`${provider.value}-revealed-webhook-secret`"
                                :model-value="integrationSecrets[provider.value].webhook_secret"
                                readonly
                            />
                            <p class="text-sm text-muted-foreground">
                                Copy this value now. It will not be shown again after this response.
                            </p>
                        </div>

                        <div class="flex flex-wrap items-center gap-3">
                            <Button
                                :disabled="integrationBusy !== '' && integrationBusy !== provider.value"
                                class="rounded-md"
                                @click="saveIntegration(provider.value)"
                            >
                                {{ integrationBusy === provider.value ? 'Saving…' : 'Save integration' }}
                            </Button>
                            <Button
                                v-if="provider.record?.webhook_url"
                                variant="outline"
                                :disabled="integrationBusy !== '' && integrationBusy !== provider.value"
                                class="rounded-md"
                                @click="saveIntegration(provider.value, { rotateWebhookSecret: true })"
                            >
                                Rotate webhook secret
                            </Button>
                            <p class="text-sm text-muted-foreground">
                                {{ provider.value === 'trello' ? 'Trello currently supports linked card references and sharing only.' : 'Stored credentials stay masked after save. Use the saved webhook URL in the external system to keep Snag updated.' }}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </template>

            <template v-if="section === 'billing'">
                <Card>
                    <CardHeader>
                        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle>Plan summary</CardTitle>
                                <CardDescription>Billing controls stay explicit, but the product remains usable when Stripe is unavailable.</CardDescription>
                            </div>
                            <Button
                                v-if="billing.enabled && billing.subscription?.stripe_status"
                                variant="outline"
                                :disabled="busy"
                                @click="openPortal"
                            >
                                Open billing portal
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent class="space-y-4">
                        <div class="grid gap-4 sm:grid-cols-3">
                            <div class="rounded-md border p-4">
                                <div class="text-sm font-medium">Current plan</div>
                                <div class="mt-1 capitalize">{{ billing.entitlements.plan }}</div>
                            </div>
                            <div class="rounded-md border p-4">
                                <div class="text-sm font-medium">Member limit</div>
                                <div class="mt-1">{{ billing.entitlements.members }}</div>
                            </div>
                            <div class="rounded-md border p-4">
                                <div class="text-sm font-medium">Stripe mode</div>
                                <div class="mt-1">{{ billing.enabled ? 'Live' : 'Disabled' }}</div>
                            </div>
                        </div>

                        <div class="rounded-md border p-4 text-sm text-muted-foreground">
                            {{ billing.entitlements.can_record_video ? `Video recording available up to ${billing.entitlements.video_seconds} seconds.` : 'Current plan supports screenshot capture only.' }}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Available plans</CardTitle>
                        <CardDescription>Choose the plan that matches the required member count and recording capability.</CardDescription>
                    </CardHeader>

                    <CardContent class="space-y-4">
                        <div class="space-y-4">
                            <div class="flex flex-col gap-4 rounded-md border p-4 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <div class="font-medium">Free</div>
                                    <div class="text-sm text-muted-foreground">3 members, screenshot capture, no video recording.</div>
                                </div>
                                <StatusBadge v-if="billing.entitlements.plan === 'free'" value="ready" />
                            </div>

                            <div class="flex flex-col gap-4 rounded-md border p-4 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <div class="font-medium">Pro</div>
                                    <div class="text-sm text-muted-foreground">10 members, video recording up to 300 seconds.</div>
                                </div>
                                <Button :disabled="!billing.enabled || busy" @click="startCheckout('pro')">
                                    Choose Pro
                                </Button>
                            </div>

                            <div class="flex flex-col gap-4 rounded-md border p-4 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <div class="font-medium">Studio</div>
                                    <div class="text-sm text-muted-foreground">50 members, video recording up to 1800 seconds.</div>
                                </div>
                                <Button :disabled="!billing.enabled || busy" @click="startCheckout('studio')">
                                    Choose Studio
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </template>
        </div>

    </AppShell>
</template>
