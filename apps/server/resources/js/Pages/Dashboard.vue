<script setup>
import AppShell from '@/Layouts/AppShell.vue';
import StatusBadge from '@/Shared/StatusBadge.vue';
import { Link, router } from '@inertiajs/vue3';
import { reactive } from 'vue';

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
    >
        <div class="stats-grid">
            <section class="stat-card">
                <p class="stat-label">Current plan</p>
                <p class="stat-value" style="text-transform: capitalize;">{{ entitlements.plan }}</p>
                <p class="stat-note">
                    {{ entitlements.can_record_video ? `Video up to ${entitlements.video_seconds}s` : 'Screenshot capture only' }}
                </p>
            </section>
            <section class="stat-card">
                <p class="stat-label">Members</p>
                <p class="stat-value">{{ membersCount }}</p>
                <p class="stat-note">Limit: {{ entitlements.members }} members</p>
            </section>
            <section class="stat-card">
                <p class="stat-label">Reports in view</p>
                <p class="stat-value">{{ reports.total ?? reports.data.length }}</p>
                <p class="stat-note">Filtered by current query string</p>
            </section>
        </div>

        <div class="page-stack">
            <section class="panel panel-pad">
                <div class="toolbar-wrap">
                    <div class="section-head">
                        <div>
                            <h2>Report queue</h2>
                            <p>Direct-upload sessions finalize into reports and continue through processing asynchronously.</p>
                        </div>
                    </div>

                    <div class="toolbar-actions">
                        <div class="field field-grow">
                            <label for="report-search">Search</label>
                            <input
                                id="report-search"
                                v-model="filters.search"
                                placeholder="Title or summary"
                                @keydown.enter.prevent="applyFilters"
                            />
                        </div>

                        <div class="field">
                            <label for="report-status">Status</label>
                            <select id="report-status" v-model="filters.status">
                                <option value="">All statuses</option>
                                <option value="draft">Draft</option>
                                <option value="uploaded">Uploaded</option>
                                <option value="processing">Processing</option>
                                <option value="ready">Ready</option>
                                <option value="failed">Failed</option>
                                <option value="deleted">Deleted</option>
                            </select>
                        </div>

                        <button class="button button-primary" type="button" @click="applyFilters">
                            Apply
                        </button>
                        <button class="button button-secondary" type="button" @click="resetFilters">
                            Reset
                        </button>
                    </div>
                </div>
            </section>

            <section v-if="reports.data.length" class="report-list">
                <article v-for="report in reports.data" :key="report.id" class="report-card">
                    <div>
                        <h2 class="report-title">
                            <Link :href="route('reports.show', report.id)">
                                {{ report.title }}
                            </Link>
                        </h2>
                        <p class="report-summary">
                            {{ report.summary || 'No summary provided yet.' }}
                        </p>
                        <div class="report-meta">
                            <span>Captured: {{ report.media_kind }}</span>
                            <span>Visibility: {{ report.visibility }}</span>
                            <span>{{ formatDate(report.created_at) }}</span>
                        </div>
                    </div>
                    <div class="actions-inline">
                        <StatusBadge :value="report.status" />
                        <a
                            v-if="report.share_url"
                            class="button button-secondary"
                            :href="report.share_url"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Public view
                        </a>
                        <Link class="button button-primary" :href="route('reports.show', report.id)">
                            Open report
                        </Link>
                    </div>
                </article>
            </section>

            <section v-else class="empty-state">
                No reports match the current filters. Create an upload session from the SDK or extension to populate the queue.
            </section>

            <section class="panel panel-pad">
                <div class="pagination">
                    <p class="muted">
                        Showing {{ reports.from ?? 0 }} to {{ reports.to ?? reports.data.length }} of {{ reports.total ?? reports.data.length }} reports
                    </p>
                    <div class="actions-inline">
                        <Link
                            v-if="reports.prev_page_url"
                            class="button button-secondary"
                            :href="reports.prev_page_url"
                            preserve-scroll
                        >
                            Previous
                        </Link>
                        <Link
                            v-if="reports.next_page_url"
                            class="button button-secondary"
                            :href="reports.next_page_url"
                            preserve-scroll
                        >
                            Next
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    </AppShell>
</template>
