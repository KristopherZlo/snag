<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { router } from '@inertiajs/vue3';
import { Globe, Lock } from 'lucide-vue-next';
import AppShell from '@/Layouts/AppShell.vue';
import ArtifactPreview from '@/Shared/ArtifactPreview.vue';
import ReportTriageControls from '@/Shared/ReportTriageControls.vue';
import StatusBadge from '@/Shared/StatusBadge.vue';
import TextLink from '@/Shared/TextLink.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const props = defineProps({
    filters: {
        type: Object,
        required: true,
    },
    sections: {
        type: Object,
        required: true,
    },
    summary: {
        type: Object,
        required: true,
    },
});

const filters = reactive({
    search: props.filters.search ?? '',
});

const reports = ref([]);

const visibilityIcon = (visibility) => (visibility === 'public' ? Globe : Lock);

const cloneSections = () =>
    [...(props.sections.todo ?? []), ...(props.sections.done ?? [])].map((report) => ({
        ...report,
        visibilityLabel: report.visibility === 'public' ? 'Public' : 'Organization only',
    }));

watch(
    () => props.sections,
    () => {
        reports.value = cloneSections();
    },
    { deep: true, immediate: true },
);

const urgencyWeight = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
};

const sortReports = (left, right) => {
    const urgencyDelta = (urgencyWeight[right.urgency] ?? 0) - (urgencyWeight[left.urgency] ?? 0);

    if (urgencyDelta !== 0) {
        return urgencyDelta;
    }

    return new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime();
};

const boardSections = computed(() => [
    {
        key: 'todo',
        title: 'Not done',
        description: 'Open bugs that still need investigation, fixing, or a decision.',
        emptyMessage: 'No open bugs match the current search.',
        items: [...reports.value.filter((report) => report.workflow_state === 'todo')].sort(sortReports),
    },
    {
        key: 'done',
        title: 'Done',
        description: 'Closed or parked bugs that no longer need active work.',
        emptyMessage: 'No completed bugs match the current search.',
        items: [...reports.value.filter((report) => report.workflow_state === 'done')].sort(sortReports),
    },
]);

const boardSummary = computed(() => ({
    total: reports.value.length,
    todo: reports.value.filter((report) => report.workflow_state === 'todo').length,
    done: reports.value.filter((report) => report.workflow_state === 'done').length,
    critical: reports.value.filter((report) => report.urgency === 'critical').length,
}));

const applyFilters = () => {
    router.get(route('bugs.index'), filters, {
        preserveScroll: true,
        preserveState: true,
        replace: true,
    });
};

const resetFilters = () => {
    filters.search = '';
    applyFilters();
};

const updateReportTriage = (reportId, triage) => {
    const target = reports.value.find((report) => report.id === reportId);

    if (!target) {
        return;
    }

    target.workflow_state = triage.workflow_state;
    target.urgency = triage.urgency;
    target.tag = triage.tag;
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
        title="Bug backlog"
        description="Track which bugs still need work, which ones are done, and keep urgency plus tags editable from one place."
        section="backlog"
    >
        <div class="space-y-6">
            <Card>
                <CardHeader>
                    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <CardTitle>Backlog filters</CardTitle>
                            <CardDescription>Search by title or summary and keep the board focused on the current batch.</CardDescription>
                        </div>

                        <div class="flex flex-wrap gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline">{{ boardSummary.todo }} not done</Badge>
                            <Badge variant="outline">{{ boardSummary.done }} done</Badge>
                            <Badge variant="outline">{{ boardSummary.critical }} critical</Badge>
                        </div>
                    </div>
                </CardHeader>

                <CardContent class="space-y-4">
                    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                        <div class="space-y-2">
                            <Label for="bug-search">Search</Label>
                            <Input
                                id="bug-search"
                                v-model="filters.search"
                                placeholder="Checkout, onboarding, billing..."
                                @keydown.enter.prevent="applyFilters"
                            />
                        </div>

                        <div class="flex flex-wrap gap-2 lg:justify-end">
                            <Button @click="applyFilters">Apply</Button>
                            <Button variant="outline" @click="resetFilters">Reset</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div class="grid gap-6 xl:grid-cols-2">
                <Card v-for="section in boardSections" :key="section.key">
                    <CardHeader>
                        <CardTitle>{{ section.title }}</CardTitle>
                        <CardDescription>{{ section.description }}</CardDescription>
                    </CardHeader>

                    <CardContent class="space-y-4">
                        <div
                            v-for="report in section.items"
                            :key="report.id"
                            class="rounded-md border bg-background p-4"
                            data-testid="bug-board-row"
                        >
                            <div class="flex flex-col gap-4">
                                <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div class="flex min-w-0 gap-4">
                                        <div class="w-28 shrink-0 overflow-hidden rounded-md border bg-muted">
                                            <div class="aspect-[4/3]">
                                                <ArtifactPreview
                                                    :preview="report.preview"
                                                    :media-kind="report.media_kind"
                                                    :alt="report.title"
                                                    media-class="h-full w-full object-cover"
                                                    placeholder-icon-class="size-6 text-muted-foreground"
                                                />
                                            </div>
                                        </div>

                                        <div class="min-w-0 space-y-3">
                                            <div class="flex flex-wrap items-start gap-3">
                                                <div class="min-w-0 space-y-1">
                                                    <TextLink :href="route('reports.show', report.id)" class="font-medium text-foreground">
                                                        {{ report.title }}
                                                    </TextLink>
                                                    <p class="text-sm text-muted-foreground">
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
                                    </div>

                                    <div class="text-sm text-muted-foreground">
                                        Captured {{ formatDate(report.created_at) }}
                                    </div>
                                </div>

                                <ReportTriageControls
                                    :report-id="report.id"
                                    :workflow-state="report.workflow_state"
                                    :urgency="report.urgency"
                                    :tag="report.tag"
                                    compact
                                    @updated="updateReportTriage(report.id, $event)"
                                />

                                <div class="flex flex-wrap gap-3">
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
                            </div>
                        </div>

                        <div v-if="section.items.length === 0" class="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                            {{ section.emptyMessage }}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </AppShell>
</template>
