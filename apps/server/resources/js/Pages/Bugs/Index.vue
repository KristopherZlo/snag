<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { Head, Link, router, usePage } from '@inertiajs/vue3';
import { Globe, LayoutGrid, Lock, Search, Settings2 } from 'lucide-vue-next';
import ArtifactPreview from '@/Shared/ArtifactPreview.vue';
import BrandMark from '@/Shared/BrandMark.vue';
import ReportTitleLink from '@/Shared/ReportTitleLink.vue';
import ReportTriageControls from '@/Shared/ReportTriageControls.vue';
import StatusBadge from '@/Shared/StatusBadge.vue';
import TextLink from '@/Shared/TextLink.vue';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { buttonVariants, Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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

const page = usePage();
const reports = ref([]);
const currentUserInitial = computed(() => (page.props.auth?.user?.name ?? 'S').slice(0, 1).toUpperCase());
const currentUserLabel = computed(() => page.props.auth?.user?.name ?? 'Signed user');
const organizationName = computed(() => page.props.organization?.name ?? 'No organization');

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
    <Head title="Bug backlog" />

    <div class="min-h-screen bg-[#f5efe7] text-foreground">
        <header class="border-b border-border/80 bg-background/95 backdrop-blur-sm">
            <div class="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3 md:px-6">
                <BrandMark :href="route('dashboard')" logo-class="size-9" text-class="text-xl" />

                <nav class="flex flex-wrap items-center gap-2">
                    <Link :href="route('dashboard')" :class="buttonVariants({ variant: 'ghost', size: 'sm' })">
                        Reports
                    </Link>
                    <Link
                        :href="route('bugs.index')"
                        :class="cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'bg-card')"
                        aria-current="page"
                    >
                        Board
                    </Link>
                    <Link :href="route('settings.members')" :class="buttonVariants({ variant: 'ghost', size: 'sm' })">
                        Team
                    </Link>
                </nav>

                <div class="ml-auto flex items-center gap-3">
                    <div class="hidden text-right sm:block">
                        <div class="text-sm font-medium">{{ organizationName }}</div>
                        <div class="text-sm text-muted-foreground">{{ currentUserLabel }}</div>
                    </div>

                    <Avatar class="size-9">
                        <AvatarFallback>{{ currentUserInitial }}</AvatarFallback>
                    </Avatar>
                </div>
            </div>
        </header>

        <main class="px-4 py-5 md:px-6">
            <div class="mx-auto max-w-[1600px] space-y-4">
                <section class="overflow-hidden rounded-xl border border-border/80 bg-[#ebe2d7]">
                    <div class="flex flex-col gap-4 border-b border-border/70 bg-[#e2d7ca] px-4 py-4 lg:flex-row lg:items-center lg:justify-between md:px-5">
                        <div class="space-y-2">
                            <div class="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary" class="gap-1">
                                    <LayoutGrid class="size-3.5" />
                                    Board
                                </Badge>
                                <Badge variant="outline">{{ boardSummary.total }} cards</Badge>
                                <Badge variant="outline">{{ boardSummary.todo }} open</Badge>
                                <Badge variant="outline">{{ boardSummary.done }} done</Badge>
                                <Badge variant="outline">{{ boardSummary.critical }} critical</Badge>
                            </div>

                            <div>
                                <h1 class="text-2xl font-semibold">Bug backlog</h1>
                                <p class="text-sm text-muted-foreground">
                                    Dedicated triage board for sorting open bugs, moving them to done, and editing urgency or tags inline.
                                </p>
                            </div>
                        </div>

                        <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] lg:min-w-[42rem]">
                            <div class="relative">
                                <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="bug-search"
                                    v-model="filters.search"
                                    class="bg-background pl-9"
                                    placeholder="Search backlog by title or summary"
                                    @keydown.enter.prevent="applyFilters"
                                />
                            </div>

                            <Button size="sm" class="bg-card text-foreground hover:bg-card/90" @click="applyFilters">
                                Apply
                            </Button>
                            <Button size="sm" variant="outline" class="bg-background" @click="resetFilters">
                                Reset
                            </Button>
                        </div>
                    </div>

                    <div class="flex items-center justify-between gap-3 border-b border-border/60 bg-[#e8ded2] px-4 py-3 md:px-5">
                        <div class="text-sm text-muted-foreground">
                            Board state stays inside the site, but the triage flow behaves like its own workspace.
                        </div>

                        <Link :href="route('settings.members')" :class="buttonVariants({ variant: 'outline', size: 'sm' })">
                            <Settings2 class="mr-2 size-4" />
                            Workspace settings
                        </Link>
                    </div>

                    <div class="overflow-x-auto bg-[#ded3c6] p-4">
                        <div class="flex min-h-[calc(100vh-19rem)] min-w-[48rem] gap-4">
                            <section
                                v-for="section in boardSections"
                                :key="section.key"
                                class="flex w-[24rem] shrink-0 flex-col rounded-xl border border-border/80 bg-[#f6f2ed]"
                                :data-testid="`bug-board-column-${section.key}`"
                            >
                                <div class="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
                                    <div class="space-y-1">
                                        <h2 class="text-sm font-semibold">{{ section.title }}</h2>
                                        <p class="text-sm text-muted-foreground">{{ section.description }}</p>
                                    </div>

                                    <Badge variant="secondary">{{ section.items.length }}</Badge>
                                </div>

                                <div class="flex-1 space-y-3 overflow-y-auto p-3">
                                    <article
                                        v-for="report in section.items"
                                        :key="report.id"
                                        class="rounded-lg border border-border/80 bg-background p-3 shadow-[0_1px_3px_rgba(28,25,23,0.08)]"
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
                </section>
            </div>
        </main>
    </div>
</template>
