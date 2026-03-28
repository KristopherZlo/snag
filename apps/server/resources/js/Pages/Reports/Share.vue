<script setup>
import Card from 'primevue/card';
import Tag from 'primevue/tag';

const props = defineProps({
    report: {
        type: Object,
        required: true,
    },
});

const primaryArtifact = props.report.artifacts.find((artifact) => ['screenshot', 'video'].includes(artifact.kind)) ?? null;
</script>

<template>
    <div class="public-wrap">
        <header class="public-header">
            <div class="auth-page-eyebrow" style="margin-bottom: 10px;">Public report</div>
            <h1 class="public-title">{{ report.title }}</h1>
            <p class="public-copy">{{ report.summary || 'No summary attached.' }}</p>
        </header>

        <div class="page-stack">
            <Card class="workspace-card">
                <template #content>
                    <div class="report-summary-card">
                        <div class="report-summary-head">
                            <div class="report-summary-copy">
                                <h2>Shared payload</h2>
                                <p>Public viewers receive a safe subset only. Internal-only debugger context remains protected behind policy checks.</p>
                            </div>
                            <div class="report-summary-tags">
                                <Tag :value="report.media_kind" severity="contrast" />
                                <Tag :value="`${report.artifacts.length} artifacts`" severity="secondary" />
                            </div>
                        </div>
                    </div>
                </template>
            </Card>

            <Card v-if="primaryArtifact" class="workspace-card">
                <template #content>
                    <div class="report-artifact-card">
                        <div class="section-head">
                            <div>
                                <h2>Capture</h2>
                                <p>The signed asset URL expires automatically based on the configured share TTL.</p>
                            </div>
                        </div>

                        <div v-if="primaryArtifact.url" class="media-frame">
                            <img
                                v-if="primaryArtifact.kind === 'screenshot'"
                                :src="primaryArtifact.url"
                                alt="Shared bug screenshot"
                            />
                            <video
                                v-else
                                :src="primaryArtifact.url"
                                controls
                                preload="metadata"
                            />
                        </div>
                        <div v-else class="empty-state">
                            Signed URLs are unavailable on the current storage disk.
                        </div>
                    </div>
                </template>
            </Card>

            <div class="split">
                <Card class="workspace-card">
                    <template #content>
                        <div class="report-side-card">
                            <div class="section-head">
                                <div>
                                    <h2>Actions</h2>
                                    <p>High-level interaction sequence only.</p>
                                </div>
                            </div>

                            <div v-if="report.debugger.actions.length" class="table-wrap">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Seq</th>
                                            <th>Type</th>
                                            <th>Label</th>
                                            <th>Selector</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="action in report.debugger.actions" :key="`${action.sequence}-${action.type}`">
                                            <td>{{ action.sequence }}</td>
                                            <td>{{ action.type }}</td>
                                            <td>{{ action.label || 'n/a' }}</td>
                                            <td class="mono">{{ action.selector || 'n/a' }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div v-else class="empty-state">
                                No action data was shared with this report.
                            </div>
                        </div>
                    </template>
                </Card>

                <Card class="workspace-card">
                    <template #content>
                        <div class="report-side-card">
                            <div class="section-head">
                                <div>
                                    <h2>Network overview</h2>
                                    <p>Request metadata is truncated for public access.</p>
                                </div>
                            </div>

                            <div v-if="report.debugger.network_requests.length" class="table-wrap">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Seq</th>
                                            <th>Method</th>
                                            <th>URL</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="request in report.debugger.network_requests" :key="`${request.sequence}-${request.url}`">
                                            <td>{{ request.sequence }}</td>
                                            <td>{{ request.method }}</td>
                                            <td class="mono public-url-cell">{{ request.url }}</td>
                                            <td>{{ request.status_code ?? 'n/a' }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div v-else class="empty-state">
                                No network request data is available for this share.
                            </div>
                        </div>
                    </template>
                </Card>
            </div>
        </div>
    </div>
</template>
