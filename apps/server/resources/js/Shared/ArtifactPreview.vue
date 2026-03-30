<script setup>
import { computed, ref, watch } from 'vue';
import { Camera, Film } from 'lucide-vue-next';

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
    placeholderIconClass: {
        type: String,
        default: 'size-8 text-muted-foreground',
    },
    videoControls: {
        type: Boolean,
        default: false,
    },
});

const loadFailed = ref(false);

const previewKind = computed(() => props.preview?.kind ?? props.mediaKind);
const previewUrl = computed(() => props.preview?.url ?? null);
const isVideo = computed(() => previewKind.value === 'video');
const canRenderMedia = computed(() => Boolean(previewUrl.value) && !loadFailed.value);
const placeholderIcon = computed(() => (isVideo.value ? Film : Camera));

watch(
    () => [props.preview?.kind, props.preview?.url, props.mediaKind],
    () => {
        loadFailed.value = false;
    },
    { immediate: true },
);

const handleMediaError = () => {
    loadFailed.value = true;
};
</script>

<template>
    <div class="flex h-full w-full items-center justify-center overflow-hidden">
        <img
            v-if="canRenderMedia && !isVideo"
            :src="previewUrl"
            :alt="alt"
            :class="mediaClass"
            @error="handleMediaError"
        />
        <video
            v-else-if="canRenderMedia"
            :src="previewUrl"
            :class="mediaClass"
            :controls="videoControls"
            muted
            playsinline
            preload="metadata"
            @error="handleMediaError"
        />
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
