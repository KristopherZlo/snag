<script setup>
import AppShell from '@/Layouts/AppShell.vue';
import StatusBadge from '@/Shared/StatusBadge.vue';
import axios from 'axios';
import { router } from '@inertiajs/vue3';
import Button from 'primevue/button';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Tag from 'primevue/tag';
import { computed, ref } from 'vue';

const props = defineProps({
    report: {
        type: Object,
        required: true,
    },
});

const busy = ref(false);
const feedback = ref('');
const failure = ref('');
const activeTab = ref('details');
const networkFilter = ref('');
const selectedNetworkSequence = ref(null);

const primaryArtifact = computed(() =>
    props.report.artifacts.find((artifact) => ['screenshot', 'video'].includes(artifact.kind)) ?? null,
);

const contextItems = computed(() => [
    { label: 'Status', value: props.report.status },
    { label: 'Visibility', value: props.report.visibility },
    { label: 'Capture', value: props.report.media_kind },
]);

const filteredNetworkRequests = computed(() => {
    const query = networkFilter.value.trim().toLowerCase();

    if (query === '') {
        return props.report.debugger.network_requests;
    }

    return props.report.debugger.network_requests.filter((request) => {
        return [
            request.method,
            request.url,
            String(request.status_code ?? ''),
        ].some((value) => String(value).toLowerCase().includes(query));
    });
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
        {
            label: 'Viewport',
            value: context.viewport ? `${context.viewport.width}x${context.viewport.height}` : 'n/a',
        },
        {
            label: 'Screen',
            value: context.screen ? `${context.screen.width}x${context.screen.height}` : 'n/a',
        },
        { label: 'Language', value: context.language || 'n/a' },
        { label: 'Timezone', value: context.timezone || 'n/a' },
    ];
});

const ticketItems = computed(() => [
    { label: 'Priority', value: props.report.debugger_meta?.priority || 'none' },
    {
        label: 'Reporter',
        value: props.report.reporter?.name
            ? `${props.report.reporter.name}${props.report.reporter.email ? ` (${props.report.reporter.email})` : ''}`
            : (props.report.reporter?.email || 'n/a'),
    },
    { label: 'Org', value: props.report.organization?.name || 'n/a' },
    { label: 'Description', value: props.report.summary || 'No description provided.' },
]);

const artifactInventory = computed(() =>
    props.report.artifacts.map((artifact) => ({
        kind: artifact.kind,
        contentType: artifact.content_type,
        url: artifact.url,
    })),
);

const networkSummary = computed(() => ({
    total: props.report.debugger.network_requests.length,
    errors: props.report.debugger.network_requests.filter((request) => Number(request.status_code) >= 400).length,
}));

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

const deleteReport = async () => {
    if (!window.confirm('Delete this report and schedule artifact cleanup?')) {
        return;
    }

    busy.value = true;
    failure.value = '';

    try {
        await axios.delete(route('api.v1.reports.destroy', props.report.id));
        router.visit(route('dashboard'));
    } catch (error) {
        failure.value = error?.response?.data?.message ?? 'Unable to delete report.';
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
</script>

<template>
    <AppShell
        :title="report.title"
        description="Review the finalized artifact, debugger telemetry, and next triage actions without leaving the report workspace."
        section="reports"
        :context-items="contextItems"
    >
        <div class="page-stack">
            <Card class="workspace-card">
                <template #content>
                    <div class="report-summary-card">
                        <div class="report-summary-head">
                            <div class="report-summary-copy">
                                <h2>Triage summary</h2>
                                <p>{{ report.summary || 'No summary was attached during finalize.' }}</p>
                            </div>
                            <div class="report-summary-tags">
                                <StatusBadge :value="report.status" />
                                <Tag :value="report.visibility" severity="secondary" />
                                <Tag :value="report.media_kind" severity="contrast" />
                            </div>
                        </div>

                        <div class="report-summary-grid">
                            <section class="surface-note">
                                <div class="section-head">
                                    <div>
                                        <h3>Viewer access</h3>
                                        <p>Keep share state explicit before forwarding the report outside the workspace.</p>
                                    </div>
                                </div>
                                <div class="detail-list">
                                    <div class="detail-item">
                                        <span class="detail-label">Share token endpoint</span>
                                        <div class="mono report-break-anywhere">{{ report.share_url ?? 'Public sharing disabled for this report.' }}</div>
                                    </div>
                                </div>
                            </section>

                            <section class="surface-note">
                                <div class="section-head">
                                    <div>
                                        <h3>Telemetry coverage</h3>
                                        <p>Quick read before diving into tabs.</p>
                                    </div>
                                </div>
                                <dl class="key-value-list">
                                    <div>
                                        <dt>User steps</dt>
                                        <dd>{{ report.debugger.actions.length }}</dd>
                                    </div>
                                    <div>
                                        <dt>Console events</dt>
                                        <dd>{{ report.debugger.logs.length }}</dd>
                                    </div>
                                    <div>
                                        <dt>Network requests</dt>
                                        <dd>{{ networkSummary.total }}</dd>
                                    </div>
                                    <div>
                                        <dt>Network errors</dt>
                                        <dd>{{ networkSummary.errors }}</dd>
                                    </div>
                                </dl>
                            </section>
                        </div>
                    </div>
                </template>
            </Card>

            <Card class="workspace-card">
                <template #content>
                    <div class="report-artifact-card">
                        <div class="section-head">
                            <div>
                                <h2>Primary artifact</h2>
                                <p v-if="primaryArtifact?.url">Signed access is generated on demand through guarded storage URLs.</p>
                                <p v-else>No signed asset URL is available for this environment.</p>
                            </div>
                        </div>

                        <div v-if="primaryArtifact?.url" class="media-frame">
                            <img
                                v-if="primaryArtifact.kind === 'screenshot'"
                                :src="primaryArtifact.url"
                                alt="Bug report screenshot"
                            />
                            <video
                                v-else
                                :src="primaryArtifact.url"
                                controls
                                preload="metadata"
                            />
                        </div>
                        <div v-else class="empty-state">
                            Storage driver does not currently expose a temporary URL for the primary artifact.
                        </div>
                    </div>
                </template>
            </Card>

            <Card class="workspace-card">
                <template #content>
                    <div class="telemetry-workspace">
                        <div class="section-head">
                            <div>
                                <h2>Debugger telemetry</h2>
                                <p>System context, user steps, console output, and captured network activity for this report.</p>
                            </div>
                        </div>

                        <div class="debugger-tabs">
                            <button
                                v-for="tab in ['details', 'steps', 'console', 'network']"
                                :key="tab"
                                class="debugger-tab"
                                :class="{ 'is-active': activeTab === tab }"
                                type="button"
                                @click="activeTab = tab"
                            >
                                {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
                            </button>
                        </div>

                        <div v-if="activeTab === 'details'" class="debugger-grid">
                            <section class="debugger-panel">
                                <div class="debugger-panel-title">Isolate context</div>
                                <div class="detail-list">
                                    <div v-for="item in detailsItems" :key="item.label" class="detail-item">
                                        <span class="detail-label">{{ item.label }}</span>
                                        <div class="mono report-break-anywhere">{{ item.value }}</div>
                                    </div>
                                </div>
                            </section>

                            <section class="debugger-panel">
                                <div class="debugger-panel-title">Ticket info</div>
                                <div class="detail-list">
                                    <div v-for="item in ticketItems" :key="item.label" class="detail-item">
                                        <span class="detail-label">{{ item.label }}</span>
                                        <div class="report-break-anywhere">{{ item.value }}</div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div v-else-if="activeTab === 'steps'" class="timeline-list">
                            <article v-for="action in report.debugger.actions" :key="`${action.sequence}-${action.type}`" class="timeline-item">
                                <div class="timeline-seq">{{ action.sequence }}</div>
                                <div class="timeline-body">
                                    <div class="timeline-head">
                                        <strong>{{ action.label || action.type }}</strong>
                                        <span class="muted mono">{{ formatTimelineOffset(action.happened_at) }}</span>
                                    </div>
                                    <time v-if="action.happened_at" class="muted mono" :datetime="action.happened_at">
                                        {{ formatAbsoluteTimestamp(action.happened_at) }}
                                    </time>
                                    <div class="muted">{{ formatActionSummary(action) }}</div>
                                    <div v-if="action.selector" class="mono report-break-anywhere">{{ action.selector }}</div>
                                </div>
                            </article>
                            <div v-if="report.debugger.actions.length === 0" class="empty-state">
                                No action steps were captured.
                            </div>
                        </div>

                        <div v-else-if="activeTab === 'console'" class="debugger-panel">
                            <div v-if="report.debugger.logs.length" class="table-wrap">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Seq</th>
                                            <th>Level</th>
                                            <th>Message</th>
                                            <th>Offset</th>
                                            <th>Timestamp</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="log in report.debugger.logs" :key="`${log.sequence}-${log.level}-${log.happened_at}`">
                                            <td>{{ log.sequence }}</td>
                                            <td><Tag :value="log.level" severity="secondary" /></td>
                                            <td>{{ log.message }}</td>
                                            <td class="mono">{{ formatTimelineOffset(log.happened_at) }}</td>
                                            <td>
                                                <time class="mono" :datetime="log.happened_at">
                                                    {{ formatAbsoluteTimestamp(log.happened_at) }}
                                                </time>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div v-else class="empty-state">
                                No console logs captured.
                            </div>
                        </div>

                        <div v-else class="debugger-grid debugger-grid-wide">
                            <section class="debugger-panel">
                                <div class="section-head">
                                    <div>
                                        <div class="debugger-panel-title">Captured requests</div>
                                        <p>{{ filteredNetworkRequests.length }} matching requests</p>
                                    </div>
                                </div>

                                <label class="field">
                                    <span class="detail-label">Filter by method, URL, or status</span>
                                    <InputText
                                        v-model="networkFilter"
                                        type="text"
                                        placeholder="Filter by method, URL, or status..."
                                    />
                                </label>

                                <div class="network-list">
                                    <button
                                        v-for="request in filteredNetworkRequests"
                                        :key="`${request.sequence}-${request.url}-${request.happened_at}`"
                                        class="network-item"
                                        :class="{ 'is-active': selectedNetworkRequest?.sequence === request.sequence }"
                                        type="button"
                                        @click="selectedNetworkSequence = request.sequence"
                                    >
                                        <div class="network-row">
                                            <strong class="mono">{{ request.method }}</strong>
                                            <Tag
                                                :value="String(request.status_code ?? 'n/a')"
                                                :severity="Number(request.status_code) >= 400 ? 'danger' : 'success'"
                                            />
                                        </div>
                                        <div class="mono network-url">{{ request.url }}</div>
                                        <div class="network-row muted">
                                            <span>{{ request.meta?.host || 'n/a' }}</span>
                                            <span>{{ request.duration_ms ? `${request.duration_ms}ms` : 'n/a' }}</span>
                                            <span>{{ formatTimelineOffset(request.happened_at) }}</span>
                                        </div>
                                        <time class="muted mono" :datetime="request.happened_at">
                                            {{ formatAbsoluteTimestamp(request.happened_at) }}
                                        </time>
                                    </button>
                                </div>

                                <div v-if="filteredNetworkRequests.length === 0" class="empty-state">
                                    No network requests match the current filter.
                                </div>
                            </section>

                            <section class="debugger-panel">
                                <div v-if="selectedNetworkRequest" class="stack">
                                    <div class="detail-list">
                                        <div class="detail-item">
                                            <span class="detail-label">URL</span>
                                            <div class="mono report-break-anywhere">{{ selectedNetworkRequest.url }}</div>
                                        </div>
                                        <div class="detail-item">
                                            <span class="detail-label">Captured</span>
                                            <time class="mono" :datetime="selectedNetworkRequest.happened_at">
                                                {{ formatAbsoluteTimestamp(selectedNetworkRequest.happened_at) }}
                                            </time>
                                        </div>
                                    </div>

                                    <div class="debugger-subsection">
                                        <div class="debugger-panel-title">Overview</div>
                                        <div class="detail-list">
                                            <div class="detail-item">
                                                <span class="detail-label">Method</span>
                                                <div>{{ selectedNetworkRequest.method }}</div>
                                            </div>
                                            <div class="detail-item">
                                                <span class="detail-label">Status</span>
                                                <div>{{ selectedNetworkRequest.status_code ?? 'n/a' }}</div>
                                            </div>
                                            <div class="detail-item">
                                                <span class="detail-label">Duration</span>
                                                <div>{{ selectedNetworkRequest.duration_ms ? `${selectedNetworkRequest.duration_ms} ms` : 'n/a' }}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="debugger-subsection">
                                        <div class="debugger-panel-title">URL query params</div>
                                        <div v-if="Object.keys(selectedNetworkRequest.meta?.query || {}).length" class="code-block mono">
                                            <div v-for="(value, key) in selectedNetworkRequest.meta.query" :key="key">{{ key }}: {{ value }}</div>
                                        </div>
                                        <div v-else class="empty-state">No query params captured.</div>
                                    </div>

                                    <div class="debugger-subsection">
                                        <div class="debugger-panel-title">Request headers</div>
                                        <div v-if="Object.keys(selectedNetworkRequest.request_headers || {}).length" class="code-block mono">
                                            <div v-for="(value, key) in selectedNetworkRequest.request_headers" :key="key">{{ key }}: {{ value }}</div>
                                        </div>
                                        <div v-else class="empty-state">No request headers captured.</div>
                                    </div>

                                    <div class="debugger-subsection">
                                        <div class="debugger-panel-title">Response headers</div>
                                        <div v-if="Object.keys(selectedNetworkRequest.response_headers || {}).length" class="code-block mono">
                                            <div v-for="(value, key) in selectedNetworkRequest.response_headers" :key="key">{{ key }}: {{ value }}</div>
                                        </div>
                                        <div v-else class="empty-state">No response headers captured.</div>
                                    </div>
                                </div>
                                <div v-else class="empty-state">
                                    Select a request to inspect its details.
                                </div>
                            </section>
                        </div>
                    </div>
                </template>
            </Card>
        </div>

        <template #aside>
            <Card class="workspace-card workspace-card-tight">
                <template #content>
                    <div class="report-side-card">
                        <div class="section-head">
                            <div>
                                <h3>Report controls</h3>
                                <p>Everything required to move or share the report without leaving this workspace.</p>
                            </div>
                        </div>

                        <div class="report-actions">
                            <StatusBadge :value="report.status" />
                            <Button
                                v-if="report.share_url"
                                label="Copy share link"
                                severity="secondary"
                                @click="copyShareUrl"
                            />
                            <Button
                                v-if="report.share_url"
                                as="a"
                                label="Open public view"
                                severity="secondary"
                                :href="report.share_url"
                                target="_blank"
                                rel="noreferrer"
                            />
                            <Button
                                label="Retry ingestion"
                                severity="secondary"
                                :loading="busy"
                                @click="retryIngestion"
                            />
                            <Button
                                label="Delete"
                                severity="danger"
                                variant="outlined"
                                :loading="busy"
                                @click="deleteReport"
                            />
                        </div>

                        <Message v-if="feedback" severity="success" size="small">{{ feedback }}</Message>
                        <Message v-if="failure" severity="error" size="small">{{ failure }}</Message>

                        <div v-if="!report.share_url" class="surface-note">
                            Public sharing disabled for this report.
                        </div>
                    </div>
                </template>
            </Card>

            <Card class="workspace-card workspace-card-tight">
                <template #content>
                    <div class="report-side-card">
                        <div class="section-head">
                            <div>
                                <h3>Artifact inventory</h3>
                                <p>Private storage objects attached to this report.</p>
                            </div>
                        </div>

                        <div class="artifact-list">
                            <article v-for="artifact in artifactInventory" :key="artifact.kind" class="artifact-item">
                                <div class="artifact-item-head">
                                    <div>
                                        <div class="artifact-kind">{{ artifact.kind }}</div>
                                        <div class="muted">{{ artifact.contentType }}</div>
                                    </div>
                                    <Button
                                        v-if="artifact.url"
                                        as="a"
                                        label="Open signed URL"
                                        severity="secondary"
                                        variant="text"
                                        :href="artifact.url"
                                        target="_blank"
                                        rel="noreferrer"
                                    />
                                </div>
                                <div v-if="!artifact.url" class="muted">Unavailable on current disk</div>
                            </article>
                        </div>
                    </div>
                </template>
            </Card>
        </template>
    </AppShell>
</template>
