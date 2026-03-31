<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import axios from 'axios';
import { Link, router } from '@inertiajs/vue3';
import { CircleAlert, LayoutGrid, Plus, Search, Table2 } from 'lucide-vue-next';
import AppShell from '@/Layouts/AppShell.vue';
import ArtifactPreview from '@/Shared/ArtifactPreview.vue';
import ChipSelect from '@/Shared/ChipSelect.vue';
import IssueTriageControls from '@/Shared/IssueTriageControls.vue';
import StatusBadge from '@/Shared/StatusBadge.vue';
import TextLink from '@/Shared/TextLink.vue';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Textarea } from '@/Components/ui/textarea';
import {
    backlogViewOptions,
    issueBoardColumns,
    issueResolutionOptions,
    issueUrgencyOptions,
    issueWorkflowOptions,
} from '@/lib/bug-issues';
import { cn } from '@/lib/utils';

const props = defineProps({
    filters: {
        type: Object,
        required: true,
    },
    issues: {
        type: Array,
        required: true,
    },
    summary: {
        type: Object,
        required: true,
    },
    members: {
        type: Array,
        required: true,
    },
});

const filters = reactive({
    search: props.filters.search ?? '',
    view: props.filters.view ?? 'board',
    workflow_state: props.filters.workflow_state ?? '',
    resolution: props.filters.resolution ?? '',
    assignee: props.filters.assignee ?? '',
});
const createForm = reactive({
    title: '',
    summary: '',
    urgency: 'medium',
});
const createBusy = ref(false);
const createFailure = ref('');
const createDialogOpen = ref(false);
const boardFailure = ref('');
const boardColumns = reactive(
    Object.fromEntries(issueBoardColumns.map((column) => [column.value, []])),
);
const dragState = reactive({
    activeIssueId: null,
    sourceColumnKey: null,
    overColumnKey: null,
    savingIssueId: null,
});

const enableBoardMotion = import.meta.env.MODE !== 'test';
let dragPreviewElement = null;
let dragSourceElement = null;
let dragPointerId = null;
let dragFrameHandle = null;
let pendingDragPoint = null;
let dragPreviewOffsetX = 0;
let dragPreviewOffsetY = 0;

const workflowFilterOptions = [
    { label: 'All stages', value: '' },
    ...issueWorkflowOptions,
];
const resolutionFilterOptions = [
    { label: 'All resolutions', value: '' },
    ...issueResolutionOptions,
];
const assigneeFilterOptions = computed(() => [
    { label: 'Anyone', value: '' },
    { label: 'Assigned to me', value: 'me' },
    ...props.members.map((member) => ({
        label: member.name || member.email,
        value: String(member.id),
    })),
]);
const isListView = computed(() => filters.view === 'list');
const boardSummary = computed(() => [
    { label: 'Inbox', value: props.summary.inbox ?? 0 },
    { label: 'Triaged', value: props.summary.triaged ?? 0 },
    { label: 'In progress', value: props.summary.in_progress ?? 0 },
    { label: 'Verify', value: props.summary.ready_to_verify ?? 0 },
    { label: 'Done', value: props.summary.done ?? 0 },
    { label: 'Critical', value: props.summary.critical ?? 0 },
    { label: 'Synced', value: props.summary.linked ?? 0 },
    { label: 'Shared', value: props.summary.shared ?? 0 },
]);
const contextItems = computed(() => [
    { label: 'Issues', value: props.summary.total ?? props.issues.length },
    { label: 'Critical', value: props.summary.critical ?? 0 },
    { label: 'Synced', value: props.summary.linked ?? 0 },
    { label: 'Shared', value: props.summary.shared ?? 0 },
]);

const formatDate = (value) =>
    value
        ? new Intl.DateTimeFormat(undefined, {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
          }).format(new Date(value))
        : 'n/a';

const issueSort = (left, right) => {
    const urgencyWeight = {
        critical: 4,
        high: 3,
        medium: 2,
        low: 1,
    };
    const urgencyDelta = (urgencyWeight[right.urgency] ?? 0) - (urgencyWeight[left.urgency] ?? 0);

    if (urgencyDelta !== 0) {
        return urgencyDelta;
    }

    return new Date(right.last_seen_at ?? right.first_seen_at ?? 0).getTime() - new Date(left.last_seen_at ?? left.first_seen_at ?? 0).getTime();
};

const buildBoardColumns = () => {
    const next = Object.fromEntries(issueBoardColumns.map((column) => [column.value, []]));

    props.issues.forEach((issue) => {
        const bucket = next[issue.workflow_state] ?? next.inbox;
        bucket.push({ ...issue });
    });

    issueBoardColumns.forEach((column) => {
        next[column.value].sort(issueSort);
    });

    return next;
};

watch(
    () => props.issues,
    () => {
        const next = buildBoardColumns();

        issueBoardColumns.forEach((column) => {
            boardColumns[column.value] = next[column.value];
        });
    },
    { deep: true, immediate: true },
);

const boardSections = computed(() =>
    issueBoardColumns.map((column) => ({
        ...column,
        items: boardColumns[column.value],
    })),
);

const latestEvidenceLine = (issue) => {
    if (!issue.latest_report?.debugger_summary) {
        return 'No debugger summary yet.';
    }

    const summary = issue.latest_report.debugger_summary;
    return `${summary.steps_count} steps, ${summary.console_count} console, ${summary.network_count} network`;
};

const applyFilters = () => {
    router.get(route('bugs.index'), filters, {
        preserveScroll: true,
        preserveState: true,
        replace: true,
    });
};

const resetFilters = () => {
    filters.search = '';
    filters.view = 'board';
    filters.workflow_state = '';
    filters.resolution = '';
    filters.assignee = '';
    applyFilters();
};

const updateFilter = (field, value) => {
    if (filters[field] === value) {
        return;
    }

    filters[field] = value;
    applyFilters();
};

const createIssue = async () => {
    if (createBusy.value || createForm.title.trim() === '') {
        return;
    }

    createBusy.value = true;
    createFailure.value = '';

    try {
        const { data } = await axios.post(route('api.v1.issues.store'), {
            title: createForm.title.trim(),
            summary: createForm.summary.trim() || null,
            urgency: createForm.urgency,
        });

        createDialogOpen.value = false;
        createForm.title = '';
        createForm.summary = '';
        createForm.urgency = 'medium';
        router.visit(data.issue.issue_url);
    } catch (error) {
        createFailure.value = error?.response?.data?.message ?? 'Unable to create a backlog issue.';
    } finally {
        createBusy.value = false;
    }
};

const setCreateDialogOpen = (open) => {
    createDialogOpen.value = open;

    if (!open) {
        createFailure.value = '';
    }
};

const findIssueLocation = (issueId) => {
    for (const column of issueBoardColumns) {
        const index = boardColumns[column.value].findIndex((issue) => issue.id === issueId);

        if (index !== -1) {
            return {
                columnKey: column.value,
                index,
                issue: boardColumns[column.value][index],
            };
        }
    }

    return null;
};

const moveIssueToColumn = (issueId, targetColumnKey) => {
    const source = findIssueLocation(issueId);

    if (!source || source.columnKey === targetColumnKey) {
        return null;
    }

    const [issue] = boardColumns[source.columnKey].splice(source.index, 1);
    issue.workflow_state = targetColumnKey;
    boardColumns[targetColumnKey].push(issue);
    boardColumns[targetColumnKey].sort(issueSort);

    return {
        issueId,
        issue,
        sourceColumnKey: source.columnKey,
        sourceIndex: source.index,
    };
};

const revertMovedIssue = (snapshot) => {
    if (!snapshot) {
        return;
    }

    const current = findIssueLocation(snapshot.issueId);

    if (!current) {
        return;
    }

    const [issue] = boardColumns[current.columnKey].splice(current.index, 1);
    issue.workflow_state = snapshot.sourceColumnKey;
    boardColumns[snapshot.sourceColumnKey].splice(snapshot.sourceIndex, 0, issue);
    boardColumns[snapshot.sourceColumnKey].sort(issueSort);
};

const replaceIssueInBoard = (updatedIssue) => {
    const current = findIssueLocation(updatedIssue.id);

    if (current) {
        boardColumns[current.columnKey].splice(current.index, 1);
    }

    if (!boardColumns[updatedIssue.workflow_state]) {
        return;
    }

    boardColumns[updatedIssue.workflow_state].push({ ...updatedIssue });
    boardColumns[updatedIssue.workflow_state].sort(issueSort);
};

const updateIssueFromControls = (updatedIssue) => {
    boardFailure.value = '';
    replaceIssueInBoard(updatedIssue);
};

const requestBoardFrame = (callback) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        return window.requestAnimationFrame(callback);
    }

    return setTimeout(callback, 16);
};

const cancelBoardFrame = (handle) => {
    if (handle === null) {
        return;
    }

    if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(handle);
        return;
    }

    clearTimeout(handle);
};

const isInteractiveTarget = (target) => {
    if (!(target instanceof Element)) {
        return false;
    }

    return Boolean(target.closest('a, button, input, textarea, label, [role="button"], [contenteditable="true"]'));
};

const findColumnKeyFromPoint = (clientX, clientY) => {
    if (typeof document === 'undefined' || typeof document.elementFromPoint !== 'function') {
        return null;
    }

    const target = document.elementFromPoint(clientX, clientY);

    if (!(target instanceof Element)) {
        return null;
    }

    return target.closest('[data-board-column-key]')?.getAttribute('data-board-column-key') ?? null;
};

const removeDragPreview = () => {
    if (!dragPreviewElement) {
        return;
    }

    dragPreviewElement.remove();
    dragPreviewElement = null;
};

const syncDragPreviewPosition = (clientX, clientY) => {
    if (!dragPreviewElement || clientX <= 0 || clientY <= 0) {
        return;
    }

    dragPreviewElement.style.transform = `translate3d(${Math.round(clientX - dragPreviewOffsetX)}px, ${Math.round(clientY - dragPreviewOffsetY)}px, 0)`;
};

const flushPendingDragPoint = () => {
    if (!pendingDragPoint) {
        return;
    }

    const nextPoint = pendingDragPoint;
    pendingDragPoint = null;

    syncDragPreviewPosition(nextPoint.clientX, nextPoint.clientY);
    dragState.overColumnKey = findColumnKeyFromPoint(nextPoint.clientX, nextPoint.clientY);
};

const queueDragPreviewPosition = (clientX, clientY) => {
    pendingDragPoint = { clientX, clientY };

    if (dragFrameHandle !== null) {
        return;
    }

    dragFrameHandle = requestBoardFrame(() => {
        dragFrameHandle = null;
        flushPendingDragPoint();
    });
};

const createDragPreview = (sourceElement, clientX, clientY) => {
    if (typeof document === 'undefined') {
        return;
    }

    removeDragPreview();

    const sourceRect = sourceElement.getBoundingClientRect();
    const clone = sourceElement.cloneNode(true);

    clone.classList.add('board-drag-preview');
    clone.style.width = `${sourceRect.width}px`;
    clone.style.height = `${sourceRect.height}px`;
    clone.style.position = 'fixed';
    clone.style.top = '0';
    clone.style.left = '0';
    clone.style.margin = '0';
    clone.style.pointerEvents = 'none';
    clone.style.transform = `translate3d(${Math.round(sourceRect.left)}px, ${Math.round(sourceRect.top)}px, 0)`;

    document.body.appendChild(clone);

    dragPreviewOffsetX = Math.min(Math.max(clientX - sourceRect.left, 0), sourceRect.width);
    dragPreviewOffsetY = Math.min(Math.max(clientY - sourceRect.top, 0), sourceRect.height);

    dragPreviewElement = clone;
    syncDragPreviewPosition(clientX, clientY);
};

const clearDragState = () => {
    dragState.activeIssueId = null;
    dragState.sourceColumnKey = null;
    dragState.overColumnKey = null;
};

const detachPointerListeners = () => {
    if (typeof window === 'undefined') {
        return;
    }

    window.removeEventListener('pointermove', handleGlobalPointerMove);
    window.removeEventListener('pointerup', handleGlobalPointerUp);
    window.removeEventListener('pointercancel', handleGlobalPointerUp);
};

const stopPointerDrag = () => {
    detachPointerListeners();
    cancelBoardFrame(dragFrameHandle);
    dragFrameHandle = null;
    pendingDragPoint = null;

    if (dragSourceElement && dragPointerId !== null && typeof dragSourceElement.releasePointerCapture === 'function') {
        try {
            dragSourceElement.releasePointerCapture(dragPointerId);
        } catch {
            // Ignore browsers that already released capture.
        }
    }

    dragSourceElement = null;
    dragPointerId = null;
    removeDragPreview();
    clearDragState();

    if (typeof document !== 'undefined') {
        document.body.classList.remove('board-dragging');
    }
};

const handleCardPointerDown = (event, issueId, columnKey) => {
    if (
        dragState.savingIssueId === issueId ||
        dragState.activeIssueId !== null ||
        event.button !== 0 ||
        event.pointerType === 'touch' ||
        isInteractiveTarget(event.target) ||
        !(event.currentTarget instanceof HTMLElement)
    ) {
        return;
    }

    boardFailure.value = '';
    dragState.activeIssueId = issueId;
    dragState.sourceColumnKey = columnKey;
    dragState.overColumnKey = columnKey;
    dragPointerId = event.pointerId;
    dragSourceElement = event.currentTarget;

    createDragPreview(event.currentTarget, event.clientX, event.clientY);

    if (typeof document !== 'undefined') {
        document.body.classList.add('board-dragging');
    }

    if (typeof event.currentTarget.setPointerCapture === 'function') {
        try {
            event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
            // Ignore partial pointer-capture support.
        }
    }

    if (typeof window !== 'undefined') {
        window.addEventListener('pointermove', handleGlobalPointerMove);
        window.addEventListener('pointerup', handleGlobalPointerUp);
        window.addEventListener('pointercancel', handleGlobalPointerUp);
    }

    event.preventDefault();
};

const handleGlobalPointerMove = (event) => {
    if (dragPointerId === null || event.pointerId !== dragPointerId) {
        return;
    }

    if (event.buttons === 0) {
        handleGlobalPointerUp(event);
        return;
    }

    queueDragPreviewPosition(event.clientX, event.clientY);
    event.preventDefault();
};

const handleGlobalPointerUp = async (event) => {
    if (dragPointerId === null || event.pointerId !== dragPointerId) {
        return;
    }

    cancelBoardFrame(dragFrameHandle);
    dragFrameHandle = null;
    pendingDragPoint = null;
    syncDragPreviewPosition(event.clientX, event.clientY);

    const issueId = dragState.activeIssueId;
    const sourceColumnKey = dragState.sourceColumnKey;
    const targetColumnKey = findColumnKeyFromPoint(event.clientX, event.clientY);

    stopPointerDrag();

    if (!issueId || !sourceColumnKey || !targetColumnKey || sourceColumnKey === targetColumnKey) {
        return;
    }

    const issueLocation = findIssueLocation(issueId);

    if (targetColumnKey === 'done' && issueLocation?.issue?.resolution === 'unresolved') {
        boardFailure.value = 'Pick a final resolution before moving an issue to Done.';
        return;
    }

    const snapshot = moveIssueToColumn(issueId, targetColumnKey);

    if (!snapshot) {
        return;
    }

    dragState.savingIssueId = issueId;

    try {
        const { data } = await axios.patch(route('api.v1.issues.update', issueId), {
            workflow_state: targetColumnKey,
            resolution: snapshot.issue.resolution,
        });

        replaceIssueInBoard(data.issue);
    } catch (error) {
        revertMovedIssue(snapshot);
        boardFailure.value = error?.response?.data?.message ?? 'Unable to move this issue right now.';
    } finally {
        dragState.savingIssueId = null;
    }
};

onBeforeUnmount(() => {
    stopPointerDrag();
});
</script>

<template>
    <AppShell
        title="Bug backlog"
        description="Issue-centric backlog for triage, sync handoff, verification, and evidence review across external delivery trackers."
        section="backlog"
        :context-items="contextItems"
    >
        <div class="space-y-6">
            <Card class="rounded-lg shadow-none">
                <CardHeader class="space-y-5 border-b pb-5">
                    <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div class="space-y-2">
                            <div class="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
                                <div v-for="item in boardSummary" :key="item.label" class="flex items-center gap-1.5">
                                    <span>{{ item.label }}</span>
                                    <span class="font-medium text-foreground">{{ item.value }}</span>
                                </div>
                            </div>
                            <div class="space-y-1">
                                <CardTitle>Backlog workspace</CardTitle>
                                <CardDescription>Track triaged issues, push them outward when needed, and keep verification inside Snag.</CardDescription>
                            </div>
                        </div>

                        <Dialog :open="createDialogOpen" @update:open="setCreateDialogOpen">
                            <DialogTrigger as-child>
                                <Button class="rounded-md" data-testid="open-create-issue-dialog">
                                    <Plus class="mr-2 size-4" />
                                    New issue
                                </Button>
                            </DialogTrigger>

                            <DialogContent class="sm:max-w-xl">
                                <DialogHeader>
                                    <DialogTitle>Create issue</DialogTitle>
                                    <DialogDescription>
                                        Start a tracked backlog issue without cluttering the board header.
                                    </DialogDescription>
                                </DialogHeader>

                                <div class="space-y-4">
                                    <div class="space-y-2">
                                        <Label for="issue-create-title">Title</Label>
                                        <Input
                                            id="issue-create-title"
                                            v-model="createForm.title"
                                            class="h-10"
                                            placeholder="Describe the bug you want to track"
                                            @keydown.enter.prevent="createIssue"
                                        />
                                    </div>

                                    <div class="space-y-2">
                                        <Label for="issue-create-summary">Summary</Label>
                                        <Textarea
                                            id="issue-create-summary"
                                            v-model="createForm.summary"
                                            rows="4"
                                            placeholder="Add quick context, repro hints, or what changed."
                                        />
                                    </div>

                                    <div class="space-y-2">
                                        <Label for="issue-create-urgency">Urgency</Label>
                                        <ChipSelect
                                            id="issue-create-urgency"
                                            :model-value="createForm.urgency"
                                            :options="issueUrgencyOptions"
                                            trigger-class="h-10 w-full justify-between rounded-md px-3"
                                            content-class="min-w-[12rem]"
                                            @update:model-value="createForm.urgency = $event"
                                        />
                                    </div>

                                    <p v-if="createFailure" class="text-sm text-rose-700">{{ createFailure }}</p>
                                </div>

                                <DialogFooter class="gap-2">
                                    <Button variant="outline" class="rounded-md" @click="setCreateDialogOpen(false)">
                                        Cancel
                                    </Button>
                                    <Button
                                        class="rounded-md"
                                        data-testid="submit-create-issue"
                                        :disabled="createBusy || createForm.title.trim() === ''"
                                        @click="createIssue"
                                    >
                                        {{ createBusy ? 'Creating...' : 'Create issue' }}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div class="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_200px_200px_200px_auto]">
                        <div class="relative">
                            <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="bug-search"
                                v-model="filters.search"
                                class="h-10 pl-9"
                                placeholder="Search by issue title, summary, or linked report"
                                @keydown.enter.prevent="applyFilters"
                            />
                        </div>

                        <ChipSelect
                            id="bug-view"
                            :model-value="filters.view"
                            :options="backlogViewOptions"
                            trigger-class="h-10 w-full justify-between rounded-md px-3"
                            content-class="min-w-[12rem]"
                            @update:model-value="updateFilter('view', $event)"
                        />

                        <ChipSelect
                            id="bug-workflow-filter"
                            :model-value="filters.workflow_state"
                            :options="workflowFilterOptions"
                            trigger-class="h-10 w-full justify-between rounded-md px-3"
                            content-class="min-w-[12rem]"
                            @update:model-value="updateFilter('workflow_state', $event)"
                        />

                        <ChipSelect
                            id="bug-resolution-filter"
                            :model-value="filters.resolution"
                            :options="resolutionFilterOptions"
                            trigger-class="h-10 w-full justify-between rounded-md px-3"
                            content-class="min-w-[12rem]"
                            @update:model-value="updateFilter('resolution', $event)"
                        />

                        <div class="flex gap-2 xl:justify-end">
                            <ChipSelect
                                id="bug-assignee-filter"
                                :model-value="filters.assignee"
                                :options="assigneeFilterOptions"
                                trigger-class="h-10 w-full justify-between rounded-md px-3 xl:w-[15rem]"
                                content-class="min-w-[15rem]"
                                @update:model-value="updateFilter('assignee', $event)"
                            />
                            <Button variant="outline" class="rounded-md" @click="resetFilters">Reset</Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <Card class="overflow-hidden rounded-lg border-border/70 bg-card shadow-none">
                <CardHeader class="border-b border-border/70 bg-muted/20">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <CardTitle class="text-lg">{{ isListView ? 'List view' : 'Board view' }}</CardTitle>
                            <CardDescription>
                                {{ isListView ? 'Dense queue for bulk review and quick scanning.' : 'Drag issues between workflow columns while keeping evidence attached.' }}
                            </CardDescription>
                        </div>
                        <div class="flex items-center gap-2 text-sm text-muted-foreground">
                            <component :is="isListView ? Table2 : LayoutGrid" class="size-4" />
                            {{ props.issues.length }} issues in this view
                        </div>
                    </div>
                </CardHeader>

                <CardContent class="p-0">
                    <div
                        v-if="boardFailure"
                        class="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900"
                    >
                        <CircleAlert class="mt-0.5 size-4 shrink-0" />
                        <span>{{ boardFailure }}</span>
                    </div>

                    <div v-if="isListView" class="overflow-x-auto">
                        <Table class="min-w-[82rem]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead class="w-24">Key</TableHead>
                                    <TableHead>Issue</TableHead>
                                    <TableHead class="w-52">Stage</TableHead>
                                    <TableHead class="w-52">Assignee</TableHead>
                                    <TableHead class="w-44">Reports</TableHead>
                                    <TableHead class="w-44">Last seen</TableHead>
                                    <TableHead class="w-52">Sync</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow v-for="issue in props.issues" :key="issue.id">
                                    <TableCell class="font-medium">{{ issue.key }}</TableCell>
                                    <TableCell class="align-top">
                                        <div class="flex gap-3">
                                            <div class="w-20 shrink-0 overflow-hidden rounded-xl border bg-muted">
                                                <div class="aspect-[16/10]">
                                                    <ArtifactPreview
                                                        :preview="issue.preview"
                                                        :media-kind="issue.latest_report?.media_kind ?? 'screenshot'"
                                                        :alt="issue.title"
                                                        media-class="h-full w-full object-cover"
                                                        placeholder-icon-class="size-5 text-muted-foreground"
                                                    />
                                                </div>
                                            </div>
                                            <div class="min-w-0 space-y-2">
                                                <Link :href="issue.issue_url" class="block truncate text-sm font-medium text-foreground hover:text-primary">
                                                    {{ issue.title }}
                                                </Link>
                                                <p class="line-clamp-2 text-sm text-muted-foreground">{{ issue.summary || 'No summary provided yet.' }}</p>
                                                <div class="flex flex-wrap gap-2">
                                                    <StatusBadge :value="issue.workflow_state" />
                                                    <StatusBadge :value="issue.urgency" />
                                                    <StatusBadge :value="issue.resolution" />
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell class="align-top">
                                        <IssueTriageControls
                                            :issue-id="issue.id"
                                            :workflow-state="issue.workflow_state"
                                            :urgency="issue.urgency"
                                            :resolution="issue.resolution"
                                            compact
                                            :show-labels="false"
                                            @updated="updateIssueFromControls"
                                            @error="boardFailure = $event"
                                        />
                                    </TableCell>
                                    <TableCell class="align-top text-sm text-muted-foreground">
                                        {{ issue.assignee?.name || issue.assignee?.email || 'Unassigned' }}
                                    </TableCell>
                                    <TableCell class="align-top text-sm text-muted-foreground">
                                        {{ issue.linked_reports_count }} reports / {{ issue.reporters_count }} reporters
                                    </TableCell>
                                    <TableCell class="align-top text-sm text-muted-foreground">
                                        {{ formatDate(issue.last_seen_at) }}
                                    </TableCell>
                                    <TableCell class="align-top">
                                        <div class="flex flex-wrap gap-2">
                                            <StatusBadge v-for="link in issue.external_links" :key="link.id" :value="link.provider" />
                                            <TextLink
                                                v-if="issue.primary_external_link"
                                                :href="issue.primary_external_link.external_url"
                                                native
                                                target="_blank"
                                                rel="noreferrer"
                                                class="text-sm font-medium text-primary hover:underline"
                                            >
                                                {{ issue.primary_external_link.external_key }}
                                            </TextLink>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>

                    <div v-else class="overflow-x-auto bg-muted/40 p-4">
                        <div class="flex min-h-[calc(100vh-24rem)] min-w-[81rem] gap-4">
                            <section
                                v-for="section in boardSections"
                                :key="section.value"
                                :data-board-column-key="section.value"
                                :class="
                                    cn(
                                        'flex w-[18.75rem] shrink-0 flex-col rounded-lg border border-border/70 bg-background transition-colors duration-200',
                                        dragState.overColumnKey === section.value && dragState.sourceColumnKey !== section.value
                                            ? 'border-primary/35 bg-accent/30'
                                            : undefined,
                                    )
                                "
                                :data-testid="`issue-board-column-${section.value}`"
                            >
                                <div class="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
                                    <div class="space-y-1">
                                        <h2 class="text-sm font-semibold">{{ section.label }}</h2>
                                        <p class="text-xs text-muted-foreground">{{ section.description }}</p>
                                    </div>
                                    <div class="text-sm font-medium text-muted-foreground">{{ section.items.length }}</div>
                                </div>

                                <div class="flex-1 space-y-3 overflow-y-auto p-3" :data-testid="`issue-board-dropzone-${section.value}`">
                                    <TransitionGroup :css="enableBoardMotion" name="board-card" tag="div" class="space-y-3">
                                        <article
                                            v-for="issue in section.items"
                                            :key="issue.id"
                                            :data-issue-id="issue.id"
                                            data-testid="issue-board-card"
                                            :class="
                                                cn(
                                                    'cursor-grab select-none rounded-lg border border-border/70 bg-card p-3 transition-[opacity,border-color,background-color] duration-150 active:cursor-grabbing',
                                                    dragState.activeIssueId === issue.id ? 'border-primary/35 opacity-35 shadow-none' : undefined,
                                                    dragState.savingIssueId === issue.id ? 'pointer-events-none opacity-70' : undefined,
                                                )
                                            "
                                            @pointerdown="handleCardPointerDown($event, issue.id, section.value)"
                                        >
                                            <div class="space-y-3">
                                                <div class="flex gap-3">
                                                    <div class="w-[4.75rem] shrink-0 overflow-hidden rounded-md border bg-muted">
                                                        <div class="aspect-[16/10]">
                                                            <ArtifactPreview
                                                                :preview="issue.preview"
                                                                :media-kind="issue.latest_report?.media_kind ?? 'screenshot'"
                                                                :alt="issue.title"
                                                                media-class="h-full w-full object-cover"
                                                                placeholder-icon-class="size-5 text-muted-foreground"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div class="min-w-0 flex-1 space-y-2">
                                                        <div class="flex items-start justify-between gap-2">
                                                            <div class="min-w-0 space-y-1">
                                                                <div class="truncate text-[11px] font-medium text-muted-foreground">
                                                                    {{ issue.key }}
                                                                </div>
                                                                <Link
                                                                    :href="issue.issue_url"
                                                                    :title="issue.title"
                                                                    class="block truncate text-sm font-medium text-foreground hover:text-primary"
                                                                >
                                                                    {{ issue.title }}
                                                                </Link>
                                                                <p class="line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                                                                    {{ issue.summary || 'No summary provided yet.' }}
                                                                </p>
                                                            </div>
                                                            <StatusBadge :value="issue.urgency" />
                                                        </div>

                                                        <div class="flex flex-wrap gap-2">
                                                            <StatusBadge :value="issue.resolution" />
                                                            <StatusBadge v-if="issue.primary_external_link" :value="issue.primary_external_link.provider" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                                                    <span>{{ issue.linked_reports_count }} reports</span>
                                                    <span>{{ issue.reporters_count }} reporters</span>
                                                    <span>Last seen {{ formatDate(issue.last_seen_at) }}</span>
                                                </div>

                                                <div class="rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                                                    {{ latestEvidenceLine(issue) }}
                                                </div>

                                                <IssueTriageControls
                                                    :issue-id="issue.id"
                                                    :workflow-state="issue.workflow_state"
                                                    :urgency="issue.urgency"
                                                    :resolution="issue.resolution"
                                                    compact
                                                    :show-workflow="false"
                                                    :show-labels="false"
                                                    :disabled="dragState.savingIssueId === issue.id"
                                                    @updated="updateIssueFromControls"
                                                    @error="boardFailure = $event"
                                                />

                                                <div class="flex items-center justify-between gap-3 border-t border-border/70 pt-3">
                                                    <div class="truncate text-[11px] text-muted-foreground">
                                                        {{ issue.assignee?.name || issue.assignee?.email || 'Unassigned' }}
                                                    </div>
                                                    <div class="flex shrink-0 items-center gap-3">
                                                        <TextLink
                                                            v-if="issue.primary_external_link"
                                                            :href="issue.primary_external_link.external_url"
                                                            native
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            class="text-xs font-medium text-primary hover:underline"
                                                        >
                                                            {{ issue.primary_external_link.external_key }}
                                                        </TextLink>
                                                        <TextLink :href="issue.issue_url" class="text-xs font-medium text-primary hover:underline">
                                                            Open issue
                                                        </TextLink>
                                                    </div>
                                                </div>
                                            </div>
                                        </article>
                                    </TransitionGroup>

                                    <div
                                        v-if="section.items.length === 0"
                                        class="grid min-h-24 place-items-center rounded-lg border border-dashed border-border/70 bg-muted/30 p-6 text-center text-sm text-muted-foreground"
                                    >
                                        {{ section.emptyMessage }}
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    </AppShell>
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
    cursor: grabbing;
    opacity: 0.98;
    box-shadow:
        0 18px 34px rgba(28, 25, 23, 0.22),
        0 2px 6px rgba(28, 25, 23, 0.12);
    transform-origin: top left;
    transition: none !important;
    will-change: transform;
    z-index: 80;
}

:global(body.board-dragging) {
    cursor: grabbing;
    user-select: none;
}

.board-drag-preview .cursor-grab,
.board-drag-preview {
    cursor: grabbing;
}
</style>
