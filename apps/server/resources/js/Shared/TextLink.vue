<script setup>
import { Link } from '@inertiajs/vue3';
import { ArrowUpRight } from 'lucide-vue-next';
import { computed, useAttrs } from 'vue';
import { cn } from '@/lib/utils';

defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    href: {
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
    iconClass: {
        type: null,
        required: false,
    },
});

const attrs = useAttrs();
const component = computed(() => (props.native ? 'a' : Link));
</script>

<template>
    <component
        :is="component"
        v-bind="attrs"
        :href="href"
        :class="cn('inline-flex items-center gap-1.5 underline-offset-4 hover:underline', props.class)"
    >
        <span><slot /></span>
        <ArrowUpRight :class="cn('size-3.5 shrink-0', props.iconClass)" />
    </component>
</template>
