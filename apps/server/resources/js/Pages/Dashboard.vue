<script setup>
import AppShell from '@/Layouts/AppShell.vue';
import StatusBadge from '@/Shared/StatusBadge.vue';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { Link, router } from '@inertiajs/vue3';
import { computed, reactive } from 'vue';

const props = defineProps({
    filters: {
        type: Object,
        required: true,
    },
    reports: {
        type: Object,
        required: true,
    },
    membersCount: {
        type: Number,
        required: true,
    },
    entitlements: {
        type: Object,
        required: true,
    },
});

const filters = reactive({
    search: props.filters.search ?? '',
    status: props.filters.status ?? '',
});

const statusOptions = [
    { label: 'All statuses', value: '' },
    { label: 'Draft', value: 'draft' },
    { label: 'Uploaded', value: 'uploaded' },
    { label: 'Processing', value: 'processing' },
    { label: 'Ready', value: 'ready' },
    { label: 'Failed', value: 'failed' },
    { label: 'Deleted', value: 'deleted' },
];

const contextItems = computed(() => [
    { label: 'Plan', value: props.entitlements.plan },
    { label: 'Members', value: `${props.membersCount}/${props.entitlements.members}` },
    { label: 'Visible reports', value: props.reports.total ?? props.reports.data.length },
]);

const applyFilters = () => {
    router.get(route('dashboard'), filters, {
        preserveScroll: true,
        preserveState: true,
        replace: true,
    });
};

const resetFilters = () => {
    filters.search = '';
    filters.status = '';
    applyFilters();
};

const formatDate = (value) =>
    value
        ? new Intl.DateTimeFormat(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
          }).format(new Date(value))
        : 'Pending';
</script>

<template>
    <AppShell
        title="Dashboard"
        description="Track report ingestion, share links, and plan limits inside the active organization."
        section="reports"
        :context-items="contextItems"
    >
        <div class="page-stack">
            <Card class="workspace-card">
                <template #content>
                    <div class="queue-toolbar">
                        <div class="queue-toolbar-copy">
                            <h2>Report queue</h2>
                            <p>Filter the active queue, open the report workspace and keep triage decisions moving without backtracking.</p>
                        </div>

                        <div class="queue-toolbar-controls">
                            <div class="field">
                                <label for="report-search">Search</label>
                                <InputText
                                    id="report-search"
                                    v-model="filters.search"
                                    placeholder="Title or summary"
                                    @keydown.enter.prevent="applyFilters"
                                />
                            </div>

                            <div class="field">
                                <label for="report-status">Status</label>
                                <Select
                                    id="report-status"
                                    v-model="filters.status"
                                    :options="statusOptions"
                                    option-label="label"
                                    option-value="value"
                                />
                            </div>

                            <div class="queue-toolbar-actions">
                                <Button label="Apply" @click="applyFilters" />
                                <Button label="Reset" severity="secondary" @click="resetFilters" />
                            </div>
                        </div>
                    </div>
                </template>
            </Card>

            <Card class="workspace-card">
                <template #content>
                    <div v-if="reports.data.length" class="queue-table-wrap">
                        <DataTable :value="reports.data" data-key="id" row-hover responsive-layout="scroll">
                            <Column header="Report">
                                <template #body="{ data }">
                                    <div class="table-primary-cell">
                                        <Link :href="route('reports.show', data.id)" class="table-primary-link">
                                            {{ data.title }}
                                        </Link>
                                        <div class="table-primary-meta">
                                            {{ data.summary || 'No summary provided yet.' }}
                                        </div>
                                    </div>
                                </template>
                            </Column>

                            <Column header="Capture">
                                <template #body="{ data }">
                                    <Tag :value="data.media_kind" severity="secondary" />
                                </template>
                            </Column>

                            <Column header="Visibility">
                                <template #body="{ data }">
                                    <span class="table-muted">{{ data.visibility }}</span>
                                </template>
                            </Column>

                            <Column header="Status">
                                <template #body="{ data }">
                                    <StatusBadge :value="data.status" />
                                </template>
                            </Column>

                            <Column header="Captured">
                                <template #body="{ data }">
                                    <span class="table-muted">{{ formatDate(data.created_at) }}</span>
                                </template>
                            </Column>

                            <Column header="Actions">
                                <template #body="{ data }">
                                    <div class="table-actions">
                                        <a
                                            v-if="data.share_url"
                                            :href="data.share_url"
                                            target="_blank"
                                            rel="noreferrer"
                                            class="table-inline-link"
                                        >
                                            Public view
                                        </a>
                                        <Link :href="route('reports.show', data.id)" class="table-inline-link is-strong">
                                            Open report
                                        </Link>
                                    </div>
                                </template>
                            </Column>
                        </DataTable>
                    </div>

                    <div v-else class="empty-state">
                        No reports match the current filters. Create an upload session from the SDK or extension to populate the queue.
                    </div>
                </template>
            </Card>

            <div class="queue-footer">
                <p class="muted">
                    Showing {{ reports.from ?? 0 }} to {{ reports.to ?? reports.data.length }} of {{ reports.total ?? reports.data.length }} reports
                </p>

                <div class="actions-inline">
                    <Link
                        v-if="reports.prev_page_url"
                        class="table-inline-link"
                        :href="reports.prev_page_url"
                        preserve-scroll
                    >
                        Previous
                    </Link>
                    <Link
                        v-if="reports.next_page_url"
                        class="table-inline-link is-strong"
                        :href="reports.next_page_url"
                        preserve-scroll
                    >
                        Next
                    </Link>
                </div>
            </div>
        </div>

        <template #aside>
            <Card class="workspace-card workspace-card-tight">
                <template #content>
                    <div class="side-summary">
                        <h3>Workspace</h3>
                        <dl class="key-value-list">
                            <div>
                                <dt>Current plan</dt>
                                <dd style="text-transform: capitalize;">{{ entitlements.plan }}</dd>
                            </div>
                            <div>
                                <dt>Video capability</dt>
                                <dd>{{ entitlements.can_record_video ? `Up to ${entitlements.video_seconds}s` : 'Screenshot only' }}</dd>
                            </div>
                            <div>
                                <dt>Members</dt>
                                <dd>{{ membersCount }} of {{ entitlements.members }}</dd>
                            </div>
                            <div>
                                <dt>Queue size</dt>
                                <dd>{{ reports.total ?? reports.data.length }} reports</dd>
                            </div>
                        </dl>
                    </div>
                </template>
            </Card>

            <Card class="workspace-card workspace-card-tight">
                <template #content>
                    <div class="side-summary">
                        <h3>Capture setup</h3>
                        <p class="muted">Keep collection and setup flows close to the triage surface.</p>
                        <div class="stack">
                            <Link :href="route('settings.extension.connect')" class="table-inline-link is-strong">
                                Open extension connect
                            </Link>
                            <Link :href="route('settings.capture-keys')" class="table-inline-link">
                                Manage capture keys
                            </Link>
                        </div>
                    </div>
                </template>
            </Card>
        </template>
    </AppShell>
</template>
