<script setup>
import { onMounted } from 'vue';
import PageLoadingOverlay from '@/Shared/PageLoadingOverlay.vue';
import { initializePageLoading, setPageLoadingState } from '@/lib/runtime/page-loading';

defineProps({
    inertiaApp: {
        type: [Object, Function],
        required: true,
    },
    inertiaProps: {
        type: Object,
        required: true,
    },
});

onMounted(() => {
    initializePageLoading();
    setPageLoadingState(false);
    document.getElementById('app-boot-shell')?.remove();
});
</script>

<template>
    <component :is="inertiaApp" v-bind="inertiaProps" />
    <PageLoadingOverlay />
</template>
