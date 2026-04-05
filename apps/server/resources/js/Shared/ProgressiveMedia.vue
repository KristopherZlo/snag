<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
    kind: {
        type: String,
        default: 'image',
    },
    src: {
        type: String,
        default: null,
    },
    poster: {
        type: String,
        default: null,
    },
    alt: {
        type: String,
        default: '',
    },
    placeholder: {
        type: Object,
        default: null,
    },
    mediaClass: {
        type: String,
        default: 'h-full w-full object-cover',
    },
    mediaElementClass: {
        type: String,
        default: '',
    },
    imageLoading: {
        type: String,
        default: 'lazy',
    },
    videoControls: {
        type: Boolean,
        default: false,
    },
    videoPreload: {
        type: String,
        default: 'metadata',
    },
    muted: {
        type: Boolean,
        default: false,
    },
    playsinline: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['load', 'error']);

const mediaLoaded = ref(false);

const blurPreviewUrl = computed(() => props.placeholder?.blur_data_url ?? null);
const backgroundStyle = computed(() =>
    props.placeholder?.average_color
        ? { backgroundColor: props.placeholder.average_color }
        : {},
);
const renderImage = computed(() => props.kind === 'image' && Boolean(props.src));
const renderVideo = computed(() => props.kind === 'video' && Boolean(props.src));
const showPlaceholder = computed(() => Boolean(props.placeholder?.average_color || blurPreviewUrl.value) && !mediaLoaded.value);

watch(
    () => [props.kind, props.src, props.poster],
    () => {
        mediaLoaded.value = false;
    },
    { immediate: true },
);

const handleMediaLoaded = (event) => {
    mediaLoaded.value = true;
    emit('load', event);
};

const handleMediaError = (event) => {
    emit('error', event);
};
</script>

<template>
    <div class="relative h-full w-full overflow-hidden" :style="backgroundStyle">
        <div v-if="showPlaceholder" class="pointer-events-none absolute inset-0" aria-hidden="true">
            <div class="absolute inset-0" :style="backgroundStyle" />
            <img
                v-if="blurPreviewUrl"
                :src="blurPreviewUrl"
                alt=""
                class="absolute inset-0 h-full w-full scale-[1.08] object-cover blur-2xl saturate-[1.12]"
                data-testid="progressive-media-blur"
            />
            <div class="absolute inset-0 bg-background/5" />
        </div>

        <img
            v-if="renderImage"
            :src="src"
            :alt="alt"
            :class="[mediaClass, props.mediaElementClass, mediaLoaded ? 'opacity-100' : 'opacity-0', 'relative z-[1] block transition-[opacity,transform] duration-300']"
            :loading="imageLoading"
            decoding="async"
            @load="handleMediaLoaded"
            @error="handleMediaError"
        />

        <video
            v-else-if="renderVideo"
            :src="src"
            :poster="poster || undefined"
            :class="[mediaClass, props.mediaElementClass, 'relative z-[1] block bg-transparent']"
            :controls="videoControls"
            :muted="muted"
            :playsinline="playsinline"
            :preload="videoPreload"
            @loadeddata="handleMediaLoaded"
            @error="handleMediaError"
        />
    </div>
</template>
