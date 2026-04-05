<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { Camera, Film } from 'lucide-vue-next';
import { Skeleton } from '@/components/ui/skeleton';
import ProgressiveMedia from '@/Shared/ProgressiveMedia.vue';
import ZoomableImageLightbox from '@/Shared/ZoomableImageLightbox.vue';

const props = defineProps({
    preview: {
        type: Object,
        default: null,
    },
    mediaKind: {
        type: String,
        default: 'screenshot',
    },
    alt: {
        type: String,
        default: 'Artifact preview',
    },
    mediaClass: {
        type: String,
        default: 'h-full w-full object-cover',
    },
    imageElementClass: {
        type: String,
        default: '',
    },
    placeholderIconClass: {
        type: String,
        default: 'size-8 text-muted-foreground',
    },
    videoControls: {
        type: Boolean,
        default: false,
    },
    staticPreviewOnly: {
        type: Boolean,
        default: false,
    },
    imageLoading: {
        type: String,
        default: 'eager',
    },
    allowImageFullscreen: {
        type: Boolean,
        default: false,
    },
});

const loadFailed = ref(false);
const mediaLoaded = ref(false);
const previewRoot = ref(null);
const requestedPreviewWidth = ref(null);
const previewMeasurementResolved = ref(false);
let resizeObserver = null;

const previewKind = computed(() => props.preview?.kind ?? props.mediaKind);
const isVideo = computed(() => previewKind.value === 'video');
const placeholderIcon = computed(() => (isVideo.value ? Film : Camera));
const staticPreviewBaseUrl = computed(() => props.preview?.dashboard_url ?? null);
const videoDurationLabel = computed(() => {
    const seconds = Math.max(0, Number(props.preview?.duration_seconds ?? 0));

    if (seconds < 1) {
        return null;
    }

    return seconds >= 3600
        ? new Intl.DateTimeFormat('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              timeZone: 'UTC',
          }).format(new Date(seconds * 1000))
        : new Intl.DateTimeFormat('en-GB', {
              minute: '2-digit',
              second: '2-digit',
              timeZone: 'UTC',
          }).format(new Date(seconds * 1000));
});
const waitingForStaticPreviewMeasurement = computed(
    () => props.staticPreviewOnly && Boolean(staticPreviewBaseUrl.value) && !previewMeasurementResolved.value,
);
const previewUrl = computed(() => {
    if (props.staticPreviewOnly && staticPreviewBaseUrl.value) {
        if (!previewMeasurementResolved.value) {
            return null;
        }

        if (requestedPreviewWidth.value === null) {
            return staticPreviewBaseUrl.value;
        }

        const url = new URL(staticPreviewBaseUrl.value, globalThis.window?.location?.origin ?? 'http://localhost');
        url.searchParams.set('w', String(requestedPreviewWidth.value));

        return url.toString();
    }

    if (props.staticPreviewOnly && isVideo.value) {
        return null;
    }

    return props.preview?.url ?? null;
});
const renderAsImage = computed(() => {
    if (!previewUrl.value) {
        return false;
    }

    return !isVideo.value || props.staticPreviewOnly;
});
const renderAsVideo = computed(() => Boolean(previewUrl.value) && isVideo.value && !props.staticPreviewOnly);
const showStaticVideoPlaceholder = computed(() => props.staticPreviewOnly && isVideo.value);
const canRenderMedia = computed(() => (renderAsImage.value || renderAsVideo.value) && !loadFailed.value);
const fullscreenImageUrl = computed(() => props.preview?.url ?? previewUrl.value);
const canOpenFullscreenImage = computed(() =>
    props.allowImageFullscreen
    && renderAsImage.value
    && !loadFailed.value
    && Boolean(fullscreenImageUrl.value),
);
const hasProgressivePlaceholder = computed(() => Boolean(
    props.preview?.placeholder?.average_color
    || props.preview?.placeholder?.blur_data_url
    || props.preview?.poster?.placeholder?.average_color
    || props.preview?.poster?.placeholder?.blur_data_url,
));
const showLoadingSkeleton = computed(() => canRenderMedia.value && !mediaLoaded.value && !hasProgressivePlaceholder.value);

const disconnectResizeObserver = () => {
    resizeObserver?.disconnect();
    resizeObserver = null;
};

const resolveRequestedPreviewWidth = () => {
    const container = previewRoot.value;

    if (!container) {
        requestedPreviewWidth.value = null;
        previewMeasurementResolved.value = true;

        return;
    }

    const measuredWidth = container.getBoundingClientRect().width || container.clientWidth || 0;
    const pixelRatio = typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 2);

    requestedPreviewWidth.value = measuredWidth > 0
        ? Math.max(240, Math.round(measuredWidth * pixelRatio))
        : null;
    previewMeasurementResolved.value = true;
};

const initializeStaticPreviewMeasurement = async () => {
    disconnectResizeObserver();
    requestedPreviewWidth.value = null;

    if (!props.staticPreviewOnly || !staticPreviewBaseUrl.value || typeof window === 'undefined') {
        previewMeasurementResolved.value = true;

        return;
    }

    previewMeasurementResolved.value = false;
    await nextTick();
    resolveRequestedPreviewWidth();

    if (typeof ResizeObserver === 'undefined' || !previewRoot.value) {
        return;
    }

    resizeObserver = new ResizeObserver(() => {
        resolveRequestedPreviewWidth();
    });
    resizeObserver.observe(previewRoot.value);
};

watch(
    () => [
        props.preview?.kind,
        props.preview?.url,
        props.preview?.dashboard_url,
        props.preview?.placeholder?.average_color,
        props.preview?.placeholder?.blur_data_url,
        props.mediaKind,
        props.staticPreviewOnly,
    ],
    () => {
        loadFailed.value = false;
        mediaLoaded.value = false;

        initializeStaticPreviewMeasurement();
    },
    { immediate: true },
);

const handleMediaError = () => {
    loadFailed.value = true;
};

const handleMediaLoaded = () => {
    mediaLoaded.value = true;
};

onBeforeUnmount(() => {
    disconnectResizeObserver();
});
</script>

<template>
    <div ref="previewRoot" class="relative h-full w-full overflow-hidden">
        <div v-if="waitingForStaticPreviewMeasurement || showLoadingSkeleton" class="absolute inset-0 z-[1]">
            <Skeleton class="h-full w-full rounded-none bg-foreground/8" data-testid="artifact-preview-skeleton" />
        </div>
        <ZoomableImageLightbox
            v-if="canOpenFullscreenImage"
            :src="fullscreenImageUrl"
            :trigger-src="previewUrl"
            :alt="alt"
            :placeholder="props.preview?.placeholder ?? null"
            :trigger-media-element-class="props.imageElementClass"
            :media-class="mediaClass"
            @trigger-load="handleMediaLoaded"
            @trigger-error="handleMediaError"
        />
        <ProgressiveMedia
            v-else-if="renderAsImage && !loadFailed"
            kind="image"
            :src="previewUrl"
            :alt="alt"
            :placeholder="props.preview?.placeholder ?? null"
            :media-class="mediaClass"
            :media-element-class="props.imageElementClass"
            :image-loading="imageLoading"
            @load="handleMediaLoaded"
            @error="handleMediaError"
        />
        <ProgressiveMedia
            v-else-if="renderAsVideo && !loadFailed"
            kind="video"
            :src="previewUrl"
            :poster="props.preview?.poster?.url ?? props.preview?.poster_url ?? undefined"
            :placeholder="props.preview?.poster?.placeholder ?? props.preview?.placeholder ?? null"
            :media-class="mediaClass"
            :video-controls="videoControls"
            muted
            playsinline
            video-preload="metadata"
            @load="handleMediaLoaded"
            @error="handleMediaError"
        />
        <div
            v-else-if="showStaticVideoPlaceholder"
            class="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted/70 px-4 text-center"
            data-testid="artifact-preview-video-placeholder"
        >
            <div class="flex size-12 items-center justify-center rounded-full border border-border/80 bg-background/80">
                <Film class="size-5 text-foreground/80" />
            </div>
            <div class="space-y-1">
                <div class="text-sm font-medium text-foreground">Video capture</div>
                <div class="text-xs text-muted-foreground">
                    Open the capture to load the recording.
                </div>
            </div>
            <div v-if="videoDurationLabel" class="rounded-md border border-border/80 bg-background/80 px-2 py-1 text-xs font-medium text-muted-foreground">
                {{ videoDurationLabel }}
            </div>
        </div>
        <div
            v-else
            :data-kind="previewKind"
            data-testid="artifact-preview-fallback"
            class="flex h-full w-full items-center justify-center"
        >
            <component :is="placeholderIcon" :class="placeholderIconClass" />
        </div>
    </div>
</template>
