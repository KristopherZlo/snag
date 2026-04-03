<script setup>
import { computed, reactive, ref } from 'vue';
import { SnagCaptureClient } from '@snag/capture-core';
import { AlertCircle, CheckCircle2, LoaderCircle, ShieldCheck, Sparkles } from 'lucide-vue-next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

const props = defineProps({
    open: { type: Boolean, default: false },
    apiBaseUrl: { type: String, required: true },
    prefillPublicKey: { type: String, default: '' },
    siteName: { type: String, default: 'Air Supply Co.' },
    pageLabel: { type: String, default: 'Air Supply storefront' },
    selectedOffer: { type: String, default: 'Summit Noon Reserve' },
});

const emit = defineEmits(['update:open']);

const issueTypeOptions = [
    { value: 'checkout', label: 'Checkout issue' },
    { value: 'delivery', label: 'Delivery question' },
    { value: 'quality', label: 'Product concern' },
    { value: 'other', label: 'Something else' },
];

const form = reactive({
    issueType: 'checkout',
    orderReference: '',
    email: '',
    details: '',
});

const submitting = ref(false);
const failure = ref('');
const result = ref(null);

const currentOrigin = computed(() => {
    if (typeof window === 'undefined') {
        return new URL(props.apiBaseUrl).origin;
    }

    return window.location.origin;
});

const isConfigured = computed(() => props.prefillPublicKey.trim() !== '');
const canSubmit = computed(() => form.details.trim().length >= 12 && !submitting.value && isConfigured.value);
const issueTypeLabel = computed(() => issueTypeOptions.find((option) => option.value === form.issueType)?.label ?? 'Support issue');

const resetOutcome = () => {
    failure.value = '';
    result.value = null;
};

const toBlob = (canvas, type) =>
    new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Failed to serialize the support snapshot.'));
                return;
            }

            resolve(blob);
        }, type);
    });

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
    canvas.width = 1366;
    canvas.height = 860;

    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error('Canvas 2D context is not available in this browser.');
    }

    context.fillStyle = '#d2dde2';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = '#f6f4ef';
    context.strokeStyle = '#d9d4ca';
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(44, 36, 1278, 788, 18);
    context.fill();
    context.stroke();

    context.fillStyle = '#ffffff';
    context.beginPath();
    context.roundRect(78, 78, 1210, 66, 14);
    context.fill();

    context.fillStyle = '#1c2930';
    context.font = '700 28px sans-serif';
    context.fillText(props.siteName, 112, 120);

    context.fillStyle = '#e4ebee';
    context.beginPath();
    context.roundRect(78, 174, 758, 362, 18);
    context.fill();

    const heroGradient = context.createLinearGradient(78, 174, 836, 536);
    heroGradient.addColorStop(0, '#91a9af');
    heroGradient.addColorStop(1, '#4d6673');
    context.fillStyle = heroGradient;
    context.beginPath();
    context.roundRect(78, 174, 758, 362, 18);
    context.fill();

    context.fillStyle = '#ffffff';
    context.font = '700 82px sans-serif';
    context.fillText('BREATHE', 126, 332);
    context.font = '400 24px sans-serif';
    wrapText(context, 'Private air reserves for studios, hotels, and teams that need the room to feel reset fast.', 130, 382, 470, 30);

    context.fillStyle = '#13233a';
    context.beginPath();
    context.roundRect(130, 434, 212, 52, 10);
    context.fill();
    context.fillStyle = '#ffffff';
    context.font = '700 18px sans-serif';
    context.fillText('Reserve this batch', 172, 467);

    context.fillStyle = '#ffffff';
    context.strokeStyle = '#d9d4ca';
    context.beginPath();
    context.roundRect(872, 174, 360, 448, 18);
    context.fill();
    context.stroke();

    context.fillStyle = '#1c2930';
    context.font = '700 30px sans-serif';
    context.fillText('Support request', 908, 228);
    context.font = '400 20px sans-serif';
    context.fillStyle = '#5c6670';
    context.fillText(issueTypeLabel.value, 908, 270);

    context.fillStyle = '#f3efe7';
    context.beginPath();
    context.roundRect(908, 302, 284, 72, 12);
    context.fill();
    context.fillStyle = '#1c2930';
    context.font = '600 18px sans-serif';
    context.fillText(`Offer: ${props.selectedOffer}`, 930, 346);

    context.fillStyle = '#f8f5ef';
    context.strokeStyle = '#e1dbd0';
    context.beginPath();
    context.roundRect(908, 402, 284, 140, 12);
    context.fill();
    context.stroke();

    context.fillStyle = '#1c2930';
    context.font = '600 18px sans-serif';
    wrapText(context, form.details || 'Customer issue details pending.', 930, 434, 240, 26);

    context.fillStyle = '#5c6670';
    context.font = '400 16px sans-serif';
    context.fillText(form.orderReference ? `Order: ${form.orderReference}` : 'Order: not provided', 930, 566);
    context.fillText(form.email ? `Contact: ${form.email}` : 'Contact: not provided', 930, 592);

    const cardXs = [78, 288, 498, 708];
    const cardTitles = ['Coastal Dawn', 'Summit Noon', 'Pine Window', 'Studio Reset'];

    for (const [index, title] of cardTitles.entries()) {
        const x = cardXs[index];
        context.fillStyle = '#ffffff';
        context.strokeStyle = '#ddd7cc';
        context.beginPath();
        context.roundRect(x, 588, 178, 174, 14);
        context.fill();
        context.stroke();

        context.fillStyle = ['#b5c6cb', '#b7c0af', '#a5b39f', '#b6bec8'][index];
        context.beginPath();
        context.roundRect(x + 14, 602, 150, 92, 10);
        context.fill();

        context.fillStyle = '#1c2930';
        context.font = '700 18px sans-serif';
        context.fillText(title, x + 14, 722);
    }

    return toBlob(canvas, 'image/png');
};

const createDebuggerBlob = () =>
    new Blob([
        JSON.stringify({
            context: {
                url: typeof window === 'undefined' ? props.apiBaseUrl : window.location.href,
                title: props.pageLabel,
                viewport: {
                    width: typeof window === 'undefined' ? 1366 : window.innerWidth,
                    height: typeof window === 'undefined' ? 860 : window.innerHeight,
                },
            },
            support_request: {
                issue_type: form.issueType,
                order_reference: form.orderReference,
                contact_email: form.email,
                selected_offer: props.selectedOffer,
            },
            logs: [
                { level: 'error', message: 'checkout.reserve-batch timed out after 5s' },
                { level: 'info', message: 'support drawer captured the current storefront context' },
            ],
            network_requests: [
                { method: 'POST', url: '/checkout/reserve-batch', status: 504, duration_ms: 5120 },
            ],
        }, null, 2),
    ], { type: 'application/json' });

const shorten = (value, maxLength = 72) => {
    const normalized = value.trim().replace(/\s+/g, ' ');
    return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
};

const buildTitle = () => {
    const summarySeed = form.details.trim() || `Issue on ${props.selectedOffer}`;
    return `${issueTypeLabel.value}: ${shorten(summarySeed, 64)}`;
};

const buildSummary = () => {
    const lines = [
        form.details.trim(),
        `Issue type: ${issueTypeLabel.value}`,
        `Offer: ${props.selectedOffer}`,
    ];

    if (form.orderReference.trim() !== '') {
        lines.push(`Order reference: ${form.orderReference.trim()}`);
    }

    if (form.email.trim() !== '') {
        lines.push(`Contact email: ${form.email.trim()}`);
    }

    lines.push(`Page label: ${props.pageLabel}`);

    return lines.filter(Boolean).join('\n');
};

const parseFailureMessage = (error) => {
    const raw = error instanceof Error ? error.message : 'We could not send your request right now.';

    if (raw.includes('forbidden_origin')) {
        return 'Support is not enabled for this domain yet. Add this storefront origin to the capture key and try again.';
    }

    if (raw.includes('invalid_capture_token')) {
        return 'Support capture is temporarily unavailable. Please try again in a minute.';
    }

    if (raw.includes('No query results for model')) {
        return 'This storefront is missing an active support capture key.';
    }

    try {
        const payload = JSON.parse(raw);
        if (payload?.message) {
            return payload.message;
        }
    } catch {
        // Ignore parse failures and fall back to the raw error text.
    }

    return raw;
};

const submit = async () => {
    if (!canSubmit.value) {
        return;
    }

    submitting.value = true;
    resetOutcome();

    const client = new SnagCaptureClient({ baseUrl: props.apiBaseUrl });

    try {
        const createToken = await client.issuePublicCaptureToken({
            public_key: props.prefillPublicKey.trim(),
            origin: currentOrigin.value,
            action: 'create',
        });

        const session = await client.createPublicUploadSession({
            public_key: props.prefillPublicKey.trim(),
            capture_token: createToken.capture_token,
            origin: currentOrigin.value,
            media_kind: 'screenshot',
            meta: {
                source: 'diagnostics.capture-widget',
                sandbox: true,
                page_label: props.pageLabel,
                issue_type: form.issueType,
            },
        });

        await client.uploadArtifacts(session, [
            { kind: 'screenshot', body: await createSyntheticScreenshot() },
            { kind: 'debugger', body: createDebuggerBlob() },
        ]);

        const finalizeToken = await client.issuePublicCaptureToken({
            public_key: props.prefillPublicKey.trim(),
            origin: currentOrigin.value,
            action: 'finalize',
        });

        const finalize = await client.finalizePublicReport({
            public_key: props.prefillPublicKey.trim(),
            capture_token: finalizeToken.capture_token,
            upload_session_token: session.upload_session_token,
            finalize_token: session.finalize_token,
            title: buildTitle(),
            summary: buildSummary(),
            visibility: 'organization',
            origin: currentOrigin.value,
            meta: { submitted_from: 'diagnostics.capture-widget' },
        });

        result.value = finalize.report;
    } catch (error) {
        failure.value = parseFailureMessage(error);
    } finally {
        submitting.value = false;
    }
};
</script>

<template>
    <Sheet :open="open" @update:open="emit('update:open', $event)">
        <SheetContent side="right" class="w-full overflow-y-auto border-l border-[#d9d2c7] bg-[#f8f5ef] px-0 text-[#1f2a32] sm:max-w-[460px]">
            <SheetHeader class="border-b border-[#e4ddd1] px-6 py-5 text-left">
                <div class="flex items-center gap-2">
                    <Badge class="border-[#d8cfbf] bg-white text-[#31414c]">{{ siteName }}</Badge>
                    <Badge class="border-[#d8cfbf] bg-[#f2ece2] text-[#6a5642]">Support</Badge>
                </div>
                <SheetTitle class="mt-3 text-[1.45rem] font-semibold tracking-[-0.03em] text-[#1c2930]">Tell us what went wrong.</SheetTitle>
                <SheetDescription class="mt-2 text-sm leading-6 text-[#5e6972]">
                    We attach the current page, reserve context, and technical details automatically so you do not have to explain
                    everything twice.
                </SheetDescription>
            </SheetHeader>

            <div class="space-y-5 px-6 py-6">
                <div v-if="!isConfigured" class="rounded-xl border border-[#efc8c1] bg-[#fff2ef] px-4 py-4 text-sm leading-6 text-[#7a4a41]">
                    This storefront does not have an active support capture key yet.
                </div>

                <div class="rounded-xl border border-[#e5dccd] bg-white px-4 py-4">
                    <div class="flex items-start gap-3">
                        <div class="flex size-10 items-center justify-center rounded-lg bg-[#eef2f4] text-[#20313c]">
                            <ShieldCheck class="size-5" />
                        </div>
                        <div class="space-y-1">
                            <div class="text-sm font-semibold text-[#1c2930]">Attached automatically</div>
                            <p class="text-sm leading-6 text-[#5f6971]">
                                Current URL, a fresh storefront screenshot, and a lightweight debugger payload.
                            </p>
                        </div>
                    </div>
                </div>

                <div class="grid gap-4">
                    <div class="space-y-2">
                        <Label for="support-issue-type">What do you need help with?</Label>
                        <NativeSelect
                            id="support-issue-type"
                            v-model="form.issueType"
                            class="w-full border-[#d9d1c6] bg-white"
                            data-testid="capture-widget-issue-type"
                            @update:model-value="resetOutcome"
                        >
                            <NativeSelectOption v-for="option in issueTypeOptions" :key="option.value" :value="option.value">
                                {{ option.label }}
                            </NativeSelectOption>
                        </NativeSelect>
                    </div>

                    <div class="space-y-2">
                        <Label for="support-order-reference">Order reference</Label>
                        <Input
                            id="support-order-reference"
                            v-model="form.orderReference"
                            type="text"
                            placeholder="Optional"
                            class="border-[#d9d1c6] bg-white"
                            data-testid="capture-widget-order-reference"
                            @input="resetOutcome"
                        />
                    </div>

                    <div class="space-y-2">
                        <Label for="support-email">Contact email</Label>
                        <Input
                            id="support-email"
                            v-model="form.email"
                            type="email"
                            placeholder="Optional"
                            class="border-[#d9d1c6] bg-white"
                            data-testid="capture-widget-email"
                            @input="resetOutcome"
                        />
                    </div>

                    <div class="space-y-2">
                        <Label for="support-details">What happened?</Label>
                        <Textarea
                            id="support-details"
                            v-model="form.details"
                            rows="6"
                            placeholder="Describe what you expected and what happened instead."
                            class="min-h-[140px] border-[#d9d1c6] bg-white"
                            data-testid="capture-widget-details"
                            @input="resetOutcome"
                        />
                        <p class="text-xs leading-5 text-[#6c777f]">
                            Include the last action you took and whether the page stayed stuck, refreshed, or showed an error.
                        </p>
                    </div>
                </div>

                <div v-if="failure" class="rounded-xl border border-[#efc8c1] bg-[#fff2ef] px-4 py-4">
                    <div class="flex items-center gap-2 text-sm font-semibold text-[#96453b]">
                        <AlertCircle class="size-4" />
                        <span>We could not send your request</span>
                    </div>
                    <p class="mt-2 text-sm leading-6 text-[#7a4a41]">{{ failure }}</p>
                </div>

                <div v-if="result" class="rounded-xl border border-[#cfe1d0] bg-[#f2f8f2] px-4 py-4">
                    <div class="flex items-center gap-2 text-sm font-semibold text-[#28533a]">
                        <CheckCircle2 class="size-4" />
                        <span>Support request sent</span>
                    </div>
                    <p class="mt-2 text-sm leading-6 text-[#4c6354]">
                        We stored your report with a fresh screenshot and technical context for the team.
                    </p>
                    <p v-if="!result.share_url" class="mt-2 text-sm leading-6 text-[#4c6354]">
                        This support request stays organization-only unless someone explicitly creates a public share later.
                    </p>
                    <div class="mt-3 flex items-center gap-2 text-sm text-[#4c6354]">
                        <span>Status:</span>
                        <Badge class="border-[#c7d7c7] bg-white text-[#28533a]">{{ result.status }}</Badge>
                    </div>
                    <a v-if="result.share_url" :href="result.share_url" class="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#1c2930] hover:underline">
                        <Sparkles class="size-4" />
                        <span>Open support record</span>
                    </a>
                </div>

                <div class="rounded-xl border border-[#e5dccd] bg-[#f3eee5] px-4 py-4 text-sm leading-6 text-[#5c655f]">
                    We review the current page, the reserve you were trying to buy, and the attached browser context before replying.
                </div>

                <Button
                    type="button"
                    class="h-11 w-full bg-[#182c45] text-white hover:bg-[#102033]"
                    :disabled="!canSubmit"
                    data-testid="capture-widget-submit"
                    @click="submit"
                >
                    <LoaderCircle v-if="submitting" class="size-4 animate-spin" />
                    <span>{{ submitting ? 'Sending support request' : 'Send to support' }}</span>
                </Button>
            </div>
        </SheetContent>
    </Sheet>
</template>
