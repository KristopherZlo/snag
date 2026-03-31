<script setup>
import { Head } from '@inertiajs/vue3';
import ArtifactPreview from '@/Shared/ArtifactPreview.vue';
import BrandMark from '@/Shared/BrandMark.vue';
import StatusBadge from '@/Shared/StatusBadge.vue';
import TextLink from '@/Shared/TextLink.vue';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';

defineProps({
    issue: {
        type: Object,
        required: true,
    },
});
</script>

<template>
    <Head :title="issue.title" />

    <div class="min-h-screen bg-background px-4 py-8 text-foreground md:px-6">
        <div class="mx-auto max-w-6xl space-y-6">
            <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <BrandMark href="/" logo-class="size-11" text-class="text-2xl" />
                <div class="flex flex-wrap gap-2">
                    <StatusBadge :value="issue.workflow_state" />
                    <StatusBadge :value="issue.urgency" />
                    <StatusBadge :value="issue.resolution" />
                </div>
            </div>

            <Card class="overflow-hidden border-border/70 bg-card">
                <CardContent class="grid gap-6 p-0 xl:grid-cols-[360px_minmax(0,1fr)]">
                    <div class="border-b bg-muted xl:border-b-0 xl:border-r">
                        <div class="aspect-[16/10]">
                            <ArtifactPreview
                                :preview="issue.preview"
                                :media-kind="issue.reports[0]?.media_kind ?? 'screenshot'"
                                :alt="issue.title"
                                media-class="h-full w-full object-cover"
                                placeholder-icon-class="size-10 text-muted-foreground"
                            />
                        </div>
                    </div>

                    <div class="space-y-5 p-6">
                        <div>
                            <div class="text-xs uppercase tracking-[0.12em] text-muted-foreground">{{ issue.key }}</div>
                            <h1 class="mt-2 text-3xl font-semibold">{{ issue.title }}</h1>
                            <p class="mt-3 max-w-3xl text-sm text-muted-foreground">
                                {{ issue.summary || 'No public summary was provided for this issue yet.' }}
                            </p>
                        </div>

                        <div class="flex flex-wrap gap-2">
                            <Badge v-for="label in issue.labels" :key="label" variant="outline">{{ label }}</Badge>
                        </div>

                        <div class="grid gap-4 md:grid-cols-3">
                            <div class="rounded-xl border p-4">
                                <div class="text-sm font-medium">Linked captures</div>
                                <div class="mt-1 text-sm text-muted-foreground">{{ issue.reports.length }} reports</div>
                            </div>
                            <div class="rounded-xl border p-4">
                                <div class="text-sm font-medium">External tickets</div>
                                <div class="mt-1 text-sm text-muted-foreground">{{ issue.external_links.length }} references</div>
                            </div>
                            <div class="rounded-xl border p-4">
                                <div class="text-sm font-medium">Shared</div>
                                <div class="mt-1 text-sm text-muted-foreground">{{ issue.shared_at ? new Date(issue.shared_at).toLocaleString() : 'n/a' }}</div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <Card>
                    <CardHeader>
                        <CardTitle>Evidence timeline</CardTitle>
                        <CardDescription>Guest view includes high-level capture context without exposing private raw console or network bodies.</CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        <div v-for="report in issue.reports" :key="report.id" class="rounded-2xl border p-4">
                            <div class="flex flex-col gap-4 sm:flex-row">
                                <div class="w-full shrink-0 overflow-hidden rounded-xl border bg-muted sm:w-36">
                                    <div class="aspect-[16/10]">
                                        <ArtifactPreview
                                            :preview="report.preview"
                                            :media-kind="report.media_kind"
                                            :alt="report.title"
                                            media-class="h-full w-full object-cover"
                                            placeholder-icon-class="size-6 text-muted-foreground"
                                        />
                                    </div>
                                </div>

                                <div class="min-w-0 flex-1 space-y-2">
                                    <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div class="min-w-0">
                                            <div class="truncate text-sm font-medium">{{ report.title }}</div>
                                            <div class="line-clamp-2 text-sm text-muted-foreground">{{ report.summary || 'No summary provided.' }}</div>
                                        </div>
                                        <div class="text-xs text-muted-foreground">
                                            {{ report.created_at ? new Date(report.created_at).toLocaleString() : 'n/a' }}
                                        </div>
                                    </div>

                                    <div class="grid gap-2 md:grid-cols-2">
                                        <div class="text-sm text-muted-foreground">Reporter: {{ report.reporter?.name || 'Anonymous' }}</div>
                                        <div class="text-sm text-muted-foreground">Platform: {{ report.debugger_summary.platform || 'n/a' }}</div>
                                        <div class="text-sm text-muted-foreground">Steps: {{ report.debugger_summary.steps_count }}</div>
                                        <div class="text-sm text-muted-foreground">Console / Network: {{ report.debugger_summary.console_count }} / {{ report.debugger_summary.network_count }}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div class="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle class="text-base">External references</CardTitle>
                        </CardHeader>
                        <CardContent class="space-y-3">
                            <div v-for="link in issue.external_links" :key="`${link.provider}-${link.external_key}`" class="rounded-xl border p-3">
                                <div class="flex items-center gap-2">
                                    <StatusBadge :value="link.provider" />
                                    <span class="text-sm font-medium">{{ link.external_key }}</span>
                                </div>
                                <TextLink
                                    :href="link.external_url"
                                    native
                                    target="_blank"
                                    rel="noreferrer"
                                    class="mt-2 text-sm font-medium text-primary hover:underline"
                                >
                                    Open external ticket
                                </TextLink>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle class="text-base">What stays private</CardTitle>
                        </CardHeader>
                        <CardContent class="space-y-2 text-sm text-muted-foreground">
                            <p>Raw console payloads, request bodies, response bodies, and internal collaboration notes stay inside the organization workspace.</p>
                            <p>This share page exists for handoff and review, not for full debugger access.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    </div>
</template>
