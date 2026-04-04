<script setup>
import { computed, reactive, ref } from 'vue';
import axios from 'axios';
import { router } from '@inertiajs/vue3';
import { CircleAlert, CircleCheckBig } from 'lucide-vue-next';
import AppShell from '@/Layouts/AppShell.vue';
import CaptureTicketPanel from '@/Shared/CaptureTicketPanel.vue';
import ReportTriageControls from '@/Shared/ReportTriageControls.vue';
import StatusBadge from '@/Shared/StatusBadge.vue';
import TextLink from '@/Shared/TextLink.vue';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { Badge } from '@/Components/ui/badge';
import { buttonVariants, Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Separator } from '@/Components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { cn } from '@/lib/utils';

const props = defineProps({
    report: {
        type: Object,
        required: true,
    },
    availableIssues: {
        type: Array,
        default: () => [],
    },
});

const busy = ref(false);
const feedback = ref('');
const failure = ref('');
const deleteDialogVisible = ref(false);
const activeTab = ref('details');
const networkFilter = ref('');
const selectedNetworkSequence = ref(null);
const triage = reactive({
    workflow_state: props.report.workflow_state,
    urgency: props.report.urgency,
    tag: props.report.tag,
});

const primaryArtifact = computed(() =>
    props.report.artifacts.find((artifact) => ['screenshot', 'video'].includes(artifact.kind)) ?? null,
);

const contextItems = computed(() => [
    { label: 'Status', value: props.report.status },
    { label: 'State', value: triage.workflow_state },
    { label: 'Urgency', value: triage.urgency },
    { label: 'Tag', value: triage.tag },
    { label: 'Visibility', value: props.report.visibility },
    { label: 'Capture', value: props.report.media_kind },
]);

const filteredNetworkRequests = computed(() => {
    const query = networkFilter.value.trim().toLowerCase();

    if (query === '') {
        return props.report.debugger.network_requests;
    }

    return props.report.debugger.network_requests.filter((request) =>
        [request.method, request.url, String(request.status_code ?? '')].some((value) =>
            String(value).toLowerCase().includes(query),
        ),
    );
});

const selectedNetworkRequest = computed(() => {
    const explicit = filteredNetworkRequests.value.find((request) => request.sequence === selectedNetworkSequence.value);
    return explicit ?? filteredNetworkRequests.value[0] ?? null;
});

const debuggerStartedAt = computed(() => {
    const timestamps = [
        ...props.report.debugger.actions.map((action) => action.happened_at),
        ...props.report.debugger.logs.map((log) => log.happened_at),
        ...props.report.debugger.network_requests.map((request) => request.happened_at),
    ].filter(Boolean);

    if (timestamps.length === 0) {
        return null;
    }

    return Math.min(...timestamps.map((value) => Date.parse(value)));
});

const detailsItems = computed(() => {
    const context = props.report.debugger_context ?? {};

    return [
        { label: 'URL', value: context.url || 'n/a' },
        { label: 'Browser', value: context.user_agent || 'n/a' },
        { label: 'OS', value: context.platform || 'n/a' },
        { label: 'Viewport', value: context.viewport ? `${context.viewport.width}x${context.viewport.height}` : 'n/a' },
        { label: 'Screen', value: context.screen ? `${context.screen.width}x${context.screen.height}` : 'n/a' },
        { label: 'Language', value: context.language || 'n/a' },
        { label: 'Timezone', value: context.timezone || 'n/a' },
    ];
});

const captureContextItems = computed(() => [
    (() => {
        const internalReporter = props.report.reporter?.name
            ? `${props.report.reporter.name}${props.report.reporter.email ? ` (${props.report.reporter.email})` : ''}`
            : props.report.reporter?.email || null;
        const visitor = props.report.debugger_meta?.user ?? props.report.debugger_context?.user ?? null;
        const visitorParts = [
            visitor?.name || null,
            visitor?.email || null,
            visitor?.id ? `ID ${visitor.id}` : null,
            visitor?.account_name ? `Account ${visitor.account_name}` : null,
        ].filter(Boolean);

        return {
            label: 'Reporter',
            value: internalReporter || visitorParts.join(' • ') || 'n/a',
        };
    })(),
    { label: 'State', value: triage.workflow_state.replaceAll('_', ' ') },
    { label: 'Urgency', value: triage.urgency },
    { label: 'Tag', value: triage.tag.replaceAll('_', ' ') },
    { label: 'Capture priority', value: props.report.debugger_meta?.priority || 'none' },
    { label: 'Organization', value: props.report.organization?.name || 'n/a' },
    { label: 'Description', value: props.report.summary || 'No description provided.' },
]);

const artifactInventory = computed(() =>
    props.report.artifacts.map((artifact) => ({
        kind: artifact.kind,
        contentType: artifact.content_type,
        url: artifact.url,
    })),
);

const reportSummaryRows = computed(() => [
    { label: 'Media kind', value: props.report.media_kind },
    { label: 'Content type', value: primaryArtifact.value?.content_type || 'n/a' },
    { label: 'Captured at', value: formatAbsoluteTimestamp(props.report.captured_at) },
    { label: 'Workflow', value: triage.workflow_state.replaceAll('_', ' ') },
    { label: 'Urgency', value: triage.urgency },
    { label: 'Tag', value: triage.tag.replaceAll('_', ' ') },
    { label: 'Visibility', value: props.report.visibility },
]);

const copyShareUrl = async () => {
    if (!props.report.share_url) {
        return;
    }

    await navigator.clipboard.writeText(props.report.share_url);
    feedback.value = 'Share link copied to clipboard.';
    failure.value = '';
};

const retryIngestion = async () => {
    busy.value = true;
    failure.value = '';

    try {
        await axios.post(route('api.v1.reports.retry', props.report.id));
        feedback.value = 'Ingestion retry queued.';
        router.reload();
    } catch (error) {
        failure.value = error?.response?.data?.message ?? 'Unable to queue retry.';
    } finally {
        busy.value = false;
    }
};

const openDeleteDialog = () => {
    failure.value = '';
    deleteDialogVisible.value = true;
};

const closeDeleteDialog = () => {
    if (busy.value) {
        return;
    }

    deleteDialogVisible.value = false;
};

const deleteReport = async () => {
    if (busy.value) {
        return;
    }

    busy.value = true;
    failure.value = '';

    try {
        await axios.delete(route('api.v1.reports.destroy', props.report.id));
        deleteDialogVisible.value = false;
        router.visit(route('dashboard'));
    } catch (error) {
        failure.value = error?.response?.data?.message ?? 'Unable to delete report.';
    } finally {
        busy.value = false;
    }
};

const formatAbsoluteTimestamp = (value) => {
    if (!value) {
        return 'n/a';
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return 'n/a';
    }

    return parsed.toISOString().replace('T', ' ').replace('Z', ' UTC');
};

const formatTimelineOffset = (value) => {
    if (!value || !debuggerStartedAt.value) {
        return '';
    }

    const totalSeconds = Math.max(0, (Date.parse(value) - debuggerStartedAt.value) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed(1).padStart(4, '0');

    return `${minutes}:${seconds}`;
};

const formatActionSummary = (action) => {
    if (action.type === 'input') {
        const count = action.payload?.event_count ?? 1;
        const fieldLength = action.payload?.field_length ?? action.value?.length ?? 0;

        return `${count} input events | field length ${fieldLength} characters`;
    }

    if (action.type === 'navigation') {
        return action.value || 'Navigation event';
    }

    return action.value || action.selector || 'No additional details.';
};

const applyTriageUpdate = (payload) => {
    triage.workflow_state = payload.workflow_state;
    triage.urgency = payload.urgency;
    triage.tag = payload.tag;
};
</script>

<template>
    <AppShell
        :title="report.title"
        description="Review this capture, its evidence, and the next ticket decision without leaving the workspace."
        section="reports"
        :context-items="contextItems"
    >
        <div class="space-y-6">
            <Card>
                <CardHeader>
                    <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <CardTitle>Capture summary</CardTitle>
                            <CardDescription class="whitespace-pre-wrap break-all [overflow-wrap:anywhere]">
                                {{ report.summary || 'No summary was attached when this capture was finalized.' }}
                            </CardDescription>
                        </div>

                        <div class="flex flex-wrap gap-2">
                            <StatusBadge :value="report.status" />
                            <StatusBadge :value="triage.workflow_state" />
                            <StatusBadge :value="triage.urgency" />
                            <StatusBadge :value="triage.tag" />
                            <Badge variant="outline" class="capitalize">{{ report.visibility }}</Badge>
                            <Badge variant="secondary" class="capitalize">{{ report.media_kind }}</Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent class="space-y-3">
                    <div class="flex flex-wrap gap-2">
                        <Badge variant="outline">Steps: {{ report.debugger.actions.length }}</Badge>
                        <Badge variant="outline">Console: {{ report.debugger.logs.length }}</Badge>
                        <Badge variant="outline">Network: {{ report.debugger.network_requests.length }}</Badge>
                    </div>

                    <div class="overflow-x-auto">
                        <Table class="min-w-[32rem]">
                            <TableBody>
                                <TableRow v-for="row in reportSummaryRows" :key="row.label">
                                    <TableCell class="w-40 font-medium">{{ row.label }}</TableCell>
                                    <TableCell
                                        class="break-all text-sm text-muted-foreground"
                                        :data-testid="
                                            row.label === 'Media kind'
                                                ? 'report-media-kind'
                                                : row.label === 'Content type'
                                                  ? 'report-content-type'
                                                  : undefined
                                        "
                                    >
                                        {{ row.value }}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>

                        <div class="rounded-md border p-4">
                            <div class="text-sm font-medium">Share URL</div>
                            <div class="mt-2 break-all text-sm text-muted-foreground">
                            {{
                                report.share_url
                                    ? report.share_url
                                    : report.has_public_share
                                      ? 'Public sharing is active. The raw URL is only revealed when the share is created.'
                                      : 'No public share URL is available.'
                            }}
                            </div>
                        </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Capture evidence</CardTitle>
                    <CardDescription v-if="primaryArtifact?.url">
                        Signed access is generated on demand through guarded storage URLs.
                    </CardDescription>
                    <CardDescription v-else>
                        No signed asset URL is available for this environment.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <div v-if="primaryArtifact?.url" class="overflow-hidden rounded-md border bg-muted">
                        <img
                            v-if="primaryArtifact.kind === 'screenshot'"
                            :src="primaryArtifact.url"
                            alt="Bug report screenshot"
                            class="block max-h-[42rem] w-full object-contain"
                        />
                        <video
                            v-else
                            :src="primaryArtifact.url"
                            controls
                            preload="metadata"
                            class="block max-h-[42rem] w-full"
                        />
                    </div>
                    <div v-else class="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                        Storage driver does not currently expose a temporary URL for the primary artifact.
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Technical details</CardTitle>
                    <CardDescription>Environment, user steps, console output, and captured network activity for this capture.</CardDescription>
                </CardHeader>

                <CardContent>
                    <Tabs v-model="activeTab" class="gap-4">
                        <TabsList>
                            <TabsTrigger value="details" @click="activeTab = 'details'">Details</TabsTrigger>
                            <TabsTrigger value="steps" @click="activeTab = 'steps'">Steps</TabsTrigger>
                            <TabsTrigger value="console" @click="activeTab = 'console'">Console</TabsTrigger>
                            <TabsTrigger value="network" @click="activeTab = 'network'">Network</TabsTrigger>
                        </TabsList>

                        <TabsContent value="details" class="space-y-4">
                            <div class="grid gap-4 xl:grid-cols-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle class="text-base">Environment</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Table class="w-full table-fixed">
                                            <TableBody>
                                                <TableRow v-for="item in detailsItems" :key="item.label">
                                                    <TableCell class="w-40 align-top font-medium">{{ item.label }}</TableCell>
                                                    <TableCell class="min-w-0 whitespace-pre-wrap break-all align-top text-sm text-muted-foreground [overflow-wrap:anywhere]">
                                                        {{ item.value }}
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle class="text-base">Capture context</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Table class="w-full table-fixed">
                                            <TableBody>
                                                <TableRow v-for="item in captureContextItems" :key="item.label">
                                                    <TableCell class="w-40 align-top font-medium">{{ item.label }}</TableCell>
                                                    <TableCell class="min-w-0 whitespace-pre-wrap break-all align-top text-sm text-muted-foreground [overflow-wrap:anywhere]">
                                                        {{ item.value }}
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="steps" class="space-y-3">
                            <div
                                v-for="action in report.debugger.actions"
                                :key="`${action.sequence}-${action.type}`"
                                class="rounded-md border p-4"
                                data-testid="report-step-item"
                            >
                                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div class="space-y-2">
                                        <div class="font-medium">{{ action.label || action.type }}</div>
                                        <time v-if="action.happened_at" class="block font-mono text-sm text-muted-foreground" :datetime="action.happened_at">
                                            {{ formatAbsoluteTimestamp(action.happened_at) }}
                                        </time>
                                        <p class="whitespace-pre-wrap break-all text-sm text-muted-foreground [overflow-wrap:anywhere]">{{ formatActionSummary(action) }}</p>
                                        <div v-if="action.selector" class="break-all font-mono text-sm">{{ action.selector }}</div>
                                    </div>
                                    <Badge variant="outline">#{{ action.sequence }} · {{ formatTimelineOffset(action.happened_at) }}</Badge>
                                </div>
                            </div>

                            <div v-if="report.debugger.actions.length === 0" class="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                                No action steps were captured.
                            </div>
                        </TabsContent>

                        <TabsContent value="console">
                            <div v-if="report.debugger.logs.length" class="overflow-x-auto">
                                <Table class="min-w-[44rem]">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Seq</TableHead>
                                            <TableHead>Level</TableHead>
                                            <TableHead>Message</TableHead>
                                            <TableHead>Offset</TableHead>
                                            <TableHead>Timestamp</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow v-for="log in report.debugger.logs" :key="`${log.sequence}-${log.level}-${log.happened_at}`">
                                            <TableCell>{{ log.sequence }}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" class="capitalize">{{ log.level }}</Badge>
                                            </TableCell>
                                            <TableCell class="whitespace-pre-wrap break-all [overflow-wrap:anywhere]">{{ log.message }}</TableCell>
                                            <TableCell class="font-mono">{{ formatTimelineOffset(log.happened_at) }}</TableCell>
                                            <TableCell>
                                                <time class="font-mono" :datetime="log.happened_at">
                                                    {{ formatAbsoluteTimestamp(log.happened_at) }}
                                                </time>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                            <div v-else class="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                                No console logs captured.
                            </div>
                        </TabsContent>

                        <TabsContent value="network" class="space-y-4">
                            <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                                <Card>
                                    <CardHeader>
                                        <CardTitle class="text-base">Captured requests</CardTitle>
                                        <CardDescription>{{ filteredNetworkRequests.length }} matching requests</CardDescription>
                                    </CardHeader>
                                    <CardContent class="space-y-4">
                                        <div class="space-y-2">
                                            <Label for="network-filter">Filter by method, URL, or status</Label>
                                            <Input
                                                id="network-filter"
                                                v-model="networkFilter"
                                                type="text"
                                                placeholder="Filter by method, URL, or status..."
                                            />
                                        </div>

                                        <div v-if="filteredNetworkRequests.length" class="overflow-x-auto">
                                            <Table class="min-w-[56rem] table-fixed">
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead class="w-20">Method</TableHead>
                                                        <TableHead>URL</TableHead>
                                                        <TableHead class="w-24">Status</TableHead>
                                                        <TableHead class="w-28">Duration</TableHead>
                                                        <TableHead class="w-48">Captured</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    <TableRow
                                                        v-for="request in filteredNetworkRequests"
                                                        :key="`${request.sequence}-${request.url}-${request.happened_at}`"
                                                        class="cursor-pointer"
                                                        data-testid="report-network-row"
                                                        :data-state="selectedNetworkRequest?.sequence === request.sequence ? 'selected' : undefined"
                                                        @click="selectedNetworkSequence = request.sequence"
                                                    >
                                                        <TableCell class="font-mono whitespace-nowrap">{{ request.method }}</TableCell>
                                                        <TableCell class="text-sm text-muted-foreground">
                                                            <div class="truncate" :title="request.url">{{ request.url }}</div>
                                                        </TableCell>
                                                        <TableCell class="whitespace-nowrap">{{ request.status_code ?? 'n/a' }}</TableCell>
                                                        <TableCell class="whitespace-nowrap">{{ request.duration_ms ? `${request.duration_ms}ms` : 'n/a' }}</TableCell>
                                                        <TableCell>
                                                            <time class="block whitespace-nowrap font-mono text-sm" :datetime="request.happened_at">
                                                                {{ formatAbsoluteTimestamp(request.happened_at) }}
                                                            </time>
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </div>

                                        <div v-else class="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                                            No network requests match the current filter.
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle class="text-base">Request details</CardTitle>
                                    </CardHeader>
                                    <CardContent class="space-y-4">
                                        <template v-if="selectedNetworkRequest">
                                            <div class="space-y-4">
                                                <div class="space-y-1">
                                                    <div class="text-sm font-medium">URL</div>
                                                    <div class="break-all text-sm text-muted-foreground">{{ selectedNetworkRequest.url }}</div>
                                                </div>
                                                <div class="grid gap-4 sm:grid-cols-3">
                                                    <div>
                                                        <div class="text-sm font-medium">Method</div>
                                                        <div class="text-sm text-muted-foreground">{{ selectedNetworkRequest.method }}</div>
                                                    </div>
                                                    <div>
                                                        <div class="text-sm font-medium">Status</div>
                                                        <div class="text-sm text-muted-foreground">{{ selectedNetworkRequest.status_code ?? 'n/a' }}</div>
                                                    </div>
                                                    <div>
                                                        <div class="text-sm font-medium">Duration</div>
                                                        <div class="text-sm text-muted-foreground">
                                                            {{ selectedNetworkRequest.duration_ms ? `${selectedNetworkRequest.duration_ms} ms` : 'n/a' }}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div class="text-sm font-medium">Captured</div>
                                                    <time class="mt-1 block font-mono text-sm text-muted-foreground" :datetime="selectedNetworkRequest.happened_at">
                                                        {{ formatAbsoluteTimestamp(selectedNetworkRequest.happened_at) }}
                                                    </time>
                                                </div>
                                            </div>

                                            <Separator />

                                            <div class="space-y-4">
                                                <div>
                                                    <div class="text-sm font-medium">URL query params</div>
                                                    <div v-if="Object.keys(selectedNetworkRequest.meta?.query || {}).length" class="mt-2 rounded-md border bg-muted px-4 py-3 font-mono text-sm whitespace-pre-wrap break-all [overflow-wrap:anywhere]">
                                                        <div v-for="(value, key) in selectedNetworkRequest.meta.query" :key="key">{{ key }}: {{ value }}</div>
                                                    </div>
                                                    <div v-else class="mt-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground">No query params captured.</div>
                                                </div>

                                                <div>
                                                    <div class="text-sm font-medium">Request headers</div>
                                                    <div v-if="Object.keys(selectedNetworkRequest.request_headers || {}).length" class="mt-2 rounded-md border bg-muted px-4 py-3 font-mono text-sm whitespace-pre-wrap break-all [overflow-wrap:anywhere]">
                                                        <div v-for="(value, key) in selectedNetworkRequest.request_headers" :key="key">{{ key }}: {{ value }}</div>
                                                    </div>
                                                    <div v-else class="mt-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground">No request headers captured.</div>
                                                </div>

                                                <div>
                                                    <div class="text-sm font-medium">Response headers</div>
                                                    <div v-if="Object.keys(selectedNetworkRequest.response_headers || {}).length" class="mt-2 rounded-md border bg-muted px-4 py-3 font-mono text-sm whitespace-pre-wrap break-all [overflow-wrap:anywhere]">
                                                        <div v-for="(value, key) in selectedNetworkRequest.response_headers" :key="key">{{ key }}: {{ value }}</div>
                                                    </div>
                                                    <div v-else class="mt-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground">No response headers captured.</div>
                                                </div>
                                            </div>
                                        </template>

                                        <div v-else class="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                                            Select a request to inspect its details.
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>

        <template #aside>
            <Card>
                <CardHeader>
                    <CardTitle class="text-base">Ticket</CardTitle>
                    <CardDescription>Decide whether this capture needs a new ticket or belongs in an existing one.</CardDescription>
                </CardHeader>
                <CardContent class="space-y-4">
                    <CaptureTicketPanel
                        :report-id="report.id"
                        :linked-ticket="report.linked_issue"
                        :available-tickets="availableIssues"
                        :suggested-title="report.title"
                        :suggested-summary="report.summary"
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle class="text-base">More actions</CardTitle>
                    <CardDescription>Adjust triage, public sharing, or recovery actions for this capture.</CardDescription>
                </CardHeader>

                <CardContent class="space-y-4">
                    <ReportTriageControls
                        :report-id="report.id"
                        :workflow-state="triage.workflow_state"
                        :urgency="triage.urgency"
                        :tag="triage.tag"
                        @updated="applyTriageUpdate"
                    />

                    <div class="flex flex-col gap-2">
                        <StatusBadge :value="report.status" />
                        <Button
                            v-if="report.share_url"
                            variant="outline"
                            :disabled="busy"
                            @click="copyShareUrl"
                        >
                            Copy public share link
                        </Button>
                        <a
                            v-if="report.share_url"
                            :href="report.share_url"
                            target="_blank"
                            rel="noreferrer"
                            :class="cn(buttonVariants({ variant: 'outline' }), 'justify-start')"
                        >
                            Open public view
                        </a>
                        <Button variant="outline" :disabled="busy" @click="retryIngestion">
                            Retry ingestion
                        </Button>
                    </div>

                    <Alert v-if="feedback" class="border-primary/25 bg-primary/10 text-foreground">
                        <CircleCheckBig class="size-4" />
                        <AlertDescription>{{ feedback }}</AlertDescription>
                    </Alert>
                    <Alert v-if="failure" class="border-rose-200 bg-rose-50 text-rose-950">
                        <CircleAlert class="size-4" />
                        <AlertDescription>{{ failure }}</AlertDescription>
                    </Alert>

                    <div v-if="!report.share_url && !report.has_public_share" class="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                        Public sharing disabled for this capture.
                    </div>
                    <div v-else-if="!report.share_url" class="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                        Public sharing is active. The URL is only shown once when the public share is created.
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle class="text-base">Danger zone</CardTitle>
                    <CardDescription>Delete this capture only when you are sure it should be removed from the workspace.</CardDescription>
                </CardHeader>

                <CardContent class="space-y-4">
                    <Button variant="destructive" :disabled="busy" data-testid="report-delete-trigger" @click="openDeleteDialog">
                        Delete capture
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle class="text-base">Evidence files</CardTitle>
                    <CardDescription>Private storage objects attached to this capture.</CardDescription>
                </CardHeader>

                <CardContent class="space-y-4">
                    <div v-for="(artifact, index) in artifactInventory" :key="artifact.kind" class="space-y-4">
                        <div class="space-y-2">
                            <div class="font-medium capitalize">{{ artifact.kind }}</div>
                            <div class="text-sm text-muted-foreground">{{ artifact.contentType }}</div>
                            <TextLink
                                v-if="artifact.url"
                                :href="artifact.url"
                                native
                                target="_blank"
                                rel="noreferrer"
                                class="text-sm font-medium text-primary hover:underline"
                            >
                                Open signed URL
                            </TextLink>
                            <div v-else class="text-sm text-muted-foreground">Unavailable on current disk</div>
                        </div>
                        <Separator v-if="index !== artifactInventory.length - 1" />
                    </div>
                </CardContent>
            </Card>
        </template>

        <Dialog :open="deleteDialogVisible" @update:open="(next) => (!next ? closeDeleteDialog() : null)">
            <DialogContent
                class="sm:max-w-md"
                :show-close-button="false"
                @interact-outside.prevent
            >
                <DialogHeader>
                    <DialogTitle>Delete this report and schedule artifact cleanup?</DialogTitle>
                    <DialogDescription>
                        Delete this capture only when you are sure it should be removed from the workspace.
                    </DialogDescription>
                </DialogHeader>

                <div class="rounded-md border bg-muted/20 px-4 py-3 text-sm" data-testid="report-delete-dialog-summary">
                    <div class="font-medium">{{ report.title }}</div>
                    <div class="mt-1 whitespace-pre-wrap break-all text-muted-foreground [overflow-wrap:anywhere]">{{ report.summary || 'No summary attached.' }}</div>
                </div>

                <div v-if="failure" class="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-950">
                    {{ failure }}
                </div>

                <DialogFooter class="gap-2 sm:justify-end">
                    <Button variant="outline" :disabled="busy" data-testid="report-delete-dialog-cancel" @click="closeDeleteDialog">
                        Keep capture
                    </Button>
                    <Button variant="destructive" :disabled="busy" data-testid="report-delete-dialog-confirm" @click="deleteReport">
                        Delete capture
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </AppShell>
</template>
