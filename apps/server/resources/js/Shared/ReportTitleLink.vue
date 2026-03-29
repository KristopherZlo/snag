<script setup>
import { Link } from '@inertiajs/vue3';
import { computed } from 'vue';
import { cn } from '@/lib/utils';

const props = defineProps({
    href: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    native: {
        type: Boolean,
        default: false,
    },
    class: {
        type: null,
        required: false,
    },
});

const component = computed(() => (props.native ? 'a' : Link));
</script>

<template>
    <component
        :is="component"
        :href="href"
        :title="title"
        :class="cn('block min-w-0 max-w-full text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline', props.class)"
    >
        <span class="block truncate">{{ title }}</span>
    </component>
</template>
