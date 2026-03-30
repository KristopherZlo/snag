<script setup>
import { computed, reactive } from 'vue';
import { router } from '@inertiajs/vue3';
import { Globe, LayoutGrid, Lock, Rows3 } from 'lucide-vue-next';
import AppShell from '@/Layouts/AppShell.vue';
import ChipSelect from '@/Shared/ChipSelect.vue';
import ArtifactPreview from '@/Shared/ArtifactPreview.vue';
import ReportTitleLink from '@/Shared/ReportTitleLink.vue';
import ReportIssueLinker from '@/Shared/ReportIssueLinker.vue';
import StatusBadge from '@/Shared/StatusBadge.vue';
import TextLink from '@/Shared/TextLink.vue';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Separator } from '@/Components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { reportSortOptions } from '@/lib/bug-triage';

const props = defineProps({
    filters: {
        type: Object,
        required: true,
    },
    reports: {
        type: Object,
        required: true,
    },
    openIssues: {
        type: Array,
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
    sort: props.filters.sort ?? 'newest',
    view: props.filters.view ?? 'cards',
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

const viewModes = [
    { label: 'Cards', value: 'cards', icon: LayoutGrid },
    { label: 'Compact', value: 'compact', icon: Rows3 },
];

const queueSummary = computed(() => [
    {
        label: 'Current plan',
        value: props.entitlements.plan,
    },
    {
        label: 'Capture mode',
        value: props.entitlements.can_record_video ? `Video up to ${props.entitlements.video_seconds}s` : 'Screenshot only',
    },
    {
        label: 'Workspace members',
        value: `${props.membersCount} active members`,
    },
    {
        label: 'Queue size',
        value: `${props.reports.total ?? props.reports.data.length} reports`,
    },
]);

const reportCards = computed(() =>
    props.reports.data.map((report) => ({
        ...report,
        visibilityLabel: report.visibility === 'public' ? 'Public' : 'Organization only',
    })),
);

const isCompactView = computed(() => filters.view === 'compact');

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
    filters.sort = 'newest';
    applyFilters();
};

const setViewMode = (view) => {
    if (filters.view === view) {
        return;
    }

    filters.view = view;
    applyFilters();
};

const updateFilter = (field, value) => {
    if (filters[field] === value) {
        return;
    }

    filters[field] = value;
    applyFilters();
};

const formatDate = (value) =>
    value
        ? new Intl.DateTimeFormat(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
          }).format(new Date(value))
        : 'Pending';

const visibilityIcon = (visibility) => (visibility === 'public' ? Globe : Lock);
</script>

<template>
    <AppShell
        title="Reports"
        description="Review the active queue, sort the list, and switch between card and compact triage views."
        section="reports"
    >
        <div class="space-y-6">
            <Card>
                <CardHeader class="space-y-4">
                    <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                            <CardTitle>Active reports</CardTitle>
                            <CardDescription>Open the report workspace, inspect triage state, or jump to the public share when visibility allows it.</CardDescription>
                        </div>

                        <div class="flex flex-col gap-3 xl:items-end">
                            <div class="text-sm text-muted-foreground">
                                Showing {{ reports.from ?? 0 }} to {{ reports.to ?? reports.data.length }} of {{ reports.total ?? reports.data.length }}
                            </div>

                            <div class="flex flex-wrap gap-2">
                                <Button
                                    v-for="mode in viewModes"
                                    :key="mode.value"
                                    :variant="filters.view === mode.value ? 'default' : 'outline'"
                                    size="sm"
                                    @click="setViewMode(mode.value)"
                                >
                                    <component :is="mode.icon" class="mr-2 size-4" />
                                    {{ mode.label }}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div class="grid gap-3 border-t pt-4 lg:grid-cols-[minmax(0,1.5fr)_210px_230px_auto] lg:items-center">
                        <Input
                            id="report-search"
                            v-model="filters.search"
                            placeholder="Search by title or summary"
                            @keydown.enter.prevent="applyFilters"
                        />

                        <ChipSelect
                            id="report-status"
                            :model-value="filters.status"
                            :options="statusOptions"
                            prefix-label="Status"
                            trigger-class="w-full justify-between px-3"
                            content-class="min-w-[13rem]"
                            @update:model-value="updateFilter('status', $event)"
                        />

                        <ChipSelect
                            id="report-sort"
                            :model-value="filters.sort"
                            :options="reportSortOptions"
                            prefix-label="Sort"
                            trigger-class="w-full justify-between px-3"
                            content-class="min-w-[14rem]"
                            @update:model-value="updateFilter('sort', $event)"
                        />

                        <div class="flex flex-wrap gap-2 lg:justify-end">
                            <Button size="sm" @click="applyFilters">Apply</Button>
                            <Button size="sm" variant="outline" @click="resetFilters">Reset</Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent class="space-y-4">
                    <div v-if="reportCards.length && !isCompactView" class="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                        <Card v-for="report in reportCards" :key="report.id" class="overflow-hidden py-0">
                            <CardContent class="p-0">
                                <div class="aspect-[16/10] border-b bg-muted">
                                    <ArtifactPreview
                                        :preview="report.preview"
                                        :media-kind="report.media_kind"
                                        :alt="report.title"
                                        media-class="h-full w-full object-cover"
                                        placeholder-icon-class="size-8 text-muted-foreground"
                                    />
                                </div>

                                <div class="space-y-4 p-5">
                                    <div class="space-y-3">
                                        <div class="flex flex-wrap items-start justify-between gap-3">
                                            <div class="min-w-0 flex-1 space-y-1">
                                                <ReportTitleLink
                                                    :href="route('reports.show', report.id)"
                                                    :title="report.title"
                                                    class="max-w-[15rem]"
                                                />
                                                <p class="line-clamp-2 text-sm text-muted-foreground">
                                                    {{ report.summary || 'No summary provided yet.' }}
                                                </p>
                                            </div>

                                            <StatusBadge :value="report.status" />
                                        </div>

                                        <div class="flex flex-wrap gap-2">
                                            <Badge variant="outline" class="capitalize">
                                                {{ report.media_kind }}
                                            </Badge>
                                            <Badge variant="outline" class="inline-flex items-center gap-1">
                                                <component :is="visibilityIcon(report.visibility)" class="size-3.5" />
                                                {{ report.visibilityLabel }}
                                            </Badge>
                                            <StatusBadge :value="report.workflow_state" />
                                            <StatusBadge :value="report.urgency" />
                                            <StatusBadge :value="report.tag" />
                                        </div>
                                    </div>

                                    <div class="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                                        <div class="text-sm text-muted-foreground">
                                            Captured {{ formatDate(report.created_at) }}
                                        </div>

                                        <div class="flex flex-wrap gap-3">
                                            <TextLink
                                                v-if="report.share_url"
                                                :href="report.share_url"
                                                native
                                                target="_blank"
                                                rel="noreferrer"
                                                class="text-sm font-medium text-primary hover:underline"
                                            >
                                                Public view
                                            </TextLink>
                                            <TextLink
                                                :href="route('reports.show', report.id)"
                                                class="text-sm font-medium text-primary hover:underline"
                                            >
                                                Open report
                                            </TextLink>
                                        </div>
                                    </div>

                                    <div class="border-t pt-4">
                                        <ReportIssueLinker
                                            :report-id="report.id"
                                            :linked-issue="report.linked_issue"
                                            :available-issues="openIssues"
                                            :suggested-title="report.title"
                                            :suggested-summary="report.summary"
                                            compact
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div v-else-if="reportCards.length" class="overflow-x-auto">
                        <Table class="min-w-[72rem] table-fixed">
                            <TableHeader>
                                <TableRow>
                                    <TableHead class="w-44">Preview</TableHead>
                                    <TableHead>Report</TableHead>
                                    <TableHead class="w-28">Status</TableHead>
                                    <TableHead class="w-44">Triage</TableHead>
                                    <TableHead class="w-72">Issue</TableHead>
                                    <TableHead class="w-40">Captured</TableHead>
                                    <TableHead class="w-36">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow v-for="report in reportCards" :key="report.id">
                                    <TableCell>
                                        <div class="overflow-hidden rounded-md border bg-muted">
                                            <div class="aspect-[16/10] w-36">
                                                <ArtifactPreview
                                                    :preview="report.preview"
                                                    :media-kind="report.media_kind"
                                                    :alt="report.title"
                                                    media-class="h-full w-full object-cover"
                                                    placeholder-icon-class="size-6 text-muted-foreground"
                                                />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell class="align-top">
                                        <div class="min-w-0 space-y-2">
                                            <ReportTitleLink
                                                :href="route('reports.show', report.id)"
                                                :title="report.title"
                                                class="max-w-full"
                                            />
                                            <p class="line-clamp-2 max-w-full text-sm text-muted-foreground">
                                                {{ report.summary || 'No summary provided yet.' }}
                                            </p>
                                            <div class="flex flex-wrap gap-2">
                                                <Badge variant="outline" class="capitalize">
                                                    {{ report.media_kind }}
                                                </Badge>
                                                <Badge variant="outline" class="inline-flex items-center gap-1">
                                                    <component :is="visibilityIcon(report.visibility)" class="size-3.5" />
                                                    {{ report.visibilityLabel }}
                                                </Badge>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell class="align-top">
                                        <StatusBadge :value="report.status" />
                                    </TableCell>
                                    <TableCell class="align-top">
                                        <div class="flex flex-wrap gap-2">
                                            <StatusBadge :value="report.workflow_state" />
                                            <StatusBadge :value="report.urgency" />
                                            <StatusBadge :value="report.tag" />
                                        </div>
                                    </TableCell>
                                    <TableCell class="align-top">
                                        <ReportIssueLinker
                                            :report-id="report.id"
                                            :linked-issue="report.linked_issue"
                                            :available-issues="openIssues"
                                            :suggested-title="report.title"
                                            :suggested-summary="report.summary"
                                            compact
                                        />
                                    </TableCell>
                                    <TableCell class="align-top text-sm text-muted-foreground">
                                        {{ formatDate(report.created_at) }}
                                    </TableCell>
                                    <TableCell class="align-top">
                                        <div class="flex flex-col items-start gap-2">
                                            <TextLink
                                                :href="route('reports.show', report.id)"
                                                class="text-sm font-medium text-primary hover:underline"
                                            >
                                                Open report
                                            </TextLink>
                                            <TextLink
                                                v-if="report.share_url"
                                                :href="report.share_url"
                                                native
                                                target="_blank"
                                                rel="noreferrer"
                                                class="text-sm font-medium text-primary hover:underline"
                                            >
                                                Public view
                                            </TextLink>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>

                    <div v-else class="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                        No reports match the current filters. Create an upload session from the SDK or extension to populate the queue.
                    </div>

                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <div class="text-sm text-muted-foreground">
                            Queue stays organization-scoped. Filters and compact mode persist through navigation.
                        </div>

                        <div class="flex flex-wrap gap-3">
                            <TextLink
                                v-if="reports.prev_page_url"
                                class="text-sm font-medium text-primary hover:underline"
                                :href="reports.prev_page_url"
                                preserve-scroll
                            >
                                Previous
                            </TextLink>
                            <TextLink
                                v-if="reports.next_page_url"
                                class="text-sm font-medium text-primary hover:underline"
                                :href="reports.next_page_url"
                                preserve-scroll
                            >
                                Next
                            </TextLink>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        <template #aside>
            <Card>
                <CardHeader>
                    <CardTitle class="text-base">Queue snapshot</CardTitle>
                    <CardDescription>Keep plan and capture limits visible without repeating them across the page.</CardDescription>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div v-for="(item, index) in queueSummary" :key="item.label" class="space-y-4">
                        <div>
                            <div class="text-sm font-medium">{{ item.label }}</div>
                            <div class="text-sm text-muted-foreground">{{ item.value }}</div>
                        </div>
                        <Separator v-if="index !== queueSummary.length - 1" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle class="text-base">Setup shortcuts</CardTitle>
                </CardHeader>
                <CardContent class="flex flex-col items-start gap-3">
                    <TextLink :href="route('bugs.index')" class="text-sm font-medium text-primary hover:underline">
                        Open bug backlog
                    </TextLink>
                    <TextLink :href="route('settings.extension.connect')" class="text-sm font-medium text-primary hover:underline">
                        Open extension connect
                    </TextLink>
                    <TextLink :href="route('settings.capture-keys')" class="text-sm font-medium text-primary hover:underline">
                        Manage capture keys
                    </TextLink>
                </CardContent>
            </Card>
        </template>
    </AppShell>
</template>
