<script setup>
import { computed, reactive, ref, watch } from 'vue';
import axios from 'axios';
import { router } from '@inertiajs/vue3';
import { Copy, LoaderCircle, PencilLine, Plus, Trash2 } from 'lucide-vue-next';
import StatusBadge from '@/Shared/StatusBadge.vue';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Switch } from '@/Components/ui/switch';
import { Textarea } from '@/Components/ui/textarea';

const props = defineProps({
    widgets: {
        type: Array,
        default: () => [],
    },
    defaults: {
        type: Object,
        required: true,
    },
    scriptUrl: {
        type: String,
        required: true,
    },
    baseUrl: {
        type: String,
        required: true,
    },
    canManage: {
        type: Boolean,
        default: true,
    },
});

const saving = ref(false);
const actionWidgetId = ref(null);
const copiedWidgetId = ref(null);
const successMessage = ref('');
const failureMessage = ref('');
const editorOpen = ref(false);
const editorMode = ref('create');
const deleteTarget = ref(null);
const createDraftStorageKey = 'snag.website-widget.create-draft';
const createDraftTtlMs = 15 * 60 * 1000;

const cloneConfig = () => JSON.parse(JSON.stringify(props.defaults ?? {}));
const mergeConfig = (value = {}) => {
    const defaults = cloneConfig();

    return {
        ...defaults,
        ...value,
        launcher: {
            ...defaults.launcher,
            ...(value?.launcher ?? {}),
        },
        intro: {
            ...defaults.intro,
            ...(value?.intro ?? {}),
        },
        helper: {
            ...defaults.helper,
            ...(value?.helper ?? {}),
        },
        review: {
            ...defaults.review,
            ...(value?.review ?? {}),
        },
        success: {
            ...defaults.success,
            ...(value?.success ?? {}),
        },
        meta: {
            ...defaults.meta,
            ...(value?.meta ?? {}),
        },
        theme: {
            ...defaults.theme,
            ...(value?.theme ?? {}),
        },
    };
};

const form = reactive({
    id: null,
    publicId: '',
    name: '',
    status: 'active',
    allowedOrigins: '',
    config: mergeConfig(),
});

const refresh = () => {
    router.reload({
        only: ['websiteWidgets'],
        preserveScroll: true,
    });
};

const normalizeOrigins = (value) =>
    value
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);

const snippetFor = (widget) =>
    [
        `<script async src="${props.scriptUrl}" data-snag-widget="${widget.public_id}" data-snag-base-url="${props.baseUrl}">`,
        '</scr',
        'ipt>',
    ].join('');

const previewWidget = computed(() => ({
    public_id: form.publicId || 'ww_your_widget_id',
}));

const previewSnippet = computed(() => snippetFor(previewWidget.value));
const previewAccent = computed(() => form.config?.theme?.accent_color || '#d97706');
const previewMode = computed(() => {
    const requested = form.config?.theme?.mode || 'auto';

    if (requested !== 'auto') {
        return requested;
    }

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    return 'light';
});
const previewTheme = computed(() => (previewMode.value === 'dark'
    ? {
        surface: '#18181b',
        card: '#27272a',
        border: 'rgba(255, 255, 255, 0.12)',
        text: '#fafafa',
        muted: '#d4d4d8',
        mutedSurface: '#1f1f23',
    }
    : {
        surface: '#ffffff',
        card: '#fafaf9',
        border: 'rgba(24, 24, 27, 0.1)',
        text: '#18181b',
        muted: '#52525b',
        mutedSurface: '#f4f4f5',
    }));
const previewSurfaceStyle = computed(() => ({
    '--widget-preview-accent': previewAccent.value,
    '--widget-preview-surface': previewTheme.value.surface,
    '--widget-preview-card': previewTheme.value.card,
    '--widget-preview-border': previewTheme.value.border,
    '--widget-preview-text': previewTheme.value.text,
    '--widget-preview-muted': previewTheme.value.muted,
    '--widget-preview-muted-surface': previewTheme.value.mutedSurface,
}));
const previewIconLabel = computed(() => {
    switch (form.config?.theme?.icon_style) {
        case 'bug':
            return 'Bug';
        case 'feedback':
            return 'Feedback';
        default:
            return 'Camera';
    }
});
const widgetCards = computed(() => props.widgets ?? []);
const deleteDialogVisible = computed(() => Boolean(deleteTarget.value));

const resetMessages = () => {
    successMessage.value = '';
    failureMessage.value = '';
};

const resetForm = () => {
    form.id = null;
    form.publicId = '';
    form.name = '';
    form.status = 'active';
    form.allowedOrigins = '';
    form.config = mergeConfig();
};

const canUseSessionStorage = () => typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const clearCreateDraft = () => {
    if (!canUseSessionStorage()) {
        return;
    }

    window.sessionStorage.removeItem(createDraftStorageKey);
};

const persistCreateDraft = () => {
    if (!canUseSessionStorage() || editorMode.value !== 'create') {
        return;
    }

    try {
        window.sessionStorage.setItem(createDraftStorageKey, JSON.stringify({
            saved_at: Date.now(),
            form: {
                name: form.name,
                status: form.status,
                allowedOrigins: form.allowedOrigins,
                config: JSON.parse(JSON.stringify(form.config)),
            },
        }));
    } catch {
        // Ignore storage failures. The modal should still work even without draft persistence.
    }
};

const restoreCreateDraft = () => {
    if (!canUseSessionStorage()) {
        return false;
    }

    try {
        const rawDraft = window.sessionStorage.getItem(createDraftStorageKey);

        if (!rawDraft) {
            return false;
        }

        const draft = JSON.parse(rawDraft);

        if (
            typeof draft?.saved_at !== 'number'
            || Date.now() - draft.saved_at > createDraftTtlMs
            || typeof draft?.form !== 'object'
            || draft.form === null
        ) {
            clearCreateDraft();
            return false;
        }

        form.id = null;
        form.publicId = '';
        form.name = typeof draft.form.name === 'string' ? draft.form.name : '';
        form.status = draft.form.status === 'disabled' ? 'disabled' : 'active';
        form.allowedOrigins = typeof draft.form.allowedOrigins === 'string' ? draft.form.allowedOrigins : '';
        form.config = mergeConfig(draft.form.config ?? {});

        return true;
    } catch {
        clearCreateDraft();
        return false;
    }
};

const openCreateDialog = () => {
    resetMessages();
    editorMode.value = 'create';

    if (!restoreCreateDraft()) {
        resetForm();
    }

    editorOpen.value = true;
};

const openEditDialog = (widget) => {
    resetMessages();
    editorMode.value = 'edit';
    form.id = widget.id;
    form.publicId = widget.public_id;
    form.name = widget.name;
    form.status = widget.status;
    form.allowedOrigins = (widget.allowed_origins ?? []).join('\n');
    form.config = mergeConfig(widget.config ?? {});
    editorOpen.value = true;
};

const closeDeleteDialog = () => {
    deleteTarget.value = null;
};

const saveWidget = async () => {
    saving.value = true;
    resetMessages();

    const payload = {
        name: form.name,
        status: form.status,
        allowed_origins: normalizeOrigins(form.allowedOrigins),
        config: JSON.parse(JSON.stringify(form.config)),
    };

    try {
        if (editorMode.value === 'create') {
            await axios.post(route('website-widgets.store'), payload);
            successMessage.value = 'Widget created.';
            clearCreateDraft();
        } else {
            await axios.patch(route('website-widgets.update', form.id), payload);
            successMessage.value = 'Widget updated.';
        }

        editorOpen.value = false;
        refresh();
    } catch (error) {
        failureMessage.value = error?.response?.data?.message ?? 'Unable to save widget.';
    } finally {
        saving.value = false;
    }
};

const copySnippet = async (widget) => {
    resetMessages();

    try {
        await navigator.clipboard.writeText(snippetFor(widget));
        copiedWidgetId.value = widget.id;
        successMessage.value = 'Widget snippet copied.';
    } catch (error) {
        failureMessage.value = 'Unable to copy widget snippet.';
    }
};

const toggleStatus = async (widget) => {
    actionWidgetId.value = widget.id;
    resetMessages();

    try {
        await axios.patch(route('website-widgets.update', widget.id), {
            status: widget.status === 'active' ? 'disabled' : 'active',
        });

        successMessage.value = 'Widget updated.';
        refresh();
    } catch (error) {
        failureMessage.value = error?.response?.data?.message ?? 'Unable to save widget.';
    } finally {
        actionWidgetId.value = null;
    }
};

const destroyWidget = async () => {
    if (!deleteTarget.value) {
        return;
    }

    actionWidgetId.value = deleteTarget.value.id;
    resetMessages();

    try {
        await axios.delete(route('website-widgets.destroy', deleteTarget.value.id));
        successMessage.value = 'Widget deleted.';
        closeDeleteDialog();
        refresh();
    } catch (error) {
        failureMessage.value = error?.response?.data?.message ?? 'Unable to delete widget.';
    } finally {
        actionWidgetId.value = null;
    }
};

watch(editorOpen, (isOpen) => {
    if (isOpen && editorMode.value === 'create') {
        persistCreateDraft();
    }
});

watch(form, () => {
    if (!editorOpen.value || editorMode.value !== 'create') {
        return;
    }

    persistCreateDraft();
}, { deep: true });
</script>

<template>
    <div class="space-y-4">
        <Alert v-if="successMessage" class="border-primary/25 bg-primary/10 text-foreground">
            <AlertDescription>{{ successMessage }}</AlertDescription>
        </Alert>

        <Alert v-if="failureMessage" class="border-rose-200 bg-rose-50 text-rose-950">
            <AlertDescription>{{ failureMessage }}</AlertDescription>
        </Alert>

        <Card class="rounded-lg shadow-none">
            <CardHeader class="border-b pb-4">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div class="space-y-1">
                        <CardTitle>Website widgets</CardTitle>
                        <CardDescription>
                            Create a copy-paste bug report widget for any site in this workspace. Each widget gets its own linked capture key and domain allowlist.
                        </CardDescription>
                    </div>

                    <Button
                        data-testid="website-widget-create"
                        :disabled="!canManage"
                        class="rounded-md"
                        @click="openCreateDialog"
                    >
                        <Plus class="size-4" />
                        Create widget
                    </Button>
                </div>
            </CardHeader>
            <CardContent class="pt-4">
                <div v-if="widgetCards.length" class="grid gap-4 xl:grid-cols-2">
                    <Card
                        v-for="widget in widgetCards"
                        :key="widget.id"
                        class="rounded-lg border shadow-none"
                        :data-testid="`website-widget-card-${widget.id}`"
                    >
                        <CardHeader class="border-b pb-4">
                            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div class="space-y-2">
                                    <div class="flex flex-wrap items-center gap-2">
                                        <CardTitle>{{ widget.name }}</CardTitle>
                                        <StatusBadge v-if="widget.status === 'active'" value="active" />
                                        <Badge v-else variant="outline" class="rounded-md">Disabled</Badge>
                                    </div>
                                    <CardDescription>{{ widget.allowed_origins.length }} allowed domains</CardDescription>
                                </div>

                                <div class="flex flex-wrap gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        class="rounded-md"
                                        :data-testid="`website-widget-copy-${widget.id}`"
                                        @click="copySnippet(widget)"
                                    >
                                        <Copy class="size-4" />
                                        {{ copiedWidgetId === widget.id ? 'Copied' : 'Copy snippet' }}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        class="rounded-md"
                                        :data-testid="`website-widget-edit-${widget.id}`"
                                        @click="openEditDialog(widget)"
                                    >
                                        <PencilLine class="size-4" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        class="rounded-md"
                                        :data-testid="`website-widget-toggle-${widget.id}`"
                                        :disabled="actionWidgetId === widget.id"
                                        @click="toggleStatus(widget)"
                                    >
                                        <LoaderCircle v-if="actionWidgetId === widget.id" class="size-4 animate-spin" />
                                        <template v-else>{{ widget.status === 'active' ? 'Disable' : 'Enable' }}</template>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        class="rounded-md text-rose-700 hover:text-rose-700"
                                        :data-testid="`website-widget-delete-${widget.id}`"
                                        @click="deleteTarget = widget"
                                    >
                                        <Trash2 class="size-4" />
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent class="space-y-4 pt-4">
                            <div class="grid gap-4 lg:grid-cols-2">
                                <div class="space-y-2">
                                    <Label :for="`website-widget-public-id-${widget.id}`">Public widget id</Label>
                                    <Input :id="`website-widget-public-id-${widget.id}`" :model-value="widget.public_id" readonly />
                                </div>
                                <div class="space-y-2">
                                    <Label :for="`website-widget-created-at-${widget.id}`">Created</Label>
                                    <Input
                                        :id="`website-widget-created-at-${widget.id}`"
                                        :model-value="widget.created_at || 'Just now'"
                                        readonly
                                    />
                                </div>
                            </div>

                            <div class="space-y-2">
                                <Label :for="`website-widget-snippet-${widget.id}`">Install snippet</Label>
                                <Textarea
                                    :id="`website-widget-snippet-${widget.id}`"
                                    :model-value="snippetFor(widget)"
                                    rows="3"
                                    readonly
                                />
                            </div>

                            <div class="space-y-2">
                                <div class="text-sm font-medium">Allowed domains</div>
                                <div class="rounded-md border bg-muted/30 p-3">
                                    <div class="space-y-1 text-sm text-muted-foreground">
                                        <div v-for="origin in widget.allowed_origins" :key="origin">{{ origin }}</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div v-else class="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No website widgets have been created yet. Add the snippet to your site, then visitors can send screenshot-only bug reports without signing in.
                </div>
            </CardContent>
        </Card>

        <Dialog v-model:open="editorOpen">
            <DialogContent class="max-h-[92vh] overflow-hidden p-0 sm:max-w-6xl" data-testid="website-widget-dialog">
                <div class="flex max-h-[92vh] flex-col">
                    <DialogHeader class="border-b px-6 py-5">
                        <DialogTitle>{{ editorMode === 'create' ? 'Create website widget' : 'Edit website widget' }}</DialogTitle>
                        <DialogDescription>
                            Give support or product teams one embed per site, then keep the domains and copy plain enough for non-technical setup.
                        </DialogDescription>
                    </DialogHeader>

                    <div
                        class="min-h-0 flex-1 overflow-y-auto px-6 py-6"
                        data-testid="website-widget-dialog-scroll"
                    >
                        <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
                            <form id="website-widget-form" class="space-y-4" @submit.prevent="saveWidget">
                        <Card class="rounded-lg shadow-none">
                            <CardHeader class="pb-4">
                                <CardTitle class="text-base">Setup</CardTitle>
                                <CardDescription>
                                    Create one widget per site or product area, then limit exactly which domains may load it.
                                </CardDescription>
                            </CardHeader>
                            <CardContent class="space-y-4">
                                <div class="space-y-2">
                                    <Label for="website-widget-name">Widget name</Label>
                                    <Input id="website-widget-name" v-model="form.name" type="text" required />
                                </div>

                                <div class="space-y-2">
                                    <Label for="website-widget-origins">Allowed domains</Label>
                                    <Textarea
                                        id="website-widget-origins"
                                        v-model="form.allowedOrigins"
                                        rows="4"
                                        required
                                        placeholder="https://app.example.com&#10;https://checkout.example.com"
                                    />
                                    <p class="text-sm text-muted-foreground">
                                        One origin per line. Only these sites can load and submit through this widget.
                                    </p>
                                </div>

                                <div class="grid gap-4 lg:grid-cols-2">
                                    <div class="space-y-2">
                                        <Label for="website-widget-site-label">Site label</Label>
                                        <Input id="website-widget-site-label" v-model="form.config.meta.site_label" type="text" />
                                    </div>

                                    <div class="space-y-2">
                                        <Label for="website-widget-support-team-name">Support team name</Label>
                                        <Input id="website-widget-support-team-name" v-model="form.config.meta.support_team_name" type="text" />
                                    </div>
                                </div>

                                <div class="flex items-end rounded-lg border px-4 py-3">
                                    <div class="flex w-full items-center justify-between gap-4">
                                        <div class="space-y-1">
                                            <div class="text-sm font-medium">Enabled</div>
                                            <p class="text-sm text-muted-foreground">Disabled widgets stop bootstrapping immediately.</p>
                                        </div>
                                        <Switch
                                            :model-value="form.status === 'active'"
                                            @update:model-value="(value) => (form.status = value ? 'active' : 'disabled')"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card class="rounded-lg shadow-none">
                            <CardHeader class="pb-4">
                                <CardTitle class="text-base">Visitor copy</CardTitle>
                                <CardDescription>
                                    Use plain text only. HTML, CSS, and scripts are not allowed here.
                                </CardDescription>
                            </CardHeader>
                            <CardContent class="space-y-4">
                                <div class="space-y-2">
                                    <Label for="website-widget-launcher-label">Launcher label</Label>
                                    <Input id="website-widget-launcher-label" v-model="form.config.launcher.label" type="text" />
                                </div>

                                <div class="grid gap-4 lg:grid-cols-2">
                                    <div class="space-y-2">
                                        <Label for="website-widget-intro-title">Intro title</Label>
                                        <Input id="website-widget-intro-title" v-model="form.config.intro.title" type="text" />
                                    </div>

                                    <div class="space-y-2">
                                        <Label for="website-widget-helper-text">Helper bubble</Label>
                                        <Input id="website-widget-helper-text" v-model="form.config.helper.text" type="text" />
                                    </div>
                                </div>

                                <div class="space-y-2">
                                    <Label for="website-widget-intro-body">Intro body</Label>
                                    <Textarea id="website-widget-intro-body" v-model="form.config.intro.body" rows="4" />
                                </div>

                                <div class="grid gap-4 lg:grid-cols-2">
                                    <div class="space-y-2">
                                        <Label for="website-widget-continue-label">Continue label</Label>
                                        <Input id="website-widget-continue-label" v-model="form.config.intro.continue_label" type="text" />
                                    </div>

                                    <div class="space-y-2">
                                        <Label for="website-widget-intro-cancel-label">Cancel label</Label>
                                        <Input id="website-widget-intro-cancel-label" v-model="form.config.intro.cancel_label" type="text" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card class="rounded-lg shadow-none">
                            <CardHeader class="pb-4">
                                <CardTitle class="text-base">Review and success</CardTitle>
                                <CardDescription>
                                    Keep the review step short and obvious so visitors can send a screenshot without learning a new flow.
                                </CardDescription>
                            </CardHeader>
                            <CardContent class="space-y-4">
                                <div class="grid gap-4 lg:grid-cols-2">
                                    <div class="space-y-2">
                                        <Label for="website-widget-review-title">Review title</Label>
                                        <Input id="website-widget-review-title" v-model="form.config.review.title" type="text" />
                                    </div>

                                    <div class="space-y-2">
                                        <Label for="website-widget-send-label">Send label</Label>
                                        <Input id="website-widget-send-label" v-model="form.config.review.send_label" type="text" />
                                    </div>
                                </div>

                                <div class="space-y-2">
                                    <Label for="website-widget-review-body">Review helper</Label>
                                    <Textarea id="website-widget-review-body" v-model="form.config.review.body" rows="3" />
                                </div>

                                <div class="space-y-2">
                                    <Label for="website-widget-review-placeholder">Review placeholder</Label>
                                    <Textarea id="website-widget-review-placeholder" v-model="form.config.review.placeholder" rows="2" />
                                </div>

                                <div class="grid gap-4 lg:grid-cols-2">
                                    <div class="space-y-2">
                                        <Label for="website-widget-review-cancel-label">Review cancel label</Label>
                                        <Input id="website-widget-review-cancel-label" v-model="form.config.review.cancel_label" type="text" />
                                    </div>

                                    <div class="space-y-2">
                                        <Label for="website-widget-retake-label">Retake label</Label>
                                        <Input id="website-widget-retake-label" v-model="form.config.review.retake_label" type="text" />
                                    </div>
                                </div>

                                <div class="grid gap-4 lg:grid-cols-2">
                                    <div class="space-y-2">
                                        <Label for="website-widget-success-title">Success title</Label>
                                        <Input id="website-widget-success-title" v-model="form.config.success.title" type="text" />
                                    </div>

                                    <div class="space-y-2">
                                        <Label for="website-widget-done-label">Done label</Label>
                                        <Input id="website-widget-done-label" v-model="form.config.success.done_label" type="text" />
                                    </div>
                                </div>

                                <div class="space-y-2">
                                    <Label for="website-widget-success-body">Success body</Label>
                                    <Textarea id="website-widget-success-body" v-model="form.config.success.body" rows="3" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card class="rounded-lg shadow-none">
                            <CardHeader class="pb-4">
                                <CardTitle class="text-base">Theme and spacing</CardTitle>
                                <CardDescription>
                                    Keep the widget fixed to the bottom-right corner, then tune the visual style with safe theme tokens.
                                </CardDescription>
                            </CardHeader>
                            <CardContent class="space-y-4">
                                <div class="grid gap-4 lg:grid-cols-[140px_minmax(0,1fr)]">
                                    <div class="space-y-2">
                                        <Label for="website-widget-accent-color">Accent color</Label>
                                        <input
                                            id="website-widget-accent-color"
                                            v-model="form.config.theme.accent_color"
                                            class="h-10 w-full rounded-md border border-input bg-background p-1"
                                            type="color"
                                        />
                                    </div>

                                    <div class="space-y-2">
                                        <Label for="website-widget-accent-color-text">Accent color hex</Label>
                                        <Input id="website-widget-accent-color-text" v-model="form.config.theme.accent_color" type="text" />
                                    </div>
                                </div>

                                <div class="grid gap-4 lg:grid-cols-2">
                                    <div class="space-y-2">
                                        <Label for="website-widget-theme-mode">Theme mode</Label>
                                        <select
                                            id="website-widget-theme-mode"
                                            v-model="form.config.theme.mode"
                                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        >
                                            <option value="auto">Auto</option>
                                            <option value="light">Light</option>
                                            <option value="dark">Dark</option>
                                        </select>
                                    </div>

                                    <div class="space-y-2">
                                        <Label for="website-widget-icon-style">Icon style</Label>
                                        <select
                                            id="website-widget-icon-style"
                                            v-model="form.config.theme.icon_style"
                                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        >
                                            <option value="camera">Camera</option>
                                            <option value="bug">Bug</option>
                                            <option value="feedback">Feedback</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="grid gap-4 lg:grid-cols-2">
                                    <div class="space-y-2">
                                        <Label for="website-widget-offset-y">Bottom offset</Label>
                                        <Input id="website-widget-offset-y" v-model.number="form.config.theme.offset_y" type="number" min="12" max="64" />
                                    </div>

                                    <div class="space-y-2">
                                        <Label for="website-widget-offset-x">Right offset</Label>
                                        <Input id="website-widget-offset-x" v-model.number="form.config.theme.offset_x" type="number" min="12" max="64" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </form>

                    <div class="space-y-4">
                        <div class="rounded-lg border p-4">
                            <div class="text-sm font-medium">Live preview</div>
                            <p class="mt-1 text-sm text-muted-foreground">
                                This is a simple preview of the launcher, intro step, and review state your visitors will see.
                            </p>
                        </div>

                        <div
                            class="rounded-lg border p-4"
                            data-testid="website-widget-preview"
                            :style="previewSurfaceStyle"
                        >
                            <div
                                class="rounded-lg border p-4"
                                :style="{
                                    backgroundColor: 'var(--widget-preview-surface)',
                                    borderColor: 'var(--widget-preview-border)',
                                    color: 'var(--widget-preview-text)',
                                }"
                            >
                                <div class="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em]" :style="{ color: 'var(--widget-preview-muted)' }">
                                    <Badge variant="outline">{{ form.config.meta.site_label }}</Badge>
                                    <span>{{ form.config.meta.support_team_name }}</span>
                                </div>
                                <div class="mt-4 text-sm font-medium">{{ form.config.intro.title }}</div>
                                <p class="mt-2 text-sm leading-6" :style="{ color: 'var(--widget-preview-muted)' }">
                                    {{ form.config.intro.body }}
                                </p>
                                <div class="mt-4 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        class="inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium text-white"
                                        :style="{ backgroundColor: previewAccent }"
                                        disabled
                                    >
                                        {{ form.config.intro.continue_label }}
                                    </button>
                                    <button
                                        type="button"
                                        class="inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium"
                                        :style="{ borderColor: 'var(--widget-preview-border)', color: 'var(--widget-preview-text)' }"
                                        disabled
                                    >
                                        {{ form.config.intro.cancel_label }}
                                    </button>
                                </div>
                            </div>

                            <div
                                class="mt-4 rounded-lg border p-4"
                                :style="{
                                    backgroundColor: 'var(--widget-preview-card)',
                                    borderColor: 'var(--widget-preview-border)',
                                    color: 'var(--widget-preview-text)',
                                }"
                            >
                                <div class="text-sm font-medium">{{ form.config.review.title }}</div>
                                <p class="mt-2 text-sm leading-6" :style="{ color: 'var(--widget-preview-muted)' }">
                                    {{ form.config.review.body }}
                                </p>
                                <div class="mt-3 rounded-md border px-3 py-2 text-sm" :style="{ borderColor: 'var(--widget-preview-border)', color: 'var(--widget-preview-muted)' }">
                                    {{ form.config.review.placeholder }}
                                </div>
                                <div class="mt-3 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        class="inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium text-white"
                                        :style="{ backgroundColor: previewAccent }"
                                        disabled
                                    >
                                        {{ form.config.review.send_label }}
                                    </button>
                                    <button
                                        type="button"
                                        class="inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium"
                                        :style="{ borderColor: 'var(--widget-preview-border)', color: 'var(--widget-preview-text)' }"
                                        disabled
                                    >
                                        {{ form.config.review.retake_label }}
                                    </button>
                                </div>
                            </div>

                            <div
                                class="mt-4 rounded-lg border p-4"
                                :style="{
                                    backgroundColor: 'var(--widget-preview-surface)',
                                    borderColor: 'var(--widget-preview-border)',
                                    color: 'var(--widget-preview-text)',
                                }"
                            >
                                <div class="text-sm font-medium">{{ form.config.success.title }}</div>
                                <p class="mt-2 text-sm leading-6" :style="{ color: 'var(--widget-preview-muted)' }">
                                    {{ form.config.success.body }}
                                </p>
                            </div>

                            <div class="mt-4 rounded-lg border border-dashed p-3 text-xs leading-5 text-muted-foreground">
                                <div class="font-medium">Preview follows the selected theme and bottom-right offsets.</div>
                                <div class="mt-2 flex flex-wrap gap-2">
                                    <Badge variant="outline">{{ previewMode === 'dark' ? 'Dark' : 'Light' }}</Badge>
                                    <Badge variant="outline">Bottom offset: {{ form.config.theme.offset_y }}px</Badge>
                                    <Badge variant="outline">Right offset: {{ form.config.theme.offset_x }}px</Badge>
                                </div>
                            </div>

                            <div class="mt-6 flex justify-end">
                                <button
                                    type="button"
                                    class="inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-white"
                                    :style="{ backgroundColor: previewAccent }"
                                    disabled
                                >
                                    <span>{{ previewIconLabel }}</span>
                                    {{ form.config.launcher.label }}
                                </button>
                            </div>
                        </div>

                        <div class="space-y-2 rounded-lg border p-4">
                            <Label for="website-widget-preview-snippet">Install snippet</Label>
                            <Textarea
                                id="website-widget-preview-snippet"
                                :model-value="previewSnippet"
                                rows="4"
                                readonly
                            />
                        </div>
                        </div>
                    </div>
                    </div>

                    <DialogFooter class="gap-2 border-t px-6 py-4 sm:justify-end">
                        <Button variant="outline" @click="editorOpen = false">Cancel</Button>
                        <Button form="website-widget-form" type="submit" :disabled="saving">
                            <LoaderCircle v-if="saving" class="size-4 animate-spin" />
                            {{ editorMode === 'create' ? 'Create widget' : 'Save widget' }}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>

        <Dialog :open="deleteDialogVisible" @update:open="(next) => (!next ? closeDeleteDialog() : null)">
            <DialogContent class="sm:max-w-md" :show-close-button="false" @interact-outside.prevent>
                <DialogHeader>
                    <DialogTitle>Delete this website widget?</DialogTitle>
                    <DialogDescription>
                        The widget embed stops working immediately. Existing reports stay in Snag, but this snippet id will stop bootstrapping.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter class="gap-2 sm:justify-end">
                    <Button variant="outline" @click="closeDeleteDialog">Cancel</Button>
                    <Button variant="destructive" :disabled="actionWidgetId === deleteTarget?.id" @click="destroyWidget">
                        <LoaderCircle v-if="actionWidgetId === deleteTarget?.id" class="size-4 animate-spin" />
                        Delete widget
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>
