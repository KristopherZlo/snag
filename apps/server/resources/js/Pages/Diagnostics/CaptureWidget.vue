<script setup>
import { computed, ref } from 'vue';
import { Head } from '@inertiajs/vue3';
import {
    ArrowRight,
    ChevronRight,
    Headphones,
    Mail,
    Package2,
    Search,
    ShieldCheck,
    ShoppingBag,
    Star,
    Truck,
    UserCircle2,
    Wind,
} from 'lucide-vue-next';
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
    { label: 'Home', href: '#top' },
    { label: 'Shop', href: '#catalog' },
    { label: 'Stories', href: '#recommendations' },
    { label: 'Support', href: '#support' },
];

const heroHighlights = [
    'Small-batch atmosphere for suites, studios, and launches.',
    'Glass bottle reserves with delivery windows and return sleeves.',
    'A support flow that captures the exact page when checkout breaks.',
];

const sidebarCategories = [
    { label: 'All reserves', count: 12 },
    { label: 'For homes', count: 4 },
    { label: 'For hotels', count: 3 },
    { label: 'For studios', count: 3 },
    { label: 'For gifting', count: 2 },
];

const quickFilters = [
    'New arrival',
    'Best seller',
    'Small batch',
    'On dispatch today',
];

const reserveProducts = [
    {
        name: 'Coastal Dawn',
        subtitle: 'Baltic shoreline reserve',
        category: 'Coastal',
        rating: '5.0',
        reviews: '1.2k Reviews',
        price: 'EUR 24',
        visual: 'bottle',
        palette: { surface: '#f0f1ed', accent: '#294a4c', body: '#9eb8b1', label: '#faf7f1' },
    },
    {
        name: 'Summit Noon',
        subtitle: 'Cold ridge batch',
        category: 'Alpine',
        rating: '4.9',
        reviews: '912 Reviews',
        price: 'EUR 31',
        visual: 'carafe',
        palette: { surface: '#f2eee9', accent: '#4b3728', body: '#cec0b0', label: '#fbf7f1' },
    },
    {
        name: 'Lobby Quiet',
        subtitle: 'Check-in signature blend',
        category: 'Hotel',
        rating: '4.8',
        reviews: '644 Reviews',
        price: 'EUR 29',
        visual: 'capsule',
        palette: { surface: '#eff1f2', accent: '#3a4651', body: '#cad2d8', label: '#fcfbf7' },
    },
    {
        name: 'Pine Window',
        subtitle: 'Forest reserve',
        category: 'Studio',
        rating: '4.9',
        reviews: '780 Reviews',
        price: 'EUR 27',
        visual: 'bottle',
        palette: { surface: '#eef2eb', accent: '#42533c', body: '#a6b59f', label: '#f8f6ef' },
    },
    {
        name: 'Soft Rain Edit',
        subtitle: 'Late-evening neutral run',
        category: 'Edit room',
        rating: '4.7',
        reviews: '510 Reviews',
        price: 'EUR 19',
        visual: 'column',
        palette: { surface: '#f0efec', accent: '#44444d', body: '#d6d6d2', label: '#fbfaf6' },
    },
    {
        name: 'Event Lift',
        subtitle: 'Short-run hospitality pack',
        category: 'Launch',
        rating: '4.8',
        reviews: '402 Reviews',
        price: 'EUR 34',
        visual: 'capsule',
        palette: { surface: '#f2efe7', accent: '#594733', body: '#d9c5b1', label: '#fcfaf5' },
    },
    {
        name: 'Studio Reset',
        subtitle: 'Desk-safe reserve',
        category: 'Other',
        rating: '5.0',
        reviews: '1.1k Reviews',
        price: 'EUR 21',
        visual: 'column',
        palette: { surface: '#efefec', accent: '#39404f', body: '#c4c8d0', label: '#f9f6f0' },
    },
    {
        name: 'Window Service',
        subtitle: 'Suite arrival pair',
        category: 'Home',
        rating: '4.8',
        reviews: '338 Reviews',
        price: 'EUR 42',
        visual: 'carafe',
        palette: { surface: '#f1eee7', accent: '#5a4633', body: '#d4c3b0', label: '#faf7f1' },
    },
    {
        name: 'After Hours',
        subtitle: 'Night-shift reserve',
        category: 'Music',
        rating: '4.9',
        reviews: '590 Reviews',
        price: 'EUR 26',
        visual: 'bottle',
        palette: { surface: '#eceff3', accent: '#324253', body: '#9eaebc', label: '#f7f6f1' },
    },
];

const recommendedProducts = reserveProducts.slice(2, 6);
const featuredReserve = computed(() => reserveProducts[1]);

const trustItems = [
    {
        title: 'Dispatch windows you can actually understand',
        copy: 'Reserve, pay, and get a real delivery slot without digging through a fake funnel.',
        icon: Truck,
    },
    {
        title: 'Support starts from the page you were on',
        copy: 'If checkout breaks, the widget captures the current page instead of asking for a vague description.',
        icon: ShieldCheck,
    },
    {
        title: 'Bottled with provenance, not random copy',
        copy: 'Every reserve has a source note, return sleeve, and a reason it exists in the catalog.',
        icon: Package2,
    },
];

const footerGroups = [
    { title: 'About', links: ['Journal', 'Wholesale', 'Our team', 'Contact'] },
    { title: 'Support', links: ['Shipping', 'Returns', 'Reserve guide', 'FAQ'] },
];

const iconButtonClass = 'flex h-10 w-10 items-center justify-center rounded-full border border-[#ece8e0] bg-white text-[#171717] transition-colors hover:bg-[#f4f2ed]';
const outlineButtonClass = 'inline-flex items-center justify-center rounded-full border border-[#d9d3ca] bg-white px-4 py-2.5 text-sm font-medium text-[#171717] transition-colors hover:bg-[#f4f2ed]';
const solidButtonClass = 'inline-flex items-center justify-center rounded-full bg-[#171717] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0d0d0d]';
</script>

<template>
    <div class="min-h-screen bg-[#d9d7d2] px-4 py-6 text-[#171717] md:px-6 lg:px-8">
        <Head title="Air Supply Co." />

        <div class="mx-auto max-w-[1360px] overflow-hidden rounded-[34px] bg-[#f7f5f0] shadow-[0_24px_80px_rgba(35,30,24,0.12)]">
            <section id="top" class="relative overflow-hidden bg-[#d7d4ce] px-5 pb-24 pt-5 md:px-8 lg:px-10 lg:pb-28">
                <div class="absolute inset-0">
                    <div class="absolute inset-x-0 top-0 h-[74%] bg-[linear-gradient(180deg,#d9d6d1_0%,#cecbc5_100%)]" />
                    <div class="absolute left-[7%] top-[18%] hidden h-[210px] w-[18%] rounded-[14px] border border-white/40 bg-[linear-gradient(180deg,#b6b2ab_0%,#d8d5ce_100%)] lg:block" />
                    <div class="absolute left-[29%] top-[16%] hidden h-[232px] w-[16%] rounded-[16px] border border-white/40 bg-[linear-gradient(180deg,#a7a39b_0%,#d8d5cd_100%)] lg:block" />
                    <div class="absolute right-[22%] top-[16%] hidden h-[232px] w-[16%] rounded-[16px] border border-white/40 bg-[linear-gradient(180deg,#a7a39b_0%,#d8d5cd_100%)] lg:block" />
                    <div class="absolute right-[6%] top-[12%] hidden h-[270px] w-[17%] rounded-[18px] border border-white/40 bg-[linear-gradient(180deg,#efefec_0%,#cfcac2_100%)] lg:block" />
                    <div class="absolute bottom-0 left-0 right-0 h-[34%] bg-[linear-gradient(180deg,rgba(247,245,240,0)_0%,rgba(247,245,240,0.96)_100%)]" />
                </div>

                <header class="relative z-20 mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4 rounded-[18px] bg-white/95 px-5 py-4 shadow-[0_14px_40px_rgba(36,31,26,0.08)]">
                    <div class="flex items-center gap-3">
                        <div class="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#efebe4] text-[#1c1c1c]">
                            <Wind class="size-5" />
                        </div>
                        <div>
                            <div class="text-xl font-semibold tracking-[-0.05em]">Air Supply Co.</div>
                            <div class="text-sm text-[#6a655c]">Bottled atmosphere for deliberate rooms</div>
                        </div>
                    </div>

                    <nav class="hidden items-center gap-8 text-sm text-[#5d5a55] lg:flex">
                        <a v-for="item in navigationItems" :key="item.label" :href="item.href" class="transition-colors hover:text-[#171717]">
                            {{ item.label }}
                        </a>
                    </nav>

                    <div class="flex items-center gap-2">
                        <button type="button" :class="iconButtonClass" aria-label="Search catalog">
                            <Search class="size-4" />
                        </button>
                        <button type="button" :class="iconButtonClass" aria-label="Reserve cart">
                            <ShoppingBag class="size-4" />
                        </button>
                        <button type="button" :class="iconButtonClass" aria-label="Account">
                            <UserCircle2 class="size-4" />
                        </button>
                    </div>
                </header>

                <div class="relative z-10 mx-auto mt-14 grid max-w-[1120px] gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
                    <div class="relative min-h-[250px] pt-24">
                        <div class="pointer-events-none absolute left-0 top-0 text-[clamp(5.5rem,20vw,14rem)] font-semibold leading-none tracking-[-0.12em] text-white/92">
                            Air
                        </div>
                        <div class="relative max-w-[30rem]">
                            <p class="text-sm font-medium uppercase tracking-[0.22em] text-[#74695c]">Limited weekly reserves</p>
                            <h1 class="mt-5 text-[clamp(2.5rem,5vw,4rem)] font-semibold leading-[0.94] tracking-[-0.08em] text-[#171717]">
                                Give the room a better story.
                            </h1>
                            <p class="mt-5 text-[15px] leading-7 text-[#4f4b45]">
                                A polished storefront for coastal, alpine, and studio air. Ridiculous as a premise, serious as a buying experience.
                            </p>
                            <div class="mt-6 flex flex-wrap gap-3">
                                <a href="#catalog" :class="solidButtonClass">Shop reserves</a>
                                <button type="button" :class="outlineButtonClass" data-testid="capture-widget-open" @click="openSupportWidget">
                                    Report a bug
                                </button>
                            </div>
                        </div>
                    </div>

                    <aside class="rounded-[24px] border border-white/60 bg-white/88 p-5 shadow-[0_14px_40px_rgba(36,31,26,0.08)] backdrop-blur">
                        <div class="flex items-start justify-between gap-3">
                            <div>
                                <div class="text-sm text-[#71685e]">Today's reserve</div>
                                <div class="mt-2 text-[1.75rem] font-semibold tracking-[-0.06em] text-[#171717]">{{ featuredReserve.name }}</div>
                            </div>
                            <span class="rounded-full border border-[#e7e1d6] bg-[#faf8f3] px-3 py-1 text-xs font-medium text-[#5f5547]">Ships today</span>
                        </div>

                        <div class="mt-5 rounded-[20px] border border-[#e8e2d8] p-4" :style="{ backgroundColor: featuredReserve.palette.surface }">
                            <div class="flex items-center gap-4">
                                <div class="flex h-[136px] w-[82px] items-end justify-center rounded-[32px] border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.18)_100%)] px-2 pb-3 pt-3">
                                    <div class="relative h-full w-full rounded-[24px]" :style="{ backgroundColor: featuredReserve.palette.body }">
                                        <div class="absolute left-1/2 top-[-8px] h-5 w-7 -translate-x-1/2 rounded-t-[10px]" :style="{ backgroundColor: featuredReserve.palette.accent }" />
                                        <div class="absolute inset-x-2 top-10 rounded-[8px] border px-1 py-2 text-center text-[10px] font-semibold tracking-[0.16em]" :style="{ backgroundColor: featuredReserve.palette.label, borderColor: `${featuredReserve.palette.accent}22`, color: featuredReserve.palette.accent }">
                                            AIR
                                        </div>
                                    </div>
                                </div>

                                <div class="min-w-0">
                                    <div class="text-sm text-[#5e554b]">{{ featuredReserve.subtitle }}</div>
                                    <div class="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#171717]">{{ featuredReserve.price }}</div>
                                    <div class="mt-2 flex items-center gap-2 text-sm text-[#5e554b]">
                                        <Star class="size-4 fill-current text-[#f4a33d]" />
                                        <span>{{ featuredReserve.rating }}</span>
                                        <span>{{ featuredReserve.reviews }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <ul class="mt-5 space-y-3 text-sm text-[#4f4b45]">
                            <li v-for="item in heroHighlights" :key="item" class="flex items-start gap-3">
                                <span class="mt-1.5 h-2 w-2 rounded-full bg-[#171717]" />
                                <span>{{ item }}</span>
                            </li>
                        </ul>
                    </aside>
                </div>
            </section>

            <main class="-mt-14 px-4 pb-8 md:px-6 lg:px-8">
                <section class="relative z-20 rounded-[28px] bg-white px-5 py-6 shadow-[0_18px_40px_rgba(34,29,24,0.1)] md:px-6 md:py-7">
                    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 class="text-[2rem] font-semibold tracking-[-0.06em] text-[#171717]">Give the room what it needs</h2>
                            <p class="mt-2 text-sm leading-7 text-[#5f5950]">
                                Reserve cards, gifting sets, and low-drama air for homes, hotels, and creative teams.
                            </p>
                        </div>

                        <div class="flex w-full max-w-[520px] items-center gap-2 rounded-full border border-[#e6e0d7] bg-[#faf8f4] px-4 py-3">
                            <Search class="size-4 shrink-0 text-[#6c665d]" />
                            <input type="text" value="Search reserve notes, room types, or dispatch windows" class="min-w-0 flex-1 bg-transparent text-sm text-[#4e4942] outline-none" readonly>
                            <button type="button" :class="solidButtonClass" data-testid="search-support" @click="openSupportWidget">
                                Need help?
                            </button>
                        </div>
                    </div>

                    <div id="catalog" class="mt-7 grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
                        <aside class="space-y-5 rounded-[22px] border border-[#efebe4] bg-[#faf8f4] p-4">
                            <div>
                                <div class="text-lg font-semibold tracking-[-0.04em] text-[#171717]">Category</div>
                                <div class="mt-4 space-y-2">
                                    <button
                                        v-for="item in sidebarCategories"
                                        :key="item.label"
                                        type="button"
                                        class="flex w-full items-center justify-between rounded-[16px] border border-transparent px-3 py-3 text-left text-sm text-[#4f4b45] transition-colors hover:border-[#e7e1d7] hover:bg-white"
                                    >
                                        <span>{{ item.label }}</span>
                                        <span class="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[#61584d]">{{ item.count }}</span>
                                    </button>
                                </div>
                            </div>

                            <div class="border-t border-[#e9e3db] pt-4">
                                <div class="text-sm font-medium text-[#6a645a]">Browse by</div>
                                <div class="mt-3 space-y-2">
                                    <button
                                        v-for="filter in quickFilters"
                                        :key="filter"
                                        type="button"
                                        class="flex w-full items-center justify-between rounded-[14px] px-2 py-2 text-left text-sm text-[#555047] transition-colors hover:bg-white"
                                    >
                                        <span>{{ filter }}</span>
                                        <ChevronRight class="size-4 text-[#7c756a]" />
                                    </button>
                                </div>
                            </div>

                            <div class="rounded-[20px] bg-[#171717] p-4 text-white" data-testid="sidebar-support-card">
                                <div class="flex items-center gap-2 text-sm text-white/80">
                                    <Headphones class="size-4" />
                                    <span>Support</span>
                                </div>
                                <div class="mt-3 text-xl font-semibold tracking-[-0.05em]">Checkout not working?</div>
                                <p class="mt-2 text-sm leading-6 text-white/72">
                                    Send the live page to support without leaving the storefront.
                                </p>
                                <button type="button" class="mt-4 inline-flex items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-medium text-[#171717]" data-testid="sidebar-support" @click="openSupportWidget">
                                    Report a checkout issue
                                </button>
                            </div>
                        </aside>

                        <div class="space-y-5">
                            <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                                <article v-for="product in reserveProducts" :key="product.name" class="group rounded-[22px] border border-[#ece8e0] bg-white p-4 transition-transform hover:-translate-y-0.5">
                                    <div class="relative overflow-hidden rounded-[22px] border border-[#efebe4] p-4" :style="{ backgroundColor: product.palette.surface }">
                                        <span class="absolute right-4 top-4 rounded-full border border-white/80 bg-white/90 px-3 py-1 text-[11px] font-medium text-[#5f564a]">
                                            {{ product.category }}
                                        </span>

                                        <div class="flex aspect-[1/0.9] items-center justify-center">
                                            <div v-if="product.visual === 'bottle'" class="flex h-[190px] w-[94px] items-end justify-center rounded-[34px] border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0.18)_100%)] px-2 pb-4 pt-3">
                                                <div class="relative h-full w-full rounded-[25px]" :style="{ backgroundColor: product.palette.body }">
                                                    <div class="absolute left-1/2 top-[-8px] h-5 w-7 -translate-x-1/2 rounded-t-[10px]" :style="{ backgroundColor: product.palette.accent }" />
                                                    <div class="absolute inset-x-2 top-11 rounded-[8px] border px-1 py-2 text-center text-[10px] font-semibold tracking-[0.16em]" :style="{ backgroundColor: product.palette.label, borderColor: `${product.palette.accent}22`, color: product.palette.accent }">
                                                        RESERVE
                                                    </div>
                                                </div>
                                            </div>

                                            <div v-else-if="product.visual === 'carafe'" class="relative flex h-[180px] w-[136px] items-end justify-center">
                                                <div class="h-[150px] w-[98px] rounded-[32px_32px_22px_22px] border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,255,255,0.2)_100%)] p-3">
                                                    <div class="relative h-full rounded-[24px_24px_18px_18px]" :style="{ backgroundColor: product.palette.body }">
                                                        <div class="absolute left-1/2 top-[-18px] h-10 w-10 -translate-x-1/2 rounded-[14px] border border-black/10 bg-white/70" />
                                                        <div class="absolute inset-x-3 top-10 rounded-[8px] border px-1 py-2 text-center text-[10px] font-semibold tracking-[0.16em]" :style="{ backgroundColor: product.palette.label, borderColor: `${product.palette.accent}22`, color: product.palette.accent }">
                                                            AIR
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div v-else-if="product.visual === 'column'" class="relative flex h-[180px] w-[120px] items-end justify-center">
                                                <div class="h-[158px] w-[88px] rounded-[28px] border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0.24)_100%)] p-3">
                                                    <div class="relative h-full rounded-[22px]" :style="{ backgroundColor: product.palette.body }">
                                                        <div class="absolute inset-x-3 top-9 rounded-[10px] border px-1 py-2 text-center text-[10px] font-semibold tracking-[0.16em]" :style="{ backgroundColor: product.palette.label, borderColor: `${product.palette.accent}22`, color: product.palette.accent }">
                                                            SOFT
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div v-else class="relative flex h-[180px] w-[180px] items-center justify-center">
                                                <div class="h-[128px] w-[128px] rounded-full border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0.22)_100%)] p-3">
                                                    <div class="relative h-full w-full rounded-full" :style="{ backgroundColor: product.palette.body }">
                                                        <div class="absolute inset-x-7 top-[32%] rounded-full border px-1 py-1.5 text-center text-[10px] font-semibold tracking-[0.16em]" :style="{ backgroundColor: product.palette.label, borderColor: `${product.palette.accent}22`, color: product.palette.accent }">
                                                            AIR
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="mt-4">
                                        <div class="text-xl font-semibold tracking-[-0.05em] text-[#171717]">{{ product.name }}</div>
                                        <div class="mt-1 text-sm text-[#6b645b]">{{ product.subtitle }}</div>
                                        <div class="mt-3 flex items-center justify-between gap-3">
                                            <div class="flex items-center gap-1 text-sm text-[#6b645b]">
                                                <Star class="size-4 fill-current text-[#f0a53c]" />
                                                <span>{{ product.rating }}</span>
                                                <span>({{ product.reviews }})</span>
                                            </div>
                                            <div class="text-[1.4rem] font-semibold tracking-[-0.04em] text-[#171717]">{{ product.price }}</div>
                                        </div>
                                        <div class="mt-4 flex items-center gap-2">
                                            <button type="button" :class="`${outlineButtonClass} flex-1 px-3`">Add to reserve</button>
                                            <button type="button" :class="`${solidButtonClass} flex-1 px-3`">Buy now</button>
                                        </div>
                                    </div>
                                </article>
                            </div>

                            <div class="flex items-center justify-between rounded-[20px] border border-[#ece8e0] bg-[#faf8f4] px-4 py-4 text-sm text-[#5d574d]">
                                <button type="button" class="inline-flex items-center gap-2 font-medium text-[#171717]">
                                    <ArrowRight class="size-4 rotate-180" />
                                    <span>Previous</span>
                                </button>
                                <div class="flex items-center gap-2">
                                    <span class="flex h-8 w-8 items-center justify-center rounded-full bg-white font-medium text-[#171717]">1</span>
                                    <span>2</span>
                                    <span>3</span>
                                    <span>...</span>
                                    <span>10</span>
                                </div>
                                <button type="button" class="inline-flex items-center gap-2 font-medium text-[#171717]">
                                    <span>Next</span>
                                    <ArrowRight class="size-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="recommendations" class="mt-8 rounded-[28px] bg-white px-5 py-6 md:px-6 md:py-7">
                    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 class="text-[2rem] font-semibold tracking-[-0.06em] text-[#171717]">Explore our recommendations</h2>
                            <p class="mt-2 text-sm leading-7 text-[#5f5950]">
                                A few reserve profiles customers reorder when they want the room to feel expensive without explaining why.
                            </p>
                        </div>
                        <div class="flex items-center gap-2">
                            <button type="button" :class="iconButtonClass" aria-label="Previous recommendation">
                                <ArrowRight class="size-4 rotate-180" />
                            </button>
                            <button type="button" :class="iconButtonClass" aria-label="Next recommendation">
                                <ArrowRight class="size-4" />
                            </button>
                        </div>
                    </div>

                    <div class="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        <article v-for="product in recommendedProducts" :key="`recommended-${product.name}`" class="rounded-[22px] border border-[#ece8e0] bg-[#faf8f4] p-4">
                            <div class="overflow-hidden rounded-[20px] border border-[#efebe4] p-4" :style="{ backgroundColor: product.palette.surface }">
                                <div class="flex aspect-[1/0.82] items-center justify-center">
                                    <div class="h-[150px] w-[88px] rounded-[28px] border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0.18)_100%)] p-3">
                                        <div class="relative h-full rounded-[22px]" :style="{ backgroundColor: product.palette.body }">
                                            <div class="absolute inset-x-3 top-9 rounded-[10px] border px-1 py-2 text-center text-[10px] font-semibold tracking-[0.16em]" :style="{ backgroundColor: product.palette.label, borderColor: `${product.palette.accent}22`, color: product.palette.accent }">
                                                {{ product.category }}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="mt-4">
                                <div class="text-xl font-semibold tracking-[-0.05em] text-[#171717]">{{ product.name }}</div>
                                <div class="mt-3 flex items-center justify-between gap-3">
                                    <div class="flex items-center gap-1 text-sm text-[#6b645b]">
                                        <Star class="size-4 fill-current text-[#f0a53c]" />
                                        <span>{{ product.rating }}</span>
                                        <span>({{ product.reviews }})</span>
                                    </div>
                                    <div class="text-[1.35rem] font-semibold tracking-[-0.04em] text-[#171717]">{{ product.price }}</div>
                                </div>
                                <div class="mt-4 flex items-center gap-2">
                                    <button type="button" :class="`${outlineButtonClass} flex-1 px-3`">Add to reserve</button>
                                    <button type="button" :class="`${solidButtonClass} flex-1 px-3`">Buy now</button>
                                </div>
                            </div>
                        </article>
                    </div>
                </section>

                <section id="support" class="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                    <div class="rounded-[28px] bg-[#171717] px-5 py-6 text-white md:px-6 md:py-7">
                        <div class="max-w-[28rem]">
                            <div class="text-[clamp(2.4rem,4.5vw,4rem)] font-semibold leading-[0.95] tracking-[-0.08em]">
                                Ready to get our next reserve note?
                            </div>
                            <p class="mt-4 text-sm leading-7 text-white/72">
                                Join the weekly dispatch letter for release drops, new room pairings, and the occasional explanation of why bottled air is now a gifting category.
                            </p>
                        </div>

                        <div class="mt-8 flex max-w-[360px] items-center gap-2 rounded-full bg-white px-2 py-2">
                            <Mail class="ml-3 size-4 shrink-0 text-[#676159]" />
                            <input type="email" value="Your email" readonly class="min-w-0 flex-1 bg-transparent text-sm text-[#5c554b] outline-none">
                            <button type="button" class="inline-flex items-center justify-center rounded-full bg-[#171717] px-4 py-2 text-sm font-medium text-white">
                                Send
                            </button>
                        </div>
                    </div>

                    <div class="grid gap-4">
                        <article v-for="item in trustItems" :key="item.title" class="rounded-[24px] bg-white px-5 py-5">
                            <div class="flex items-start gap-4">
                                <div class="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#f4f1ea] text-[#171717]">
                                    <component :is="item.icon" class="size-5" />
                                </div>
                                <div>
                                    <div class="text-lg font-semibold tracking-[-0.04em] text-[#171717]">{{ item.title }}</div>
                                    <p class="mt-2 text-sm leading-7 text-[#5f5950]">{{ item.copy }}</p>
                                </div>
                            </div>
                        </article>

                        <div class="rounded-[24px] bg-white px-5 py-5">
                            <div class="text-lg font-semibold tracking-[-0.04em] text-[#171717]">Need support right now?</div>
                            <p class="mt-2 text-sm leading-7 text-[#5f5950]">
                                Open the widget, capture the page, and send it to support with the exact checkout state attached.
                            </p>
                            <button type="button" :class="`${solidButtonClass} mt-4`" data-testid="footer-support" @click="openSupportWidget">
                                Report a bug
                            </button>
                        </div>
                    </div>
                </section>
            </main>

            <footer class="border-t border-[#ece7df] px-5 py-6 md:px-6">
                <div class="flex flex-col gap-8 md:flex-row md:justify-between">
                    <div class="max-w-[22rem]">
                        <div class="text-xl font-semibold tracking-[-0.05em] text-[#171717]">Air Supply Co.</div>
                        <p class="mt-3 text-sm leading-7 text-[#5f5950]">
                            A diagnostics storefront that should feel like a real retail surface, not an internal demo page.
                        </p>
                    </div>

                    <div class="grid gap-8 sm:grid-cols-2">
                        <div v-for="group in footerGroups" :key="group.title">
                            <div class="text-base font-semibold tracking-[-0.03em] text-[#171717]">{{ group.title }}</div>
                            <div class="mt-3 space-y-2">
                                <a
                                    v-for="link in group.links"
                                    :key="`${group.title}-${link}`"
                                    href="#support"
                                    class="block text-sm text-[#5f5950] transition-colors hover:text-[#171717]"
                                >
                                    {{ link }}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
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
