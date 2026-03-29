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
import { Input } from '@/components/ui/input';

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
        <div class="space-y-5">
            <div class="rounded-xl border bg-card p-4">
                <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div class="flex flex-wrap gap-2">
                        <Badge variant="outline">{{ boardSummary.total }} total</Badge>
                        <Badge variant="outline">{{ boardSummary.todo }} not done</Badge>
                        <Badge variant="outline">{{ boardSummary.done }} done</Badge>
                        <Badge variant="outline">{{ boardSummary.critical }} critical</Badge>
                    </div>

                    <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] xl:min-w-[34rem]">
                        <Input
                            id="bug-search"
                            v-model="filters.search"
                            placeholder="Search backlog by title or summary"
                            @keydown.enter.prevent="applyFilters"
                        />

                        <div class="flex flex-wrap gap-2 md:justify-end">
                            <Button size="sm" @click="applyFilters">Apply</Button>
                            <Button size="sm" variant="outline" @click="resetFilters">Reset</Button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="overflow-x-auto pb-2">
                <div class="grid min-w-[44rem] gap-5 xl:grid-cols-2">
                    <section
                        v-for="section in boardSections"
                        :key="section.key"
                        class="flex min-h-[42rem] flex-col rounded-xl border border-border/80 bg-muted/55 p-3"
                    >
                        <div class="mb-3 rounded-lg border bg-background px-4 py-3">
                            <div class="flex items-start justify-between gap-3">
                                <div class="space-y-1">
                                    <h2 class="text-sm font-semibold">{{ section.title }}</h2>
                                    <p class="text-sm text-muted-foreground">{{ section.description }}</p>
                                </div>

                                <Badge variant="secondary">{{ section.items.length }}</Badge>
                            </div>
                        </div>

                        <div class="flex-1 space-y-3 overflow-y-auto pr-1">
                            <article
                                v-for="report in section.items"
                                :key="report.id"
                                class="rounded-lg border bg-background p-3 shadow-xs"
                                data-testid="bug-board-row"
                            >
                                <div class="space-y-3">
                                    <div class="overflow-hidden rounded-md border bg-muted">
                                        <div class="aspect-[16/9]">
                                            <ArtifactPreview
                                                :preview="report.preview"
                                                :media-kind="report.media_kind"
                                                :alt="report.title"
                                                media-class="h-full w-full object-cover"
                                                placeholder-icon-class="size-6 text-muted-foreground"
                                            />
                                        </div>
                                    </div>

                                    <div class="flex items-start justify-between gap-3">
                                        <div class="min-w-0 flex-1 space-y-1">
                                            <TextLink
                                                :href="route('reports.show', report.id)"
                                                :title="report.title"
                                                class="max-w-full font-medium text-foreground"
                                            >
                                                <span class="block truncate">
                                                    {{ report.title }}
                                                </span>
                                            </TextLink>
                                            <p class="line-clamp-2 text-sm text-muted-foreground">
                                                {{ report.summary || 'No summary provided yet.' }}
                                            </p>
                                        </div>

                                        <StatusBadge :value="report.status" />
                                    </div>

                                    <div class="flex flex-wrap gap-2">
                                        <StatusBadge :value="report.urgency" />
                                        <StatusBadge :value="report.tag" />
                                        <Badge variant="outline" class="capitalize">
                                            {{ report.media_kind }}
                                        </Badge>
                                        <Badge variant="outline" class="inline-flex items-center gap-1">
                                            <component :is="visibilityIcon(report.visibility)" class="size-3.5" />
                                            {{ report.visibilityLabel }}
                                        </Badge>
                                    </div>

                                    <ReportTriageControls
                                        :report-id="report.id"
                                        :workflow-state="report.workflow_state"
                                        :urgency="report.urgency"
                                        :tag="report.tag"
                                        compact
                                        :show-labels="false"
                                        @updated="updateReportTriage(report.id, $event)"
                                    />

                                    <div class="flex items-center justify-between gap-3 border-t pt-3">
                                        <div class="text-xs text-muted-foreground">
                                            Captured {{ formatDate(report.created_at) }}
                                        </div>

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
                            </article>

                            <div
                                v-if="section.items.length === 0"
                                class="grid min-h-32 place-items-center rounded-lg border border-dashed bg-background/70 p-6 text-center text-sm text-muted-foreground"
                            >
                                {{ section.emptyMessage }}
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    </AppShell>
</template>
