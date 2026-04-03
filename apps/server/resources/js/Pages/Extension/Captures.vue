<script setup>
import { computed, ref } from 'vue';
import { Link, router } from '@inertiajs/vue3';
import {
    Camera,
    CircleAlert,
    Film,
    Link2,
    ShieldAlert,
    Trash2,
} from 'lucide-vue-next';
import AppShell from '@/Layouts/AppShell.vue';
import ArtifactPreview from '@/Shared/ArtifactPreview.vue';
import TextLink from '@/Shared/TextLink.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonVariants, Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const props = defineProps({
    captures: {
        type: Array,
        required: true,
    },
    stats: {
        type: Object,
        required: true,
    },
});

const busy = ref(false);
const failure = ref('');
const deleteTarget = ref(null);

const contextItems = computed(() => [
    { label: 'Total', value: props.stats.total },
    { label: 'Screenshots', value: props.stats.screenshots },
    { label: 'Videos', value: props.stats.videos },
]);

const extensionLinks = [
    { key: 'connect', label: 'Connect', href: route('settings.extension.connect') },
    { key: 'captures', label: 'Sent captures', href: route('settings.extension.captures') },
];

const openDeleteDialog = (capture) => {
    deleteTarget.value = capture;
    failure.value = '';
};

const closeDeleteDialog = () => {
    if (busy.value) {
        return;
    }

    deleteTarget.value = null;
};

const deleteCapture = () => {
    if (!deleteTarget.value) {
        return;
    }

    busy.value = true;
    failure.value = '';

    router.delete(route('settings.extension.captures.destroy', deleteTarget.value.id), {
        preserveScroll: true,
        onSuccess: () => {
            deleteTarget.value = null;
        },
        onError: () => {
            failure.value = 'Unable to delete this capture from the server.';
        },
        onFinish: () => {
            busy.value = false;
        },
    });
};

const formatCapturedAt = (value) => {
    if (!value) {
        return 'Unknown time';
    }

    return new Intl.DateTimeFormat('ru-RU', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
};

const mediaLabel = (capture) => (capture.media_kind === 'video' ? 'Video' : 'Screenshot');
const previewDuration = (capture) => {
    const seconds = Number(capture.preview?.duration_seconds ?? 0);

    if (!seconds) {
        return null;
    }

    const minutes = Math.floor(seconds / 60)
        .toString()
        .padStart(2, '0');
    const remainder = (seconds % 60).toString().padStart(2, '0');

    return `${minutes}:${remainder}`;
};
</script>

<template>
    <AppShell
        title="Sent Captures"
        description="Review everything this account already sent from the active workspace and remove anything sensitive without leaving extension setup."
        section="extension"
        :context-items="contextItems"
    >
        <div class="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Extension pages</CardTitle>
                    <CardDescription>Connect a browser install or review captures already sent by this account.</CardDescription>
                </CardHeader>
                <CardContent>
                    <nav class="flex flex-wrap gap-2">
                        <Link
                            v-for="item in extensionLinks"
                            :key="item.key"
                            :href="item.href"
                            :class="cn(buttonVariants({ variant: item.key === 'captures' ? 'secondary' : 'outline', size: 'sm' }))"
                        >
                            {{ item.label }}
                        </Link>
                    </nav>
                </CardContent>
            </Card>

            <Alert v-if="failure" class="border-rose-200 bg-rose-50 text-rose-950">
                <CircleAlert class="size-4" />
                <AlertDescription>{{ failure }}</AlertDescription>
            </Alert>

            <Card v-if="!captures.length">
                <CardHeader>
                    <CardTitle>No sent captures yet</CardTitle>
                    <CardDescription>Your screenshots and recordings will appear here after they are submitted.</CardDescription>
                </CardHeader>
                <CardContent class="flex flex-wrap items-center gap-3">
                    <Link :href="route('settings.extension.connect')" :class="buttonVariants({ variant: 'outline' })">
                        Open extension connect
                    </Link>
                    <TextLink :href="route('dashboard')">
                        Open reports dashboard
                    </TextLink>
                </CardContent>
            </Card>

            <div v-else class="grid gap-4 xl:grid-cols-2">
                <Card v-for="capture in captures" :key="capture.id" :id="`sent-capture-${capture.id}`" class="overflow-hidden">
                    <div class="border-b bg-muted/30">
                        <div class="relative aspect-[16/9] overflow-hidden bg-stone-950">
                            <ArtifactPreview
                                :preview="capture.preview"
                                :media-kind="capture.media_kind"
                                :alt="capture.title"
                                media-class="h-full w-full object-cover"
                                placeholder-icon-class="size-8 text-white/70"
                                video-controls
                            />

                            <div class="absolute left-3 top-3 flex flex-wrap gap-2">
                                <Badge variant="secondary" class="bg-black/65 text-white hover:bg-black/65">
                                    <Camera v-if="capture.media_kind === 'screenshot'" class="mr-1 size-3.5" />
                                    <Film v-else class="mr-1 size-3.5" />
                                    {{ mediaLabel(capture) }}
                                </Badge>
                                <Badge variant="secondary" class="bg-black/65 text-white hover:bg-black/65">
                                    {{ capture.status }}
                                </Badge>
                                <Badge
                                    v-if="previewDuration(capture)"
                                    variant="secondary"
                                    class="bg-black/65 text-white hover:bg-black/65"
                                >
                                    {{ previewDuration(capture) }}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <CardHeader class="space-y-3">
                        <div class="space-y-1">
                            <CardTitle class="text-lg">{{ capture.title }}</CardTitle>
                            <CardDescription>
                                {{ capture.summary || 'No additional description was attached to this capture.' }}
                            </CardDescription>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <Badge variant="outline">{{ formatCapturedAt(capture.created_at) }}</Badge>
                            <Badge variant="outline" class="capitalize">{{ capture.visibility }}</Badge>
                        </div>
                    </CardHeader>

                    <CardContent class="space-y-4">
                        <div v-if="capture.page_url" class="rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                            {{ capture.page_url }}
                        </div>

                        <div class="flex flex-wrap items-center gap-3">
                            <TextLink :href="capture.report_url">
                                Open report
                            </TextLink>
                            <span v-if="capture.has_public_share" class="text-sm text-muted-foreground">
                                Public share active
                            </span>
                            <Button variant="outline" class="ml-auto" @click="openDeleteDialog(capture)">
                                <Trash2 class="mr-2 size-4" />
                                Delete from server
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>

        <template #aside>
            <Card>
                <CardHeader>
                    <CardTitle class="text-base">Privacy control</CardTitle>
                </CardHeader>
                <CardContent class="space-y-3 text-sm text-muted-foreground">
                    <div class="flex items-start gap-3">
                        <ShieldAlert class="mt-0.5 size-4 shrink-0" />
                        <p>Use this page when a capture accidentally contains personal or sensitive information.</p>
                    </div>
                    <div class="flex items-start gap-3">
                        <Link2 class="mt-0.5 size-4 shrink-0" />
                        <p>Public share links keep working only while the report stays available.</p>
                    </div>
                </CardContent>
            </Card>
        </template>

        <Dialog :open="Boolean(deleteTarget)" @update:open="(next) => (!next ? closeDeleteDialog() : null)">
            <DialogContent
                :show-close-button="false"
                @interact-outside.prevent
            >
                <DialogHeader>
                    <DialogTitle>Delete capture from server?</DialogTitle>
                    <DialogDescription>
                        This removes the selected screenshot or recording from the workspace so it can no longer be reviewed or shared.
                    </DialogDescription>
                </DialogHeader>

                <div v-if="deleteTarget" class="rounded-md border bg-muted/20 px-4 py-3 text-sm">
                    <div class="font-medium">{{ deleteTarget.title }}</div>
                    <div class="mt-1 text-muted-foreground">{{ deleteTarget.summary || 'No summary attached.' }}</div>
                </div>

                <DialogFooter class="gap-2 sm:justify-end">
                    <Button variant="outline" :disabled="busy" @click="closeDeleteDialog">
                        Keep capture
                    </Button>
                    <Button variant="destructive" :disabled="busy" @click="deleteCapture">
                        Delete from server
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </AppShell>
</template>
