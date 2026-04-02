<script setup>
import { computed, reactive, ref } from 'vue';
import { Head, Link } from '@inertiajs/vue3';
import { SnagCaptureClient } from '@snag/capture-core';
import GuestLayout from '@/Layouts/GuestLayout.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle2, ExternalLink, LoaderCircle, Package, ShieldCheck, ShoppingCart, Truck, Wind } from 'lucide-vue-next';

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
    title: 'Checkout stalls on air reservation',
    summary: 'Clicking Reserve air keeps the order in pending state and no confirmation screen appears.',
    visibility: 'public',
    pageLabel: 'Air Supply storefront',
});

const catalogItems = [
    {
        name: 'Starter Breeze',
        description: 'A desk-sized jar for teams that need a ceremonial inhale before another standup.',
        volume: '250 ml sealed jar',
        price: 'EUR 12',
        note: 'Packed today',
    },
    {
        name: 'Mountain Reserve',
        description: 'Higher-altitude air for dramatic demos, pricing calls, and suspiciously calm retros.',
        volume: '1 liter bottle',
        price: 'EUR 39',
        note: 'Best seller',
    },
    {
        name: 'Boardroom Refill',
        description: 'Bulk air for meetings that somehow consume all oxygen in under twenty minutes.',
        volume: '5 liter canister',
        price: 'EUR 89',
        note: 'Ships tomorrow',
    },
];

const storefrontStats = [
    { label: 'sealed lots today', value: '3' },
    { label: 'checkout bugs expected', value: '1' },
    { label: 'real API calls on submit', value: '4' },
];

const fulfillmentNotes = [
    {
        title: 'Tamper-sealed packaging',
        description: 'Every fake order arrives with a label, batch marker, and a lot of confidence.',
        icon: Package,
    },
    {
        title: 'Same-day dispatch',
        description: 'The mock cart is ready immediately so you can trigger the failing checkout path.',
        icon: Truck,
    },
    {
        title: 'Origin restrictions',
        description: 'The widget only works when the current origin is allowed by the capture key.',
        icon: ShieldCheck,
    },
];

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
    `Allow origin ${currentOrigin.value} in the capture key`,
    'Paste an active public capture key from Settings -> Capture',
    'Submit the embedded support widget to send a synthetic screenshot and debugger blob',
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

    context.fillStyle = '#fffdfa';
    context.strokeStyle = '#ddd4c5';
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(40, 40, 1200, 640, 20);
    context.fill();
    context.stroke();

    context.fillStyle = '#211c17';
    context.font = '700 30px sans-serif';
    context.fillText('Air Supply Co.', 80, 96);

    context.fillStyle = '#6c6258';
    context.font = '400 18px sans-serif';
    context.fillText('Reserve sealed atmosphere for people who ran out of room air.', 80, 128);

    context.fillStyle = '#f3ece2';
    context.beginPath();
    context.roundRect(80, 172, 760, 428, 18);
    context.fill();

    context.fillStyle = '#211c17';
    context.font = '700 24px sans-serif';
    context.fillText('Catalog', 112, 214);

    const productOffsets = [0, 232, 464];

    for (const [index, item] of catalogItems.entries()) {
        const offsetX = 112 + productOffsets[index];

        context.fillStyle = '#fffdfa';
        context.strokeStyle = '#ddd4c5';
        context.beginPath();
        context.roundRect(offsetX, 248, 200, 300, 14);
        context.fill();
        context.stroke();

        context.fillStyle = '#e8ded0';
        context.beginPath();
        context.roundRect(offsetX + 16, 264, 168, 110, 12);
        context.fill();

        context.fillStyle = '#211c17';
        context.font = '700 20px sans-serif';
        wrapText(context, item.name, offsetX + 16, 410, 168, 24);

        context.fillStyle = '#6c6258';
        context.font = '400 15px sans-serif';
        wrapText(context, item.description, offsetX + 16, 458, 168, 22);

        context.fillStyle = '#211c17';
        context.font = '700 16px sans-serif';
        context.fillText(item.price, offsetX + 16, 518);
    }

    context.fillStyle = '#fff7ee';
    context.strokeStyle = '#e2bc8f';
    context.beginPath();
    context.roundRect(876, 172, 320, 428, 18);
    context.fill();
    context.stroke();

    context.fillStyle = '#211c17';
    context.font = '700 24px sans-serif';
    context.fillText('Checkout support', 908, 214);

    context.fillStyle = '#6c6258';
    context.font = '400 16px sans-serif';
    wrapText(context, 'Embedded Snag widget using the public capture API.', 908, 252, 256, 22);
    context.fillText(`Origin: ${currentOrigin.value}`, 908, 304);
    context.fillText(`Visibility: ${form.visibility}`, 908, 332);

    context.fillStyle = '#211c17';
    context.font = '700 18px sans-serif';
    wrapText(context, form.title, 908, 388, 256, 24);

    context.fillStyle = '#6c6258';
    context.font = '400 15px sans-serif';
    wrapText(context, form.summary, 908, 430, 256, 22);

    context.fillStyle = '#c96d28';
    context.beginPath();
    context.roundRect(908, 526, 192, 44, 10);
    context.fill();
    context.fillStyle = '#ffffff';
    context.font = '700 16px sans-serif';
    context.fillText('Send report to Snag', 948, 554);

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
                { type: 'click', target: 'button.reserve-air', label: 'Reserve air' },
                { type: 'widget_opened', target: 'snag-storefront-support' },
            ],
            logs: [
                { level: 'error', message: 'checkout.reserve timed out after 5s' },
                { level: 'info', message: 'diagnostics storefront generated a synthetic screenshot' },
            ],
            network_requests: [
                { method: 'POST', url: '/checkout/reserve-air', status: 504, duration_ms: 5120 },
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
        <Head title="Air storefront capture demo" />

        <div class="overflow-hidden rounded-lg border bg-background">
            <header class="border-b bg-background px-6 py-4">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div class="space-y-1">
                        <div class="text-lg font-semibold tracking-tight">Air Supply Co.</div>
                        <p class="max-w-2xl text-sm leading-6 text-muted-foreground">
                            Mock storefront for selling bottled air. The catalog is fake, but the embedded Snag public capture flow is real.
                        </p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2 text-sm">
                        <Badge variant="outline">Demo storefront</Badge>
                        <Badge variant="outline">Public capture API</Badge>
                        <Link :href="docsUrl" class="inline-flex items-center gap-2 font-medium text-primary hover:underline">
                            <span>Capture docs</span>
                            <ExternalLink class="size-4" />
                        </Link>
                    </div>
                </div>
            </header>

            <main class="grid 2xl:grid-cols-[minmax(0,1fr)_360px]">
                <div class="space-y-8 border-b 2xl:border-r 2xl:border-b-0">
                    <section class="border-b bg-muted/30 px-6 py-6">
                        <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
                            <div class="space-y-5">
                                <div class="space-y-3">
                                    <h1 class="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                                        Reserve sealed air for meetings that already used up all the normal air.
                                    </h1>
                                    <p class="max-w-2xl text-sm leading-7 text-muted-foreground">
                                        This page behaves like a public storefront. Use the checkout support widget on the right to send a real
                                        public capture report into Snag when the reservation flow breaks.
                                    </p>
                                </div>

                                <div class="flex flex-wrap gap-3">
                                    <Button type="button">Reserve starter breeze</Button>
                                    <Button type="button" variant="outline" as-child>
                                        <a href="#checkout-support">Report storefront bug</a>
                                    </Button>
                                </div>

                                <div class="grid gap-3 sm:grid-cols-3">
                                    <div
                                        v-for="item in storefrontStats"
                                        :key="item.label"
                                        class="rounded-md border bg-background px-4 py-4"
                                    >
                                        <div class="text-xl font-semibold text-foreground">{{ item.value }}</div>
                                        <div class="mt-1 text-sm text-muted-foreground">{{ item.label }}</div>
                                    </div>
                                </div>
                            </div>

                            <div class="rounded-md border bg-background p-5">
                                <div class="flex items-center justify-between gap-3">
                                    <div>
                                        <div class="text-sm font-medium text-foreground">Today&apos;s cart</div>
                                        <p class="mt-1 text-sm text-muted-foreground">One bottle of mountain air, one guaranteed checkout problem.</p>
                                    </div>
                                    <ShoppingCart class="size-5 text-muted-foreground" />
                                </div>

                                <Separator class="my-4" />

                                <div class="space-y-3 text-sm">
                                    <div class="flex items-center justify-between gap-3">
                                        <span class="text-muted-foreground">Mountain Reserve</span>
                                        <span class="font-medium text-foreground">EUR 39</span>
                                    </div>
                                    <div class="flex items-center justify-between gap-3">
                                        <span class="text-muted-foreground">Glass bottle deposit</span>
                                        <span class="font-medium text-foreground">EUR 4</span>
                                    </div>
                                    <div class="flex items-center justify-between gap-3">
                                        <span class="text-muted-foreground">Dispatch</span>
                                        <span class="font-medium text-foreground">Same day</span>
                                    </div>
                                </div>

                                <Separator class="my-4" />

                                <div class="flex items-center justify-between gap-3 text-sm">
                                    <span class="font-medium text-foreground">Expected total</span>
                                    <span class="text-base font-semibold text-foreground">EUR 43</span>
                                </div>

                                <Button type="button" class="mt-5 w-full">Reserve this batch</Button>
                                <p class="mt-3 text-sm leading-6 text-muted-foreground">
                                    The button is intentionally boring. The failure path is the interesting part.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section class="px-6">
                        <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                            <div class="space-y-1">
                                <h2 class="text-xl font-semibold tracking-tight text-foreground">Current catalog</h2>
                                <p class="text-sm leading-6 text-muted-foreground">
                                    Three fake products make the storefront feel real enough to test the embed.
                                </p>
                            </div>
                            <div class="text-sm text-muted-foreground">All products are fictional. The capture requests are not.</div>
                        </div>

                        <div class="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                            <article
                                v-for="item in catalogItems"
                                :key="item.name"
                                class="rounded-md border bg-background p-4"
                            >
                                <div class="rounded-md border bg-muted/40 p-4">
                                    <div class="text-sm font-medium text-foreground">{{ item.note }}</div>
                                    <div class="mt-8 flex items-end justify-between gap-3">
                                        <Wind class="size-8 text-primary" />
                                        <span class="text-sm text-muted-foreground">{{ item.volume }}</span>
                                    </div>
                                </div>

                                <div class="mt-4 space-y-3">
                                    <div class="flex items-start justify-between gap-3">
                                        <h3 class="text-base font-medium text-foreground">{{ item.name }}</h3>
                                        <span class="text-sm font-semibold text-foreground">{{ item.price }}</span>
                                    </div>
                                    <p class="text-sm leading-6 text-muted-foreground">{{ item.description }}</p>
                                    <Button type="button" variant="outline" size="sm">Reserve</Button>
                                </div>
                            </article>
                        </div>
                    </section>

                    <section class="grid gap-4 px-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                        <div class="rounded-md border bg-background p-5">
                            <h2 class="text-lg font-semibold tracking-tight text-foreground">How fulfillment works</h2>
                            <div class="mt-5 space-y-4">
                                <div
                                    v-for="item in fulfillmentNotes"
                                    :key="item.title"
                                    class="flex items-start gap-3"
                                >
                                    <component :is="item.icon" class="mt-0.5 size-4 text-muted-foreground" />
                                    <div class="space-y-1">
                                        <div class="text-sm font-medium text-foreground">{{ item.title }}</div>
                                        <p class="text-sm leading-6 text-muted-foreground">{{ item.description }}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="rounded-md border bg-background p-5">
                            <h2 class="text-lg font-semibold tracking-tight text-foreground">Developer notes</h2>
                            <p class="mt-2 text-sm leading-6 text-muted-foreground">
                                The support widget uses the same documented public capture flow as an external site integration.
                            </p>

                            <div class="mt-5 space-y-3 rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
                                <div v-for="item in widgetChecklist" :key="item" class="flex items-start gap-2">
                                    <CheckCircle2 class="mt-0.5 size-4 text-primary" />
                                    <span>{{ item }}</span>
                                </div>
                            </div>

                            <div class="mt-5 space-y-2 text-sm text-muted-foreground">
                                <div>{{ baseUrlPreview }}/tokens</div>
                                <div>{{ baseUrlPreview }}/upload-sessions</div>
                                <div>{{ baseUrlPreview }}/finalize</div>
                            </div>
                        </div>
                    </section>

                    <section class="border-t px-6 py-6">
                        <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                            <div class="space-y-1">
                                <h2 class="text-xl font-semibold tracking-tight text-foreground">Sandbox request log</h2>
                                <p class="text-sm leading-6 text-muted-foreground">
                                    Every entry below comes from the embedded widget using the public capture API client.
                                </p>
                            </div>
                            <Badge variant="outline">Live request sequence</Badge>
                        </div>

                        <div class="mt-5 space-y-3">
                            <div v-if="requestLog.length === 0" class="rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground">
                                Submit the checkout support widget to see each request step appear here.
                            </div>
                            <div
                                v-for="entry in requestLog"
                                :key="`${entry.at}-${entry.title}`"
                                class="rounded-md border px-4 py-4"
                            >
                                <div class="flex items-center justify-between gap-3">
                                    <span class="font-medium text-foreground">{{ entry.title }}</span>
                                    <span class="text-xs text-muted-foreground">{{ entry.at }}</span>
                                </div>
                                <p class="mt-2 text-sm leading-6 text-muted-foreground">{{ entry.detail }}</p>
                            </div>
                        </div>
                    </section>
                </div>

                <aside id="checkout-support" class="space-y-5 bg-muted/20 px-6 py-6">
                    <div class="rounded-md border bg-background p-5">
                        <div class="space-y-1">
                            <h2 class="text-lg font-semibold tracking-tight text-foreground">Checkout support</h2>
                            <p class="text-sm leading-6 text-muted-foreground">
                                This is the embedded Snag widget for the storefront. It submits a real public capture report.
                            </p>
                        </div>

                        <Alert class="mt-4 border-primary/20 bg-primary/5">
                            <ShieldCheck class="size-4" />
                            <AlertTitle>Origin must be whitelisted</AlertTitle>
                            <AlertDescription>
                                Add <span class="font-medium text-foreground">{{ currentOrigin }}</span> to the capture key and use an active
                                public key below.
                            </AlertDescription>
                        </Alert>

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
                                <Wind v-else class="size-4" />
                                <span>{{ submitting ? 'Sending sandbox capture' : 'Send report to Snag' }}</span>
                            </Button>
                        </div>
                    </div>

                    <div v-if="failure" class="rounded-md border border-destructive/40 bg-background p-5">
                        <div class="flex items-center gap-2 text-sm font-medium text-destructive">
                            <AlertCircle class="size-4" />
                            <span>Request failed</span>
                        </div>
                        <p class="mt-3 text-sm leading-6 text-muted-foreground">{{ failure }}</p>
                    </div>

                    <div v-if="result" class="rounded-md border border-primary/25 bg-background p-5">
                        <div class="flex items-center gap-2 text-sm font-medium text-foreground">
                            <CheckCircle2 class="size-4 text-primary" />
                            <span>Sandbox report created</span>
                        </div>
                        <p class="mt-2 text-sm leading-6 text-muted-foreground">
                            The public capture flow completed and Snag returned a report payload.
                        </p>

                        <div class="mt-4 flex items-center justify-between gap-3 text-sm">
                            <span class="text-muted-foreground">Status</span>
                            <Badge variant="outline">{{ result.status }}</Badge>
                        </div>

                        <div class="mt-4">
                            <a
                                v-if="result.share_url"
                                :href="result.share_url"
                                class="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                            >
                                <span>Open public share</span>
                                <ExternalLink class="size-4" />
                            </a>
                            <p v-else class="text-sm leading-6 text-muted-foreground">
                                Share URL is empty for the selected visibility.
                            </p>
                        </div>
                    </div>

                    <div class="rounded-md border bg-background p-5">
                        <div class="text-sm font-medium text-foreground">Expected debugger payload</div>
                        <p class="mt-2 text-sm leading-6 text-muted-foreground">
                            The widget submits a synthetic screenshot, a debugger JSON blob, and the metadata needed to finalize the report.
                        </p>
                    </div>
                </aside>
            </main>
        </div>
    </GuestLayout>
</template>
