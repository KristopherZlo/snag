<script setup>
import { computed } from 'vue';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const props = defineProps({
    value: {
        type: String,
        required: true,
    },
});

const tone = computed(() => {
    if (['ready', 'active', 'done', 'fixed'].includes(props.value)) {
        return 'border-primary/25 bg-primary/10 text-primary';
    }

    if (['processing', 'todo', 'medium', 'high', 'unresolved', 'blocked', 'needs_info'].includes(props.value)) {
        return 'border-amber-700/15 bg-amber-50 text-amber-900';
    }

    if (['failed', 'deleted', 'revoked', 'critical'].includes(props.value)) {
        return 'border-rose-700/15 bg-rose-50 text-rose-900';
    }

    return 'border-stone-300 bg-stone-100 text-stone-800';
});

const label = computed(() => props.value.replaceAll('_', ' '));
</script>

<template>
    <Badge variant="outline" :class="cn('shrink-0 capitalize font-medium', tone)">
        {{ label }}
    </Badge>
</template>
