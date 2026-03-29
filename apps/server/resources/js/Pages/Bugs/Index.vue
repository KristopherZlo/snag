<script setup>
import { computed, reactive, ref, watch } from 'vue';
import axios from 'axios';
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
const boardColumns = reactive({
    todo: [],
    done: [],
});
const boardFailure = ref('');
const dragState = reactive({
    activeReportId: null,
    sourceColumnKey: null,
    overColumnKey: null,
    savingReportId: null,
});
const enableBoardMotion = import.meta.env.MODE !== 'test';
let dragPreviewElement = null;
const currentUserInitial = computed(() => (page.props.auth?.user?.name ?? 'S').slice(0, 1).toUpperCase());
const currentUserLabel = computed(() => page.props.auth?.user?.name ?? 'Signed user');
const organizationName = computed(() => page.props.organization?.name ?? 'No organization');

const visibilityIcon = (visibility) => (visibility === 'public' ? Globe : Lock);

const normalizeReport = (report) => ({
    ...report,
    visibilityLabel: report.visibility === 'public' ? 'Public' : 'Organization only',
});

const createBoardColumns = () => ({
    todo: [...(props.sections.todo ?? [])].map(normalizeReport).sort(sortReports),
    done: [...(props.sections.done ?? [])].map(normalizeReport).sort(sortReports),
});

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

watch(
    () => props.sections,
    () => {
        const next = createBoardColumns();
        boardColumns.todo = next.todo;
        boardColumns.done = next.done;
    },
    { deep: true, immediate: true },
);

const boardSections = computed(() => [
    {
        key: 'todo',
        title: 'Not done',
        description: 'Open bugs that still need investigation, fixing, or a decision.',
        emptyMessage: 'No open bugs match the current search.',
        items: boardColumns.todo,
    },
    {
        key: 'done',
        title: 'Done',
        description: 'Closed or parked bugs that no longer need active work.',
        emptyMessage: 'No completed bugs match the current search.',
        items: boardColumns.done,
    },
]);

const boardSummary = computed(() => ({
    total: boardColumns.todo.length + boardColumns.done.length,
    todo: boardColumns.todo.length,
    done: boardColumns.done.length,
    critical: [...boardColumns.todo, ...boardColumns.done].filter((report) => report.urgency === 'critical').length,
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

const findReportLocation = (reportId) => {
    for (const columnKey of ['todo', 'done']) {
        const index = boardColumns[columnKey].findIndex((report) => report.id === reportId);

        if (index !== -1) {
            return {
                columnKey,
                index,
                report: boardColumns[columnKey][index],
            };
        }
    }

    return null;
};

const moveReportToColumn = (reportId, targetColumnKey) => {
    const source = findReportLocation(reportId);

    if (!source || source.columnKey === targetColumnKey) {
        return null;
    }

    const [report] = boardColumns[source.columnKey].splice(source.index, 1);
    report.workflow_state = targetColumnKey;
    boardColumns[targetColumnKey].push(report);

    return {
        reportId,
        report,
        sourceColumnKey: source.columnKey,
        sourceIndex: source.index,
        targetColumnKey,
    };
};

const revertMovedReport = (snapshot) => {
    if (!snapshot) {
        return;
    }

    const current = findReportLocation(snapshot.reportId);

    if (!current) {
        return;
    }

    const [report] = boardColumns[current.columnKey].splice(current.index, 1);
    report.workflow_state = snapshot.sourceColumnKey;
    boardColumns[snapshot.sourceColumnKey].splice(snapshot.sourceIndex, 0, report);
};

const updateReportTriage = (reportId, triage) => {
    const location = findReportLocation(reportId);

    if (!location) {
        return;
    }

    const target = location.report;
    const previousColumnKey = location.columnKey;
    target.urgency = triage.urgency;
    target.tag = triage.tag;

    if (previousColumnKey !== triage.workflow_state) {
        moveReportToColumn(reportId, triage.workflow_state);
        return;
    }

    target.workflow_state = triage.workflow_state;
};

const boardDateFormatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
});

const formatDate = (value) => (value ? boardDateFormatter.format(new Date(value)) : 'Pending');

const parseDragPayload = (event) => {
    const rawPayload = event.dataTransfer?.getData('application/json');

    if (!rawPayload) {
        return null;
    }

    try {
        return JSON.parse(rawPayload);
    } catch {
        return null;
    }
};

const removeDragPreview = () => {
    if (!dragPreviewElement) {
        return;
    }

    dragPreviewElement.remove();
    dragPreviewElement = null;
};

const createDragPreview = (event) => {
    if (
        typeof document === 'undefined' ||
        !event.dataTransfer ||
        typeof event.dataTransfer.setDragImage !== 'function' ||
        !(event.currentTarget instanceof HTMLElement)
    ) {
        return;
    }

    removeDragPreview();

    const sourceElement = event.currentTarget;
    const sourceRect = sourceElement.getBoundingClientRect();
    const clone = sourceElement.cloneNode(true);

    clone.classList.add('board-drag-preview');
    clone.style.width = `${sourceRect.width}px`;
    clone.style.position = 'fixed';
    clone.style.top = '-9999px';
    clone.style.left = '-9999px';
    clone.style.margin = '0';
    clone.style.pointerEvents = 'none';

    document.body.appendChild(clone);

    const offsetX = Math.min(Math.max(event.clientX - sourceRect.left, 0), sourceRect.width);
    const offsetY = Math.min(Math.max(event.clientY - sourceRect.top, 0), sourceRect.height);

    event.dataTransfer.setDragImage(clone, offsetX, offsetY);
    dragPreviewElement = clone;
};

const clearDragState = () => {
    dragState.activeReportId = null;
    dragState.sourceColumnKey = null;
    dragState.overColumnKey = null;
};

const handleCardDragStart = (event, reportId, columnKey) => {
    if (dragState.savingReportId === reportId) {
        event.preventDefault();
        return;
    }

    boardFailure.value = '';
    dragState.activeReportId = reportId;
    dragState.sourceColumnKey = columnKey;
    dragState.overColumnKey = columnKey;

    createDragPreview(event);

    event.dataTransfer?.setData(
        'application/json',
        JSON.stringify({
            reportId,
            columnKey,
        }),
    );
    event.dataTransfer?.setData('text/plain', String(reportId));

    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
    }
};

const handleCardDragEnd = () => {
    removeDragPreview();
    clearDragState();
};

const handleColumnDragOver = (event, columnKey) => {
    if (!dragState.activeReportId) {
        return;
    }

    event.preventDefault();
    dragState.overColumnKey = columnKey;

    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = dragState.sourceColumnKey === columnKey ? 'none' : 'move';
    }
};

const handleColumnDrop = async (event, columnKey) => {
    event.preventDefault();

    const payload = parseDragPayload(event);
    const reportId = payload?.reportId ?? dragState.activeReportId;
    const sourceColumnKey = payload?.columnKey ?? dragState.sourceColumnKey;

    if (!reportId || !sourceColumnKey || sourceColumnKey === columnKey) {
        clearDragState();
        return;
    }

    const snapshot = moveReportToColumn(reportId, columnKey);

    clearDragState();

    if (!snapshot) {
        return;
    }

    dragState.savingReportId = reportId;

    try {
        boardFailure.value = '';
        await axios.patch(route('api.v1.reports.triage', reportId), {
            workflow_state: columnKey,
        });
    } catch (error) {
        revertMovedReport(snapshot);
        boardFailure.value = error?.response?.data?.message ?? 'Unable to move this bug right now.';
    } finally {
        dragState.savingReportId = null;
    }
};
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
                            Drag cards between lists to change their workflow state without opening the report.
                        </div>

                        <Link :href="route('settings.members')" :class="buttonVariants({ variant: 'outline', size: 'sm' })">
                            <Settings2 class="mr-2 size-4" />
                            Workspace settings
                        </Link>
                    </div>

                    <div class="overflow-x-auto bg-[#ded3c6] p-4">
                        <div
                            v-if="boardFailure"
                            class="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900"
                        >
                            {{ boardFailure }}
                        </div>

                        <div class="flex min-h-[calc(100vh-19rem)] min-w-[44rem] gap-3">
                            <section
                                v-for="section in boardSections"
                                :key="section.key"
                                :class="
                                    cn(
                                        'flex w-[21.5rem] shrink-0 flex-col rounded-xl border border-border/80 bg-[#f6f2ed] transition-colors duration-200',
                                        dragState.overColumnKey === section.key && dragState.sourceColumnKey !== section.key
                                            ? 'border-stone-500 bg-[#f2e7da]'
                                            : undefined,
                                    )
                                "
                                :data-testid="`bug-board-column-${section.key}`"
                            >
                                <div class="flex items-start justify-between gap-3 border-b border-border/70 px-3.5 py-3">
                                    <div class="space-y-1">
                                        <h2 class="text-sm font-semibold">{{ section.title }}</h2>
                                        <p class="text-sm text-muted-foreground">{{ section.description }}</p>
                                    </div>

                                    <Badge variant="secondary">{{ section.items.length }}</Badge>
                                </div>

                                <div
                                    class="flex-1 overflow-y-auto p-2.5"
                                    :data-testid="`bug-board-dropzone-${section.key}`"
                                    @dragover="handleColumnDragOver($event, section.key)"
                                    @drop="handleColumnDrop($event, section.key)"
                                >
                                    <TransitionGroup :css="enableBoardMotion" name="board-card" tag="div" class="space-y-3">
                                        <article
                                            v-for="report in section.items"
                                            :key="report.id"
                                            :data-report-id="report.id"
                                            data-testid="bug-board-row"
                                            :class="
                                                cn(
                                                    'cursor-grab rounded-lg border border-border/80 bg-background p-2.5 shadow-[0_1px_3px_rgba(28,25,23,0.08)] transition-[transform,box-shadow,opacity] duration-200 active:cursor-grabbing',
                                                    dragState.activeReportId === report.id ? 'scale-[0.985] rotate-[1deg] opacity-60 shadow-lg' : undefined,
                                                    dragState.savingReportId === report.id ? 'pointer-events-none opacity-70' : undefined,
                                                )
                                            "
                                            draggable="true"
                                            @dragstart="handleCardDragStart($event, report.id, section.key)"
                                            @dragend="handleCardDragEnd"
                                        >
                                            <div class="grid grid-cols-[5.75rem_minmax(0,1fr)] gap-2.5">
                                                <div class="w-[5.75rem] shrink-0 self-start overflow-hidden rounded-md border bg-muted">
                                                    <div class="aspect-[16/10]">
                                                        <ArtifactPreview
                                                            :preview="report.preview"
                                                            :media-kind="report.media_kind"
                                                            :alt="report.title"
                                                            media-class="h-full w-full object-cover"
                                                            placeholder-icon-class="size-5 text-muted-foreground"
                                                        />
                                                    </div>
                                                </div>

                                                <div class="min-w-0 space-y-2">
                                                    <div class="flex items-start justify-between gap-2">
                                                        <div class="min-w-0 flex-1 space-y-1">
                                                            <ReportTitleLink
                                                                :href="route('reports.show', report.id)"
                                                                :title="report.title"
                                                                class="max-w-full"
                                                            />
                                                            <p class="line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                                                                {{ report.summary || 'No summary provided yet.' }}
                                                            </p>
                                                        </div>

                                                        <StatusBadge :value="report.status" />
                                                    </div>

                                                    <div class="flex flex-wrap gap-1.5">
                                                        <Badge variant="outline" class="capitalize">
                                                            {{ report.media_kind }}
                                                        </Badge>
                                                        <Badge variant="outline" class="inline-flex items-center gap-1">
                                                            <component :is="visibilityIcon(report.visibility)" class="size-3" />
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
                                                        :disabled="dragState.savingReportId === report.id"
                                                        @updated="updateReportTriage(report.id, $event)"
                                                    />

                                                    <div class="flex items-center justify-between gap-2 border-t pt-2">
                                                        <div class="truncate text-[11px] text-muted-foreground">
                                                            {{ formatDate(report.created_at) }}
                                                        </div>

                                                        <div class="flex shrink-0 flex-wrap gap-2.5">
                                                            <TextLink
                                                                :href="route('reports.show', report.id)"
                                                                class="text-xs font-medium text-primary hover:underline"
                                                            >
                                                                Open
                                                            </TextLink>
                                                            <TextLink
                                                                v-if="report.share_url"
                                                                :href="report.share_url"
                                                                native
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                class="text-xs font-medium text-primary hover:underline"
                                                            >
                                                                Public
                                                            </TextLink>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </article>
                                    </TransitionGroup>

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

<style scoped>
.board-card-move,
.board-card-enter-active,
.board-card-leave-active {
    transition:
        transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
        opacity 180ms ease,
        box-shadow 220ms ease;
}

.board-card-enter-from,
.board-card-leave-to {
    opacity: 0;
    transform: translateY(14px) scale(0.98);
}

.board-drag-preview {
    opacity: 0.96;
    transform: rotate(1.5deg);
    box-shadow:
        0 18px 34px rgba(28, 25, 23, 0.22),
        0 2px 6px rgba(28, 25, 23, 0.12);
}
</style>
