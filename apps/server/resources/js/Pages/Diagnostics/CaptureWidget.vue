<script setup>
import { computed, reactive, ref } from 'vue';
import { Head, Link } from '@inertiajs/vue3';
import { SnagCaptureClient } from '@snag/capture-core';
import GuestLayout from '@/Layouts/GuestLayout.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle2, ExternalLink, LoaderCircle, RadioTower, Upload, WandSparkles } from 'lucide-vue-next';

const props = defineProps({
    apiBaseUrl: {
        type: String,
        required: true,
    },
    docsUrl: {
        type: String,
        required: true,
    },
    prefillPublicKey: {
        type: String,
        default: '',
    },
});

const form = reactive({
    publicKey: props.prefillPublicKey,
    title: 'Checkout button does nothing',
    summary: 'Click on Pay now keeps the page idle and no confirmation state appears.',
    visibility: 'public',
    pageLabel: 'Storefront checkout',
});

const submitting = ref(false);
const failure = ref('');
const result = ref(null);
const requestLog = ref([]);

const currentOrigin = computed(() => {
    if (typeof window === 'undefined') {
        return new URL(props.apiBaseUrl).origin;
    }

    return window.location.origin;
});

const baseUrlPreview = computed(() => `${props.apiBaseUrl.replace(/\/+$/, '')}/api/v1/public/capture`);

const widgetChecklist = computed(() => [
    `Whitelist origin: ${currentOrigin.value}`,
    'Paste an active capture key from Settings -> Capture',
    'Click the embedded action to send a synthetic screenshot + debugger payload',
]);

const pushLog = (title, detail) => {
    requestLog.value = [
        {
            title,
            detail,
            at: new Date().toLocaleTimeString(),
        },
        ...requestLog.value,
    ].slice(0, 8);
};

const wrapText = (context, text, x, y, maxWidth, lineHeight) => {
    const words = text.split(/\s+/).filter(Boolean);
    let line = '';
    let currentY = y;

    for (const word of words) {
        const next = line === '' ? word : `${line} ${word}`;

        if (context.measureText(next).width > maxWidth && line !== '') {
            context.fillText(line, x, currentY);
            line = word;
            currentY += lineHeight;
            continue;
        }

        line = next;
    }

    if (line !== '') {
        context.fillText(line, x, currentY);
    }
};

const createSyntheticScreenshot = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;

    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error('Canvas 2D context is not available in this browser.');
    }

    context.fillStyle = '#f5f1ea';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = '#ffffff';
    context.strokeStyle = '#e7dccd';
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(56, 56, 1168, 608, 24);
    context.fill();
    context.stroke();

    context.fillStyle = '#1f1a16';
    context.font = '700 32px Arial';
    context.fillText(form.pageLabel, 96, 116);

    context.fillStyle = '#7b6f63';
    context.font = '400 20px Arial';
    context.fillText('Embedded Snag sandbox widget using the public capture API', 96, 152);

    context.fillStyle = '#fff9f3';
    context.strokeStyle = '#efc69a';
    context.beginPath();
    context.roundRect(96, 200, 720, 244, 18);
    context.fill();
    context.stroke();

    context.fillStyle = '#1f1a16';
    context.font = '700 24px Arial';
    context.fillText('Broken state being reported', 128, 246);

    context.fillStyle = '#7b6f63';
    context.font = '400 18px Arial';
    wrapText(context, form.summary, 128, 284, 656, 28);

    context.fillStyle = '#d96d21';
    context.beginPath();
    context.roundRect(128, 360, 186, 44, 10);
    context.fill();
    context.fillStyle = '#ffffff';
    context.font = '700 18px Arial';
    context.fillText('Pay now', 188, 389);

    context.fillStyle = '#fcedde';
    context.strokeStyle = '#efc69a';
    context.beginPath();
    context.roundRect(860, 164, 292, 380, 20);
    context.fill();
    context.stroke();

    context.fillStyle = '#1f1a16';
    context.font = '700 24px Arial';
    context.fillText('Snag widget', 892, 210);

    context.fillStyle = '#7b6f63';
    context.font = '400 18px Arial';
    context.fillText(`Visibility: ${form.visibility}`, 892, 250);
    context.fillText(`Origin: ${currentOrigin.value}`, 892, 284);

    context.fillStyle = '#1f1a16';
    context.font = '700 20px Arial';
    wrapText(context, form.title, 892, 336, 220, 26);

    context.fillStyle = '#7b6f63';
    context.font = '400 16px Arial';
    wrapText(context, form.summary, 892, 390, 220, 24);

    const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/png');
    });

    if (!blob) {
        throw new Error('Failed to serialize the synthetic screenshot.');
    }

    return blob;
};

const createDebuggerBlob = () =>
    new Blob([
        JSON.stringify({
            context: {
                url: typeof window === 'undefined' ? props.apiBaseUrl : window.location.href,
                title: form.pageLabel,
                viewport: {
                    width: typeof window === 'undefined' ? 1280 : window.innerWidth,
                    height: typeof window === 'undefined' ? 720 : window.innerHeight,
                },
            },
            actions: [
                { type: 'click', target: 'button.pay-now', label: 'Pay now' },
                { type: 'widget_opened', target: 'snag-sandbox-widget' },
            ],
            logs: [
                { level: 'error', message: 'checkout.submit timed out after 5s' },
                { level: 'info', message: 'snag sandbox generated a synthetic screenshot' },
            ],
            network_requests: [
                { method: 'POST', url: '/checkout', status: 504, duration_ms: 5120 },
            ],
        }, null, 2),
    ], { type: 'application/json' });

const submitWidgetReport = async () => {
    if (form.publicKey.trim() === '') {
        failure.value = 'Paste an active capture key before sending the sandbox report.';
        return;
    }

    submitting.value = true;
    failure.value = '';
    result.value = null;
    requestLog.value = [];

    const client = new SnagCaptureClient({
        baseUrl: props.apiBaseUrl,
    });

    try {
        pushLog('Issue create token', `${baseUrlPreview.value}/tokens`);
        const createToken = await client.issuePublicCaptureToken({
            public_key: form.publicKey.trim(),
            origin: currentOrigin.value,
            action: 'create',
        });

        pushLog('Create upload session', `${baseUrlPreview.value}/upload-sessions`);
        const session = await client.createPublicUploadSession({
            public_key: form.publicKey.trim(),
            capture_token: createToken.capture_token,
            origin: currentOrigin.value,
            media_kind: 'screenshot',
            meta: {
                source: 'diagnostics.capture-widget',
                sandbox: true,
                page_label: form.pageLabel,
            },
        });

        pushLog('Upload artifacts', `${session.artifacts.length} artifact instructions received`);
        await client.uploadArtifacts(session, [
            {
                kind: 'screenshot',
                body: await createSyntheticScreenshot(),
            },
            {
                kind: 'debugger',
                body: createDebuggerBlob(),
            },
        ]);

        pushLog('Issue finalize token', `${baseUrlPreview.value}/tokens`);
        const finalizeToken = await client.issuePublicCaptureToken({
            public_key: form.publicKey.trim(),
            origin: currentOrigin.value,
            action: 'finalize',
        });

        pushLog('Finalize report', `${baseUrlPreview.value}/finalize`);
        const finalize = await client.finalizePublicReport({
            public_key: form.publicKey.trim(),
            capture_token: finalizeToken.capture_token,
            upload_session_token: session.upload_session_token,
            finalize_token: session.finalize_token,
            title: form.title,
            summary: form.summary,
            visibility: form.visibility,
            origin: currentOrigin.value,
            meta: {
                submitted_from: 'diagnostics.capture-widget',
            },
        });

        result.value = finalize.report;
        pushLog('Completed', `Report status: ${finalize.report.status}`);
    } catch (error) {
        failure.value = error instanceof Error ? error.message : 'The sandbox request failed.';
        pushLog('Failed', failure.value);
    } finally {
        submitting.value = false;
    }
};
</script>

<template>
    <GuestLayout wide>
        <Head title="Public capture sandbox" />

        <div class="space-y-8">
            <div class="space-y-2">
                <h1 class="text-2xl font-semibold tracking-tight">Public capture sandbox</h1>
                <p class="max-w-3xl text-sm leading-6 text-muted-foreground">
                    This page behaves like an external website that embeds a Snag bug button. It uses the public capture API
                    directly, uploads a synthetic screenshot and debugger payload, and finalizes the report with your capture key.
                </p>
            </div>

            <Alert class="border-primary/20 bg-primary/5">
                <RadioTower class="size-4" />
                <AlertTitle>Whitelist this origin in your capture key</AlertTitle>
                <AlertDescription>
                    Add <span class="font-medium text-foreground">{{ currentOrigin }}</span> to allowed origins, then paste the
                    public key below. Read the full flow in
                    <a :href="docsUrl" class="font-medium text-primary underline underline-offset-4">capture docs</a>.
                </AlertDescription>
            </Alert>

            <div class="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
                <Card class="overflow-hidden">
                    <CardHeader class="border-b bg-muted/40">
                        <div class="flex items-center justify-between gap-4">
                            <div>
                                <CardTitle>{{ form.pageLabel }}</CardTitle>
                                <CardDescription>Sandbox storefront with an embedded “Report a problem” action.</CardDescription>
                            </div>
                            <Badge variant="outline">Synthetic capture</Badge>
                        </div>
                    </CardHeader>

                    <CardContent class="space-y-6 p-6">
                        <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                            <div class="space-y-4 rounded-xl border bg-muted/20 p-5">
                                <div class="space-y-1">
                                    <div class="text-sm font-medium">Broken checkout state</div>
                                    <p class="text-sm leading-6 text-muted-foreground">
                                        The fake page below mirrors the bug that the widget will report into Snag. The uploaded
                                        screenshot is generated from this state.
                                    </p>
                                </div>

                                <div class="rounded-lg border bg-background p-4">
                                    <div class="flex items-start justify-between gap-4">
                                        <div class="space-y-1">
                                            <div class="font-medium">Premium plan</div>
                                            <p class="text-sm text-muted-foreground">Seat upgrade for your workspace</p>
                                        </div>
                                        <Badge variant="outline">Timeout</Badge>
                                    </div>
                                    <Separator class="my-4" />
                                    <div class="space-y-3">
                                        <div class="flex items-center justify-between text-sm">
                                            <span class="text-muted-foreground">Monthly total</span>
                                            <span class="font-medium">$49</span>
                                        </div>
                                        <div class="flex items-center justify-between text-sm">
                                            <span class="text-muted-foreground">Payment status</span>
                                            <span class="font-medium text-amber-700">No confirmation returned</span>
                                        </div>
                                        <Button type="button" class="mt-2 w-full">Pay now</Button>
                                    </div>
                                </div>
                            </div>

                            <div class="rounded-xl border bg-background p-5">
                                <div class="space-y-1">
                                    <div class="font-medium">Embedded widget</div>
                                    <p class="text-sm leading-6 text-muted-foreground">
                                        This form calls the public capture endpoints directly through `@snag/capture-core`.
                                    </p>
                                </div>

                                <div class="mt-5 space-y-4">
                                    <div class="space-y-2">
                                        <Label for="sandbox-public-key">Capture key</Label>
                                        <Input
                                            id="sandbox-public-key"
                                            v-model="form.publicKey"
                                            type="text"
                                            placeholder="ck_..."
                                            data-testid="capture-widget-public-key"
                                        />
                                    </div>

                                    <div class="space-y-2">
                                        <Label for="sandbox-title">Bug title</Label>
                                        <Input id="sandbox-title" v-model="form.title" type="text" />
                                    </div>

                                    <div class="space-y-2">
                                        <Label for="sandbox-summary">Summary</Label>
                                        <Textarea id="sandbox-summary" v-model="form.summary" rows="4" />
                                    </div>

                                    <div class="space-y-2">
                                        <Label for="sandbox-visibility">Visibility</Label>
                                        <NativeSelect id="sandbox-visibility" v-model="form.visibility" class="w-full">
                                            <NativeSelectOption value="public">Public share link</NativeSelectOption>
                                            <NativeSelectOption value="organization">Organization only</NativeSelectOption>
                                        </NativeSelect>
                                    </div>

                                    <Button
                                        type="button"
                                        class="w-full justify-center"
                                        :disabled="submitting"
                                        data-testid="capture-widget-submit"
                                        @click="submitWidgetReport"
                                    >
                                        <LoaderCircle v-if="submitting" class="size-4 animate-spin" />
                                        <Upload v-else class="size-4" />
                                        <span>{{ submitting ? 'Sending sandbox capture' : 'Send report to Snag' }}</span>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                            <Card class="border-dashed">
                                <CardHeader>
                                    <CardTitle class="text-base">Checklist</CardTitle>
                                    <CardDescription>The page will only work when the capture key allows this browser origin.</CardDescription>
                                </CardHeader>
                                <CardContent class="space-y-3 text-sm text-muted-foreground">
                                    <div v-for="item in widgetChecklist" :key="item" class="flex items-start gap-2">
                                        <WandSparkles class="mt-0.5 size-4 text-primary" />
                                        <span>{{ item }}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card class="border-dashed">
                                <CardHeader>
                                    <CardTitle class="text-base">Endpoint preview</CardTitle>
                                    <CardDescription>The widget drives the same API flow documented for public embeds.</CardDescription>
                                </CardHeader>
                                <CardContent class="space-y-2 text-sm text-muted-foreground">
                                    <p>{{ baseUrlPreview }}/tokens</p>
                                    <p>{{ baseUrlPreview }}/upload-sessions</p>
                                    <p>{{ baseUrlPreview }}/finalize</p>
                                </CardContent>
                            </Card>
                        </div>
                    </CardContent>
                </Card>

                <div class="space-y-6">
                    <Card v-if="failure" class="border-destructive/40">
                        <CardHeader>
                            <CardTitle class="flex items-center gap-2 text-base text-destructive">
                                <AlertCircle class="size-4" />
                                <span>Request failed</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p class="text-sm leading-6 text-muted-foreground">{{ failure }}</p>
                        </CardContent>
                    </Card>

                    <Card v-if="result" class="border-primary/25">
                        <CardHeader>
                            <CardTitle class="flex items-center gap-2 text-base">
                                <CheckCircle2 class="size-4 text-primary" />
                                <span>Sandbox report created</span>
                            </CardTitle>
                            <CardDescription>The public capture flow completed and Snag returned a report payload.</CardDescription>
                        </CardHeader>
                        <CardContent class="space-y-4 text-sm text-muted-foreground">
                            <div class="flex items-center justify-between">
                                <span>Status</span>
                                <Badge variant="outline">{{ result.status }}</Badge>
                            </div>
                            <div class="space-y-2">
                                <a
                                    v-if="result.share_url"
                                    :href="result.share_url"
                                    class="inline-flex items-center gap-2 font-medium text-primary hover:underline"
                                >
                                    <span>Open public share</span>
                                    <ExternalLink class="size-4" />
                                </a>
                                <p v-else>Share URL is empty for the selected visibility.</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle class="text-base">API request log</CardTitle>
                            <CardDescription>Each step below is executed by the sandbox widget during submission.</CardDescription>
                        </CardHeader>
                        <CardContent class="space-y-3">
                            <div v-if="requestLog.length === 0" class="text-sm text-muted-foreground">
                                Start with a capture key and submit the widget to see the request sequence.
                            </div>
                            <div
                                v-for="entry in requestLog"
                                :key="`${entry.at}-${entry.title}`"
                                class="rounded-lg border px-3 py-3 text-sm"
                            >
                                <div class="flex items-center justify-between gap-3">
                                    <span class="font-medium text-foreground">{{ entry.title }}</span>
                                    <span class="text-xs text-muted-foreground">{{ entry.at }}</span>
                                </div>
                                <p class="mt-1 leading-6 text-muted-foreground">{{ entry.detail }}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Link :href="docsUrl" class="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                        <span>Open capture integration docs</span>
                        <ExternalLink class="size-4" />
                    </Link>
                </div>
            </div>
        </div>
    </GuestLayout>
</template>
