<script setup>
import { onBeforeUnmount, onMounted, watch } from 'vue';
import { mountWebsiteWidget } from '@/embed/runtime/widget-runtime.js';

const DIAGNOSTICS_CAPTURE_KEY = 'ck_wnz6f0axnoqbsz0f0bonhvm3haelxyxl';

const props = defineProps({
    apiBaseUrl: { type: String, required: true },
    prefillPublicKey: { type: String, default: DIAGNOSTICS_CAPTURE_KEY },
    siteName: { type: String, default: 'Air Supply Co.' },
    pageLabel: { type: String, default: 'Air Supply storefront' },
    openSignal: { type: Number, default: 0 },
});

const resolvedPublicKey = () => props.prefillPublicKey.trim() || DIAGNOSTICS_CAPTURE_KEY;

let script = null;
let runtime = null;

const buildBootstrap = () => ({
    widget: {
        public_id: 'ww_air_supply_storefront_demo',
        name: `${props.siteName} support widget`,
        status: 'active',
    },
    capture: {
        public_key: resolvedPublicKey(),
        mode: 'browser',
        media_kind: 'screenshot',
    },
    runtime: {
        position: 'bottom-right',
        screenshot_only: true,
        reopen_intro: false,
    },
    config: {
        launcher: {
            label: 'Report a bug',
        },
        intro: {
            title: 'Saw something broken?',
            body: `We can send a screenshot of this page to the ${props.siteName} support team. First click Continue. Then click the camera button. After that add a short note and send it.`,
            continue_label: 'Continue',
            cancel_label: 'Not now',
        },
        helper: {
            text: 'Click the camera to take a screenshot of this page.',
        },
        review: {
            title: 'Screenshot ready',
            body: 'Add context before sending this capture to Snag.',
            placeholder: 'Describe what happened, what you expected, and whether the issue is stable.',
            send_label: 'Continue',
            cancel_label: 'Keep draft',
            retake_label: 'Discard',
        },
        success: {
            title: 'Feedback sent',
            body: 'Your report was sent to our support team.',
            done_label: 'Done',
        },
        meta: {
            support_team_name: `${props.siteName} support`,
            site_label: props.pageLabel,
        },
        theme: {
            accent_color: '#182c45',
            mode: 'light',
            offset_x: 20,
            offset_y: 20,
            icon_style: 'camera',
        },
    },
});

const openWidgetIntro = () => {
    runtime?.openIntro?.();
};

onMounted(() => {
    if (typeof document === 'undefined') {
        return;
    }

    script = document.createElement('script');
    script.dataset.snagWidget = 'ww_air_supply_storefront_demo';
    script.dataset.snagBaseUrl = props.apiBaseUrl;
    script.dataset.snagPublicKey = resolvedPublicKey();

    runtime = mountWebsiteWidget({
        script,
        bootstrap: buildBootstrap(),
        baseUrl: props.apiBaseUrl,
    });

    if (props.openSignal > 0) {
        openWidgetIntro();
    }
});

watch(() => props.openSignal, (nextValue, previousValue) => {
    if (nextValue > previousValue) {
        openWidgetIntro();
    }
});

onBeforeUnmount(() => {
    runtime?.destroy?.();
    runtime = null;
    script = null;
});
</script>

<template>
    <div class="sr-only" aria-hidden="true" />
</template>
