<script setup>
const props = defineProps({
    report: {
        type: Object,
        required: true,
    },
});

const primaryArtifact = props.report.artifacts.find((artifact) =>
    ['screenshot', 'video'].includes(artifact.kind),
) ?? null;
</script>

<template>
    <div class="public-wrap">
        <header class="public-header">
            <div class="muted" style="margin-bottom: 8px;">Public report</div>
            <h1 style="font-size: 2rem; font-weight: 600; margin: 0 0 10px;">{{ report.title }}</h1>
            <p class="muted" style="font-size: 1rem; margin: 0;">{{ report.summary || 'No summary attached.' }}</p>
        </header>

        <div class="page-stack">
            <section class="panel panel-pad">
                <div class="meta-grid">
                    <div class="detail-list">
                        <div class="detail-item">
                            <span class="detail-label">Media kind</span>
                            <div>{{ report.media_kind }}</div>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Artifacts</span>
                            <div>{{ report.artifacts.length }}</div>
                        </div>
                    </div>
                    <div class="surface-note">
                        Public viewers receive a safe payload only. Internal-only fields such as raw log context remain protected behind policy checks.
                    </div>
                </div>
            </section>

            <section v-if="primaryArtifact" class="panel panel-pad">
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
            </section>

            <div class="split">
                <section class="panel panel-pad">
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
                </section>

                <section class="panel panel-pad">
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
                                    <td class="mono">{{ request.url }}</td>
                                    <td>{{ request.status_code ?? 'n/a' }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div v-else class="empty-state">
                        No network request data is available for this share.
                    </div>
                </section>
            </div>
        </div>
    </div>
</template>
