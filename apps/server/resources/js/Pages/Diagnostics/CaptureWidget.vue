<script setup>
import { computed, ref } from 'vue';
import { Head } from '@inertiajs/vue3';
import { ArrowRight, Box, Building2, Clock3, Hotel, PackageCheck, ShieldCheck, Sparkles, Wind } from 'lucide-vue-next';
import AirStorefrontWidgetBridge from './Partials/AirStorefrontWidgetBridge.vue';

defineProps({
    apiBaseUrl: { type: String, required: true },
    docsUrl: { type: String, required: true },
    prefillPublicKey: { type: String, default: '' },
});

const supportLaunchSignal = ref(0);
const openSupportWidget = () => {
    supportLaunchSignal.value += 1;
};

const navigationItems = [
    { label: 'Reserves', href: '#shop' },
    { label: 'Who buys this', href: '#buyers' },
    { label: 'Starter kits', href: '#packs' },
    { label: 'Delivery', href: '#delivery' },
    { label: 'FAQ', href: '#faq' },
];

const reserveCollections = [
    {
        name: 'Coastal Dawn',
        code: 'CD-14',
        origin: 'Baltic shoreline run',
        size: '750 ml',
        price: 'EUR 24',
        availability: 'Ships Tuesday',
        note: 'Dry morning air with a faint mineral edge for kitchens, studios, and hotel check-ins.',
        tags: ['Sea salt', 'Early light', 'Low drama'],
        palette: { surface: '#dfe7e3', bottle: '#acc5bf', label: '#f9f5ee', accent: '#284a4c' },
    },
    {
        name: 'Summit Noon',
        code: 'SN-09',
        origin: 'Cold ridge batch',
        size: '750 ml',
        price: 'EUR 31',
        availability: 'Ships today',
        note: 'Sharp mountain air for boardrooms, suites, and teams that would like their afternoon to feel more expensive.',
        tags: ['Dry', 'Crisp', 'High altitude'],
        palette: { surface: '#e6e2dc', bottle: '#c5beb4', label: '#fcf9f3', accent: '#4b3728' },
    },
    {
        name: 'Pine Window',
        code: 'PW-21',
        origin: 'Forest reserve',
        size: '750 ml',
        price: 'EUR 27',
        availability: 'Ships Wednesday',
        note: 'Green, clean, slightly unreasonable air for editing rooms and guest welcome trays.',
        tags: ['Needles', 'Cool shade', 'Quiet rooms'],
        palette: { surface: '#dee4da', bottle: '#9caf95', label: '#f8f6ee', accent: '#41523b' },
    },
    {
        name: 'Studio Reset',
        code: 'SR-05',
        origin: 'Late-night neutral run',
        size: '500 ml',
        price: 'EUR 19',
        availability: 'Ships Thursday',
        note: 'Neutral clean air for dense offices, late decks, and teams that forgot what outside smells like.',
        tags: ['Neutral', 'Desk-safe', 'Repeat order'],
        palette: { surface: '#e5e4e0', bottle: '#bbbfc6', label: '#f9f5ef', accent: '#39404f' },
    },
];

const featuredReserve = computed(() => reserveCollections[1]);

const proofStats = [
    { value: '12,400', label: 'sealed bottles delivered' },
    { value: '96%', label: 'repeat reserve rate' },
    { value: '48h', label: 'support response window' },
    { value: '31', label: 'cities on weekly dispatch' },
];

const buyerSegments = [
    { title: 'Boutique hotels', copy: 'Welcome trays, suite drops, and minibar theatrics that sound considered instead of gimmicky.', icon: Hotel },
    { title: 'Creative teams', copy: 'Studios buying a reset for pitch rooms, edit bays, and client visits that need the room to wake up.', icon: Sparkles },
    { title: 'Events and launches', copy: 'Small-batch atmosphere for openings, private dinners, and hospitality programs with a sense of humour.', icon: Building2 },
];

const trustReasons = [
    { title: 'Clear provenance', copy: 'Each reserve ships with bottling date, climate note, and a plain-language source description.', icon: Wind },
    { title: 'Normal fulfilment', copy: 'No weird checkout maze. One reserve, one deposit line, one dispatch promise.', icon: PackageCheck },
    { title: 'Support starts with context', copy: 'If checkout breaks, the widget sends the exact page state instead of a vague complaint.', icon: ShieldCheck },
];

const partnerMarks = ['Northline Studio', 'Hotel Aster', 'Signal House', 'Room Service Club'];

const starterKits = [
    { title: 'Guest Arrival Set', price: 'EUR 74', summary: 'Three bottles for suites, private residences, or hospitality teams that want a more memorable arrival note.', items: ['1x Summit Noon', '1x Coastal Dawn', '1x Pine Window', 'Glass return sleeves'] },
    { title: 'Pitch Room Refill', price: 'EUR 88', summary: 'A four-bottle reset for creative teams before reviews, launches, and very serious afternoons.', items: ['2x Studio Reset', '1x Summit Noon', '1x Pine Window', 'Desk note cards'] },
    { title: 'Lobby Signature Pair', price: 'EUR 52', summary: 'A two-bottle pair for entry tables, concierge desks, and everyone else pretending this was always the plan.', items: ['1x Coastal Dawn', '1x Summit Noon', 'Deposit return envelope'] },
];

const deliverySteps = [
    { step: '01', title: 'Choose a reserve', copy: 'Pick the climate note that fits the room: coastal, alpine, forest, or neutral studio air.' },
    { step: '02', title: 'Book dispatch', copy: 'Single orders and recurring refills use the same straightforward reserve flow with deposit tracking.' },
    { step: '03', title: 'Use support only if needed', copy: 'When something breaks, the widget captures the live page and sends it with context to support.' },
];

const faqItems = [
    { question: 'Is this actually bottled air?', answer: 'Yes. Carefully packed, sealed, and shipped with a straight face. It is intentionally theatrical and operationally normal.' },
    { question: 'Do you ship internationally?', answer: 'Selected EU routes ship weekly. Hospitality and event orders are reviewed manually before dispatch.' },
    { question: 'How long does a reserve stay fresh?', answer: 'Long enough for the story to work. Each bottle includes a bottling date and a recommended use window.' },
    { question: 'What happens if checkout fails?', answer: 'Use the support entry points on the page. The widget captures the page you were on and sends it to support.' },
];

const primaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#231b15] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#17110d]';
const secondaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#d5ccc1] bg-white px-5 py-3 text-sm font-medium text-[#231b15] transition-colors hover:bg-[#f4efe8]';
</script>

<template>
    <div class="min-h-screen bg-[#ebe5dd] text-[#231b15]">
        <Head title="Air Supply Co." />
        <div class="mx-auto max-w-[1240px] px-4 pb-14 pt-4 md:px-6 lg:px-8">
            <div class="overflow-hidden rounded-[16px] border border-[#d7cec2] bg-[#faf7f2] shadow-[0_16px_40px_rgba(56,43,31,0.08)]">
                <header class="border-b border-[#e5ddd1] px-5 py-4 md:px-8">
                    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-10">
                            <div class="flex items-center gap-3">
                                <div class="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#d9e2de] text-[#294645]">
                                    <Wind class="size-5" />
                                </div>
                                <div>
                                    <div class="text-base font-semibold tracking-[-0.03em]">Air Supply Co.</div>
                                    <div class="text-sm text-[#73655a]">Private reserves for deliberate rooms</div>
                                </div>
                            </div>
                            <nav class="hidden items-center gap-6 text-sm text-[#6d5f54] lg:flex">
                                <a v-for="item in navigationItems" :key="item.label" :href="item.href" class="transition-colors hover:text-[#231b15]">
                                    {{ item.label }}
                                </a>
                            </nav>
                        </div>
                        <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                            <a href="#packs" class="inline-flex items-center justify-center rounded-[10px] px-4 py-2.5 text-sm font-medium text-[#5f5146] hover:text-[#231b15]">Starter kits</a>
                            <button type="button" :class="secondaryButtonClass" @click="openSupportWidget">Support</button>
                            <a href="#shop" :class="primaryButtonClass">Reserve now</a>
                        </div>
                    </div>
                </header>

                <main class="space-y-10 px-5 py-6 md:px-8 md:py-8">
                    <section class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                        <div class="rounded-[16px] border border-[#ded5ca] bg-[#f2ebe1] p-6 md:p-8">
                            <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
                                <div>
                                    <p class="max-w-[40rem] text-sm leading-6 text-[#7d5d3c]">Limited atmosphere, bottled with a straight face.</p>
                                    <h1 class="mt-4 max-w-[11ch] text-[clamp(3rem,8vw,5.7rem)] font-semibold leading-[0.94] tracking-[-0.08em] text-[#231b15]">
                                        Air for rooms that need a better story.
                                    </h1>
                                    <p class="mt-5 max-w-[42rem] text-[15px] leading-7 text-[#5f5044]">
                                        Air Supply Co. sells coastal, alpine, and forest reserve air for hotels, studios, launches, and anyone who has already purchased every candle worth discussing.
                                    </p>
                                    <div class="mt-6 flex flex-wrap gap-3">
                                        <a href="#shop" :class="primaryButtonClass">Browse reserves</a>
                                        <button type="button" :class="secondaryButtonClass" data-testid="capture-widget-open" @click="openSupportWidget">
                                            Report a checkout issue
                                        </button>
                                    </div>
                                    <dl class="mt-8 grid gap-4 sm:grid-cols-3">
                                        <div class="rounded-[12px] border border-[#e0d7cd] bg-white px-4 py-4">
                                            <dt class="text-sm text-[#7a6a5e]">Dispatch</dt>
                                            <dd class="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#231b15]">31-city weekly run</dd>
                                        </div>
                                        <div class="rounded-[12px] border border-[#e0d7cd] bg-white px-4 py-4">
                                            <dt class="text-sm text-[#7a6a5e]">Format</dt>
                                            <dd class="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#231b15]">Returnable glass bottle</dd>
                                        </div>
                                        <div class="rounded-[12px] border border-[#e0d7cd] bg-white px-4 py-4">
                                            <dt class="text-sm text-[#7a6a5e]">Audience</dt>
                                            <dd class="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#231b15]">Hotels, studios, events</dd>
                                        </div>
                                    </dl>
                                </div>

                                <div class="rounded-[14px] border border-[#ddd4c8] bg-white p-5">
                                    <div class="flex items-start justify-between gap-3">
                                        <div>
                                            <div class="text-sm text-[#76685d]">This week's bottling ledger</div>
                                            <div class="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#231b15]">Four reserve profiles</div>
                                        </div>
                                        <span class="rounded-[999px] bg-[#efe6da] px-3 py-1 text-xs font-medium text-[#71553a]">Week 14 release</span>
                                    </div>

                                    <div class="mt-6 grid grid-cols-3 gap-3" aria-hidden="true">
                                        <div v-for="reserve in reserveCollections.slice(0, 3)" :key="`${reserve.code}-hero`" class="rounded-[12px] border border-[#ece3d9] px-3 pb-4 pt-3" :style="{ backgroundColor: reserve.palette.surface }">
                                            <div class="mx-auto flex h-[148px] w-[76px] items-end justify-center rounded-[30px] border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(255,255,255,0.18)_100%)] px-2 pb-3 pt-3">
                                                <div class="relative h-full w-full rounded-[22px]" :style="{ backgroundColor: reserve.palette.bottle }">
                                                    <div class="absolute left-1/2 top-[-8px] h-5 w-7 -translate-x-1/2 rounded-t-[10px]" :style="{ backgroundColor: reserve.palette.accent }" />
                                                    <div class="absolute inset-x-2 top-9 rounded-[8px] border px-1 py-2 text-center text-[10px] font-semibold tracking-[0.12em]" :style="{ backgroundColor: reserve.palette.label, borderColor: `${reserve.palette.accent}22`, color: reserve.palette.accent }">
                                                        {{ reserve.code }}
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="mt-3 text-center text-xs font-medium text-[#4c3d31]">{{ reserve.name }}</div>
                                        </div>
                                    </div>

                                    <div class="mt-5 rounded-[12px] border border-[#ece3d8] bg-[#faf6f0] px-4 py-4">
                                        <div class="flex items-center justify-between gap-3">
                                            <div>
                                                <div class="text-sm font-medium text-[#231b15]">Reserve notes included</div>
                                                <div class="mt-1 text-sm leading-6 text-[#6a5c50]">Every bottle ships with a source note, bottling date, and return deposit card.</div>
                                            </div>
                                            <Box class="size-5 shrink-0 text-[#7b6753]" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <aside class="rounded-[16px] border border-[#ded5ca] bg-white p-5">
                            <div class="flex items-start justify-between gap-3">
                                <div>
                                    <div class="text-sm text-[#76685d]">Featured reserve</div>
                                    <div class="mt-2 text-[1.55rem] font-semibold tracking-[-0.05em] text-[#231b15]">{{ featuredReserve.name }}</div>
                                </div>
                                <span class="rounded-[999px] bg-[#efe6da] px-3 py-1 text-xs font-medium text-[#71553a]">Ships today</span>
                            </div>

                            <p class="mt-4 text-sm leading-7 text-[#5f5044]">{{ featuredReserve.note }}</p>

                            <div class="mt-5 rounded-[14px] border border-[#e5ddd2] px-4 py-4" :style="{ backgroundColor: featuredReserve.palette.surface }">
                                <div class="flex items-center gap-4">
                                    <div class="flex h-[128px] w-[74px] items-end justify-center rounded-[28px] border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.18)_100%)] px-2 pb-3 pt-3">
                                        <div class="relative h-full w-full rounded-[20px]" :style="{ backgroundColor: featuredReserve.palette.bottle }">
                                            <div class="absolute left-1/2 top-[-7px] h-4 w-6 -translate-x-1/2 rounded-t-[10px]" :style="{ backgroundColor: featuredReserve.palette.accent }" />
                                            <div class="absolute inset-x-2 top-8 rounded-[8px] border px-1 py-2 text-center text-[10px] font-semibold tracking-[0.12em]" :style="{ backgroundColor: featuredReserve.palette.label, borderColor: `${featuredReserve.palette.accent}22`, color: featuredReserve.palette.accent }">
                                                {{ featuredReserve.code }}
                                            </div>
                                        </div>
                                    </div>

                                    <div class="min-w-0">
                                        <div class="text-sm text-[#6d5f54]">{{ featuredReserve.origin }}</div>
                                        <div class="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#231b15]">{{ featuredReserve.price }}</div>
                                        <div class="mt-1 text-sm text-[#6d5f54]">{{ featuredReserve.size }} / {{ featuredReserve.availability }}</div>
                                    </div>
                                </div>
                            </div>

                            <div class="mt-5 rounded-[12px] border border-[#e9e0d5] bg-[#faf6f0] px-4 py-4">
                                <div class="flex items-center justify-between text-sm"><span class="text-[#74665a]">Bottle</span><span class="font-medium text-[#231b15]">{{ featuredReserve.price }}</span></div>
                                <div class="mt-3 flex items-center justify-between text-sm"><span class="text-[#74665a]">Glass return deposit</span><span class="font-medium text-[#231b15]">EUR 4</span></div>
                                <div class="mt-3 flex items-center justify-between text-sm"><span class="text-[#74665a]">Dispatch slot</span><span class="font-medium text-[#231b15]">Today, 16:00-19:00</span></div>
                                <div class="mt-4 border-t border-[#e5ddd2] pt-4">
                                    <div class="flex items-center justify-between"><span class="text-sm text-[#74665a]">Estimated total</span><span class="text-[1.35rem] font-semibold tracking-[-0.04em] text-[#231b15]">EUR 35</span></div>
                                </div>
                            </div>

                            <div class="mt-5 space-y-3">
                                <a href="#shop" :class="`${primaryButtonClass} w-full`">Reserve featured batch</a>
                                <button type="button" :class="`${secondaryButtonClass} w-full`" data-testid="featured-reserve-support" @click="openSupportWidget">
                                    Checkout not working?
                                </button>
                            </div>
                        </aside>
                    </section>

                    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div v-for="item in proofStats" :key="item.label" class="rounded-[14px] border border-[#ddd4c8] bg-white px-5 py-5">
                            <div class="text-[1.7rem] font-semibold tracking-[-0.05em] text-[#231b15]">{{ item.value }}</div>
                            <div class="mt-2 text-sm leading-6 text-[#66584c]">{{ item.label }}</div>
                        </div>
                    </section>

                    <section id="shop" class="rounded-[16px] border border-[#ddd4c8] bg-white px-5 py-6 md:px-6">
                        <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                            <div class="max-w-[40rem]">
                                <h2 class="text-[1.8rem] font-semibold tracking-[-0.05em] text-[#231b15]">Shop by atmosphere</h2>
                                <p class="mt-2 text-sm leading-7 text-[#66584c]">Four reserve profiles for guest arrivals, client rooms, lobbies, edit suites, and anyone making a very committed bit of it.</p>
                            </div>
                            <a href="#packs" class="text-sm font-medium text-[#5f5146] transition-colors hover:text-[#231b15]">See starter kits</a>
                        </div>

                        <div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <article v-for="reserve in reserveCollections" :key="reserve.code" class="flex h-full flex-col rounded-[14px] border border-[#e3dbd1] bg-[#fcfbf8]">
                                <div class="rounded-t-[14px] border-b border-[#e7dfd5] px-4 py-4" :style="{ backgroundColor: reserve.palette.surface }">
                                    <div class="flex items-start justify-between gap-3">
                                        <div>
                                            <div class="text-sm font-medium text-[#4b3e33]">{{ reserve.origin }}</div>
                                            <div class="mt-1 text-base font-semibold tracking-[-0.03em] text-[#231b15]">{{ reserve.name }}</div>
                                        </div>
                                        <span class="text-sm font-semibold text-[#231b15]">{{ reserve.price }}</span>
                                    </div>

                                    <div class="mt-4 flex items-end gap-3" aria-hidden="true">
                                        <div class="flex h-[122px] w-[68px] items-end justify-center rounded-[24px] border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.15)_100%)] px-2 pb-3 pt-3">
                                            <div class="relative h-full w-full rounded-[18px]" :style="{ backgroundColor: reserve.palette.bottle }">
                                                <div class="absolute left-1/2 top-[-7px] h-4 w-6 -translate-x-1/2 rounded-t-[10px]" :style="{ backgroundColor: reserve.palette.accent }" />
                                                <div class="absolute inset-x-2 top-8 rounded-[7px] border px-1 py-2 text-center text-[10px] font-semibold tracking-[0.12em]" :style="{ backgroundColor: reserve.palette.label, borderColor: `${reserve.palette.accent}22`, color: reserve.palette.accent }">
                                                    {{ reserve.code }}
                                                </div>
                                            </div>
                                        </div>

                                        <div class="space-y-2 text-sm text-[#5a4d42]">
                                            <div>{{ reserve.size }}</div>
                                            <div>{{ reserve.availability }}</div>
                                            <div class="flex flex-wrap gap-2">
                                                <span v-for="tag in reserve.tags" :key="`${reserve.code}-${tag}`" class="rounded-[999px] border border-white/60 bg-white/70 px-2.5 py-1 text-xs font-medium text-[#4d4035]">
                                                    {{ tag }}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="flex flex-1 flex-col px-4 py-4">
                                    <p class="text-sm leading-7 text-[#66584c]">{{ reserve.note }}</p>
                                    <div class="mt-5">
                                        <a href="#packs" class="inline-flex items-center gap-2 text-sm font-medium text-[#231b15] hover:text-[#52443a]">
                                            Add to a starter kit
                                            <ArrowRight class="size-4" />
                                        </a>
                                    </div>
                                </div>
                            </article>
                        </div>
                    </section>

                    <section id="buyers" class="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_380px]">
                        <div class="rounded-[16px] border border-[#ddd4c8] bg-white px-5 py-6 md:px-6">
                            <h2 class="text-[1.8rem] font-semibold tracking-[-0.05em] text-[#231b15]">Where this actually ends up</h2>
                            <p class="mt-2 max-w-[42rem] text-sm leading-7 text-[#66584c]">The product is intentionally absurd. The use cases are not. Most customers want one small moment that makes the room feel deliberate.</p>

                            <div class="mt-6 grid gap-4 md:grid-cols-3">
                                <article v-for="segment in buyerSegments" :key="segment.title" class="rounded-[14px] border border-[#e5ddd2] bg-[#fbf8f3] p-5">
                                    <div class="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#ece4da] text-[#4b3a2f]">
                                        <component :is="segment.icon" class="size-5" />
                                    </div>
                                    <div class="mt-4 text-lg font-semibold tracking-[-0.03em] text-[#231b15]">{{ segment.title }}</div>
                                    <p class="mt-2 text-sm leading-7 text-[#66584c]">{{ segment.copy }}</p>
                                </article>
                            </div>
                        </div>

                        <aside class="rounded-[16px] border border-[#ddd4c8] bg-[#f3ece3] px-5 py-6">
                            <h2 class="text-[1.55rem] font-semibold tracking-[-0.05em] text-[#231b15]">Why people reorder</h2>
                            <div class="mt-5 space-y-4">
                                <article v-for="reason in trustReasons" :key="reason.title" class="rounded-[14px] border border-[#e2d9cf] bg-white p-4">
                                    <div class="flex items-start gap-3">
                                        <div class="mt-1 flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#eee5db] text-[#4b3a2f]">
                                            <component :is="reason.icon" class="size-4.5" />
                                        </div>
                                        <div>
                                            <div class="text-sm font-semibold text-[#231b15]">{{ reason.title }}</div>
                                            <p class="mt-1 text-sm leading-6 text-[#66584c]">{{ reason.copy }}</p>
                                        </div>
                                    </div>
                                </article>
                            </div>

                            <div class="mt-5 rounded-[14px] border border-[#e2d9cf] bg-white px-4 py-4">
                                <div class="text-sm font-medium text-[#231b15]">Seen in guest rooms and studio kitchens</div>
                                <div class="mt-3 flex flex-wrap gap-2 text-sm text-[#6a5c50]">
                                    <span v-for="mark in partnerMarks" :key="mark" class="rounded-[999px] border border-[#e5ddd2] bg-[#fbf8f3] px-3 py-1.5">
                                        {{ mark }}
                                    </span>
                                </div>
                            </div>
                        </aside>
                    </section>

                    <section id="packs" class="rounded-[16px] border border-[#ddd4c8] bg-white px-5 py-6 md:px-6">
                        <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                            <div class="max-w-[40rem]">
                                <h2 class="text-[1.8rem] font-semibold tracking-[-0.05em] text-[#231b15]">Starter kits for people who want this to look planned</h2>
                                <p class="mt-2 text-sm leading-7 text-[#66584c]">Bundled reserve sets for guest arrivals, pitch rooms, and hospitality tables that need a cleaner opening move.</p>
                            </div>
                            <a href="#delivery" class="text-sm font-medium text-[#5f5146] transition-colors hover:text-[#231b15]">View delivery policy</a>
                        </div>

                        <div class="mt-6 grid gap-4 lg:grid-cols-3">
                            <article v-for="pack in starterKits" :key="pack.title" class="rounded-[14px] border border-[#e5ddd2] bg-[#fbf8f3] p-5">
                                <div class="flex items-start justify-between gap-3">
                                    <div>
                                        <div class="text-lg font-semibold tracking-[-0.03em] text-[#231b15]">{{ pack.title }}</div>
                                        <div class="mt-1 text-sm text-[#6d5f54]">{{ pack.price }}</div>
                                    </div>
                                    <div class="flex h-10 w-10 items-center justify-center rounded-[10px] bg-white text-[#4b3a2f]">
                                        <Box class="size-5" />
                                    </div>
                                </div>

                                <p class="mt-3 text-sm leading-7 text-[#66584c]">{{ pack.summary }}</p>
                                <ul class="mt-4 space-y-2 text-sm text-[#5a4d42]">
                                    <li v-for="item in pack.items" :key="`${pack.title}-${item}`" class="flex items-start gap-2">
                                        <span class="mt-[7px] h-1.5 w-1.5 rounded-full bg-[#6e5b46]" />
                                        <span>{{ item }}</span>
                                    </li>
                                </ul>
                                <div class="mt-5">
                                    <a href="#shop" class="inline-flex items-center gap-2 text-sm font-medium text-[#231b15] hover:text-[#52443a]">
                                        Build a custom reserve mix
                                        <ArrowRight class="size-4" />
                                    </a>
                                </div>
                            </article>
                        </div>
                    </section>

                    <section id="delivery" class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                        <div class="rounded-[16px] border border-[#ddd4c8] bg-white px-5 py-6 md:px-6">
                            <h2 class="text-[1.8rem] font-semibold tracking-[-0.05em] text-[#231b15]">How delivery works</h2>
                            <p class="mt-2 max-w-[42rem] text-sm leading-7 text-[#66584c]">Buying bottled air should not involve a complicated process, even if the product itself raises questions.</p>

                            <div class="mt-6 grid gap-4 md:grid-cols-3">
                                <article v-for="step in deliverySteps" :key="step.step" class="rounded-[14px] border border-[#e5ddd2] bg-[#fbf8f3] p-5">
                                    <div class="text-sm font-medium text-[#7b6a5e]">{{ step.step }}</div>
                                    <div class="mt-4 text-lg font-semibold tracking-[-0.03em] text-[#231b15]">{{ step.title }}</div>
                                    <p class="mt-2 text-sm leading-7 text-[#66584c]">{{ step.copy }}</p>
                                </article>
                            </div>
                        </div>

                        <aside id="faq" class="rounded-[16px] border border-[#ddd4c8] bg-[#f3ece3] px-5 py-6">
                            <div class="flex items-center gap-2 text-sm text-[#6f604f]">
                                <Clock3 class="size-4" />
                                <span>Questions people ask before buying bottled air</span>
                            </div>

                            <div class="mt-5 space-y-4">
                                <article v-for="item in faqItems" :key="item.question" class="rounded-[14px] border border-[#e4dbcf] bg-white p-4">
                                    <div class="text-sm font-semibold text-[#231b15]">{{ item.question }}</div>
                                    <p class="mt-2 text-sm leading-6 text-[#66584c]">{{ item.answer }}</p>
                                </article>
                            </div>

                            <div class="mt-5 rounded-[14px] border border-[#e2d9ce] bg-white p-4">
                                <div class="text-base font-semibold tracking-[-0.03em] text-[#231b15]">Support starts from the page you were on</div>
                                <p class="mt-2 text-sm leading-7 text-[#66584c]">If the reserve flow breaks, send the page directly to support instead of explaining the layout from memory.</p>
                                <button type="button" :class="`${primaryButtonClass} mt-4 w-full`" data-testid="faq-support" @click="openSupportWidget">
                                    Report a bug
                                </button>
                            </div>
                        </aside>
                    </section>
                </main>

                <footer class="border-t border-[#e5ddd1] px-5 py-5 md:px-8">
                    <div class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                        <div class="max-w-[32rem]">
                            <div class="text-lg font-semibold tracking-[-0.03em] text-[#231b15]">Air Supply Co.</div>
                            <p class="mt-2 text-sm leading-7 text-[#66584c]">Private reserves for hotels, studios, launches, and anyone who wants the room to feel like someone planned it.</p>
                        </div>
                        <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                            <a href="#shop" class="text-sm font-medium text-[#5f5146] hover:text-[#231b15]">Reserves</a>
                            <a href="#packs" class="text-sm font-medium text-[#5f5146] hover:text-[#231b15]">Starter kits</a>
                            <a href="#faq" class="text-sm font-medium text-[#5f5146] hover:text-[#231b15]">FAQ</a>
                            <button type="button" class="text-sm font-medium text-[#231b15] hover:text-[#52443a]" data-testid="footer-support" @click="openSupportWidget">
                                Support
                            </button>
                        </div>
                    </div>
                </footer>
            </div>
        </div>

        <AirStorefrontWidgetBridge
            :api-base-url="apiBaseUrl"
            :prefill-public-key="prefillPublicKey"
            :open-signal="supportLaunchSignal"
            site-name="Air Supply Co."
            page-label="Air Supply storefront"
        />
    </div>
</template>
