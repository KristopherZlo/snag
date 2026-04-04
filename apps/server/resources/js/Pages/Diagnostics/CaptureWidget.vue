<script setup>
import { Head } from '@inertiajs/vue3';
import {
    ArrowRight,
    Facebook,
    Instagram,
    Linkedin,
    Mail,
    Play,
    Search,
    ShoppingBag,
    Star,
    Truck,
    Twitter,
    UserCircle2,
    Wind,
} from 'lucide-vue-next';
import heroImage from '../../../images/diagnostics/air-storefront/storefront-hero.jpg';
import promoInteriorImage from '../../../images/diagnostics/air-storefront/storefront-editorial.jpg';
import promoStoryImage from '../../../images/diagnostics/air-storefront/storefront-story.jpg';
import AirStorefrontWidgetBridge from './Partials/AirStorefrontWidgetBridge.vue';

defineProps({
    apiBaseUrl: { type: String, required: true },
    docsUrl: { type: String, required: true },
    prefillPublicKey: { type: String, default: '' },
});

const navigationItems = [
    { label: 'Home', href: '#top' },
    { label: 'Shop', href: '#catalog' },
    { label: 'Stories', href: '#editorial' },
    { label: 'Support', href: '#support' },
];

const categoryChips = ['All', 'Home', 'Studio', 'Travel', 'Gift', 'Reserve'];

const reserveProducts = [
    {
        name: 'Coastal Dawn',
        category: 'Reserve',
        rating: '5.0',
        reviews: '1.2k Reviews',
        price: 'EUR 24.00',
    },
    {
        name: 'Studio Quiet',
        category: 'Studio',
        rating: '4.8',
        reviews: '804 Reviews',
        price: 'EUR 12.00',
    },
    {
        name: 'Lobby Quiet',
        category: 'Gift',
        rating: '4.4',
        reviews: '644 Reviews',
        price: 'EUR 29.90',
    },
    {
        name: 'Window Reserve',
        category: 'Home',
        rating: '4.8',
        reviews: '120 Reviews',
        price: 'EUR 50.00',
    },
    {
        name: 'Soft Morning',
        category: 'Travel',
        rating: '5.0',
        reviews: '1.2k Reviews',
        price: 'EUR 9.90',
    },
    {
        name: 'Night Room',
        category: 'Reserve',
        rating: '4.8',
        reviews: '2.4k Reviews',
        price: 'EUR 34.10',
    },
];

const categoryCards = [
    {
        label: 'Studio',
        title: 'Studio corners and slower working rooms',
        tone: 'Clean reserve notes for editing bays, desks, and late sessions.',
    },
    {
        label: 'Home',
        title: 'Home resets for bedrooms and entry tables',
        tone: 'Quiet air rituals for mornings, guests, and everyday resets.',
    },
    {
        label: 'Gift',
        title: 'Gift sets and seasonal reserve drops',
        tone: 'Limited batches for hosts, teams, and absurdly thoughtful presents.',
    },
];

const featureBullets = [
    { title: 'Small-batch dispatch', copy: 'Reserve notes, bottle returns, and one clean delivery window for every order.' },
    { title: 'Quiet product language', copy: 'Dense catalog blocks without marketplace noise or fake scarcity gimmicks.' },
    { title: 'Built for real browsing', copy: 'Search, categories, and editorial modules stay readable across the full landing.' },
];

const footerGroups = [
    { title: 'About', links: ['Blog', 'Meet the team', 'Contact us'] },
    { title: 'Support', links: ['Shipping', 'Return', 'FAQ'] },
];

const socialLinks = [
    { label: 'Twitter', icon: Twitter },
    { label: 'Facebook', icon: Facebook },
    { label: 'LinkedIn', icon: Linkedin },
    { label: 'Instagram', icon: Instagram },
];

const iconButtonClass = 'flex h-10 w-10 items-center justify-center rounded-full border border-[#ebe7df] bg-white text-[#181818] transition-colors hover:bg-[#f4f2ee]';
const outlineButtonClass = 'inline-flex items-center justify-center rounded-full border border-[#d9d3ca] bg-white px-4 py-2.5 text-sm font-medium text-[#181818] transition-colors hover:bg-[#f4f2ee]';
const solidButtonClass = 'inline-flex items-center justify-center rounded-full bg-[#181818] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0d0d0d]';
</script>

<template>
    <div class="min-h-screen bg-[#d9d7d2] px-4 py-6 text-[#181818] md:px-6 lg:px-8">
        <Head title="Air Supply Co." />

        <div class="mx-auto max-w-[1310px] overflow-hidden rounded-[30px] bg-[#f7f5f0] shadow-[0_28px_90px_rgba(35,30,24,0.12)]">
            <section id="top" class="px-6 pt-6 md:px-8 lg:px-10">
                <div class="relative overflow-hidden rounded-[28px] bg-[#d8d5cf]">
                    <img
                        :src="heroImage"
                        alt="Woman on a sofa browsing her phone in a bright modern interior."
                        class="absolute inset-0 h-full w-full -scale-x-100 object-cover object-center"
                    >
                    <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,16,16,0.08)_0%,rgba(16,16,16,0.0)_28%,rgba(247,245,240,0.0)_55%,rgba(247,245,240,0.96)_100%)]" />

                    <header class="relative z-20 mx-6 mt-6 flex items-center justify-between gap-4 rounded-[18px] bg-white/95 px-5 py-4 shadow-[0_14px_40px_rgba(36,31,26,0.08)] backdrop-blur-sm">
                        <div class="flex items-center gap-3">
                            <div class="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#efebe4] text-[#181818]">
                                <Wind class="size-5" />
                            </div>
                            <div>
                                <div class="text-xl font-semibold tracking-[-0.05em]">Air Supply Co.</div>
                                <div class="text-sm text-[#68635b]">Bottled atmosphere for deliberate rooms</div>
                            </div>
                        </div>

                        <nav class="hidden items-center gap-8 text-sm text-[#5f5a52] lg:flex">
                            <a v-for="item in navigationItems" :key="item.label" :href="item.href" class="transition-colors hover:text-[#181818]">
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

                    <div class="relative z-10 h-[520px] px-8 pb-10 pt-20">
                        <div class="absolute bottom-[10%] left-6 text-[clamp(7rem,18vw,12rem)] font-semibold leading-none tracking-[-0.11em] text-white/96 drop-shadow-[0_14px_32px_rgba(0,0,0,0.12)]">
                            Airsupply
                        </div>
                    </div>
                </div>

                <div class="relative z-20 -mt-24 mx-auto max-w-[1120px] rounded-[26px] bg-white px-6 py-6 shadow-[0_18px_42px_rgba(34,29,24,0.12)]">
                    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h1 class="text-[2rem] font-semibold tracking-[-0.06em] text-[#181818]">Give All You Need</h1>
                            <p class="mt-2 text-sm leading-7 text-[#5f5950]">
                                Reserve cards, gifting sets, and clean room atmosphere for homes, studios, and hospitality teams.
                            </p>
                        </div>

                        <div class="flex w-full max-w-[470px] items-center gap-2 rounded-full border border-[#e6e0d7] bg-[#faf8f4] px-4 py-3">
                            <Search class="size-4 shrink-0 text-[#6c665d]" />
                            <input type="text" value="Search the catalog" readonly class="min-w-0 flex-1 bg-transparent text-sm text-[#4e4942] outline-none">
                            <button type="button" :class="solidButtonClass">
                                Search
                            </button>
                        </div>
                    </div>

                    <div class="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div class="flex flex-wrap items-center gap-3">
                            <button
                                v-for="chip in categoryChips"
                                :key="chip"
                                type="button"
                                class="inline-flex items-center justify-center rounded-full border border-[#e8e2d9] bg-[#faf8f4] px-4 py-2 text-sm font-medium text-[#5f5950] transition-colors hover:bg-white hover:text-[#181818]"
                            >
                                {{ chip }}
                            </button>
                        </div>

                        <a href="#catalog" class="inline-flex items-center gap-2 text-sm font-medium text-[#181818] transition-opacity hover:opacity-70">
                            <span>See all products</span>
                            <ArrowRight class="size-4" />
                        </a>
                    </div>

                    <div id="catalog" class="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        <article v-for="product in reserveProducts" :key="product.name" class="rounded-[22px] border border-[#ece8e0] bg-white p-4">
                            <div class="relative overflow-hidden rounded-[20px] border border-[#efebe4] bg-[#f6f3ee]">
                                <span class="absolute right-4 top-4 z-10 rounded-full border border-white/80 bg-white/90 px-3 py-1 text-[11px] font-medium text-[#5f564a]">
                                    {{ product.category }}
                                </span>

                                <div class="aspect-[1/0.82] bg-[linear-gradient(180deg,#f6f3ee_0%,#efe9df_100%)]" />
                            </div>

                            <div class="mt-4">
                                <div class="text-xl font-semibold tracking-[-0.05em] text-[#181818]">{{ product.name }}</div>
                                <div class="mt-3 flex items-center justify-between gap-3">
                                    <div class="flex items-center gap-1 text-sm text-[#6b645b]">
                                        <Star class="size-4 fill-current text-[#f0a53c]" />
                                        <span>{{ product.rating }}</span>
                                        <span>({{ product.reviews }})</span>
                                    </div>
                                    <div class="text-[1.35rem] font-semibold tracking-[-0.04em] text-[#181818]">{{ product.price }}</div>
                                </div>
                                <div class="mt-4 flex items-center gap-2">
                                    <button type="button" :class="`${outlineButtonClass} flex-1 px-3`">Add to cart</button>
                                    <button type="button" :class="`${solidButtonClass} flex-1 px-3`">Buy now</button>
                                </div>
                            </div>
                        </article>
                    </div>
                </div>
            </section>

            <main class="px-6 pb-8 pt-8 md:px-8 lg:px-10">
                <section class="overflow-hidden rounded-[28px] bg-[#d8d5cf]">
                    <div class="relative h-[360px]">
                        <img
                            :src="promoStoryImage"
                            alt="Two women listening to music together on a sofa."
                            class="absolute inset-0 h-full w-full object-cover object-[center_50%]"
                            loading="lazy"
                        >
                        <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,20,20,0.02)_0%,rgba(20,20,20,0.12)_44%,rgba(17,17,17,0.74)_100%)]" />

                        <div class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 px-8 pb-7 text-white">
                            <div class="max-w-[34rem]">
                                <button type="button" class="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/20 px-3 py-1.5 text-sm font-medium backdrop-blur">
                                    <span class="flex h-6 w-6 items-center justify-center rounded-full border border-white/35">
                                        <Play class="size-3.5 fill-current" />
                                    </span>
                                    <span>Watch story</span>
                                </button>
                                <div class="mt-4 text-[2rem] font-semibold leading-[1.02] tracking-[-0.06em]">
                                    A quieter room, a cleaner ritual, and a storefront that feels ready to buy from.
                                </div>
                                <p class="mt-3 max-w-[32rem] text-sm leading-7 text-white/76">
                                    Air Supply Co. packages atmosphere like a premium home brand: calm merchandising, grounded copy, and no extra noise between discovery and checkout.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="editorial" class="mt-10 grid gap-8 xl:grid-cols-[0.86fr_1.14fr]">
                    <div class="rounded-[28px] bg-white px-6 py-6">
                        <div class="text-sm font-medium uppercase tracking-[0.18em] text-[#7a7368]">New arrival</div>
                        <h2 class="mt-3 text-[2.45rem] font-semibold leading-[0.96] tracking-[-0.08em] text-[#181818]">
                            Signature reserve layout with editorial breathing room
                        </h2>
                        <p class="mt-4 text-sm leading-7 text-[#5f5950]">
                            A clean hero, dense product grid, promotional story block, and category rail. The page reads like a retail destination instead of a diagnostics demo.
                        </p>

                        <div class="mt-8 space-y-5">
                            <div v-for="item in featureBullets" :key="item.title" class="flex items-start gap-4">
                                <div class="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-[#f2efe9] text-[#181818]">
                                    <Truck class="size-4" />
                                </div>
                                <div>
                                    <div class="text-base font-semibold tracking-[-0.03em] text-[#181818]">{{ item.title }}</div>
                                    <p class="mt-1 text-sm leading-6 text-[#5f5950]">{{ item.copy }}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="overflow-hidden rounded-[28px] border border-[#ebe6de] bg-[#f1eee8] p-4">
                        <div class="overflow-hidden rounded-[24px] bg-white/72 p-4">
                            <div class="relative aspect-[1.15/0.9] overflow-hidden rounded-[20px]">
                                <img
                                    :src="promoInteriorImage"
                                    alt="Bright, minimalist living room interior."
                                    class="h-full w-full object-cover object-center"
                                    loading="lazy"
                                >
                                <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.0)_0%,rgba(248,245,239,0.14)_100%)]" />
                            </div>
                        </div>
                    </div>
                </section>

                <section class="mt-10">
                    <div class="flex items-center justify-between gap-6">
                        <div>
                            <h2 class="text-[2.2rem] font-semibold leading-[1.02] tracking-[-0.07em] text-[#181818]">
                                Explore our curated categories and transform your living spaces
                            </h2>
                        </div>
                        <div class="hidden items-center gap-2 lg:flex">
                            <button type="button" :class="iconButtonClass" aria-label="Previous category">
                                <ArrowRight class="size-4 rotate-180" />
                            </button>
                            <button type="button" :class="iconButtonClass" aria-label="Next category">
                                <ArrowRight class="size-4" />
                            </button>
                        </div>
                    </div>

                    <div class="mt-6 grid gap-5 xl:grid-cols-3">
                        <article v-for="card in categoryCards" :key="card.title" class="overflow-hidden rounded-[24px] border border-[#ebe6de] bg-white p-4">
                            <div class="overflow-hidden rounded-[20px] border border-[#ece7df] bg-[#f3efe8]">
                                <div class="relative aspect-[1.2/0.78] bg-[linear-gradient(180deg,#f7f3ec_0%,#efe9e0_100%)]">
                                    <span class="absolute bottom-4 left-4 rounded-full bg-white/92 px-3 py-1 text-[11px] font-medium text-[#4d473e]">
                                        {{ card.label }}
                                    </span>
                                </div>
                            </div>
                            <div class="mt-4 text-lg font-semibold tracking-[-0.04em] text-[#181818]">{{ card.title }}</div>
                            <p class="mt-2 text-sm leading-7 text-[#5f5950]">{{ card.tone }}</p>
                        </article>
                    </div>
                </section>

                <section id="support" class="mt-10 rounded-[28px] bg-[#181818] px-6 py-6 text-white md:px-8">
                    <div class="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                        <div class="max-w-[26rem]">
                            <div class="text-[clamp(2.6rem,5vw,4.2rem)] font-semibold leading-[0.94] tracking-[-0.08em]">
                                Ready to get our new stuff?
                            </div>
                            <div class="mt-6 flex max-w-[320px] items-center gap-2 rounded-full bg-white px-2 py-2">
                                <Mail class="ml-3 size-4 shrink-0 text-[#676159]" />
                                <input type="email" value="Your email" readonly class="min-w-0 flex-1 bg-transparent text-sm text-[#5c554b] outline-none">
                                <button type="button" class="inline-flex items-center justify-center rounded-full bg-[#181818] px-4 py-2 text-sm font-medium text-white">
                                    Send
                                </button>
                            </div>
                        </div>

                        <div class="max-w-[23rem]">
                            <div class="text-base font-semibold tracking-[-0.03em] text-white">Air Supply for homes and studios</div>
                            <p class="mt-3 text-sm leading-7 text-white/72">
                                Get reserve drops, seasonal notes, and occasional rituals for rooms that want a softer atmosphere.
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            <footer class="border-t border-[#ece7df] px-6 py-6 md:px-8 lg:px-10">
                <div class="flex flex-col gap-8 md:flex-row md:justify-between">
                    <div class="grid gap-8 sm:grid-cols-2">
                        <div v-for="group in footerGroups" :key="group.title">
                            <div class="text-base font-semibold tracking-[-0.03em] text-[#181818]">{{ group.title }}</div>
                            <div class="mt-3 space-y-2">
                                <a
                                    v-for="link in group.links"
                                    :key="`${group.title}-${link}`"
                                    href="#support"
                                    class="block text-sm text-[#5f5950] transition-colors hover:text-[#181818]"
                                >
                                    {{ link }}
                                </a>
                            </div>
                        </div>
                    </div>

                    <div class="text-right">
                        <div class="text-sm font-medium text-[#7a7368]">Social media</div>
                        <div class="mt-3 flex items-center justify-end gap-2">
                            <button
                                v-for="item in socialLinks"
                                :key="item.label"
                                type="button"
                                :class="iconButtonClass"
                                :aria-label="item.label"
                            >
                                <component :is="item.icon" class="size-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </footer>
        </div>

        <AirStorefrontWidgetBridge
            :api-base-url="apiBaseUrl"
            :prefill-public-key="prefillPublicKey"
            site-name="Air Supply Co."
            page-label="Air Supply storefront"
        />
    </div>
</template>
