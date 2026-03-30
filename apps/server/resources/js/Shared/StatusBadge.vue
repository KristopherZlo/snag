<script setup>
import { computed } from 'vue';
import { Badge } from '@/Components/ui/badge';
import { cn } from '@/lib/utils';

const props = defineProps({
    value: {
        type: String,
        required: true,
    },
});

const toneMap = {
    ready: 'border-primary/25 bg-primary/10 text-primary',
    active: 'border-primary/25 bg-primary/10 text-primary',
    done: 'border-primary/25 bg-primary/10 text-primary',
    fixed: 'border-primary/25 bg-primary/10 text-primary',
    github: 'border-slate-700/15 bg-slate-100 text-slate-900',
    jira: 'border-sky-700/15 bg-sky-50 text-sky-900',
    trello: 'border-cyan-700/15 bg-cyan-50 text-cyan-900',
    processing: 'border-amber-700/15 bg-amber-50 text-amber-900',
    todo: 'border-amber-700/15 bg-amber-50 text-amber-900',
    triaged: 'border-amber-700/15 bg-amber-50 text-amber-900',
    medium: 'border-amber-700/15 bg-amber-50 text-amber-900',
    high: 'border-amber-700/15 bg-amber-50 text-amber-900',
    unresolved: 'border-amber-700/15 bg-amber-50 text-amber-900',
    blocked: 'border-amber-700/15 bg-amber-50 text-amber-900',
    needs_info: 'border-amber-700/15 bg-amber-50 text-amber-900',
    ready_to_verify: 'border-sky-700/15 bg-sky-50 text-sky-900',
    duplicate: 'border-violet-700/15 bg-violet-50 text-violet-900',
    unreproducible: 'border-violet-700/15 bg-violet-50 text-violet-900',
    wontfix: 'border-violet-700/15 bg-violet-50 text-violet-900',
    inbox: 'border-stone-300 bg-stone-100 text-stone-800',
    in_progress: 'border-orange-700/15 bg-orange-50 text-orange-900',
    low: 'border-emerald-700/15 bg-emerald-50 text-emerald-900',
    failed: 'border-rose-700/15 bg-rose-50 text-rose-900',
    deleted: 'border-rose-700/15 bg-rose-50 text-rose-900',
    revoked: 'border-rose-700/15 bg-rose-50 text-rose-900',
    critical: 'border-rose-700/15 bg-rose-50 text-rose-900',
};

const labelMap = {
    github: 'GitHub',
    jira: 'Jira',
    trello: 'Trello',
    in_progress: 'In progress',
    ready_to_verify: 'Ready to verify',
    needs_info: 'Needs info',
    wontfix: "Won't fix",
};

const tone = computed(() => {
    return toneMap[props.value] ?? 'border-stone-300 bg-stone-100 text-stone-800';
});

const label = computed(() => labelMap[props.value] ?? props.value.replaceAll('_', ' '));
</script>

<template>
    <Badge variant="outline" :class="cn('shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium capitalize', tone)">
        {{ label }}
    </Badge>
</template>
