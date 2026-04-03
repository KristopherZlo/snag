<script setup>
import { computed, reactive, ref } from 'vue';
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

const cloneConfig = () => JSON.parse(JSON.stringify(props.defaults ?? {}));

const form = reactive({
    id: null,
    publicId: '',
    name: '',
    status: 'active',
    allowedOrigins: '',
    config: cloneConfig(),
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
    form.config = cloneConfig();
};

const openCreateDialog = () => {
    resetMessages();
    editorMode.value = 'create';
    resetForm();
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
    form.config = JSON.parse(JSON.stringify(widget.config ?? cloneConfig()));
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
            <DialogContent class="sm:max-w-5xl" data-testid="website-widget-dialog">
                <DialogHeader>
                    <DialogTitle>{{ editorMode === 'create' ? 'Create website widget' : 'Edit website widget' }}</DialogTitle>
                    <DialogDescription>
                        Give support or product teams one embed per site, then keep the domains and copy plain enough for non-technical setup.
                    </DialogDescription>
                </DialogHeader>

                <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
                    <form id="website-widget-form" class="space-y-4" @submit.prevent="saveWidget">
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
                                <Label for="website-widget-launcher-label">Launcher label</Label>
                                <Input id="website-widget-launcher-label" v-model="form.config.launcher.label" type="text" />
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
                        </div>

                        <div class="space-y-2">
                            <Label for="website-widget-intro-title">Intro title</Label>
                            <Input id="website-widget-intro-title" v-model="form.config.intro.title" type="text" />
                        </div>

                        <div class="space-y-2">
                            <Label for="website-widget-intro-body">Intro body</Label>
                            <Textarea id="website-widget-intro-body" v-model="form.config.intro.body" rows="5" />
                        </div>
                    </form>

                    <div class="space-y-4">
                        <div class="rounded-lg border p-4">
                            <div class="text-sm font-medium">Live preview</div>
                            <p class="mt-1 text-sm text-muted-foreground">
                                This is a simple preview of the launcher and intro modal your visitors will see.
                            </p>
                        </div>

                        <div class="rounded-lg border bg-muted/30 p-4" data-testid="website-widget-preview">
                            <div class="rounded-lg border bg-background p-4">
                                <div class="text-sm font-medium">{{ form.config.intro.title }}</div>
                                <p class="mt-2 text-sm leading-6 text-muted-foreground">
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
                                        disabled
                                    >
                                        {{ form.config.intro.cancel_label }}
                                    </button>
                                </div>
                            </div>

                            <div class="mt-6 flex justify-end">
                                <button
                                    type="button"
                                    class="inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-white"
                                    :style="{ backgroundColor: previewAccent }"
                                    disabled
                                >
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

                <DialogFooter class="gap-2 sm:justify-end">
                    <Button variant="outline" @click="editorOpen = false">Cancel</Button>
                    <Button form="website-widget-form" type="submit" :disabled="saving">
                        <LoaderCircle v-if="saving" class="size-4 animate-spin" />
                        {{ editorMode === 'create' ? 'Create widget' : 'Save widget' }}
                    </Button>
                </DialogFooter>
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
