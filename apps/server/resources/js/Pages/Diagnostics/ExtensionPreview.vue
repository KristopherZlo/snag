<script setup>
import { Head } from '@inertiajs/vue3';
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import {
    Bug,
    Camera,
    CheckCircle2,
    Clock3,
    Copy,
    MessageSquare,
    Monitor,
    Play,
    Server,
    Square,
} from 'lucide-vue-next';
import BrandMark from '@/Shared/BrandMark.vue';
import TextLink from '@/Shared/TextLink.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogScrollContent,
    DialogTitle,
} from '@/components/ui/dialog';
import ScreenshotEditor from '@/components/diagnostics/ScreenshotEditor.vue';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime } from '@/lib/intl';

const previewConnection = reactive({
    connected: false,
    apiBaseUrl: '',
    code: '',
    deviceName: 'Chromium extension',
});
const reportingEnabled = ref(true);
const overlayReady = ref(false);
const isRecording = ref(false);
const elapsedSeconds = ref(0);
const captureDialogOpen = ref(false);
const confirmDialogOpen = ref(false);
const shareDialogOpen = ref(false);
const savedMessage = ref('');
const recordingStartedAt = ref(0);
const lastCapture = ref(null);
const submittedCapture = ref(null);
const submittedCaptures = ref([]);
const pendingSubmission = ref(null);
const feedbackLinkCopied = ref(false);
const previewBaseUrl = ref('');

const overlayPosition = reactive({
    x: 24,
    y: 120,
});

const viewport = reactive({
    width: 1440,
    height: 900,
});

const dragState = reactive({
    active: false,
    moved: false,
    pointerId: null,
    originX: 0,
    originY: 0,
    startX: 0,
    startY: 0,
});

const captureDraft = reactive({
    kind: 'screenshot',
    note: '',
    capturedAt: '',
    durationSeconds: 0,
});

const sampleTargets = [
    {
        title: 'Checkout drawer shifts after quantity change',
        description: 'Open the cart, switch the shipping method, and resize to 1280px before confirming alignment.',
        status: 'Ready to verify',
        owner: 'QA',
    },
    {
        title: 'Promo code validation does not recover',
        description: 'Submit an expired code first, then try a valid code without refreshing the page.',
        status: 'Needs fresh capture',
        owner: 'Frontend',
    },
    {
        title: 'Payment modal double-submits on slow network',
        description: 'Throttle the network, confirm card details, and watch the confirm button state after the first click.',
        status: 'Watch closely',
        owner: 'Integration',
    },
];

const sampleSignals = [
    {
        label: 'Page',
        value: '/checkout?build=4.7.0-rc.2',
        icon: Monitor,
    },
    {
        label: 'API',
        value: 'POST /api/payments/confirm',
        icon: Server,
    },
    {
        label: 'Thread',
        value: 'Payment retry QA sweep',
        icon: Bug,
    },
];

const sampleNotes = [
    'Watch the confirm button after closing the Apple Pay sheet.',
    'Console warnings are expected on the mock gateway route.',
    'One screenshot should be enough for the alignment issue.',
];

const overlayVisible = computed(() => previewConnection.connected && reportingEnabled.value && overlayReady.value);

const formattedElapsed = computed(() => {
    const minutes = Math.floor(elapsedSeconds.value / 60)
        .toString()
        .padStart(2, '0');
    const seconds = (elapsedSeconds.value % 60).toString().padStart(2, '0');

    return `${minutes}:${seconds}`;
});

const popupStatus = computed(() => {
    if (!previewConnection.connected) {
        return 'Connect the preview popup first. The floating recorder stays hidden until the extension is linked to the site.';
    }

    if (!reportingEnabled.value) {
        return 'Floating recorder is hidden on the page.';
    }

    if (isRecording.value) {
        return `Recording is active. ${formattedElapsed.value} captured so far.`;
    }

    return 'Floating recorder is ready. Drag it anywhere and use hover for screenshots.';
});

let timerId = null;

function formatTimestamp(date) {
    return formatDateTime(date);
}

function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
}

function formatDuration(seconds) {
    const normalized = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(normalized / 60)
        .toString()
        .padStart(2, '0');
    const remainder = (normalized % 60).toString().padStart(2, '0');

    return `${minutes}:${remainder}`;
}

function clampOverlayPosition(x, y) {
    const maxX = Math.max(24, viewport.width - 88);
    const maxY = Math.max(96, viewport.height - 148);

    return {
        x: clamp(x, 24, maxX),
        y: clamp(y, 96, maxY),
    };
}

function setOverlayPosition(x, y) {
    const next = clampOverlayPosition(x, y);

    overlayPosition.x = next.x;
    overlayPosition.y = next.y;
}

function syncViewport() {
    viewport.width = window.innerWidth;
    viewport.height = window.innerHeight;
    setOverlayPosition(overlayPosition.x, overlayPosition.y);
}

function resetOverlayPosition() {
    const targetX = Math.max(24, viewport.width - 112);
    const targetY = Math.max(112, Math.min(Math.round(viewport.height * 0.58), viewport.height - 180));

    setOverlayPosition(targetX, targetY);
}

function startTimer() {
    stopTimer();
    recordingStartedAt.value = Date.now();
    elapsedSeconds.value = 0;

    timerId = window.setInterval(() => {
        elapsedSeconds.value = Math.max(0, Math.floor((Date.now() - recordingStartedAt.value) / 1000));
    }, 1000);
}

function stopTimer() {
    if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
    }
}

function cleanupDrag() {
    dragState.active = false;
    dragState.moved = false;
    dragState.pointerId = null;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerUp);
}

function resetCaptureDraft() {
    captureDraft.kind = 'screenshot';
    captureDraft.note = '';
    captureDraft.capturedAt = '';
    captureDraft.durationSeconds = 0;
}

function snapshotCaptureDraft() {
    return {
        kind: captureDraft.kind,
        note: captureDraft.note,
        capturedAt: captureDraft.capturedAt,
        durationSeconds: captureDraft.durationSeconds,
    };
}

function restoreCaptureDraft(snapshot) {
    if (!snapshot) {
        return;
    }

    captureDraft.kind = snapshot.kind;
    captureDraft.note = snapshot.note;
    captureDraft.capturedAt = snapshot.capturedAt;
    captureDraft.durationSeconds = snapshot.durationSeconds;
}

function buildPrototypeShareUrl(id) {
    if (!previewBaseUrl.value) {
        return '';
    }

    return `${previewBaseUrl.value}#prototype-feedback-${id}`;
}

function openCaptureDialog(kind, durationSeconds = 0) {
    captureDraft.kind = kind;
    captureDraft.note = '';
    captureDraft.durationSeconds = durationSeconds;
    captureDraft.capturedAt = formatTimestamp(new Date());
    captureDialogOpen.value = true;
}

function startRecording() {
    savedMessage.value = '';
    isRecording.value = true;
    startTimer();
}

function finishRecording() {
    const durationSeconds = elapsedSeconds.value;

    isRecording.value = false;
    stopTimer();
    openCaptureDialog('video', durationSeconds);
}

function toggleRecording() {
    if (!reportingEnabled.value) {
        return;
    }

    if (isRecording.value) {
        finishRecording();
        return;
    }

    startRecording();
}

function handlePointerDown(event) {
    if (!reportingEnabled.value) {
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

function handlePointerMove(event) {
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

function handlePointerUp(event) {
    if (!dragState.active || event.pointerId !== dragState.pointerId) {
        return;
    }

    const wasDragged = dragState.moved;

    cleanupDrag();

    if (!wasDragged) {
        toggleRecording();
    }
}

function captureScreenshot() {
    if (!reportingEnabled.value || isRecording.value) {
        return;
    }

    savedMessage.value = '';
    openCaptureDialog('screenshot');
}

function closeCaptureDialog(options = {}) {
    const { reset = true } = options;

    captureDialogOpen.value = false;

    if (reset) {
        resetCaptureDraft();
    }
}

function requestSendConfirmation() {
    pendingSubmission.value = snapshotCaptureDraft();
    closeCaptureDialog({ reset: false });
    confirmDialogOpen.value = true;
}

function cancelSendConfirmation() {
    confirmDialogOpen.value = false;
    restoreCaptureDraft(pendingSubmission.value);
    captureDialogOpen.value = true;
}

function finalizePendingSend() {
    if (!pendingSubmission.value) {
        return;
    }

    const id = `prototype-${Date.now()}`;
    const capture = {
        id,
        ...pendingSubmission.value,
        shareUrl: buildPrototypeShareUrl(id),
    };

    submittedCaptures.value = [capture, ...submittedCaptures.value];
    submittedCapture.value = capture;
    lastCapture.value = capture;
    savedMessage.value = capture.kind === 'video'
        ? 'Prototype video feedback was sent.'
        : 'Prototype screenshot feedback was sent.';
    feedbackLinkCopied.value = false;
    shareDialogOpen.value = true;
    pendingSubmission.value = null;
    resetCaptureDraft();
}

function confirmSendCapture() {
    confirmDialogOpen.value = false;
    finalizePendingSend();
}

async function copyFeedbackLink() {
    if (!submittedCapture.value?.shareUrl) {
        return;
    }

    await navigator.clipboard.writeText(submittedCapture.value.shareUrl);
    feedbackLinkCopied.value = true;
}

function closeShareDialog() {
    shareDialogOpen.value = false;
    feedbackLinkCopied.value = false;
}

function openPreviewConnectPage() {
    window.location.assign(route('settings.extension.connect'));
}

function openPreviewSentCapturesPage() {
    window.location.assign(route('settings.extension.captures'));
}

function connectPreview() {
    previewConnection.connected = true;
    reportingEnabled.value = true;
    savedMessage.value = `Preview connected to ${previewConnection.apiBaseUrl}.`;
}

function disconnectPreview() {
    previewConnection.connected = false;
    reportingEnabled.value = false;
    savedMessage.value = 'Preview connection cleared.';
}

watch(reportingEnabled, (enabled) => {
    if (enabled) {
        return;
    }

    captureDialogOpen.value = false;
    confirmDialogOpen.value = false;
    shareDialogOpen.value = false;
    pendingSubmission.value = null;
    feedbackLinkCopied.value = false;
    resetCaptureDraft();

    if (isRecording.value) {
        isRecording.value = false;
        stopTimer();
        elapsedSeconds.value = 0;
    }
});

watch(() => previewConnection.connected, (connected) => {
    if (connected) {
        return;
    }

    captureDialogOpen.value = false;
    confirmDialogOpen.value = false;
    shareDialogOpen.value = false;
    pendingSubmission.value = null;
    feedbackLinkCopied.value = false;
    resetCaptureDraft();

    if (isRecording.value) {
        isRecording.value = false;
        stopTimer();
        elapsedSeconds.value = 0;
    }
});

onMounted(() => {
    syncViewport();
    resetOverlayPosition();
    overlayReady.value = true;
    previewBaseUrl.value = new URL(route('diagnostics.extension-preview'), window.location.origin).toString();
    previewConnection.apiBaseUrl = new URL(route('home'), window.location.origin).toString().replace(/\/$/, '');
    window.addEventListener('resize', syncViewport);
});

onBeforeUnmount(() => {
    stopTimer();
    cleanupDrag();
    window.removeEventListener('resize', syncViewport);
});
</script>

<template>
    <Head title="Extension Preview" />

    <div class="min-h-screen bg-muted/30">
        <div class="mx-auto max-w-7xl px-4 py-6 md:px-6">
            <header class="flex flex-col gap-4 border-b bg-background px-6 py-5 md:flex-row md:items-center md:justify-between">
                <div class="space-y-1">
                    <BrandMark href="/" logo-class="size-10" text-class="text-xl" />
                    <p class="text-sm text-muted-foreground">
                        Local preview of the extension popup, floating recorder, and comment modal.
                    </p>
                </div>

                <TextLink :href="route('diagnostics.extension-recorder')">
                    Open recorder smoke page
                </TextLink>
            </header>

            <main class="grid gap-6 py-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                <aside class="space-y-6 xl:sticky xl:top-6 xl:self-start">
                    <Card>
                        <CardHeader>
                            <CardTitle class="text-base">Popup preview</CardTitle>
                            <CardDescription>What the user sees after clicking the extension icon.</CardDescription>
                        </CardHeader>
                        <CardContent class="space-y-4">
                            <div v-if="!previewConnection.connected" class="space-y-4 rounded-lg border bg-background p-4">
                                <div class="space-y-1">
                                    <div class="text-base font-medium">Connect the extension</div>
                                    <p class="text-sm text-muted-foreground">
                                        Use the one-time code from the website settings page before enabling reporting on every page.
                                    </p>
                                </div>

                                <div class="space-y-2">
                                    <Label for="extension-preview-api-base-url">API base URL</Label>
                                    <Input
                                        id="extension-preview-api-base-url"
                                        v-model="previewConnection.apiBaseUrl"
                                        placeholder="http://192.168.x.x/snag"
                                    />
                                </div>

                                <div class="space-y-2">
                                    <Label for="extension-preview-one-time-code">One-time code</Label>
                                    <Input
                                        id="extension-preview-one-time-code"
                                        v-model="previewConnection.code"
                                        placeholder="Paste code from settings"
                                    />
                                </div>

                                <div class="space-y-2">
                                    <Label for="extension-preview-device-name">Device name</Label>
                                    <Input
                                        id="extension-preview-device-name"
                                        v-model="previewConnection.deviceName"
                                        placeholder="Chromium extension"
                                    />
                                </div>

                                <div class="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                                    1. Open the extension connect page on the site.
                                    <br>
                                    2. Copy the one-time code.
                                    <br>
                                    3. Paste the code here and connect the preview popup.
                                </div>

                                <div class="grid gap-2 sm:grid-cols-2">
                                    <Button
                                        :disabled="!previewConnection.code.trim()"
                                        @click="connectPreview"
                                    >
                                        Connect preview
                                    </Button>
                                    <Button variant="outline" @click="openPreviewConnectPage">
                                        Open connect settings
                                    </Button>
                                </div>
                            </div>

                            <div v-else class="rounded-lg border bg-background p-4">
                                <div class="flex items-start justify-between gap-4">
                                    <div class="space-y-1">
                                        <Label for="extension-preview-start" class="text-base">Start reporting</Label>
                                        <p class="text-sm text-muted-foreground">
                                            Show the floating recorder on every page.
                                        </p>
                                    </div>

                                    <Switch
                                        id="extension-preview-start"
                                        v-model="reportingEnabled"
                                        data-testid="extension-preview-switch"
                                    />
                                </div>

                                <div class="mt-4 grid gap-2 sm:grid-cols-2">
                                    <Button variant="outline" @click="openPreviewSentCapturesPage">
                                        Open sent captures
                                    </Button>
                                    <Button variant="outline" @click="disconnectPreview">
                                        Clear preview connection
                                    </Button>
                                </div>
                            </div>

                            <div class="rounded-lg border bg-background px-4 py-3 text-sm text-muted-foreground">
                                {{ popupStatus }}
                            </div>

                            <template v-if="lastCapture">
                                <Separator />

                                <div class="space-y-2">
                                    <div class="flex items-center gap-2">
                                        <Badge variant="secondary" class="capitalize">{{ lastCapture.kind }}</Badge>
                                        <span class="text-sm text-muted-foreground">{{ lastCapture.capturedAt }}</span>
                                    </div>

                                    <p class="text-sm">
                                        {{ lastCapture.note || 'No comment attached yet.' }}
                                    </p>
                                </div>
                            </template>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle class="text-base">Interaction rules</CardTitle>
                        </CardHeader>
                        <CardContent class="space-y-3 text-sm text-muted-foreground">
                            <p>Disconnected popup shows connection inputs instead of the reporting switch.</p>
                            <p>The large button starts and stops video recording.</p>
                            <p>Hover the idle control to reveal the screenshot action above it.</p>
                            <p>Every capture opens a locked comment modal, then asks for confirmation before send.</p>
                        </CardContent>
                    </Card>
                </aside>

                <div class="space-y-6">
                    <Alert v-if="savedMessage">
                        <CheckCircle2 class="size-4" />
                        <AlertTitle>Prototype state updated</AlertTitle>
                        <AlertDescription>{{ savedMessage }}</AlertDescription>
                    </Alert>

                    <Card>
                        <CardHeader>
                            <CardTitle>Checkout QA sandbox</CardTitle>
                            <CardDescription>
                                Sample page content for testing how the recorder sits above normal product screens.
                            </CardDescription>
                        </CardHeader>
                        <CardContent class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                            <div class="space-y-4">
                                <div
                                    v-for="target in sampleTargets"
                                    :key="target.title"
                                    class="rounded-lg border bg-background p-4"
                                >
                                    <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                        <div class="space-y-1">
                                            <div class="font-medium">{{ target.title }}</div>
                                            <p class="text-sm text-muted-foreground">{{ target.description }}</p>
                                        </div>

                                        <div class="flex items-center gap-2">
                                            <Badge variant="outline">{{ target.owner }}</Badge>
                                            <Badge variant="secondary">{{ target.status }}</Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="space-y-4">
                                <div class="rounded-lg border bg-background p-4">
                                    <div class="mb-3 font-medium">Current signals</div>
                                    <div class="space-y-3">
                                        <div
                                            v-for="signal in sampleSignals"
                                            :key="signal.label"
                                            class="flex items-start gap-3"
                                        >
                                            <component :is="signal.icon" class="mt-0.5 size-4 text-muted-foreground" />
                                            <div class="space-y-1">
                                                <div class="text-sm font-medium">{{ signal.label }}</div>
                                                <p class="text-sm text-muted-foreground">{{ signal.value }}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="rounded-lg border bg-background p-4">
                                    <div class="mb-3 font-medium">Tester notes</div>
                                    <div class="space-y-3">
                                        <div
                                            v-for="note in sampleNotes"
                                            :key="note"
                                            class="flex items-start gap-3 text-sm text-muted-foreground"
                                        >
                                            <MessageSquare class="mt-0.5 size-4 shrink-0" />
                                            <span>{{ note }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card v-if="submittedCaptures.length">
                        <CardHeader>
                            <CardTitle>Prototype sent feedback</CardTitle>
                            <CardDescription>Each completed prototype submission gets a share link and stays visible here for review.</CardDescription>
                        </CardHeader>
                        <CardContent class="grid gap-4 lg:grid-cols-2">
                            <div
                                v-for="capture in submittedCaptures"
                                :key="capture.id"
                                :id="`prototype-feedback-${capture.id}`"
                                class="rounded-lg border bg-background p-4"
                            >
                                <div class="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" class="capitalize">{{ capture.kind }}</Badge>
                                    <span class="text-sm text-muted-foreground">{{ capture.capturedAt }}</span>
                                </div>
                                <div class="mt-3 text-base font-medium">
                                    {{ capture.kind === 'video' ? 'Prototype video feedback' : 'Prototype screenshot feedback' }}
                                </div>
                                <p class="mt-1 text-sm text-muted-foreground">
                                    {{ capture.note || 'No comment attached.' }}
                                </p>
                                <div class="mt-4">
                                    <TextLink :href="capture.shareUrl" native target="_blank" rel="noreferrer" class="text-sm font-medium">
                                        Open prototype feedback link
                                    </TextLink>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>

        <svg aria-hidden="true" class="pointer-events-none absolute h-0 w-0">
            <defs>
                <filter id="extension-preview-metaball" color-interpolation-filters="sRGB">
                    <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="7" />
                    <feColorMatrix
                        in="blur"
                        result="goo"
                        type="matrix"
                        values="
                            1 0 0 0 0
                            0 1 0 0 0
                            0 0 1 0 0
                            0 0 0 26 -11
                        "
                    />
                    <feBlend in="SourceGraphic" in2="goo" />
                </filter>
            </defs>
        </svg>

        <div
            v-if="overlayVisible"
            data-testid="extension-floating-control"
            class="fixed z-50"
            :style="{ left: `${overlayPosition.x}px`, top: `${overlayPosition.y}px` }"
        >
            <div class="group flex flex-col items-center">
                <div class="relative flex h-28 w-20 items-end justify-center">
                    <div v-if="isRecording" class="extension-preview-recording-orbit">
                        <span class="extension-preview-recording-ring extension-preview-recording-ring--static" />
                        <span class="extension-preview-recording-ring extension-preview-recording-ring--pulse" />
                        <span class="extension-preview-recording-ring extension-preview-recording-ring--pulse extension-preview-recording-ring--delayed" />
                    </div>

                    <div
                        aria-hidden="true"
                        class="pointer-events-none absolute inset-0"
                        style="filter: url(#extension-preview-metaball);"
                    >
                        <div
                            class="absolute bottom-2 left-1/2 size-11 -translate-x-1/2 rounded-full bg-stone-950 transition-all duration-200 ease-out"
                            :class="
                                isRecording
                                    ? 'scale-90 opacity-0'
                                    : 'scale-90 opacity-0 group-hover:-translate-y-14 group-hover:opacity-100 group-hover:scale-100 group-focus-within:-translate-y-14 group-focus-within:opacity-100 group-focus-within:scale-100'
                            "
                        />
                        <div
                            class="absolute bottom-0 left-1/2 size-16 -translate-x-1/2 rounded-full bg-stone-950 transition-colors duration-200"
                        />
                    </div>

                    <Button
                        data-testid="extension-screenshot-trigger"
                        type="button"
                        variant="secondary"
                        size="icon"
                        class="absolute bottom-2 size-11 rounded-full bg-stone-950 text-white shadow-lg transition-all duration-200 ease-out"
                        :class="
                            isRecording
                                ? 'pointer-events-none scale-90 opacity-0'
                                : 'scale-90 opacity-0 group-hover:-translate-y-14 group-hover:opacity-100 group-hover:scale-100 group-focus-within:-translate-y-14 group-focus-within:opacity-100 group-focus-within:scale-100'
                        "
                        @click="captureScreenshot"
                    >
                        <Camera class="size-4 text-primary" />
                        <span class="sr-only">Take screenshot</span>
                    </Button>

                    <Button
                        data-testid="extension-record-trigger"
                        type="button"
                        size="icon"
                        class="relative z-10 size-16 rounded-full bg-stone-950 text-primary opacity-75 shadow-lg transition-[opacity,background-color] duration-200 hover:bg-stone-900 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-white/30"
                        :class="isRecording ? 'bg-stone-950 text-[#ff6b6b] hover:bg-stone-950' : ''"
                        :aria-pressed="isRecording"
                        @pointerdown.prevent="handlePointerDown"
                        @keydown.enter.prevent="toggleRecording"
                        @keydown.space.prevent="toggleRecording"
                    >
                        <span
                            v-if="isRecording"
                            aria-hidden="true"
                            class="absolute inset-3 rounded-full bg-[#ff6b6b]/12"
                        />
                        <Square v-if="isRecording" class="relative z-10 size-5 fill-current text-[#ff6b6b]" />
                        <Play v-else class="size-5 fill-current" />
                        <span class="sr-only">{{ isRecording ? 'Stop recording' : 'Start recording' }}</span>
                    </Button>
                </div>

                <div
                    class="mt-3 flex items-center gap-1 rounded-full bg-stone-950 px-3 py-1 text-xs font-medium text-white shadow-lg transition-opacity duration-150"
                    :class="isRecording ? 'opacity-100' : 'opacity-0'"
                >
                    <Clock3 class="size-3.5" />
                    <span>{{ formattedElapsed }}</span>
                </div>
            </div>
        </div>

        <Dialog :open="captureDialogOpen" @update:open="(next) => (!next ? closeCaptureDialog() : null)">
            <DialogScrollContent
                data-testid="extension-capture-dialog"
                :class="captureDraft.kind === 'screenshot' ? 'sm:max-w-5xl' : ''"
                @pointer-down-outside.prevent
                @interact-outside.prevent
            >
                <DialogHeader>
                    <DialogTitle class="capitalize">
                        {{ captureDraft.kind === 'video' ? 'Video capture ready' : 'Screenshot ready' }}
                    </DialogTitle>
                    <DialogDescription>
                        Add the tester note that should travel with this capture before it is submitted.
                    </DialogDescription>
                </DialogHeader>

                <ScreenshotEditor
                    v-if="captureDraft.kind === 'screenshot'"
                    :session-key="captureDraft.capturedAt"
                />

                <div v-else class="rounded-lg border bg-muted/40 p-4">
                    <div class="flex items-start gap-3">
                        <div class="rounded-full border bg-background p-2">
                            <Play class="size-4 text-primary" />
                        </div>

                        <div class="space-y-1 text-sm">
                            <div class="font-medium">Video</div>
                            <p class="text-muted-foreground">{{ captureDraft.capturedAt }}</p>
                            <p class="text-muted-foreground">Duration: {{ formatDuration(captureDraft.durationSeconds) }}</p>
                        </div>
                    </div>
                </div>

                <div class="space-y-2">
                    <Label for="extension-capture-note">Comment</Label>
                    <Textarea
                        id="extension-capture-note"
                        v-model="captureDraft.note"
                        data-testid="extension-capture-note"
                        class="min-h-28 max-h-[40vh] resize-y overflow-y-auto"
                        rows="5"
                        placeholder="Describe what went wrong, what you expected to see, and how stable the issue is."
                    />
                </div>

                <DialogFooter class="gap-2 sm:justify-end">
                    <Button variant="outline" @click="closeCaptureDialog">
                        Close draft
                    </Button>
                    <Button @click="requestSendConfirmation">
                        Send feedback
                    </Button>
                </DialogFooter>
            </DialogScrollContent>
        </Dialog>

        <Dialog :open="confirmDialogOpen" @update:open="(next) => (!next ? cancelSendConfirmation() : null)">
            <DialogContent :show-close-button="false" @interact-outside.prevent>
                <DialogHeader>
                    <DialogTitle>Send this feedback?</DialogTitle>
                    <DialogDescription>
                        Make sure the capture and comment are ready before sending.
                    </DialogDescription>
                </DialogHeader>

                <div v-if="pendingSubmission" class="space-y-3 rounded-md border bg-muted/20 p-4 text-sm">
                    <div class="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" class="capitalize">{{ pendingSubmission.kind }}</Badge>
                        <span class="text-muted-foreground">{{ pendingSubmission.capturedAt }}</span>
                    </div>
                    <p>{{ pendingSubmission.note || 'No comment attached yet.' }}</p>
                </div>

                <DialogFooter class="gap-2 sm:justify-end">
                    <Button variant="outline" @click="cancelSendConfirmation">
                        Keep editing
                    </Button>
                    <Button @click="confirmSendCapture">
                        Yes, send it
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog :open="shareDialogOpen" @update:open="(next) => (!next ? closeShareDialog() : null)">
            <DialogContent :show-close-button="false" @interact-outside.prevent>
                <DialogHeader>
                    <DialogTitle>Feedback sent</DialogTitle>
                    <DialogDescription>
                        Share this link if someone else should review the submitted prototype feedback entry.
                    </DialogDescription>
                </DialogHeader>

                <div class="space-y-3">
                    <div class="space-y-2">
                        <Label for="extension-feedback-link">Feedback link</Label>
                        <div class="flex gap-2">
                            <Input
                                id="extension-feedback-link"
                                :model-value="submittedCapture?.shareUrl ?? ''"
                                readonly
                            />
                            <Button variant="outline" @click="copyFeedbackLink">
                                <Copy class="mr-2 size-4" />
                                {{ feedbackLinkCopied ? 'Copied' : 'Copy' }}
                            </Button>
                        </div>
                    </div>

                    <div v-if="submittedCapture" class="rounded-md border bg-muted/20 px-4 py-3 text-sm">
                        <div class="font-medium">
                            {{ submittedCapture.kind === 'video' ? 'Prototype video feedback' : 'Prototype screenshot feedback' }}
                        </div>
                        <div class="mt-1 text-muted-foreground">{{ submittedCapture.note || 'No comment attached.' }}</div>
                    </div>
                </div>

                <DialogFooter class="gap-2 sm:justify-end">
                    <TextLink
                        v-if="submittedCapture?.shareUrl"
                        :href="submittedCapture.shareUrl"
                        native
                        target="_blank"
                        rel="noreferrer"
                        class="text-sm font-medium"
                    >
                        Open feedback
                    </TextLink>
                    <Button @click="closeShareDialog">
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>

<style scoped>
.extension-preview-recording-orbit {
    pointer-events: none;
    position: absolute;
    left: 50%;
    bottom: 0;
    width: 4rem;
    height: 4rem;
    transform: translateX(-50%);
}

.extension-preview-recording-orbit > span {
    position: absolute;
    inset: 0;
    border-radius: 9999px;
}

.extension-preview-recording-ring {
    border: 1px solid rgb(255 255 255 / 0.14);
}

.extension-preview-recording-ring--static {
    transform: scale(1.34);
}

.extension-preview-recording-ring--pulse {
    background: rgb(255 107 107 / 0.08);
    border-color: rgb(255 107 107 / 0.18);
    animation: extension-preview-record-pulse 2.4s cubic-bezier(0.16, 1, 0.3, 1) infinite;
}

.extension-preview-recording-ring--delayed {
    animation-delay: 0.8s;
}

@keyframes extension-preview-record-pulse {
    0% {
        opacity: 0;
        transform: scale(1);
    }

    15% {
        opacity: 1;
    }

    100% {
        opacity: 0;
        transform: scale(2.05);
    }
}
</style>
