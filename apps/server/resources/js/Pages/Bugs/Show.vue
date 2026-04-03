<script setup>
import { computed, reactive, ref, watch } from 'vue';
import axios from 'axios';
import AppShell from '@/Layouts/AppShell.vue';
import ArtifactPreview from '@/Shared/ArtifactPreview.vue';
import ChipSelect from '@/Shared/ChipSelect.vue';
import StatusBadge from '@/Shared/StatusBadge.vue';
import TextLink from '@/Shared/TextLink.vue';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Checkbox } from '@/Components/ui/checkbox';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Separator } from '@/Components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Textarea } from '@/Components/ui/textarea';
import {
    issueExternalProviderOptions,
    issueResolutionOptions,
    issueUrgencyOptions,
    issueWorkflowOptions,
} from '@/lib/bug-issues';
import { formatDateTime } from '@/lib/intl';

const props = defineProps({
    issue: {
        type: Object,
        required: true,
    },
    availableReports: {
        type: Array,
        default: () => [],
    },
    members: {
        type: Array,
        default: () => [],
    },
});

const issueState = ref(props.issue);
const labelsInput = ref('');
const feedback = ref('');
const failure = ref('');
const saveBusy = ref(false);
const attachBusy = ref(false);
const shareBusy = ref(false);
const externalBusy = ref(false);
const createdShare = ref(null);
const draft = reactive({
    title: props.issue.title,
    summary: props.issue.summary ?? '',
    workflow_state: props.issue.workflow_state,
    urgency: props.issue.urgency,
    resolution: props.issue.resolution,
    assignee_id: props.issue.assignee?.id ? String(props.issue.assignee.id) : '',
    verification_checklist: { ...props.issue.verification_checklist },
});
const attachForm = reactive({
    report_id: '',
    is_primary: false,
});
const shareForm = reactive({
    name: '',
    expires_at: '',
});
const externalForm = reactive({
    provider: 'jira',
    action: 'create',
    external_key: '',
    external_url: '',
    is_primary: false,
});

const memberOptions = computed(() => [
    { label: 'Unassigned', value: '' },
    ...props.members.map((member) => ({
        label: member.name || member.email,
        value: String(member.id),
    })),
]);
const reportOptions = computed(() => [
    { label: 'Add capture', value: '' },
    ...props.availableReports.map((report) => ({
        label: `${report.title} (${report.media_kind})`,
        value: String(report.id),
    })),
]);
const externalActionOptions = computed(() =>
    externalForm.provider === 'trello'
        ? [{ label: 'Link existing', value: 'link' }]
        : [
              { label: 'Create new', value: 'create' },
              { label: 'Link existing', value: 'link' },
          ],
);
const contextItems = computed(() => [
    { label: 'Key', value: issueState.value.key },
    { label: 'Stage', value: issueState.value.workflow_state.replaceAll('_', ' ') },
    { label: 'Urgency', value: issueState.value.urgency },
    { label: 'Resolution', value: issueState.value.resolution.replaceAll('_', ' ') },
]);
const latestReport = computed(() => issueState.value.reports[0] ?? null);
const primaryEvidence = computed(() => issueState.value.reports.find((report) => report.is_primary) ?? issueState.value.reports[0] ?? null);
const evidenceSummary = computed(() => {
    const count = issueState.value.linked_reports_count;

    if (count === 0) {
        return 'No captures are linked yet. Add the first capture to start the evidence trail for this ticket.';
    }

    if (!primaryEvidence.value) {
        return `${count} captures are linked to this ticket.`;
    }

    return `${count} captures are linked to this ticket. Primary evidence: ${primaryEvidence.value.title}.`;
});

const syncDraft = (issue) => {
    issueState.value = issue;
    draft.title = issue.title;
    draft.summary = issue.summary ?? '';
    draft.workflow_state = issue.workflow_state;
    draft.urgency = issue.urgency;
    draft.resolution = issue.resolution;
    draft.assignee_id = issue.assignee?.id ? String(issue.assignee.id) : '';
    draft.verification_checklist = { ...issue.verification_checklist };
    labelsInput.value = (issue.labels ?? []).join(', ');
};

watch(
    () => props.issue,
    (value) => {
        syncDraft(value);
    },
    { immediate: true },
);

watch(
    () => externalForm.provider,
    (provider) => {
        if (provider === 'trello') {
            externalForm.action = 'link';
        }
    },
);

const parseLabels = () =>
    labelsInput.value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

const applyIssue = (issue, message = '') => {
    syncDraft(issue);

    if (message) {
        feedback.value = message;
    }

    failure.value = '';
    attachForm.report_id = '';
    attachForm.is_primary = false;
    shareForm.name = '';
    shareForm.expires_at = '';
    externalForm.external_key = '';
    externalForm.external_url = '';

    if (!issue.share_tokens.some((token) => token.id === createdShare.value?.id)) {
        createdShare.value = null;
    }
};

const saveIssue = async () => {
    if (saveBusy.value) {
        return;
    }

    if (draft.workflow_state === 'done' && draft.resolution === 'unresolved') {
        failure.value = 'Done issues must have a final resolution.';
        return;
    }

    saveBusy.value = true;

    try {
        const { data } = await axios.patch(route('api.v1.issues.update', issueState.value.id), {
            title: draft.title.trim(),
            summary: draft.summary.trim() || null,
            workflow_state: draft.workflow_state,
            urgency: draft.urgency,
            resolution: draft.resolution,
            assignee_id: draft.assignee_id === '' ? null : Number(draft.assignee_id),
            labels: parseLabels(),
            verification_checklist: draft.verification_checklist,
        });

        applyIssue(data.issue, 'Ticket updated.');
    } catch (error) {
        failure.value = error?.response?.data?.message ?? 'Unable to update this ticket.';
    } finally {
        saveBusy.value = false;
    }
};

const attachReport = async () => {
    if (attachBusy.value || attachForm.report_id === '') {
        return;
    }

    attachBusy.value = true;

    try {
        const { data } = await axios.post(route('api.v1.issues.reports.store', issueState.value.id), {
            report_id: Number(attachForm.report_id),
            is_primary: attachForm.is_primary,
        });

        applyIssue(data.issue, 'Capture added to the ticket.');
    } catch (error) {
        failure.value = error?.response?.data?.message ?? 'Unable to add the selected capture.';
    } finally {
        attachBusy.value = false;
    }
};

const detachReport = async (reportId) => {
    if (attachBusy.value) {
        return;
    }

    attachBusy.value = true;

    try {
        const { data } = await axios.delete(
            route('api.v1.issues.reports.destroy', {
                bugIssue: issueState.value.id,
                bugReport: reportId,
            }),
        );
        applyIssue(data.issue, 'Capture removed from the ticket.');
    } catch (error) {
        failure.value = error?.response?.data?.message ?? 'Unable to remove this capture from the ticket.';
    } finally {
        attachBusy.value = false;
    }
};

const createShareLink = async () => {
    if (shareBusy.value) {
        return;
    }

    shareBusy.value = true;

    try {
        const { data } = await axios.post(route('api.v1.issues.share-links.store', issueState.value.id), {
            name: shareForm.name.trim() || null,
            expires_at: shareForm.expires_at || null,
        });
        createdShare.value = data.share ?? null;
        applyIssue(data.issue, 'Guest share link created.');
    } catch (error) {
        failure.value = error?.response?.data?.message ?? 'Unable to create a guest share link.';
    } finally {
        shareBusy.value = false;
    }
};

const revokeShareLink = async (shareTokenId) => {
    if (shareBusy.value) {
        return;
    }

    shareBusy.value = true;

    try {
        const { data } = await axios.delete(
            route('api.v1.issues.share-links.destroy', {
                bugIssue: issueState.value.id,
                shareToken: shareTokenId,
            }),
        );
        if (createdShare.value?.id === shareTokenId) {
            createdShare.value = null;
        }
        applyIssue(data.issue, 'Guest share link revoked.');
    } catch (error) {
        failure.value = error?.response?.data?.message ?? 'Unable to revoke this share link.';
    } finally {
        shareBusy.value = false;
    }
};

const saveExternalLink = async () => {
    if (externalBusy.value) {
        return;
    }

    externalBusy.value = true;

    try {
        const payload = {
            provider: externalForm.provider,
            action: externalForm.action,
            external_key: externalForm.action === 'link' ? externalForm.external_key.trim() : null,
            external_url: externalForm.action === 'link' ? externalForm.external_url.trim() : null,
            is_primary: externalForm.is_primary,
        };
        const { data } = await axios.post(route('api.v1.issues.external-links.store', issueState.value.id), payload);
        applyIssue(data.issue, externalForm.action === 'create' ? 'External ticket created.' : 'External ticket linked.');
    } catch (error) {
        failure.value = error?.response?.data?.message ?? 'Unable to save the external link.';
    } finally {
        externalBusy.value = false;
    }
};

const syncExternalLink = async (externalLinkId) => {
    if (externalBusy.value) {
        return;
    }

    externalBusy.value = true;

    try {
        const { data } = await axios.post(
            route('api.v1.issues.external-links.sync', {
                bugIssue: issueState.value.id,
                externalLink: externalLinkId,
            }),
        );
        applyIssue(data.issue, 'External ticket synced.');
    } catch (error) {
        failure.value = error?.response?.data?.message ?? 'Unable to sync this external ticket.';
    } finally {
        externalBusy.value = false;
    }
};

const removeExternalLink = async (externalLinkId) => {
    if (externalBusy.value) {
        return;
    }

    externalBusy.value = true;

    try {
        const { data } = await axios.delete(
            route('api.v1.issues.external-links.destroy', {
                bugIssue: issueState.value.id,
                externalLink: externalLinkId,
            }),
        );
        applyIssue(data.issue, 'External link removed.');
    } catch (error) {
        failure.value = error?.response?.data?.message ?? 'Unable to remove this external link.';
    } finally {
        externalBusy.value = false;
    }
};
</script>

<template>
    <AppShell
        :title="issueState.title"
        :description="issueState.summary || 'Tracked ticket with linked captures, guest sharing, and external sync state.'"
        section="backlog"
        :context-items="contextItems"
    >
        <div class="space-y-6">
            <Card>
                <CardHeader>
                    <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <div class="text-xs uppercase tracking-[0.12em] text-muted-foreground">{{ issueState.key }}</div>
                            <CardTitle>Ticket overview</CardTitle>
                            <CardDescription>Keep the ticket state, ownership, and verification checklist aligned before it moves into external trackers.</CardDescription>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <StatusBadge :value="issueState.workflow_state" />
                            <StatusBadge :value="issueState.urgency" />
                            <StatusBadge :value="issueState.resolution" />
                            <StatusBadge
                                v-if="issueState.primary_external_link"
                                :value="issueState.primary_external_link.provider"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                        <div class="space-y-4">
                            <div class="space-y-2">
                                <Label for="issue-title">Title</Label>
                                <Input id="issue-title" v-model="draft.title" />
                            </div>

                            <div class="space-y-2">
                                <Label for="issue-summary">Summary</Label>
                                <Textarea id="issue-summary" v-model="draft.summary" rows="6" />
                            </div>

                            <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <div class="space-y-2">
                                    <Label for="issue-workflow">Stage</Label>
                                    <ChipSelect id="issue-workflow" v-model="draft.workflow_state" :options="issueWorkflowOptions" trigger-class="w-full justify-between px-3" content-class="min-w-[12rem]" test-id-prefix="issue-workflow" />
                                </div>
                                <div class="space-y-2">
                                    <Label for="issue-urgency">Urgency</Label>
                                    <ChipSelect id="issue-urgency" v-model="draft.urgency" :options="issueUrgencyOptions" trigger-class="w-full justify-between px-3" content-class="min-w-[12rem]" test-id-prefix="issue-urgency" />
                                </div>
                                <div class="space-y-2">
                                    <Label for="issue-resolution">Resolution</Label>
                                    <ChipSelect id="issue-resolution" v-model="draft.resolution" :options="issueResolutionOptions" trigger-class="w-full justify-between px-3" content-class="min-w-[12rem]" test-id-prefix="issue-resolution" />
                                </div>
                                <div class="space-y-2">
                                    <Label for="issue-assignee">Assignee</Label>
                                    <ChipSelect id="issue-assignee" v-model="draft.assignee_id" :options="memberOptions" trigger-class="w-full justify-between px-3" content-class="min-w-[12rem]" test-id-prefix="issue-assignee" />
                                </div>
                            </div>

                            <div class="space-y-2">
                                <Label for="issue-labels">Labels</Label>
                                <Input id="issue-labels" v-model="labelsInput" placeholder="checkout, regression, mobile" />
                            </div>
                        </div>

                        <div class="space-y-4 rounded-2xl border bg-muted/30 p-4">
                            <div>
                                <div class="text-sm font-medium">Verification checklist</div>
                                <div class="text-sm text-muted-foreground">Keep QA handoff explicit inside Snag even when implementation lives elsewhere.</div>
                            </div>

                            <label class="flex items-center gap-3 text-sm">
                                <Checkbox v-model="draft.verification_checklist.reproduced" />
                                Reproduced internally
                            </label>
                            <label class="flex items-center gap-3 text-sm">
                                <Checkbox v-model="draft.verification_checklist.fix_linked" />
                                Fix or external ticket linked
                            </label>
                            <label class="flex items-center gap-3 text-sm">
                                <Checkbox v-model="draft.verification_checklist.verified" />
                                Verified and ready to close
                            </label>

                            <div class="space-y-2 border-t pt-4">
                                <div class="text-sm font-medium">Handoff package</div>
                                <div class="flex flex-wrap gap-3">
                                    <TextLink :href="issueState.handoff_urls.markdown" native target="_blank" rel="noreferrer" class="text-sm font-medium text-primary hover:underline">Markdown</TextLink>
                                    <TextLink :href="issueState.handoff_urls.text" native target="_blank" rel="noreferrer" class="text-sm font-medium text-primary hover:underline">Text</TextLink>
                                    <TextLink :href="issueState.handoff_urls.json" native target="_blank" rel="noreferrer" class="text-sm font-medium text-primary hover:underline">JSON</TextLink>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-3 border-t pt-4">
                        <Button :disabled="saveBusy" @click="saveIssue">{{ saveBusy ? 'Saving...' : 'Save ticket' }}</Button>
                        <p v-if="feedback" class="text-sm text-primary">{{ feedback }}</p>
                        <p v-if="failure" class="text-sm text-rose-700">{{ failure }}</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Ticket evidence</CardTitle>
                    <CardDescription>Use this view to understand what the ticket already contains before you add, remove, or share captures.</CardDescription>
                </CardHeader>
                <CardContent class="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
                    <div class="overflow-hidden rounded-2xl border bg-muted">
                        <div class="aspect-[16/10]">
                            <ArtifactPreview
                                :preview="issueState.preview"
                                :media-kind="latestReport?.media_kind ?? 'screenshot'"
                                :alt="issueState.title"
                                media-class="h-full w-full object-cover"
                                placeholder-icon-class="size-8 text-muted-foreground"
                            />
                        </div>
                    </div>

                    <div class="space-y-4">
                        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <div class="rounded-xl border p-4">
                                <div class="text-sm font-medium">Captures</div>
                                <div class="mt-1 text-2xl font-semibold">{{ issueState.linked_reports_count }}</div>
                            </div>
                            <div class="rounded-xl border p-4">
                                <div class="text-sm font-medium">Reporters</div>
                                <div class="mt-1 text-2xl font-semibold">{{ issueState.reporters_count }}</div>
                            </div>
                            <div class="rounded-xl border p-4">
                                <div class="text-sm font-medium">First seen</div>
                                <div class="mt-1 text-sm text-muted-foreground">{{ formatDateTime(issueState.first_seen_at, { fallback: 'n/a' }) }}</div>
                            </div>
                            <div class="rounded-xl border p-4">
                                <div class="text-sm font-medium">Last seen</div>
                                <div class="mt-1 text-sm text-muted-foreground">{{ formatDateTime(issueState.last_seen_at, { fallback: 'n/a' }) }}</div>
                            </div>
                        </div>

                        <div class="rounded-2xl border p-4">
                            <div class="text-sm font-medium">Latest capture summary</div>
                            <div v-if="latestReport?.debugger_summary" class="mt-3 grid gap-3 md:grid-cols-2">
                                <div class="text-sm text-muted-foreground">
                                    URL: {{ latestReport.debugger_summary.url || 'n/a' }}
                                </div>
                                <div class="text-sm text-muted-foreground">
                                    Platform: {{ latestReport.debugger_summary.platform || 'n/a' }}
                                </div>
                                <div class="text-sm text-muted-foreground">
                                    Steps: {{ latestReport.debugger_summary.steps_count }}
                                </div>
                                <div class="text-sm text-muted-foreground">
                                    Console / Network: {{ latestReport.debugger_summary.console_count }} / {{ latestReport.debugger_summary.network_count }}
                                </div>
                            </div>
                            <div v-else class="mt-3 text-sm text-muted-foreground">No debugger summary attached yet.</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <CardTitle>Evidence</CardTitle>
                            <CardDescription>Add captures to this ticket when duplicate reports or fresh reproductions arrive.</CardDescription>
                        </div>
                        <div class="flex flex-col gap-2 sm:flex-row">
                            <ChipSelect
                                id="attach-report"
                                v-model="attachForm.report_id"
                                :options="reportOptions"
                                trigger-class="w-full justify-between px-3 sm:w-[18rem]"
                                content-class="min-w-[18rem]"
                            />
                            <label class="flex items-center gap-2 text-sm text-muted-foreground">
                                <Checkbox v-model="attachForm.is_primary" />
                                Make primary evidence
                            </label>
                            <Button data-testid="issue-add-capture" :disabled="attachBusy || attachForm.report_id === ''" @click="attachReport">
                                {{ attachBusy ? 'Adding...' : 'Add capture' }}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div class="rounded-xl border bg-muted/30 p-4" data-testid="issue-evidence-summary">
                        <div class="text-sm font-medium">Evidence summary</div>
                        <p class="mt-1 text-sm text-muted-foreground">{{ evidenceSummary }}</p>
                    </div>

                    <div class="overflow-x-auto">
                        <Table class="min-w-[68rem]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Capture</TableHead>
                                    <TableHead>Technical summary</TableHead>
                                    <TableHead>Reporter</TableHead>
                                    <TableHead>Captured</TableHead>
                                    <TableHead class="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow v-for="report in issueState.reports" :key="report.id">
                                    <TableCell class="align-top">
                                        <div class="flex gap-3">
                                            <div class="w-20 shrink-0 overflow-hidden rounded-xl border bg-muted">
                                                <div class="aspect-[16/10]">
                                                    <ArtifactPreview
                                                        :preview="report.preview"
                                                        :media-kind="report.media_kind"
                                                        :alt="report.title"
                                                        media-class="h-full w-full object-cover"
                                                        placeholder-icon-class="size-5 text-muted-foreground"
                                                    />
                                                </div>
                                            </div>
                                            <div class="min-w-0 space-y-1">
                                                <div class="flex flex-wrap items-center gap-2">
                                                    <TextLink :href="report.report_url" class="text-sm font-medium text-primary hover:underline">{{ report.title }}</TextLink>
                                                    <Badge v-if="report.is_primary" variant="outline">Primary evidence</Badge>
                                                </div>
                                                <div class="line-clamp-2 text-sm text-muted-foreground">{{ report.summary || 'No summary provided yet.' }}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell class="align-top text-sm text-muted-foreground">
                                        {{ report.debugger_summary.steps_count }} steps / {{ report.debugger_summary.console_count }} console / {{ report.debugger_summary.network_count }} network
                                    </TableCell>
                                    <TableCell class="align-top text-sm text-muted-foreground">
                                        {{ report.reporter?.name || 'Anonymous reporter' }}
                                    </TableCell>
                                    <TableCell class="align-top text-sm text-muted-foreground">
                                        {{ formatDateTime(report.created_at, { fallback: 'n/a' }) }}
                                    </TableCell>
                                    <TableCell class="text-right">
                                        <Button :data-testid="`issue-remove-capture-${report.id}`" variant="outline" size="sm" :disabled="attachBusy" @click="detachReport(report.id)">
                                            Remove from ticket
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Activity and sync history</CardTitle>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div v-for="activity in issueState.activities" :key="activity.id" class="rounded-xl border p-4">
                        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div class="font-medium">{{ activity.description }}</div>
                                <div class="text-sm text-muted-foreground">
                                    {{ activity.user?.name || activity.user?.email || 'System' }}
                                </div>
                            </div>
                            <div class="text-sm text-muted-foreground">
                                {{ formatDateTime(activity.created_at, { fallback: 'n/a' }) }}
                            </div>
                        </div>
                        <div v-if="Object.keys(activity.meta || {}).length" class="mt-3 rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">
                            <pre class="whitespace-pre-wrap break-all">{{ JSON.stringify(activity.meta, null, 2) }}</pre>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        <template #aside>
            <Card>
                <CardHeader>
                    <CardTitle class="text-base">Sharing</CardTitle>
                    <CardDescription>Guest shares expose summary, preview, and linked tracker references without leaking raw private debugger payloads.</CardDescription>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div class="space-y-2">
                        <Label for="share-name">Share label</Label>
                        <Input id="share-name" v-model="shareForm.name" placeholder="QA handoff" />
                    </div>
                    <div class="space-y-2">
                        <Label for="share-expiry">Expires at</Label>
                        <Input id="share-expiry" v-model="shareForm.expires_at" type="datetime-local" />
                    </div>
                    <Button class="w-full" :disabled="shareBusy" @click="createShareLink">
                        {{ shareBusy ? 'Creating...' : 'Create guest share link' }}
                    </Button>

                    <Separator />

                    <div class="space-y-4">
                        <div v-if="createdShare?.url" class="rounded-xl border border-primary/20 bg-primary/5 p-3">
                            <div class="text-sm font-medium">Newest guest share link</div>
                            <div class="mt-1 text-xs text-muted-foreground">
                                Copy or open it now. Raw share URLs are not shown again after reload.
                            </div>
                            <div class="mt-3">
                                <TextLink :href="createdShare.url" native target="_blank" rel="noreferrer" class="text-sm font-medium text-primary hover:underline">
                                    Open newest share
                                </TextLink>
                            </div>
                        </div>

                        <div v-for="token in issueState.share_tokens" :key="token.id" class="rounded-xl border p-3">
                            <div class="text-sm font-medium">{{ token.name }}</div>
                            <div class="mt-1 text-xs text-muted-foreground">{{ formatDateTime(token.expires_at, { fallback: 'No expiry' }) }}</div>
                            <div class="mt-1 text-xs text-muted-foreground">
                                URL is revealed only when the share link is created.
                            </div>
                            <div class="mt-3 flex flex-wrap gap-3">
                                <Button v-if="!token.revoked_at" variant="outline" size="sm" :disabled="shareBusy" @click="revokeShareLink(token.id)">
                                    Revoke
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle class="text-base">External sync</CardTitle>
                    <CardDescription>Create or link external tickets while keeping Snag as the evidence source of truth.</CardDescription>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div class="space-y-2">
                        <Label for="external-provider">Provider</Label>
                        <ChipSelect id="external-provider" v-model="externalForm.provider" :options="issueExternalProviderOptions" trigger-class="w-full justify-between px-3" content-class="min-w-[12rem]" />
                    </div>
                    <div class="space-y-2">
                        <Label for="external-action">Action</Label>
                        <ChipSelect id="external-action" v-model="externalForm.action" :options="externalActionOptions" trigger-class="w-full justify-between px-3" content-class="min-w-[12rem]" />
                    </div>
                    <div v-if="externalForm.action === 'link'" class="space-y-4">
                        <div class="space-y-2">
                            <Label for="external-key">External key</Label>
                            <Input id="external-key" v-model="externalForm.external_key" placeholder="BUG-123 or #456" />
                        </div>
                        <div class="space-y-2">
                            <Label for="external-url">External URL</Label>
                            <Input id="external-url" v-model="externalForm.external_url" placeholder="https://jira.example.com/browse/BUG-123" />
                        </div>
                    </div>
                    <label class="flex items-center gap-2 text-sm text-muted-foreground">
                        <Checkbox v-model="externalForm.is_primary" />
                        Mark as primary sync target
                    </label>
                    <Button class="w-full" :disabled="externalBusy" @click="saveExternalLink">
                        {{ externalBusy ? 'Saving...' : externalForm.action === 'create' ? 'Create external ticket' : 'Link external ticket' }}
                    </Button>

                    <Separator />

                    <div class="space-y-4">
                        <div v-for="link in issueState.external_links" :key="link.id" class="rounded-xl border p-3">
                            <div class="flex items-center gap-2">
                                <StatusBadge :value="link.provider" />
                                <Badge v-if="link.is_primary" variant="outline">Primary</Badge>
                            </div>
                            <div class="mt-2 text-sm font-medium">{{ link.external_key }}</div>
                            <div class="mt-1 text-xs text-muted-foreground">{{ link.last_synced_at ? `Last synced ${formatDateTime(link.last_synced_at)}` : 'Not synced yet' }}</div>
                            <div v-if="link.last_sync_error" class="mt-2 text-xs text-rose-700">{{ link.last_sync_error }}</div>
                            <div class="mt-3 flex flex-wrap gap-3">
                                <TextLink :href="link.external_url" native target="_blank" rel="noreferrer" class="text-sm font-medium text-primary hover:underline">Open ticket</TextLink>
                                <Button variant="outline" size="sm" :disabled="externalBusy" @click="syncExternalLink(link.id)">Resync</Button>
                                <Button variant="outline" size="sm" :disabled="externalBusy" @click="removeExternalLink(link.id)">Remove</Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </template>
    </AppShell>
</template>
