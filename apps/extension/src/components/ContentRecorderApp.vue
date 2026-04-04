<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import {
    Camera,
    CheckCircle2,
    CircleAlert,
    Clock3,
    Copy,
    ExternalLink,
    LoaderCircle,
    Play,
    Send,
    Square,
    Trash2,
    X,
} from 'lucide-vue-next';
import ContentScreenshotEditor from './ContentScreenshotEditor.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { buildApiUrl } from '@/lib/api-base-url';
import { sendRuntimeMessage } from '@/lib/chrome';
import { deletePendingCaptureMedia, writePendingCaptureMedia } from '@/lib/pending-capture-media';
import {
    clearSession,
    getPendingCapture,
    getRecordingState,
    getReportingEnabled,
    getSession,
    type ExtensionSession,
    type PendingCapture,
    type RecordingState,
} from '@/lib/storage';

type EditorExpose = {
    exportBlob: () => Promise<Blob>;
};

const overlayRefreshEvent = 'snag:overlay-refresh-state';

const state = reactive({
    session: null as ExtensionSession | null,
    reportingEnabled: false,
    pendingCapture: null as PendingCapture | null,
    recordingState: { status: 'idle' } as RecordingState,
    busy: false,
    status: '',
    statusTone: 'info' as 'info' | 'success' | 'error',
});

const captureModalOpen = ref(false);
const confirmDialogOpen = ref(false);
const shareDialogOpen = ref(false);
const comment = ref('');
const elapsedSeconds = ref(0);
const draftCapture = ref<PendingCapture | null>(null);
const submittedLink = ref('');
const linkCopied = ref(false);
const fabHovered = ref(false);
const editorRef = ref<EditorExpose | null>(null);

function readViewportSize() {
    const visualViewport = window.visualViewport;

    if (visualViewport) {
        return {
            width: Math.round(visualViewport.width),
            height: Math.round(visualViewport.height),
        };
    }

    return {
        width: document.documentElement.clientWidth || window.innerWidth,
        height: document.documentElement.clientHeight || window.innerHeight,
    };
}

const overlayPosition = reactive({
    x: 24,
    y: 120,
});

const initialViewport = typeof window !== 'undefined'
    ? readViewportSize()
    : { width: 1440, height: 900 };

const viewport = reactive({
    width: initialViewport.width,
    height: initialViewport.height,
});

const dragState = reactive({
    active: false,
    moved: false,
    pointerId: null as number | null,
    originX: 0,
    originY: 0,
    startX: 0,
    startY: 0,
});

let elapsedTimerId: number | null = null;

const overlayVisible = computed(() => Boolean(state.session) && state.reportingEnabled);
const isRecording = computed(() => state.recordingState.status === 'recording');
const fabExpanded = computed(() => fabHovered.value && !isRecording.value);
const screenshotButtonVisible = computed(() => overlayVisible.value && fabExpanded.value);
const resumeDraftVisible = computed(() => (
    overlayVisible.value
    && !isRecording.value
    && Boolean(draftCapture.value)
    && !captureModalOpen.value
    && !confirmDialogOpen.value
    && !shareDialogOpen.value
));
const captureKindLabel = computed(() => (draftCapture.value?.kind === 'video' ? 'Video' : 'Screenshot'));
const shareLabel = computed(() => submittedLink.value ? 'Feedback link' : 'Feedback sent');
const formattedElapsed = computed(() => {
    const minutes = Math.floor(elapsedSeconds.value / 60).toString().padStart(2, '0');
    const seconds = (elapsedSeconds.value % 60).toString().padStart(2, '0');

    return `${minutes}:${seconds}`;
});

function setStatus(message: string, tone: 'info' | 'success' | 'error' = 'info') {
    state.status = message;
    state.statusTone = tone;
}

function clearStatus() {
    state.status = '';
}

function clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(Math.max(value, minimum), maximum);
}

function clampOverlayPosition(x: number, y: number) {
    const maxX = Math.max(24, viewport.width - 88);
    const maxY = Math.max(96, viewport.height - 148);

    return {
        x: clamp(x, 24, maxX),
        y: clamp(y, 96, maxY),
    };
}

function setOverlayPosition(x: number, y: number) {
    const next = clampOverlayPosition(x, y);
    overlayPosition.x = next.x;
    overlayPosition.y = next.y;
}

function resetOverlayPosition() {
    const targetX = Math.max(24, viewport.width - 112);
    const targetY = Math.max(112, Math.min(Math.round(viewport.height * 0.58), viewport.height - 180));

    setOverlayPosition(targetX, targetY);
}

function syncViewport() {
    const nextViewport = readViewportSize();
    viewport.width = nextViewport.width;
    viewport.height = nextViewport.height;
    setOverlayPosition(overlayPosition.x, overlayPosition.y);
}

function stopElapsedTimer() {
    if (elapsedTimerId !== null) {
        window.clearInterval(elapsedTimerId);
        elapsedTimerId = null;
    }
}

function syncElapsedTimer() {
    stopElapsedTimer();

    if (state.recordingState.status !== 'recording' || !state.recordingState.startedAt) {
        elapsedSeconds.value = 0;
        return;
    }

    const startedAt = new Date(state.recordingState.startedAt).getTime();

    if (!startedAt) {
        elapsedSeconds.value = 0;
        return;
    }

    const update = () => {
        elapsedSeconds.value = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    };

    update();
    elapsedTimerId = window.setInterval(update, 1000);
}

function cleanupDrag() {
    dragState.active = false;
    dragState.moved = false;
    dragState.pointerId = null;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerUp);
}

async function refreshState() {
    const [session, reportingEnabled, pendingCapture, recordingState] = await Promise.all([
        getSession(),
        getReportingEnabled(),
        getPendingCapture(),
        getRecordingState(),
    ]);

    state.session = session;
    state.reportingEnabled = reportingEnabled;
    state.pendingCapture = pendingCapture;
    state.recordingState = recordingState;

    if (pendingCapture && !draftCapture.value) {
        draftCapture.value = pendingCapture;
    }

    if (!pendingCapture && draftCapture.value && !captureModalOpen.value && !confirmDialogOpen.value) {
        draftCapture.value = null;
        comment.value = '';
    }
}

function openDraft(capture: PendingCapture) {
    draftCapture.value = capture;
    comment.value = '';
    captureModalOpen.value = true;
    confirmDialogOpen.value = false;
    linkCopied.value = false;
}

function closeCaptureModal() {
    if (state.busy) {
        return;
    }

    captureModalOpen.value = false;
}

function openConfirmDialog() {
    if (!draftCapture.value) {
        return;
    }

    captureModalOpen.value = false;
    confirmDialogOpen.value = true;
}

function cancelConfirmDialog() {
    confirmDialogOpen.value = false;
    captureModalOpen.value = true;
}

async function captureScreenshot() {
    if (!overlayVisible.value || isRecording.value) {
        return;
    }

    state.busy = true;

    try {
        const response = await sendRuntimeMessage<{ ok: boolean; message?: string; capture?: PendingCapture }>({
            type: 'capture-current-tab',
        });

        if (!response.ok || !response.capture) {
            throw new Error(response.message ?? 'Unable to capture the current tab.');
        }

        await refreshState();
        openDraft(response.capture);
        setStatus('Screenshot captured. Add context and send when ready.', 'success');
    } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Unable to capture the current tab.', 'error');
    } finally {
        state.busy = false;
    }
}

async function startRecording() {
    state.busy = true;

    try {
        const response = await sendRuntimeMessage<{ ok: boolean; message?: string }>({
            type: 'start-video-recording',
        });

        if (!response.ok) {
            throw new Error(response.message ?? 'Unable to start recording.');
        }

        await refreshState();
        setStatus('Recording started. Stop when you have enough context.', 'success');
    } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Unable to start recording.', 'error');
    } finally {
        state.busy = false;
    }
}

async function stopRecording() {
    state.busy = true;

    try {
        const response = await sendRuntimeMessage<{ ok: boolean; message?: string; capture?: PendingCapture }>({
            type: 'stop-video-recording',
        });

        if (!response.ok || !response.capture) {
            throw new Error(response.message ?? 'Unable to stop recording.');
        }

        await refreshState();
        openDraft(response.capture);
        setStatus('Recording saved locally. Review and send when ready.', 'success');
    } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Unable to stop recording.', 'error');
    } finally {
        state.busy = false;
    }
}

function toggleRecording() {
    if (!overlayVisible.value) {
        return;
    }

    if (isRecording.value) {
        void stopRecording();
        return;
    }

    void startRecording();
}

async function discardCurrentCapture() {
    state.busy = true;

    try {
        const response = await sendRuntimeMessage<{ ok: boolean; message?: string }>({
            type: 'discard-pending-capture',
        });

        if (!response.ok) {
            throw new Error(response.message ?? 'Unable to discard the current capture.');
        }

        captureModalOpen.value = false;
        confirmDialogOpen.value = false;
        draftCapture.value = null;
        comment.value = '';
        await refreshState();
        setStatus('Capture discarded.', 'success');
    } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Unable to discard the current capture.', 'error');
    } finally {
        state.busy = false;
    }
}

async function submitCurrentCapture() {
    if (!state.session || !draftCapture.value) {
        return;
    }

    state.busy = true;
    let screenshotOverrideBlobKey: string | null = null;

    try {
        if (draftCapture.value.kind === 'screenshot') {
            const screenshotOverride = await editorRef.value?.exportBlob() ?? null;

            if (screenshotOverride) {
                screenshotOverrideBlobKey = await writePendingCaptureMedia(screenshotOverride);
            }
        }

        const response = await sendRuntimeMessage<{
            ok: boolean;
            message?: string;
            result?: {
                report: {
                    share_url?: string | null;
                    report_url?: string | null;
                };
            };
        }>({
            type: 'report:submit',
            payload: {
                summary: comment.value,
                screenshotOverrideBlobKey,
                fallbackContext: {
                    url: window.location.href,
                    title: document.title,
                    selection: window.getSelection()?.toString().trim() ?? '',
                },
            },
        });

        if (!response.ok || !response.result) {
            throw new Error(response.message ?? 'Unable to submit capture.');
        }

        const result = response.result;
        const discardResponse = await sendRuntimeMessage<{ ok: boolean; message?: string }>({
            type: 'discard-pending-capture',
        });

        if (!discardResponse.ok) {
            throw new Error(discardResponse.message ?? 'Capture submitted but local draft could not be cleared.');
        }

        submittedLink.value = result.report.share_url ?? result.report.report_url ?? '';
        linkCopied.value = false;
        draftCapture.value = null;
        comment.value = '';
        confirmDialogOpen.value = false;
        captureModalOpen.value = false;
        shareDialogOpen.value = true;
        await refreshState();
        setStatus('Capture sent.', 'success');
    } catch (error) {
        if (error instanceof Error && /unauthenticated/i.test(error.message)) {
            await clearSession();
            await refreshState();
            setStatus('Extension session was rejected. Reconnect the extension and try again.', 'error');
        } else {
            setStatus(error instanceof Error ? error.message : 'Unable to submit capture.', 'error');
        }
    } finally {
        if (screenshotOverrideBlobKey) {
            await deletePendingCaptureMedia(screenshotOverrideBlobKey).catch(() => undefined);
        }

        state.busy = false;
    }
}

async function copySubmittedLink() {
    if (!submittedLink.value) {
        return;
    }

    await navigator.clipboard.writeText(submittedLink.value);
    linkCopied.value = true;
}

function openSubmittedLink() {
    if (!submittedLink.value) {
        return;
    }

    window.open(submittedLink.value, '_blank', 'noopener');
}

function reopenDraft() {
    if (!draftCapture.value) {
        return;
    }

    captureModalOpen.value = true;
}

function closeShareDialog() {
    shareDialogOpen.value = false;
}

function openFabMenu() {
    if (isRecording.value) {
        fabHovered.value = false;
        return;
    }

    fabHovered.value = true;
}

function closeFabMenu() {
    fabHovered.value = false;
}

function handleFabFocusOut(event: FocusEvent) {
    const currentTarget = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    const relatedTarget = event.relatedTarget instanceof Node ? event.relatedTarget : null;

    if (currentTarget && relatedTarget && currentTarget.contains(relatedTarget)) {
        return;
    }

    closeFabMenu();
}

function handlePointerDown(event: PointerEvent) {
    if (!overlayVisible.value) {
        return;
    }

    dragState.active = true;
    dragState.moved = false;
    dragState.pointerId = event.pointerId;
    dragState.originX = overlayPosition.x;
    dragState.originY = overlayPosition.y;
    dragState.startX = event.clientX;
    dragState.startY = event.clientY;

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
}

function handlePointerMove(event: PointerEvent) {
    if (!dragState.active || event.pointerId !== dragState.pointerId) {
        return;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        dragState.moved = true;
    }

    setOverlayPosition(dragState.originX + deltaX, dragState.originY + deltaY);
}

function handlePointerUp(event: PointerEvent) {
    if (!dragState.active || event.pointerId !== dragState.pointerId) {
        return;
    }

    const wasDragged = dragState.moved;
    cleanupDrag();

    if (!wasDragged) {
        toggleRecording();
    }
}

function handleStorageChange(changes: Record<string, chrome.storage.StorageChange>, areaName: string) {
    if (areaName !== 'local' && areaName !== 'session') {
        return;
    }

    const watchedKeys = ['session', 'pendingCapture', 'recordingState', 'reportingEnabled'];

    if (watchedKeys.some((key) => key in changes)) {
        void refreshState().catch((error) => {
            setStatus(error instanceof Error ? error.message : 'Unable to refresh overlay state.', 'error');
        });
    }
}

function handleOverlayRefresh() {
    void refreshState().catch((error) => {
        setStatus(error instanceof Error ? error.message : 'Unable to refresh overlay state.', 'error');
    });
}

watch(() => [state.recordingState.status, state.recordingState.startedAt], syncElapsedTimer, { immediate: true });

watch(overlayVisible, (visible) => {
    if (visible) {
        return;
    }

    fabHovered.value = false;
    captureModalOpen.value = false;
    confirmDialogOpen.value = false;
    shareDialogOpen.value = false;
});

watch(isRecording, (recording) => {
    if (recording) {
        fabHovered.value = false;
    }
});

onMounted(() => {
    resetOverlayPosition();
    syncViewport();
    void refreshState().catch((error) => {
        setStatus(error instanceof Error ? error.message : 'Unable to load overlay state.', 'error');
    });
    window.addEventListener('resize', syncViewport);
    window.visualViewport?.addEventListener('resize', syncViewport);
    window.visualViewport?.addEventListener('scroll', syncViewport);
    window.addEventListener(overlayRefreshEvent, handleOverlayRefresh);
    chrome.storage?.onChanged?.addListener(handleStorageChange);
});

onBeforeUnmount(() => {
    stopElapsedTimer();
    cleanupDrag();
    window.removeEventListener('resize', syncViewport);
    window.visualViewport?.removeEventListener('resize', syncViewport);
    window.visualViewport?.removeEventListener('scroll', syncViewport);
    window.removeEventListener(overlayRefreshEvent, handleOverlayRefresh);
    chrome.storage?.onChanged?.removeListener(handleStorageChange);
});
</script>

<template>
    <div data-testid="content-recorder-root" data-snag-theme-root class="pointer-events-none fixed inset-0 z-[2147483646] text-foreground">
        <svg aria-hidden="true" class="pointer-events-none absolute h-0 w-0">
            <defs>
                <filter id="snag-extension-metaball" color-interpolation-filters="sRGB">
                    <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="6" />
                    <feColorMatrix
                        in="blur"
                        result="goo"
                        type="matrix"
                        values="
                            1 0 0 0 0
                            0 1 0 0 0
                            0 0 1 0 0
                            0 0 0 24 -9
                        "
                    />
                    <feBlend in="SourceGraphic" in2="goo" />
                </filter>
            </defs>
        </svg>

        <div
            v-if="state.status && overlayVisible"
            data-testid="content-recorder-status"
            class="pointer-events-auto fixed right-6 top-6 z-[2147483647] w-[320px]"
        >
            <Alert :class="[
                'relative pr-10',
                state.statusTone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-950' : state.statusTone === 'success' ? 'border-primary/25 bg-primary/10' : '',
            ]">
                <CircleAlert v-if="state.statusTone === 'error'" class="size-4" />
                <CheckCircle2 v-else-if="state.statusTone === 'success'" class="size-4" />
                <Clock3 v-else class="size-4" />
                <AlertDescription>{{ state.status }}</AlertDescription>
                <button
                    data-testid="content-recorder-status-dismiss"
                    type="button"
                    class="absolute right-3 top-3 inline-flex size-5 items-center justify-center rounded-sm text-current/65 transition-colors hover:text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                    aria-label="Dismiss notification"
                    @click="clearStatus"
                >
                    <X class="size-3.5" />
                </button>
            </Alert>
        </div>

        <div
            v-if="overlayVisible"
            data-testid="content-recorder-floating"
            class="fixed z-[2147483647]"
            :style="{ left: `${overlayPosition.x}px`, top: `${overlayPosition.y}px` }"
        >
            <div
                class="snag-extension-fab-stack flex flex-col items-center"
                :class="{ 'is-expanded': fabExpanded, 'is-recording': isRecording }"
            >
                <div
                    class="snag-extension-fab-anchor pointer-events-auto"
                    @mouseenter="openFabMenu"
                    @mouseleave="closeFabMenu"
                    @focusin="openFabMenu"
                    @focusout="handleFabFocusOut"
                >
                    <div v-if="isRecording" class="snag-extension-recording-orbit">
                        <span class="snag-extension-recording-ring snag-extension-recording-ring--static" />
                        <span class="snag-extension-recording-ring snag-extension-recording-ring--pulse" />
                        <span class="snag-extension-recording-ring snag-extension-recording-ring--pulse snag-extension-recording-ring--delayed" />
                    </div>

                    <div
                        aria-hidden="true"
                        class="snag-extension-goo-layer pointer-events-none absolute inset-0"
                        :class="{ 'is-expanded': fabExpanded }"
                        style="filter: url(#snag-extension-metaball);"
                    >
                        <div
                            class="snag-extension-goo-satellite"
                            :class="{ 'is-visible': fabExpanded }"
                        />
                        <div
                            class="snag-extension-goo-bridge"
                            :class="{ 'is-visible': fabExpanded }"
                        />
                        <div
                            class="snag-extension-goo-base"
                            :class="{ 'is-hovered': fabExpanded, 'is-recording': isRecording }"
                        />
                    </div>

                    <Button
                        data-testid="content-recorder-screenshot"
                        type="button"
                        variant="secondary"
                        size="icon"
                        class="snag-extension-screenshot-button rounded-full bg-stone-950 text-white shadow-lg hover:bg-stone-950"
                        :class="{ 'is-visible': screenshotButtonVisible }"
                        :disabled="state.busy"
                        @click="captureScreenshot"
                    >
                        <Camera class="size-4 text-primary" />
                        <span class="sr-only">Take screenshot</span>
                    </Button>

                    <Button
                        data-testid="content-recorder-toggle"
                        type="button"
                        size="icon"
                        class="snag-extension-record-button pointer-events-auto relative z-10 rounded-full text-primary shadow-lg transition-[background-color,color] duration-200 focus-visible:ring-white/30"
                        :class="isRecording ? 'bg-stone-950 text-[#ff6b6b] hover:bg-stone-950' : 'bg-stone-950 hover:bg-stone-950'"
                        :aria-pressed="isRecording"
                        :disabled="state.busy"
                        @pointerdown.prevent="handlePointerDown"
                        @keydown.enter.prevent="toggleRecording"
                        @keydown.space.prevent="toggleRecording"
                    >
                        <span v-if="isRecording" aria-hidden="true" class="absolute inset-3 rounded-full bg-[#ff6b6b]/12" />
                        <LoaderCircle v-if="state.busy" class="relative z-10 size-[18px] animate-spin" />
                        <Square v-else-if="isRecording" class="relative z-10 size-[18px] fill-current text-[#ff6b6b]" />
                        <Play v-else class="size-[18px] fill-current" />
                        <span class="sr-only">{{ isRecording ? 'Stop recording' : 'Start recording' }}</span>
                    </Button>
                </div>

                <div
                    data-testid="content-recorder-timer"
                    class="mt-3 flex items-center gap-1 rounded-full bg-stone-950 px-3 py-1 text-xs font-medium text-white shadow-lg transition-opacity duration-150"
                    :class="isRecording ? 'opacity-100' : 'opacity-0'"
                >
                    <Clock3 class="size-3.5" />
                    <span>{{ formattedElapsed }}</span>
                </div>

                <Button
                    v-if="resumeDraftVisible"
                    variant="outline"
                    size="sm"
                    class="pointer-events-auto mt-3 rounded-full bg-background/95 backdrop-blur"
                    @click="reopenDraft"
                >
                    Resume draft
                </Button>
            </div>
        </div>

        <div
            v-if="captureModalOpen && draftCapture"
            data-testid="content-recorder-capture-modal"
            class="pointer-events-auto fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/55 p-4"
        >
            <div
                data-snag-modal-panel
                class="max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-y-auto rounded-lg border border-border bg-background p-6 shadow-lg"
            >
                <div class="space-y-1">
                    <div class="text-lg font-semibold">{{ captureKindLabel }} ready</div>
                    <p class="text-sm text-muted-foreground">
                        Add context before sending this capture to Snag.
                    </p>
                </div>

                <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
                    <div class="min-w-0">
                        <ContentScreenshotEditor
                            v-if="draftCapture.kind === 'screenshot'"
                            ref="editorRef"
                            :image-url="draftCapture.dataUrl"
                            :session-key="draftCapture.capturedAt"
                        />

                        <div v-else class="rounded-lg border border-border bg-muted/20 p-4">
                            <div class="flex flex-wrap items-center gap-2">
                                <Badge variant="outline">Video</Badge>
                                <span class="text-sm text-muted-foreground">{{ draftCapture.capturedAt }}</span>
                            </div>
                            <div class="mt-3 text-sm text-muted-foreground">
                                Duration: {{ draftCapture.durationSeconds }}s
                            </div>
                        </div>
                    </div>

                    <aside class="space-y-6 lg:sticky lg:top-0">
                        <div class="space-y-2">
                            <Label for="snag-extension-comment">Comment</Label>
                            <Textarea
                                id="snag-extension-comment"
                                v-model="comment"
                                class="min-h-40 max-h-[40vh] resize-y overflow-y-auto"
                                rows="8"
                                placeholder="Describe what happened, what you expected, and whether the issue is stable."
                            />
                        </div>

                        <div class="flex flex-wrap justify-end gap-2 lg:flex-col lg:items-stretch">
                            <Button variant="outline" :disabled="state.busy" @click="closeCaptureModal">
                                Keep draft
                            </Button>
                            <Button variant="outline" :disabled="state.busy" @click="discardCurrentCapture">
                                <Trash2 class="size-4" />
                                <span>Discard</span>
                            </Button>
                            <Button :disabled="state.busy" @click="openConfirmDialog">
                                Continue
                            </Button>
                        </div>
                    </aside>
                </div>
            </div>
        </div>

        <div
            v-if="confirmDialogOpen && draftCapture"
            data-testid="content-recorder-confirm-modal"
            class="pointer-events-auto fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/55 p-4"
        >
            <div
                data-snag-modal-panel
                class="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg"
            >
                <div class="space-y-1">
                    <div class="text-lg font-semibold">Send this feedback?</div>
                    <p class="text-sm text-muted-foreground">
                        Make sure the capture and comment are ready before sending.
                    </p>
                </div>

                <div class="mt-4 space-y-3 rounded-md border border-border bg-muted/20 p-4 text-sm">
                    <div class="flex items-center gap-2">
                        <Badge variant="outline" class="capitalize">{{ draftCapture.kind }}</Badge>
                        <span class="text-muted-foreground">{{ draftCapture.capturedAt }}</span>
                    </div>
                    <p class="whitespace-pre-wrap break-all [overflow-wrap:anywhere]">
                        {{ comment || 'No comment attached yet.' }}
                    </p>
                </div>

                <div class="mt-6 flex flex-wrap justify-end gap-2">
                    <Button variant="outline" :disabled="state.busy" @click="cancelConfirmDialog">
                        Keep editing
                    </Button>
                    <Button :disabled="state.busy" @click="submitCurrentCapture">
                        <Send class="size-4" />
                        <span>Send feedback</span>
                    </Button>
                </div>
            </div>
        </div>

        <div
            v-if="shareDialogOpen"
            data-testid="content-recorder-share-modal"
            class="pointer-events-auto fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/55 p-4"
        >
            <div
                data-snag-modal-panel
                class="w-full max-w-lg rounded-lg border border-border bg-background p-6 shadow-lg"
            >
                <div class="space-y-1">
                    <div class="text-lg font-semibold">Feedback sent</div>
                    <p class="text-sm text-muted-foreground">
                        Open or copy the resulting feedback link.
                    </p>
                </div>

                <div class="mt-6 space-y-2">
                    <Label for="snag-extension-share-link">{{ shareLabel }}</Label>
                    <div class="flex gap-2">
                        <Input id="snag-extension-share-link" :model-value="submittedLink" readonly />
                        <Button variant="outline" :disabled="!submittedLink" @click="copySubmittedLink">
                            <Copy class="size-4" />
                            <span>{{ linkCopied ? 'Copied' : 'Copy' }}</span>
                        </Button>
                    </div>
                </div>

                <div class="mt-6 flex flex-wrap justify-end gap-2">
                    <Button variant="outline" :disabled="!submittedLink" @click="openSubmittedLink">
                        <ExternalLink class="size-4" />
                        <span>Open feedback</span>
                    </Button>
                    <Button @click="closeShareDialog">
                        Done
                    </Button>
                </div>
            </div>
        </div>
    </div>
</template>
