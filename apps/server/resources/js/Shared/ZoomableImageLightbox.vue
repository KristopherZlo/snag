<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { Expand, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-vue-next';
import ProgressiveMedia from '@/Shared/ProgressiveMedia.vue';
import { Button } from '@/Components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/Components/ui/dialog';

const props = defineProps({
    src: {
        type: String,
        required: true,
    },
    triggerSrc: {
        type: String,
        default: null,
    },
    alt: {
        type: String,
        default: 'Image preview',
    },
    placeholder: {
        type: Object,
        default: null,
    },
    triggerClass: {
        type: String,
        default: '',
    },
    triggerMediaElementClass: {
        type: String,
        default: '',
    },
    mediaClass: {
        type: String,
        default: 'block max-h-[42rem] w-full object-contain',
    },
});

const emit = defineEmits(['trigger-load', 'trigger-error']);

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;

const open = ref(false);
const viewport = ref(null);
const imageLoaded = ref(false);
const zoom = ref(MIN_ZOOM);
const dragging = ref(false);
const naturalSize = reactive({
    width: 0,
    height: 0,
});
const viewportSize = reactive({
    width: 0,
    height: 0,
});
const pan = reactive({
    x: 0,
    y: 0,
});
const dragState = reactive({
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
});
let resizeObserver = null;

const blurPreviewUrl = computed(() => props.placeholder?.blur_data_url ?? null);
const triggerImageSrc = computed(() => props.triggerSrc || props.src);
const triggerMediaElementClasses = computed(() =>
    [
        'group-hover:scale-[1.04]',
        'group-focus-visible:scale-[1.04]',
        'transform-gpu',
        'transition-transform',
        'duration-200',
        'ease-out',
        'will-change-transform',
        props.triggerMediaElementClass,
    ]
        .filter(Boolean)
        .join(' '),
);
const backgroundStyle = computed(() =>
    props.placeholder?.average_color
        ? { backgroundColor: props.placeholder.average_color }
        : {},
);
const showPlaceholder = computed(() => Boolean(props.placeholder?.average_color || blurPreviewUrl.value) && !imageLoaded.value);
const zoomLabel = computed(() => `${Math.round(zoom.value * 100)}%`);
const canZoomOut = computed(() => zoom.value > MIN_ZOOM);
const canZoomIn = computed(() => zoom.value < MAX_ZOOM);
const fittedImageSize = computed(() => {
    if (!naturalSize.width || !naturalSize.height) {
        return {
            width: null,
            height: null,
        };
    }

    if (!viewportSize.width || !viewportSize.height) {
        return {
            width: naturalSize.width,
            height: naturalSize.height,
        };
    }

    const scale = Math.min(
        viewportSize.width / naturalSize.width,
        viewportSize.height / naturalSize.height,
        1,
    );

    return {
        width: Math.round(naturalSize.width * scale),
        height: Math.round(naturalSize.height * scale),
    };
});
const maxPan = computed(() => {
    const baseWidth = fittedImageSize.value.width ?? 0;
    const baseHeight = fittedImageSize.value.height ?? 0;

    return {
        x: Math.max(0, ((baseWidth * zoom.value) - baseWidth) / 2),
        y: Math.max(0, ((baseHeight * zoom.value) - baseHeight) / 2),
    };
});
const imageStyle = computed(() => ({
    width: fittedImageSize.value.width ? `${fittedImageSize.value.width}px` : undefined,
    height: fittedImageSize.value.height ? `${fittedImageSize.value.height}px` : undefined,
    transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom.value})`,
    transition: dragging.value ? 'none' : 'transform 180ms ease-out',
    cursor: zoom.value > MIN_ZOOM ? (dragging.value ? 'grabbing' : 'grab') : 'zoom-in',
    touchAction: zoom.value > MIN_ZOOM ? 'none' : 'manipulation',
}));

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

const applyPan = (nextX, nextY) => {
    pan.x = clamp(nextX, -maxPan.value.x, maxPan.value.x);
    pan.y = clamp(nextY, -maxPan.value.y, maxPan.value.y);
};

const resetView = () => {
    zoom.value = MIN_ZOOM;
    applyPan(0, 0);
};

const updateViewportSize = () => {
    const element = viewport.value;

    if (!element) {
        return;
    }

    const rect = element.getBoundingClientRect();
    viewportSize.width = Math.round(rect.width);
    viewportSize.height = Math.round(rect.height);

    if (zoom.value > MIN_ZOOM) {
        applyPan(pan.x, pan.y);
    }
};

const stopObservingViewport = () => {
    resizeObserver?.disconnect();
    resizeObserver = null;
};

const startObservingViewport = async () => {
    stopObservingViewport();
    await nextTick();
    updateViewportSize();

    if (typeof ResizeObserver === 'undefined' || !viewport.value) {
        return;
    }

    resizeObserver = new ResizeObserver(() => {
        updateViewportSize();
    });
    resizeObserver.observe(viewport.value);
};

const setZoom = (nextZoom) => {
    zoom.value = clamp(Number(nextZoom.toFixed(2)), MIN_ZOOM, MAX_ZOOM);

    if (zoom.value === MIN_ZOOM) {
        applyPan(0, 0);

        return;
    }

    applyPan(pan.x, pan.y);
};

const zoomIn = () => {
    setZoom(zoom.value + ZOOM_STEP);
};

const zoomOut = () => {
    setZoom(zoom.value - ZOOM_STEP);
};

const handleDialogOpenChange = async (nextOpen) => {
    open.value = nextOpen;

    if (!nextOpen) {
        stopObservingViewport();
        dragging.value = false;
        dragState.pointerId = null;
        resetView();

        return;
    }

    imageLoaded.value = false;
    resetView();
    await startObservingViewport();
};

const handleImageLoad = (event) => {
    imageLoaded.value = true;
    naturalSize.width = event.target?.naturalWidth ?? 0;
    naturalSize.height = event.target?.naturalHeight ?? 0;
    updateViewportSize();
};

const handleWheel = (event) => {
    if (!imageLoaded.value) {
        return;
    }

    if (event.deltaY < 0) {
        zoomIn();

        return;
    }

    zoomOut();
};

const handlePointerDown = (event) => {
    if (zoom.value <= MIN_ZOOM) {
        return;
    }

    dragging.value = true;
    dragState.pointerId = event.pointerId;
    dragState.startX = event.clientX;
    dragState.startY = event.clientY;
    dragState.originX = pan.x;
    dragState.originY = pan.y;
    event.currentTarget?.setPointerCapture?.(event.pointerId);
};

const handlePointerMove = (event) => {
    if (!dragging.value || dragState.pointerId !== event.pointerId) {
        return;
    }

    applyPan(
        dragState.originX + (event.clientX - dragState.startX),
        dragState.originY + (event.clientY - dragState.startY),
    );
};

const endDrag = (event) => {
    if (dragState.pointerId !== null && event.pointerId !== dragState.pointerId) {
        return;
    }

    dragging.value = false;
    event.currentTarget?.releasePointerCapture?.(event.pointerId);
    dragState.pointerId = null;
};

const handleDoubleClick = () => {
    if (zoom.value === MIN_ZOOM) {
        setZoom(2);

        return;
    }

    resetView();
};

watch(
    () => [props.src, open.value],
    async ([, isOpen]) => {
        if (!isOpen) {
            return;
        }

        imageLoaded.value = false;
        resetView();
        await startObservingViewport();
    },
);

onBeforeUnmount(() => {
    stopObservingViewport();
});
</script>

<template>
    <Dialog :open="open" @update:open="handleDialogOpenChange">
        <button
            type="button"
            class="group relative block h-full w-full cursor-pointer overflow-hidden text-left"
            :class="triggerClass"
            data-testid="zoomable-image-trigger"
            @click="open = true"
        >
            <ProgressiveMedia
                kind="image"
                :src="triggerImageSrc"
                :alt="alt"
                :placeholder="placeholder"
                :media-class="mediaClass"
                :media-element-class="triggerMediaElementClasses"
                image-loading="eager"
                @load="emit('trigger-load', $event)"
                @error="emit('trigger-error', $event)"
            />
            <div class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent p-3">
                <div class="flex justify-end">
                    <span class="inline-flex items-center gap-1 rounded-md border border-white/20 bg-black/45 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm md:opacity-0 md:transition group-hover:md:opacity-100">
                        <Expand class="size-3.5" />
                        Open fullscreen
                    </span>
                </div>
            </div>
        </button>

        <DialogContent
            class="flex h-[calc(100vh-1rem)] max-h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col overflow-hidden border bg-background p-0 sm:h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-2rem)] sm:w-[calc(100vw-2rem)] sm:!max-w-[calc(100vw-2rem)]"
            :show-close-button="false"
            data-testid="zoomable-image-dialog"
        >
            <div class="flex items-center justify-between gap-4 border-b px-4 py-3">
                <div class="min-w-0">
                    <DialogTitle class="truncate text-sm font-semibold">{{ alt || 'Image preview' }}</DialogTitle>
                    <DialogDescription class="text-xs">
                        Scroll to zoom. Drag to pan when zoomed in.
                    </DialogDescription>
                </div>

                <div class="flex items-center gap-2">
                    <div
                        class="rounded-md border border-border/80 bg-muted/60 px-2 py-1 text-xs font-medium text-muted-foreground"
                        data-testid="zoomable-image-zoom-level"
                    >
                        {{ zoomLabel }}
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        :disabled="!canZoomOut"
                        data-testid="zoomable-image-zoom-out"
                        @click="zoomOut"
                    >
                        <ZoomOut class="size-4" />
                        <span class="sr-only">Zoom out</span>
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        :disabled="!canZoomIn"
                        data-testid="zoomable-image-zoom-in"
                        @click="zoomIn"
                    >
                        <ZoomIn class="size-4" />
                        <span class="sr-only">Zoom in</span>
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        :disabled="zoom === MIN_ZOOM"
                        data-testid="zoomable-image-reset"
                        @click="resetView"
                    >
                        <RotateCcw class="size-4" />
                        <span class="sr-only">Reset zoom</span>
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        data-testid="zoomable-image-close"
                        @click="open = false"
                    >
                        <X class="size-4" />
                        <span class="sr-only">Close fullscreen image</span>
                    </Button>
                </div>
            </div>

            <div
                ref="viewport"
                class="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-stone-950/95"
                data-testid="zoomable-image-viewport"
                @wheel.prevent="handleWheel"
            >
                <div v-if="showPlaceholder" class="pointer-events-none absolute inset-0" aria-hidden="true">
                    <div class="absolute inset-0" :style="backgroundStyle" />
                    <img
                        v-if="blurPreviewUrl"
                        :src="blurPreviewUrl"
                        alt=""
                        class="absolute inset-0 h-full w-full scale-[1.08] object-cover blur-3xl"
                    />
                </div>

                <img
                    :src="src"
                    :alt="alt"
                    :draggable="false"
                    class="relative z-[1] max-w-none select-none"
                    :style="imageStyle"
                    data-testid="zoomable-image-full"
                    @load="handleImageLoad"
                    @pointerdown="handlePointerDown"
                    @pointermove="handlePointerMove"
                    @pointerup="endDrag"
                    @pointercancel="endDrag"
                    @dblclick="handleDoubleClick"
                />

                <div class="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
                    <div class="rounded-full border border-white/15 bg-black/45 px-3 py-1 text-xs font-medium text-white/85 backdrop-blur-sm">
                        {{ zoom > MIN_ZOOM ? 'Drag to pan' : 'Scroll to zoom' }}
                    </div>
                </div>
            </div>
        </DialogContent>
    </Dialog>
</template>
