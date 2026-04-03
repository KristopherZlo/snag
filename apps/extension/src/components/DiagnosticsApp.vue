<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue';
import { CircleAlert, RotateCcw, Video } from 'lucide-vue-next';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { requestOverlayDebugSnapshot } from '@/lib/chrome';
import { getOverlayDebugEntries, getPendingCapture, getRecordingState, type PendingCapture, type RecordingState } from '@/lib/storage';

interface DiagnosticsState {
    targetUrl: string;
    selectedTabId: string;
    status: string;
    busy: boolean;
    tabs: chrome.tabs.Tab[];
    pendingCapture: PendingCapture | null;
    recordingState: RecordingState;
    overlayDebugDump: string;
}

const state = reactive<DiagnosticsState>({
    targetUrl: '',
    selectedTabId: '',
    status: 'Pick a real browser tab and inspect the live capture state. For recorder smoke tests, start and stop the recording from the target diagnostics page so Chrome grants the tab capture invocation.',
    busy: false,
    tabs: [],
    pendingCapture: null,
    recordingState: { status: 'idle' },
    overlayDebugDump: '',
});

function telemetryTimestamps(pendingCapture: PendingCapture | null): string[] {
    if (!pendingCapture?.telemetry) {
        return [];
    }

    return [
        ...pendingCapture.telemetry.actions.map((entry) => entry.happened_at),
        ...pendingCapture.telemetry.logs.map((entry) => entry.happened_at),
        ...pendingCapture.telemetry.network_requests.map((entry) => entry.happened_at),
    ].filter((value): value is string => typeof value === 'string' && value.length > 0);
}

const pendingRows = computed(() => {
    const timestamps = telemetryTimestamps(state.pendingCapture);
    const firstTimestamp = timestamps[0] ?? 'n/a';
    const lastTimestamp = timestamps[timestamps.length - 1] ?? 'n/a';

    if (!state.pendingCapture) {
        return [{ label: 'Pending capture', value: 'none', testId: 'diagnostics-pending-kind' }];
    }

    return [
        { label: 'Pending capture', value: state.pendingCapture.kind, testId: 'diagnostics-pending-kind' },
        { label: 'Title', value: state.pendingCapture.title },
        { label: 'Byte size', value: String('byteSize' in state.pendingCapture ? state.pendingCapture.byteSize : 0), testId: 'diagnostics-pending-byte-size' },
        { label: 'Duration seconds', value: String('durationSeconds' in state.pendingCapture ? state.pendingCapture.durationSeconds : 0) },
        { label: 'Steps', value: String(state.pendingCapture.telemetry?.actions.length ?? 0), testId: 'diagnostics-actions-count' },
        { label: 'Console', value: String(state.pendingCapture.telemetry?.logs.length ?? 0), testId: 'diagnostics-logs-count' },
        { label: 'Network', value: String(state.pendingCapture.telemetry?.network_requests.length ?? 0), testId: 'diagnostics-network-count' },
        { label: 'First timestamp', value: firstTimestamp, testId: 'diagnostics-first-timestamp' },
        { label: 'Last timestamp', value: lastTimestamp, testId: 'diagnostics-last-timestamp' },
    ];
});

const recordingRows = computed(() => {
    const rows = [
        { label: 'Recorder state', value: state.recordingState.status, testId: 'diagnostics-recording-state' },
    ];

    if (state.recordingState.startedAt) {
        rows.push({ label: 'Started at', value: state.recordingState.startedAt });
    }

    return rows;
});

async function queryTabs(): Promise<chrome.tabs.Tab[]> {
    return new Promise((resolve) => {
        chrome.tabs.query({}, (tabs) => {
            resolve(
                tabs.filter((tab) => {
                    const url = tab.url ?? '';
                    return /^https?:\/\//.test(url);
                }),
            );
        });
    });
}

async function sendRuntimeMessage<T>(message: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            const error = chrome.runtime.lastError;

            if (error) {
                reject(new Error(error.message));
                return;
            }

            resolve(response as T);
        });
    });
}

async function refreshTabs(): Promise<void> {
    state.tabs = await queryTabs();

    const exactMatch = state.targetUrl.trim() === ''
        ? null
        : state.tabs.find((tab) => tab.url === state.targetUrl.trim()) ?? null;

    if (exactMatch?.id) {
        state.selectedTabId = String(exactMatch.id);
    } else if (!state.tabs.some((tab) => String(tab.id ?? '') === state.selectedTabId)) {
        state.selectedTabId = state.tabs[0]?.id ? String(state.tabs[0].id) : '';
    }
}

async function refreshDiagnosticsStatus(message?: string): Promise<void> {
    const [pendingCapture, recordingState] = await Promise.all([
        getPendingCapture(),
        getRecordingState(),
    ]);

    state.pendingCapture = pendingCapture;
    state.recordingState = recordingState;

    if (message) {
        state.status = message;
    }
}

async function refreshAll(message?: string): Promise<void> {
    await refreshTabs();
    await refreshDiagnosticsStatus(message);
}

async function activateSelectedTab(): Promise<void> {
    if (!state.selectedTabId) {
        return;
    }

    await chrome.tabs.update(Number(state.selectedTabId), { active: true });
}

async function startRecording(): Promise<void> {
    if (!state.selectedTabId) {
        throw new Error('Select a target tab first.');
    }

    const response = await sendRuntimeMessage<{ ok: boolean; message?: string }>({
        type: 'start-video-recording',
        tabId: Number(state.selectedTabId),
    });

    if (!response.ok) {
        throw new Error(response.message ?? 'Unable to start live recording.');
    }
}

async function stopRecording(): Promise<void> {
    const response = await sendRuntimeMessage<{ ok: boolean; message?: string }>({
        type: 'stop-video-recording',
    });

    if (!response.ok) {
        throw new Error(response.message ?? 'Unable to stop live recording.');
    }
}

async function loadOverlayDebug(): Promise<void> {
    if (!state.selectedTabId) {
        throw new Error('Select a target tab first.');
    }

    const tabId = Number(state.selectedTabId);
    const tab = state.tabs.find((entry) => entry.id === tabId) ?? null;
    const [snapshot, debugEntries] = await Promise.all([
        requestOverlayDebugSnapshot(tabId),
        getOverlayDebugEntries(),
    ]);

    state.overlayDebugDump = JSON.stringify({
        generated_at: new Date().toISOString(),
        active_tab: {
            id: tabId,
            title: tab?.title ?? null,
            url: tab?.url ?? null,
        },
        content_script_reachable: Boolean(snapshot),
        recent_overlay_events: debugEntries.filter((entry) => entry.url === (tab?.url ?? '')).slice(-20),
        overlay_snapshot: snapshot,
    }, null, 2);

    state.status = snapshot
        ? 'Overlay debug snapshot loaded.'
        : 'Loaded fallback overlay log. The content script did not respond on this tab.';
}

async function runTask(task: () => Promise<void>): Promise<void> {
    state.busy = true;

    try {
        await task();
    } catch (error) {
        state.status = error instanceof Error ? error.message : 'Diagnostics action failed.';
    } finally {
        state.busy = false;
    }
}

onMounted(() => {
    void refreshAll();
});
</script>

<template>
    <div class="min-h-screen bg-muted/30">
        <div class="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-6 md:px-6">
            <Card>
                <CardHeader>
                    <CardTitle>Extension diagnostics</CardTitle>
                    <CardDescription>
                        Live smoke page for real tab recording. It runs the same background and offscreen runtime used by the product,
                        but lets you target a specific browser tab.
                    </CardDescription>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle class="text-base">Recorder controls</CardTitle>
                    <CardDescription>Select the target tab and drive the real runtime actions.</CardDescription>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div class="grid gap-4 md:grid-cols-2">
                        <div class="space-y-2">
                            <Label for="target-url">Target URL</Label>
                            <Input
                                id="target-url"
                                v-model="state.targetUrl"
                                data-testid="diagnostics-target-url"
                                placeholder="http://127.0.0.1:8010/_diagnostics/extension-recorder"
                            />
                        </div>

                        <div class="space-y-2">
                            <Label for="tab-select">Target tab</Label>
                            <NativeSelect
                                id="tab-select"
                                v-model="state.selectedTabId"
                                data-testid="diagnostics-tab-select"
                                class="w-full"
                            >
                                <NativeSelectOption
                                    v-for="tab in state.tabs"
                                    :key="String(tab.id ?? tab.url ?? tab.title)"
                                    :value="String(tab.id ?? '')"
                                >
                                    {{ `${tab.title ?? 'Untitled tab'} | ${tab.url ?? ''}` }}
                                </NativeSelectOption>
                                <NativeSelectOption v-if="state.tabs.length === 0" value="">
                                    No eligible tabs found
                                </NativeSelectOption>
                            </NativeSelect>
                        </div>
                    </div>

                    <div class="flex flex-wrap gap-2">
                        <Button
                            id="refresh-tabs"
                            data-testid="diagnostics-refresh-tabs"
                            variant="outline"
                            :disabled="state.busy"
                            @click="runTask(async () => refreshAll('Tab list refreshed.'))"
                        >
                            <RotateCcw class="size-4" />
                            <span>Refresh tabs</span>
                        </Button>
                        <Button
                            id="open-target"
                            data-testid="diagnostics-open-target"
                            variant="outline"
                            :disabled="state.busy || !state.selectedTabId"
                            @click="runTask(async () => { await activateSelectedTab(); await refreshAll('Target tab activated.'); })"
                        >
                            Activate target tab
                        </Button>
                        <Button
                            id="start-recording"
                            data-testid="diagnostics-start-recording"
                            :disabled="state.busy || !state.selectedTabId"
                            @click="runTask(async () => { await startRecording(); await refreshAll('Live recording started. Interact with the target page, then stop recording.'); })"
                        >
                            <Video class="size-4" />
                            <span>Start live recording</span>
                        </Button>
                        <Button
                            id="stop-recording"
                            data-testid="diagnostics-stop-recording"
                            variant="outline"
                            :disabled="state.busy"
                            @click="runTask(async () => { await stopRecording(); await refreshAll('Live recording stopped. Pending capture and telemetry snapshot refreshed.'); })"
                        >
                            Stop live recording
                        </Button>
                        <Button
                            id="load-overlay-debug"
                            data-testid="diagnostics-load-overlay-debug"
                            variant="outline"
                            :disabled="state.busy || !state.selectedTabId"
                            @click="runTask(loadOverlayDebug)"
                        >
                            Load overlay debug log
                        </Button>
                    </div>

                    <Alert data-testid="diagnostics-status">
                        <CircleAlert class="size-4" />
                        <AlertDescription>{{ state.status }}</AlertDescription>
                    </Alert>
                </CardContent>
            </Card>

            <div class="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <div class="flex items-center justify-between gap-3">
                            <div>
                                <CardTitle class="text-base">Recorder state</CardTitle>
                                <CardDescription>Current in-memory state exposed by background/offscreen.</CardDescription>
                            </div>
                            <Badge :variant="state.recordingState.status === 'recording' ? 'secondary' : 'outline'">
                                {{ state.recordingState.status }}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableBody>
                                <TableRow v-for="row in recordingRows" :key="row.label">
                                    <TableCell class="font-medium">{{ row.label }}</TableCell>
                                    <TableCell :data-testid="row.testId">{{ row.value }}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div class="flex items-center justify-between gap-3">
                            <div>
                                <CardTitle class="text-base">Pending capture</CardTitle>
                                <CardDescription>Snapshot and telemetry currently held in extension storage.</CardDescription>
                            </div>
                            <Badge variant="outline">{{ state.pendingCapture?.kind ?? 'none' }}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableBody>
                                <TableRow v-for="row in pendingRows" :key="row.label">
                                    <TableCell class="font-medium">{{ row.label }}</TableCell>
                                    <TableCell :data-testid="row.testId">{{ row.value }}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Card v-if="state.overlayDebugDump">
                <CardHeader>
                    <CardTitle class="text-base">Overlay debug log</CardTitle>
                    <CardDescription>Snapshot of the live content overlay plus recent extension-side events for the selected tab.</CardDescription>
                </CardHeader>
                <CardContent>
                    <pre class="max-h-[32rem] overflow-auto rounded-md border bg-muted/20 p-4 text-xs leading-5">{{ state.overlayDebugDump }}</pre>
                </CardContent>
            </Card>
        </div>
    </div>
</template>
