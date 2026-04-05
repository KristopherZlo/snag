<script setup>
import ProgressiveMedia from '@/Shared/ProgressiveMedia.vue';
import ZoomableImageLightbox from '@/Shared/ZoomableImageLightbox.vue';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const props = defineProps({
    report: {
        type: Object,
        required: true,
    },
});

const primaryArtifact = props.report.artifacts.find((artifact) => ['screenshot', 'video'].includes(artifact.kind)) ?? null;
</script>

<template>
    <div class="min-h-screen bg-muted/30 px-4 py-6 md:px-6">
        <div class="mx-auto max-w-6xl space-y-6">
            <header class="space-y-3">
                <Badge variant="secondary">Public report</Badge>
                <div class="space-y-2">
                    <h1 class="break-all text-3xl font-semibold tracking-tight [overflow-wrap:anywhere] md:text-4xl">{{ report.title }}</h1>
                    <p class="max-w-3xl whitespace-pre-wrap break-all text-sm text-muted-foreground [overflow-wrap:anywhere]">{{ report.summary || 'No summary attached.' }}</p>
                </div>
            </header>

            <Card>
                <CardHeader>
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <CardTitle>Shared payload</CardTitle>
                            <CardDescription>
                                Public viewers receive a safe subset only. Internal-only debugger context remains protected behind policy checks.
                            </CardDescription>
                        </div>

                        <div class="flex flex-wrap gap-2">
                            <Badge variant="outline" class="capitalize">{{ report.media_kind }}</Badge>
                            <Badge variant="secondary">{{ report.artifacts.length }} artifacts</Badge>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <Card v-if="primaryArtifact">
                <CardHeader>
                    <CardTitle>Capture</CardTitle>
                    <CardDescription>The signed asset URL expires automatically based on the configured share TTL.</CardDescription>
                </CardHeader>

                <CardContent>
                    <div v-if="primaryArtifact.url" class="overflow-hidden rounded-md border bg-muted">
                        <ZoomableImageLightbox
                            v-if="primaryArtifact.kind === 'screenshot'"
                            :src="primaryArtifact.url"
                            alt="Shared bug screenshot"
                            :placeholder="primaryArtifact.placeholder"
                            media-class="block max-h-[42rem] w-full object-contain"
                        />
                        <ProgressiveMedia
                            v-else
                            kind="video"
                            :src="primaryArtifact.url"
                            :poster="report.video_poster?.url || report.video_poster_url || undefined"
                            :placeholder="report.video_poster?.placeholder || null"
                            media-class="block max-h-[42rem] w-full object-contain"
                            video-controls
                            video-preload="metadata"
                        />
                    </div>
                    <div v-else class="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                        Signed URLs are unavailable on the current storage disk.
                    </div>
                </CardContent>
            </Card>

            <div class="grid gap-6 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Actions</CardTitle>
                        <CardDescription>High-level interaction sequence only.</CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div v-if="report.debugger.actions.length" class="overflow-x-auto">
                            <Table class="min-w-[36rem]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Seq</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Label</TableHead>
                                        <TableHead>Selector</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow v-for="action in report.debugger.actions" :key="`${action.sequence}-${action.type}`">
                                        <TableCell>{{ action.sequence }}</TableCell>
                                        <TableCell>{{ action.type }}</TableCell>
                                        <TableCell class="whitespace-pre-wrap break-all [overflow-wrap:anywhere]">{{ action.label || 'n/a' }}</TableCell>
                                        <TableCell class="font-mono whitespace-pre-wrap break-all [overflow-wrap:anywhere]">{{ action.selector || 'n/a' }}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                        <div v-else class="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                            No action data was shared with this report.
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Network overview</CardTitle>
                        <CardDescription>Request metadata is truncated for public access.</CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div v-if="report.debugger.network_requests.length" class="overflow-x-auto">
                            <Table class="min-w-[36rem]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Seq</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead>URL</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow v-for="request in report.debugger.network_requests" :key="`${request.sequence}-${request.url}`">
                                        <TableCell>{{ request.sequence }}</TableCell>
                                        <TableCell>{{ request.method }}</TableCell>
                                        <TableCell class="max-w-xs break-all font-mono">{{ request.url }}</TableCell>
                                        <TableCell>{{ request.status_code ?? 'n/a' }}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                        <div v-else class="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                            No network request data is available for this share.
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
</template>
