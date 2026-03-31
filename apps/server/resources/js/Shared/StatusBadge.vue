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
    github: 'border-slate-400/30 bg-slate-100 text-slate-800 dark:border-slate-400/20 dark:bg-slate-500/15 dark:text-slate-100',
    jira: 'border-sky-500/30 bg-sky-50 text-sky-900 dark:border-sky-400/20 dark:bg-sky-500/15 dark:text-sky-100',
    trello: 'border-cyan-500/30 bg-cyan-50 text-cyan-900 dark:border-cyan-400/20 dark:bg-cyan-500/15 dark:text-cyan-100',
    processing: 'border-amber-500/25 bg-amber-50 text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-100',
    todo: 'border-amber-500/25 bg-amber-50 text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-100',
    triaged: 'border-amber-500/25 bg-amber-50 text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-100',
    medium: 'border-amber-500/25 bg-amber-50 text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-100',
    high: 'border-amber-500/25 bg-amber-50 text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-100',
    unresolved: 'border-amber-500/25 bg-amber-50 text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-100',
    blocked: 'border-amber-500/25 bg-amber-50 text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-100',
    needs_info: 'border-amber-500/25 bg-amber-50 text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-100',
    ready_to_verify: 'border-sky-500/25 bg-sky-50 text-sky-900 dark:border-sky-400/20 dark:bg-sky-500/15 dark:text-sky-100',
    duplicate: 'border-violet-500/25 bg-violet-50 text-violet-900 dark:border-violet-400/20 dark:bg-violet-500/15 dark:text-violet-100',
    unreproducible: 'border-violet-500/25 bg-violet-50 text-violet-900 dark:border-violet-400/20 dark:bg-violet-500/15 dark:text-violet-100',
    wontfix: 'border-violet-500/25 bg-violet-50 text-violet-900 dark:border-violet-400/20 dark:bg-violet-500/15 dark:text-violet-100',
    inbox: 'border-border bg-muted text-foreground dark:border-border/80 dark:bg-muted/60 dark:text-foreground',
    in_progress: 'border-orange-500/25 bg-orange-50 text-orange-900 dark:border-orange-400/20 dark:bg-orange-500/15 dark:text-orange-100',
    low: 'border-emerald-500/25 bg-emerald-50 text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-100',
    failed: 'border-rose-500/25 bg-rose-50 text-rose-900 dark:border-rose-400/20 dark:bg-rose-500/15 dark:text-rose-100',
    deleted: 'border-rose-500/25 bg-rose-50 text-rose-900 dark:border-rose-400/20 dark:bg-rose-500/15 dark:text-rose-100',
    revoked: 'border-rose-500/25 bg-rose-50 text-rose-900 dark:border-rose-400/20 dark:bg-rose-500/15 dark:text-rose-100',
    critical: 'border-rose-500/25 bg-rose-50 text-rose-900 dark:border-rose-400/20 dark:bg-rose-500/15 dark:text-rose-100',
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
    return toneMap[props.value] ?? 'border-border bg-muted text-foreground';
});

const label = computed(() => labelMap[props.value] ?? props.value.replaceAll('_', ' '));
</script>

<template>
    <Badge variant="outline" :class="cn('shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium capitalize', tone)">
        {{ label }}
    </Badge>
</template>
