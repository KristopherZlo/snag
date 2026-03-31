<script setup>
import { Link } from '@inertiajs/vue3';
import { cn } from '@/lib/utils';
import logoUrl from '../../../../../images/snag-logo.svg';

const props = defineProps({
    href: {
        type: String,
        default: '/',
    },
    logoClass: {
        type: String,
        default: 'size-10',
    },
    textClass: {
        type: String,
        default: 'text-[1.5rem]',
    },
    hideText: {
        type: Boolean,
        default: false,
    },
    class: {
        type: null,
        required: false,
    },
});
</script>

<template>
    <Link :href="href" :class="cn('inline-flex items-center gap-3', props.class)">
        <img :src="logoUrl" alt="Snag logo" :class="cn('shrink-0', props.logoClass)" />
        <span
            v-if="!hideText"
            :class="cn('leading-none text-primary', props.textClass)"
            style="font-family: var(--font-brand); font-weight: 800"
        >
            Snag
        </span>
    </Link>
</template>
