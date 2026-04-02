<script setup>
import { computed, reactive, ref } from 'vue';
import { Head, Link } from '@inertiajs/vue3';
import { SnagCaptureClient } from '@snag/capture-core';
import heroLandscapeUrl from './air-storefront-hero.svg';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
    AlertCircle,
    CheckCircle2,
    CloudSun,
    ExternalLink,
    LoaderCircle,
    MapPinned,
    Package,
    Search,
    ShieldCheck,
    Sparkles,
    TimerReset,
    Wind,
    X,
} from 'lucide-vue-next';

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
    title: 'Reserve batch never confirms',
    summary: 'Clicking Reserve this batch leaves the order pending and the confirmation screen never loads.',
    visibility: 'public',
    pageLabel: 'Air Supply Co. storefront',
});

const supportPanelOpen = ref(false);
const submitting = ref(false);
const failure = ref('');
const result = ref(null);
const requestLog = ref([]);

const collections = [
    {
        name: 'Coastal Dawn',
        region: 'Sea line reserve',
        price: 'EUR 24',
        copy: 'Bright, salty air bottled before the city wakes up.',
        metric: '4.8',
        background: 'linear-gradient(160deg, #86aab4 0%, #cfe0dc 55%, #eff4ef 100%)',
    },
    {
        name: 'Summit Noon',
        region: 'Cold ridge batch',
        price: 'EUR 31',
        copy: 'Thin mountain air with a clean, dry finish.',
        metric: '4.9',
        background: 'linear-gradient(160deg, #8ea28a 0%, #c3d0bf 52%, #edf2ea 100%)',
    },
    {
        name: 'Pine Window',
        region: 'Forest reserve',
        price: 'EUR 27',
        copy: 'Green, resin-heavy air for rooms that forgot the concept of ventilation.',
        metric: '4.7',
        background: 'linear-gradient(160deg, #6d8b74 0%, #b6c3b0 54%, #edf0ea 100%)',
    },
    {
        name: 'Studio Reset',
        region: 'Late-night refill',
        price: 'EUR 19',
        copy: 'Neutral office air for teams that want a clean restart between calls.',
        metric: '4.6',
        background: 'linear-gradient(160deg, #a2a5ad 0%, #d8dadf 58%, #f5f5f3 100%)',
    },
];

const trustPoints = [
    {
        title: 'Origin notes on every bottle',
        copy: 'Every batch ships with altitude, time sealed, and handling notes.',
        icon: MapPinned,
    },
    {
        title: 'One checkout for all reserves',
        copy: 'Reserve single bottles, office refills, or mixed packs in one order flow.',
        icon: Package,
    },
    {
        title: 'Support that understands the bug',
        copy: 'The embedded Snag widget sends a real screenshot and debugger payload when checkout breaks.',
        icon: ShieldCheck,
    },
];

const proofStats = [
    { value: '12k', label: 'sealed bottles shipped' },
    { value: '9 yrs', label: 'pretending air needs luxury packaging' },
    { value: '24/7', label: 'support for broken reservation flows' },
];

const packageHighlights = [
    {
        title: 'Morning Room Reset',
        copy: 'A soft starter batch for teams opening laptops before opening windows.',
        accent: '#d5e1db',
        icon: CloudSun,
    },
    {
        title: 'Pitch Deck Recovery',
        copy: 'Sharper air for afternoons that turned into six straight presentation rehearsals.',
        accent: '#cfd8e2',
        icon: Sparkles,
    },
];

const purchaseSteps = [
    {
        step: '01',
        title: 'Choose a reserve',
        copy: 'Pick coastal, mountain, forest, or neutral studio air based on the state of the room.',
    },
    {
        step: '02',
        title: 'Reserve the batch',
        copy: 'The mock checkout behaves like a public storefront and is ideal for testing the embed path.',
    },
    {
        step: '03',
        title: 'Report the failure',
        copy: 'If checkout stalls, open the support widget and send the broken state into Snag.',
    },
];

const currentOrigin = computed(() => {
    if (typeof window === 'undefined') {
        return new URL(props.apiBaseUrl).origin;
    }

    return window.location.origin;
});

const baseUrlPreview = computed(() => `${props.apiBaseUrl.replace(/\/+$/, '')}/api/v1/public/capture`);

const pushLog = (title, detail) => {
    requestLog.value = [
        {
            title,
            detail,
            at: new Date().toLocaleTimeString(),
        },
        ...requestLog.value,
    ].slice(0, 6);
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

    context.fillStyle = '#c9d7db';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = '#f8f7f3';
    context.strokeStyle = '#d9d5cd';
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(52, 42, 1176, 636, 22);
    context.fill();
    context.stroke();

    context.fillStyle = '#ffffff';
    context.beginPath();
    context.roundRect(84, 98, 782, 302, 20);
    context.fill();

    const sky = context.createLinearGradient(0, 98, 0, 400);
    sky.addColorStop(0, '#c8d8dd');
    sky.addColorStop(1, '#95b0b6');
    context.fillStyle = sky;
    context.beginPath();
    context.roundRect(84, 98, 782, 302, 20);
    context.fill();

    context.fillStyle = '#5f7f8d';
    context.beginPath();
    context.moveTo(572, 98);
    context.lineTo(866, 98);
    context.lineTo(866, 400);
    context.lineTo(664, 400);
    context.quadraticCurveTo(704, 234, 572, 98);
    context.fill();

    context.fillStyle = '#6f8e5f';
    context.beginPath();
    context.moveTo(84, 286);
    context.quadraticCurveTo(252, 212, 412, 262);
    context.quadraticCurveTo(624, 324, 866, 278);
    context.lineTo(866, 400);
    context.lineTo(84, 400);
    context.closePath();
    context.fill();

    context.fillStyle = '#91ac68';
    context.beginPath();
    context.moveTo(84, 340);
    context.quadraticCurveTo(272, 274, 462, 338);
    context.quadraticCurveTo(664, 410, 866, 344);
    context.lineTo(866, 400);
    context.lineTo(84, 400);
    context.closePath();
    context.fill();

    context.fillStyle = '#ffffff';
    context.font = '700 88px sans-serif';
    context.fillText('INHALE', 132, 272);

    context.font = '400 20px sans-serif';
    wrapText(
        context,
        'Curated air from coastlines, hills, and cold office mornings.',
        136,
        314,
        460,
        28,
    );

    context.fillStyle = '#fbfaf6';
    context.strokeStyle = '#ddd7cb';
    context.beginPath();
    context.roundRect(896, 98, 290, 244, 18);
    context.fill();
    context.stroke();

    context.fillStyle = '#162127';
    context.font = '700 26px sans-serif';
    context.fillText('Checkout support', 928, 146);
    context.font = '400 18px sans-serif';
    context.fillStyle = '#655b50';
    wrapText(context, `Origin: ${currentOrigin.value}`, 928, 192, 220, 24);
    wrapText(context, form.title, 928, 248, 220, 24);
    wrapText(context, form.summary, 928, 304, 220, 24);

    context.fillStyle = '#112033';
    context.beginPath();
    context.roundRect(928, 358, 208, 42, 10);
    context.fill();
    context.fillStyle = '#ffffff';
    context.font = '700 16px sans-serif';
    context.fillText('Send report to Snag', 970, 385);

    const cardXs = [84, 280, 476, 672];

    for (const [index, item] of collections.entries()) {
        const x = cardXs[index];

        context.fillStyle = '#ffffff';
        context.strokeStyle = '#ddd7cb';
        context.beginPath();
        context.roundRect(x, 454, 172, 174, 16);
        context.fill();
        context.stroke();

        context.fillStyle = ['#9bb6be', '#a9b39c', '#90a48f', '#b7bbc2'][index];
        context.beginPath();
        context.roundRect(x + 14, 468, 144, 88, 12);
        context.fill();

        context.fillStyle = '#162127';
        context.font = '700 18px sans-serif';
        context.fillText(item.name, x + 14, 584);
        context.font = '400 15px sans-serif';
        context.fillStyle = '#655b50';
        context.fillText(item.region, x + 14, 608);
    }

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
                { type: 'click', target: 'button.reserve-batch', label: 'Reserve this batch' },
                { type: 'widget_opened', target: 'air-storefront-support' },
            ],
            logs: [
                { level: 'error', message: 'checkout.reserve-batch timed out after 5s' },
                { level: 'info', message: 'air storefront generated a synthetic screenshot' },
            ],
            network_requests: [
                { method: 'POST', url: '/checkout/reserve-batch', status: 504, duration_ms: 5120 },
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
    <div class="min-h-screen bg-[#c6d4d9] px-4 py-5 text-[#17212a] md:px-6 lg:px-8">
        <Head title="Air Supply storefront demo" />

        <div class="mx-auto max-w-[1320px]">
            <div class="overflow-hidden rounded-[18px] border border-[#d7d5cf] bg-[#f8f7f3] shadow-[0_18px_50px_rgba(73,91,99,0.12)]">
                <header class="border-b border-[#dfddd6] px-5 py-4 md:px-8">
                    <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div class="flex flex-wrap items-center gap-6">
                            <div class="flex items-center gap-3">
                                <div class="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#13233a] text-white">
                                    <Wind class="size-4" />
                                </div>
                                <div class="text-lg font-semibold tracking-[-0.03em]">Air Supply Co.</div>
                            </div>

                            <nav class="hidden items-center gap-5 text-sm text-[#49525b] lg:flex">
                                <a href="#collections" class="transition-colors hover:text-[#0f1f33]">Collections</a>
                                <a href="#why-air" class="transition-colors hover:text-[#0f1f33]">Why us</a>
                                <a href="#packages" class="transition-colors hover:text-[#0f1f33]">Packages</a>
                                <a href="#process" class="transition-colors hover:text-[#0f1f33]">How it works</a>
                            </nav>
                        </div>

                        <div class="flex flex-col gap-3 md:flex-row md:items-center">
                            <div class="relative min-w-0 flex-1 md:w-[320px]">
                                <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#6c737a]" />
                                <Input
                                    type="text"
                                    value="Search by climate, mood, or altitude"
                                    readonly
                                    class="h-10 border-[#d6d6d0] bg-white pl-10 text-[#697078] shadow-none"
                                />
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                class="border-[#d0d0ca] bg-white text-[#13233a] hover:bg-[#f4f3ef]"
                                data-testid="capture-widget-open"
                                @click="supportPanelOpen = true"
                            >
                                Report checkout issue
                            </Button>

                            <Button type="button" class="bg-[#13233a] text-white hover:bg-[#0e1a2b]">
                                Reserve now
                            </Button>
                        </div>
                    </div>
                </header>

                <main class="space-y-8 px-5 py-5 md:px-8 md:py-8">
                    <section class="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_330px]">
                        <div class="relative overflow-hidden rounded-[18px] border border-[#c9d4d5] bg-[#d5e0e2]">
                            <img :src="heroLandscapeUrl" alt="Air landscape" class="h-[420px] w-full object-cover" />
                            <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,31,36,0.58)_0%,rgba(17,31,36,0.28)_36%,rgba(17,31,36,0.04)_66%)]" />

                            <div class="absolute left-0 top-0 w-full p-6 md:p-8">
                                <div class="flex items-start justify-between gap-4">
                                    <Badge class="border-0 bg-white/88 text-[#102033]">Batch 24 / bottled this week</Badge>
                                    <div class="hidden rounded-full bg-white/82 px-3 py-1 text-sm font-medium text-[#13233a] md:block">
                                        Limited release
                                    </div>
                                </div>
                            </div>

                            <div class="absolute bottom-0 left-0 w-full p-6 md:p-8">
                                <div class="max-w-[560px]">
                                    <div class="text-[clamp(3.2rem,11vw,6.8rem)] font-semibold leading-none tracking-[-0.08em] text-white">
                                        INHALE
                                    </div>
                                    <p class="mt-4 max-w-[520px] text-sm leading-7 text-white/88 md:text-[15px]">
                                        Curated air lots from coastlines, hills, and cold morning rooftops. Reserve a sealed batch for teams
                                        that need a cleaner reset than another espresso.
                                    </p>
                                    <div class="mt-6 flex flex-wrap gap-3">
                                        <Button type="button" class="bg-white text-[#13233a] hover:bg-white/92">
                                            Shop collections
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            class="border-white/38 bg-white/10 text-white hover:bg-white/16"
                                            @click="supportPanelOpen = true"
                                        >
                                            Open support widget
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="space-y-4">
                            <div class="rounded-[18px] border border-[#d8d4cb] bg-white p-5">
                                <div class="flex items-center justify-between gap-3">
                                    <div>
                                        <div class="text-base font-semibold tracking-[-0.02em]">Today&apos;s cart</div>
                                        <p class="mt-1 text-sm leading-6 text-[#5f655f]">
                                            One bottle of mountain air, one glass deposit, and one suspicious checkout timeout.
                                        </p>
                                    </div>
                                    <Badge class="border-[#d3d0c9] bg-[#f5f3ef] text-[#13233a]">Popular order</Badge>
                                </div>

                                <Separator class="my-4 bg-[#ebe8e2]" />

                                <div class="space-y-3 text-sm">
                                    <div class="flex items-center justify-between gap-3">
                                        <span class="text-[#5f655f]">Summit Noon</span>
                                        <span class="font-semibold text-[#17212a]">EUR 31</span>
                                    </div>
                                    <div class="flex items-center justify-between gap-3">
                                        <span class="text-[#5f655f]">Bottle deposit</span>
                                        <span class="font-semibold text-[#17212a]">EUR 4</span>
                                    </div>
                                    <div class="flex items-center justify-between gap-3">
                                        <span class="text-[#5f655f]">Dispatch</span>
                                        <span class="font-semibold text-[#17212a]">Same day</span>
                                    </div>
                                </div>

                                <Separator class="my-4 bg-[#ebe8e2]" />

                                <div class="flex items-center justify-between gap-3">
                                    <span class="text-sm font-medium text-[#17212a]">Expected total</span>
                                    <span class="text-xl font-semibold tracking-[-0.03em] text-[#17212a]">EUR 35</span>
                                </div>

                                <Button type="button" class="mt-5 w-full bg-[#13233a] text-white hover:bg-[#0e1a2b]">
                                    Reserve this batch
                                </Button>
                            </div>

                            <div class="rounded-[18px] border border-[#d8d4cb] bg-[#e4eaee] p-5">
                                <div class="text-base font-semibold tracking-[-0.02em]">Need to test the embed?</div>
                                <p class="mt-2 text-sm leading-6 text-[#4f5862]">
                                    The checkout support widget uses the real public capture API. It uploads a synthetic screenshot, debugger
                                    payload, and finalizes the report in Snag.
                                </p>

                                <div class="mt-4 flex flex-wrap gap-2">
                                    <Badge class="border-[#c7d1d7] bg-white/80 text-[#13233a]">Public capture API</Badge>
                                    <Badge class="border-[#c7d1d7] bg-white/80 text-[#13233a]">{{ currentOrigin }}</Badge>
                                </div>

                                <div class="mt-5 flex flex-wrap gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        class="border-[#bfc8ce] bg-white text-[#13233a] hover:bg-[#f4f7f8]"
                                        @click="supportPanelOpen = true"
                                    >
                                        Open widget
                                    </Button>
                                    <Link :href="docsUrl" class="inline-flex items-center gap-2 text-sm font-medium text-[#13233a] hover:underline">
                                        <span>Read capture docs</span>
                                        <ExternalLink class="size-4" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section id="why-air" class="grid gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                        <div class="space-y-5">
                            <div class="space-y-3">
                                <h1 class="text-[clamp(1.9rem,5vw,2.8rem)] font-semibold leading-tight tracking-[-0.05em]">
                                    Why teams buy bottled air from us instead of trusting whatever is left in the room.
                                </h1>
                                <p class="max-w-[560px] text-sm leading-7 text-[#54606a] md:text-[15px]">
                                    Air Supply Co. treats atmosphere like a premium material. We package coastal brightness, cold ridge quiet,
                                    and neutral studio resets for offices, shoots, and teams that need a change of air without leaving the desk.
                                </p>
                            </div>

                            <div class="flex flex-wrap gap-2">
                                <Badge class="border-[#d6d2c9] bg-[#f4f2ec] text-[#13233a]">Tracked origin</Badge>
                                <Badge class="border-[#d6d2c9] bg-[#f4f2ec] text-[#13233a]">Same-day dispatch</Badge>
                                <Badge class="border-[#d6d2c9] bg-[#f4f2ec] text-[#13233a]">Snag support widget</Badge>
                            </div>
                        </div>

                        <div class="grid gap-4 md:grid-cols-3">
                            <article
                                v-for="item in trustPoints"
                                :key="item.title"
                                class="rounded-[16px] border border-[#d7d5cf] bg-white p-5"
                            >
                                <div class="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#e7ebef] text-[#13233a]">
                                    <component :is="item.icon" class="size-5" />
                                </div>
                                <div class="mt-4 text-base font-semibold tracking-[-0.02em]">{{ item.title }}</div>
                                <p class="mt-2 text-sm leading-6 text-[#57616a]">{{ item.copy }}</p>
                            </article>
                        </div>
                    </section>

                    <section class="grid gap-4 md:grid-cols-3">
                        <div
                            v-for="item in proofStats"
                            :key="item.label"
                            class="rounded-[16px] border border-[#d8d5cf] bg-white px-5 py-6 text-center"
                        >
                            <div class="text-[1.75rem] font-semibold tracking-[-0.04em] text-[#17212a]">{{ item.value }}</div>
                            <div class="mt-2 text-sm leading-6 text-[#5d646b]">{{ item.label }}</div>
                        </div>
                    </section>

                    <section id="collections" class="rounded-[18px] border border-[#d7d7d0] bg-[#e5eaee] px-5 py-6 md:px-6">
                        <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <div class="text-[1.65rem] font-semibold tracking-[-0.04em]">Top reserves</div>
                                <p class="mt-2 max-w-[560px] text-sm leading-6 text-[#55606a]">
                                    Four atmosphere batches for different rooms, moods, and levels of oxygen-related desperation.
                                </p>
                            </div>

                            <Button type="button" variant="outline" class="border-[#c5ced5] bg-white text-[#13233a] hover:bg-[#f3f6f8]">
                                View all reserves
                            </Button>
                        </div>

                        <div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <article
                                v-for="item in collections"
                                :key="item.name"
                                class="overflow-hidden rounded-[16px] border border-[#d7d5cf] bg-white"
                            >
                                <div class="p-4">
                                    <div class="h-[160px] rounded-[14px]" :style="{ background: item.background }"></div>
                                </div>

                                <div class="space-y-3 px-4 pb-4">
                                    <div class="flex items-start justify-between gap-3">
                                        <div>
                                            <h2 class="text-base font-semibold tracking-[-0.02em]">{{ item.name }}</h2>
                                            <div class="mt-1 text-sm text-[#5f655f]">{{ item.region }}</div>
                                        </div>
                                        <span class="text-sm font-semibold text-[#17212a]">{{ item.price }}</span>
                                    </div>

                                    <p class="text-sm leading-6 text-[#58616a]">{{ item.copy }}</p>

                                    <div class="flex items-center justify-between gap-3 text-sm">
                                        <span class="text-[#58616a]">Customer score</span>
                                        <span class="font-medium text-[#17212a]">{{ item.metric }}/5</span>
                                    </div>
                                </div>
                            </article>
                        </div>
                    </section>

                    <section id="packages" class="grid gap-4 lg:grid-cols-[320px_repeat(2,minmax(0,1fr))]">
                        <article class="rounded-[18px] border border-[#d7d5cf] bg-[#d5dee6] p-6">
                            <div class="text-[1.55rem] font-semibold tracking-[-0.04em] text-[#17212a]">Signature packs</div>
                            <p class="mt-3 text-sm leading-7 text-[#4f5a65]">
                                Bundled atmospheres for different working conditions, from morning standups to late-night launch prep.
                            </p>
                            <Button type="button" class="mt-6 bg-[#13233a] text-white hover:bg-[#0e1a2b]">
                                Browse all packs
                            </Button>
                        </article>

                        <article
                            v-for="item in packageHighlights"
                            :key="item.title"
                            class="overflow-hidden rounded-[18px] border border-[#d7d5cf] bg-white"
                        >
                            <div class="h-[220px] p-5" :style="{ background: `linear-gradient(160deg, ${item.accent} 0%, #f5f6f2 100%)` }">
                                <div class="flex h-12 w-12 items-center justify-center rounded-[14px] bg-white/70 text-[#13233a]">
                                    <component :is="item.icon" class="size-6" />
                                </div>
                            </div>
                            <div class="space-y-3 p-5">
                                <div class="text-xl font-semibold tracking-[-0.04em] text-[#17212a]">{{ item.title }}</div>
                                <p class="text-sm leading-7 text-[#57616a]">{{ item.copy }}</p>
                            </div>
                        </article>
                    </section>

                    <section id="process" class="rounded-[18px] border border-[#d8d5cf] bg-white px-5 py-6 md:px-6">
                        <div class="max-w-[640px]">
                            <div class="text-[1.7rem] font-semibold tracking-[-0.04em] text-[#17212a]">Ordering air is as easy as 1-2-3.</div>
                            <p class="mt-2 text-sm leading-7 text-[#58616a]">
                                The flow is intentionally simple so the support widget is the interesting part when something breaks.
                            </p>
                        </div>

                        <div class="mt-6 grid gap-4 md:grid-cols-3">
                            <article
                                v-for="item in purchaseSteps"
                                :key="item.step"
                                class="rounded-[16px] border border-[#e2dfd8] bg-[#fbfaf6] p-5"
                            >
                                <div class="text-sm font-semibold tracking-[0.18em] text-[#61717f]">{{ item.step }}</div>
                                <div class="mt-4 text-lg font-semibold tracking-[-0.03em] text-[#17212a]">{{ item.title }}</div>
                                <p class="mt-2 text-sm leading-7 text-[#58616a]">{{ item.copy }}</p>
                            </article>
                        </div>
                    </section>
                </main>

                <footer class="border-t border-[#e0ddd7] px-5 py-5 md:px-8">
                    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div class="text-base font-semibold tracking-[-0.03em] text-[#17212a]">Air Supply Co.</div>
                            <p class="mt-1 text-sm text-[#5b636a]">A polished demo storefront with a real Snag public capture embed.</p>
                        </div>

                        <div class="flex flex-wrap items-center gap-4 text-sm text-[#53606a]">
                            <a href="#collections" class="hover:text-[#13233a]">Collections</a>
                            <a href="#packages" class="hover:text-[#13233a]">Packages</a>
                            <a href="#process" class="hover:text-[#13233a]">How it works</a>
                            <Link :href="docsUrl" class="inline-flex items-center gap-2 font-medium text-[#13233a] hover:underline">
                                <span>Capture docs</span>
                                <ExternalLink class="size-4" />
                            </Link>
                        </div>
                    </div>
                </footer>
            </div>
        </div>

        <div class="fixed bottom-5 right-5 z-40">
            <Button
                type="button"
                class="h-12 rounded-full bg-[#13233a] px-5 text-white shadow-[0_12px_28px_rgba(19,35,58,0.24)] hover:bg-[#0e1a2b]"
                @click="supportPanelOpen = true"
            >
                <Sparkles class="size-4" />
                <span>Support widget</span>
            </Button>
        </div>

        <transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
        >
            <div
                v-if="supportPanelOpen"
                class="fixed inset-0 z-50 bg-[#13181d]/38 px-4 py-4 backdrop-blur-[2px]"
                @click.self="supportPanelOpen = false"
            >
                <div class="ml-auto flex h-full w-full max-w-[430px] flex-col overflow-hidden rounded-[18px] border border-[#d6d0c6] bg-[#fbfaf6] shadow-[0_24px_60px_rgba(35,44,52,0.22)]">
                    <div class="flex items-start justify-between gap-4 border-b border-[#e4ded2] px-5 py-5">
                        <div>
                            <div class="text-lg font-semibold tracking-[-0.03em] text-[#17212a]">Checkout support</div>
                            <p class="mt-1 text-sm leading-6 text-[#5d666f]">
                                This embedded widget submits a real public capture report into Snag.
                            </p>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            class="border-[#ddd6cb] bg-white text-[#13233a] hover:bg-[#f5f3ee]"
                            @click="supportPanelOpen = false"
                        >
                            <X class="size-4" />
                        </Button>
                    </div>

                    <div class="flex-1 space-y-5 overflow-y-auto px-5 py-5">
                        <div class="rounded-[16px] border border-[#ead7bb] bg-[#fff7eb] p-4">
                            <div class="flex items-start gap-3">
                                <div class="mt-0.5 flex h-9 w-9 items-center justify-center rounded-[12px] bg-white text-[#13233a]">
                                    <ShieldCheck class="size-4" />
                                </div>
                                <div class="space-y-1">
                                    <div class="text-sm font-semibold text-[#17212a]">Origin must be whitelisted</div>
                                    <p class="text-sm leading-6 text-[#64594b]">
                                        Add <span class="font-medium text-[#17212a]">{{ currentOrigin }}</span> to your capture key before you
                                        submit.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div class="space-y-4">
                            <div class="space-y-2">
                                <Label for="sandbox-public-key">Capture key</Label>
                                <Input
                                    id="sandbox-public-key"
                                    v-model="form.publicKey"
                                    type="text"
                                    placeholder="ck_..."
                                    class="border-[#d7d4cd] bg-white"
                                    data-testid="capture-widget-public-key"
                                />
                            </div>

                            <div class="space-y-2">
                                <Label for="sandbox-title">Bug title</Label>
                                <Input id="sandbox-title" v-model="form.title" type="text" class="border-[#d7d4cd] bg-white" />
                            </div>

                            <div class="space-y-2">
                                <Label for="sandbox-summary">Summary</Label>
                                <Textarea id="sandbox-summary" v-model="form.summary" rows="4" class="border-[#d7d4cd] bg-white" />
                            </div>

                            <div class="space-y-2">
                                <Label for="sandbox-visibility">Visibility</Label>
                                <NativeSelect id="sandbox-visibility" v-model="form.visibility" class="w-full border-[#d7d4cd] bg-white">
                                    <NativeSelectOption value="public">Public share link</NativeSelectOption>
                                    <NativeSelectOption value="organization">Organization only</NativeSelectOption>
                                </NativeSelect>
                            </div>

                            <Button
                                type="button"
                                class="w-full justify-center bg-[#13233a] text-white hover:bg-[#0e1a2b]"
                                :disabled="submitting"
                                data-testid="capture-widget-submit"
                                @click="submitWidgetReport"
                            >
                                <LoaderCircle v-if="submitting" class="size-4 animate-spin" />
                                <TimerReset v-else class="size-4" />
                                <span>{{ submitting ? 'Sending sandbox capture' : 'Send report to Snag' }}</span>
                            </Button>
                        </div>

                        <div v-if="failure" class="rounded-[16px] border border-[#efc7c0] bg-[#fff3f1] p-4">
                            <div class="flex items-center gap-2 text-sm font-semibold text-[#9f3f30]">
                                <AlertCircle class="size-4" />
                                <span>Request failed</span>
                            </div>
                            <p class="mt-2 text-sm leading-6 text-[#6b534d]">{{ failure }}</p>
                        </div>

                        <div v-if="result" class="rounded-[16px] border border-[#cddfcf] bg-[#f2f8f1] p-4">
                            <div class="flex items-center gap-2 text-sm font-semibold text-[#1d5031]">
                                <CheckCircle2 class="size-4" />
                                <span>Sandbox report created</span>
                            </div>
                            <p class="mt-2 text-sm leading-6 text-[#4d6052]">
                                The public capture flow completed and Snag returned a report payload.
                            </p>
                            <div class="mt-3 flex items-center justify-between gap-3 text-sm">
                                <span class="text-[#4d6052]">Status</span>
                                <Badge class="border-[#c6d7c8] bg-white text-[#1d5031]">{{ result.status }}</Badge>
                            </div>

                            <div class="mt-3">
                                <a
                                    v-if="result.share_url"
                                    :href="result.share_url"
                                    class="inline-flex items-center gap-2 text-sm font-medium text-[#13233a] hover:underline"
                                >
                                    <span>Open public share</span>
                                    <ExternalLink class="size-4" />
                                </a>
                                <p v-else class="text-sm leading-6 text-[#4d6052]">Share URL is empty for the selected visibility.</p>
                            </div>
                        </div>

                        <div class="rounded-[16px] border border-[#e1ddd5] bg-white p-4">
                            <div class="flex items-center justify-between gap-3">
                                <div class="text-sm font-semibold text-[#17212a]">API request log</div>
                                <Link :href="docsUrl" class="inline-flex items-center gap-2 text-sm font-medium text-[#13233a] hover:underline">
                                    <span>Docs</span>
                                    <ExternalLink class="size-4" />
                                </Link>
                            </div>

                            <div class="mt-4 space-y-3">
                                <div v-if="requestLog.length === 0" class="rounded-[12px] border border-dashed border-[#ddd8cf] px-3 py-4 text-sm text-[#626970]">
                                    Submit the widget to see the public capture sequence.
                                </div>
                                <div
                                    v-for="entry in requestLog"
                                    :key="`${entry.at}-${entry.title}`"
                                    class="rounded-[12px] border border-[#ebe6dd] px-3 py-3"
                                >
                                    <div class="flex items-center justify-between gap-3">
                                        <span class="text-sm font-medium text-[#17212a]">{{ entry.title }}</span>
                                        <span class="text-xs text-[#74808b]">{{ entry.at }}</span>
                                    </div>
                                    <p class="mt-2 text-sm leading-6 text-[#5e6870]">{{ entry.detail }}</p>
                                </div>
                            </div>
                        </div>

                        <div class="rounded-[16px] border border-[#dbe2e6] bg-[#edf2f4] p-4 text-sm text-[#55616c]">
                            <div class="font-semibold text-[#17212a]">Endpoint preview</div>
                            <div class="mt-3 space-y-1">
                                <div>{{ baseUrlPreview }}/tokens</div>
                                <div>{{ baseUrlPreview }}/upload-sessions</div>
                                <div>{{ baseUrlPreview }}/finalize</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </transition>
    </div>
</template>
