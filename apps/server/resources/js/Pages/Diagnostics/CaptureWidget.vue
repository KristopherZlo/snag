<script setup>
import { ref } from 'vue';
import { Head } from '@inertiajs/vue3';
import {
    ArrowRight,
    Mail,
    Search,
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
    { label: 'Stories', href: '#editorial' },
    { label: 'Support', href: '#support' },
];

const categoryChips = ['All', 'Home', 'Music', 'Phone', 'Storage', 'Other'];

const reserveProducts = [
    { name: 'Coastal Dawn', category: 'Other', rating: '5.0', reviews: '1.2k Reviews', price: 'EUR 24.00' },
    { name: 'Headsound Alpine', category: 'Music', rating: '4.8', reviews: '804 Reviews', price: 'EUR 12.00' },
    { name: 'Lobby Quiet', category: 'Other', rating: '4.4', reviews: '644 Reviews', price: 'EUR 29.90' },
    { name: 'Suite Camera Air', category: 'Home', rating: '4.8', reviews: '120 Reviews', price: 'EUR 50.00' },
    { name: 'Soft Studio', category: 'Other', rating: '5.0', reviews: '1.2k Reviews', price: 'EUR 9.90' },
    { name: 'Night Shift Pods', category: 'Music', rating: '4.8', reviews: '2.4k Reviews', price: 'EUR 34.10' },
];

const categoryCards = [
    { label: 'Music', title: 'Sound systems and listening rooms', tone: 'Warm brass and speaker corners.' },
    { label: 'Home', title: 'Home setups with cleaner atmosphere', tone: 'Desk, phone, and entry-table rituals.' },
    { label: 'Storage', title: 'Shelving, gifting, and room staging', tone: 'Quiet corners with curated reserve notes.' },
];

const featureBullets = [
    { title: 'Super clean dispatch', copy: 'Reserve notes, bottle returns, and one clean delivery window.' },
    { title: 'Support-ready checkout', copy: 'If anything breaks, the page can be captured and sent directly to support.' },
    { title: 'Simple catalog structure', copy: 'One storefront, one visible grid, and no fake funnel drama.' },
];

const footerGroups = [
    { title: 'About', links: ['Blog', 'Meet the team', 'Contact us'] },
    { title: 'Support', links: ['Shipping', 'Return', 'FAQ'] },
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
                    <div class="absolute inset-0 bg-[linear-gradient(180deg,#d6d3ce_0%,#cecac3_48%,#c8c4bd_100%)]" />
                    <div class="absolute inset-x-[9%] top-[18%] h-[58%] rounded-[18px] border border-white/35 bg-[linear-gradient(180deg,#ebe9e3_0%,#d2cdc6_100%)] opacity-90" />
                    <div class="absolute left-[6%] top-[18%] h-[56%] w-[18%] rounded-[16px] border border-white/35 bg-[linear-gradient(180deg,#a7a197_0%,#d5d0c7_100%)]" />
                    <div class="absolute right-[8%] top-[18%] h-[56%] w-[18%] rounded-[16px] border border-white/35 bg-[linear-gradient(180deg,#efece7_0%,#d1cbc3_100%)]" />
                    <div class="absolute left-[38%] top-[13%] h-[64%] w-[24%] rounded-[140px] bg-[radial-gradient(circle_at_50%_28%,#f0cf78_0%,#e4b048_30%,#88592d_31%,#7f5632_43%,#d7cab8_44%,#d7cab8_100%)] opacity-95" />
                    <div class="absolute left-[44%] top-[34%] h-[45%] w-[19%] rounded-[90px_90px_24px_24px] bg-[linear-gradient(180deg,#f4c8bf_0%,#c69182_100%)] opacity-85" />
                    <div class="absolute left-[31%] top-[41%] h-[28%] w-[16%] rounded-[120px_120px_20px_20px] bg-[linear-gradient(180deg,#b78c76_0%,#8c6856_100%)] opacity-72" />
                    <div class="absolute right-[23%] top-[50%] h-[18%] w-[20%] rounded-[120px] bg-[linear-gradient(180deg,#b59278_0%,#8e6f5e_100%)] opacity-72" />
                    <div class="absolute bottom-0 left-0 right-0 h-[38%] bg-[linear-gradient(180deg,rgba(247,245,240,0)_0%,rgba(247,245,240,0.94)_100%)]" />

                    <header class="relative z-20 mx-6 mt-6 flex items-center justify-between gap-4 rounded-[18px] bg-white/95 px-5 py-4 shadow-[0_14px_40px_rgba(36,31,26,0.08)]">
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
                        <div class="absolute bottom-[10%] left-6 text-[clamp(7rem,18vw,12rem)] font-semibold leading-none tracking-[-0.11em] text-white/96">
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
                            <button type="button" :class="solidButtonClass" data-testid="search-support" @click="openSupportWidget">
                                Search
                            </button>
                        </div>
                    </div>

                    <div class="mt-5 flex flex-wrap items-center gap-3">
                        <button
                            v-for="chip in categoryChips"
                            :key="chip"
                            type="button"
                            class="inline-flex items-center justify-center rounded-full border border-[#e8e2d9] bg-[#faf8f4] px-4 py-2 text-sm font-medium text-[#5f5950] transition-colors hover:bg-white hover:text-[#181818]"
                        >
                            {{ chip }}
                        </button>

                        <button type="button" :class="outlineButtonClass" data-testid="capture-widget-open" @click="openSupportWidget">
                            Report a bug
                        </button>
                    </div>

                    <div id="catalog" class="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        <article v-for="product in reserveProducts" :key="product.name" class="rounded-[22px] border border-[#ece8e0] bg-white p-4">
                            <div class="relative overflow-hidden rounded-[20px] border border-[#efebe4] bg-[#f6f3ee] p-4">
                                <span class="absolute right-4 top-4 rounded-full border border-white/80 bg-white/90 px-3 py-1 text-[11px] font-medium text-[#5f564a]">
                                    {{ product.category }}
                                </span>

                                <div class="flex aspect-[1/0.82] items-center justify-center">
                                    <div class="w-full max-w-[240px] rounded-[20px] border border-[#ddd6ca] bg-white/80 p-4">
                                        <div class="aspect-[1/0.78] rounded-[16px] border-2 border-dashed border-[#d3ccbf] bg-[#faf7f1] p-3">
                                            <div class="flex h-full flex-col">
                                                <div class="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.16em] text-[#8a8377]">
                                                    <span>Placeholder</span>
                                                    <span>{{ product.category }}</span>
                                                </div>
                                                <div class="relative mt-3 flex-1 overflow-hidden rounded-[12px] border border-[#e5dfd5] bg-[linear-gradient(180deg,#ffffff_0%,#f1ece5_100%)]">
                                                    <div class="absolute inset-0 bg-[linear-gradient(135deg,transparent_49.2%,#d7d1c6_49.2%,#d7d1c6_50.8%,transparent_50.8%),linear-gradient(45deg,transparent_49.2%,#d7d1c6_49.2%,#d7d1c6_50.8%,transparent_50.8%)]" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
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
                    <div class="relative h-[320px]">
                        <div class="absolute inset-0 bg-[linear-gradient(180deg,#d9d7d1_0%,#cecac2_100%)]" />
                        <div class="absolute right-[10%] top-[14%] h-[62%] w-[34%] rounded-[120px] bg-[radial-gradient(circle_at_55%_22%,#efefec_0%,#d6d7d7_30%,#c6c8cb_31%,#b7b9bd_44%,#d6cfc5_45%,#d6cfc5_100%)]" />
                        <div class="absolute right-[22%] top-[38%] h-[38%] w-[22%] rounded-[120px] bg-[linear-gradient(180deg,#f3f0eb_0%,#b8c0c6_100%)] opacity-80" />
                        <div class="absolute left-[8%] bottom-[18%] h-[34%] w-[52%] rounded-[26px] bg-[linear-gradient(180deg,#dad7d1_0%,#c6c1b8_100%)] opacity-80" />
                        <div class="absolute inset-x-0 bottom-0 h-[48%] bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(17,17,17,0.7)_100%)]" />

                        <div class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 px-8 pb-7 text-white">
                            <div class="max-w-[34rem]">
                                <button type="button" class="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/20 px-3 py-1.5 text-sm font-medium backdrop-blur" data-testid="banner-support" @click="openSupportWidget">
                                    <span class="flex h-5 w-5 items-center justify-center rounded-full border border-white/35 text-[11px]">▶</span>
                                    <span>Need help?</span>
                                </button>
                                <div class="mt-4 text-[2rem] font-semibold leading-[1.02] tracking-[-0.06em]">
                                    When your home wants a cleaner mood and your checkout still needs to behave.
                                </div>
                                <p class="mt-3 max-w-[32rem] text-sm leading-7 text-white/76">
                                    This diagnostics storefront keeps the support flow close to the shopping surface instead of hiding it in a help center maze.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="editorial" class="mt-10 grid gap-8 xl:grid-cols-[0.86fr_1.14fr]">
                    <div class="rounded-[28px] bg-white px-6 py-6">
                        <div class="text-sm font-medium uppercase tracking-[0.18em] text-[#7a7368]">New arrival</div>
                        <h2 class="mt-3 text-[2.45rem] font-semibold leading-[0.96] tracking-[-0.08em] text-[#181818]">
                            Signature reserve layout for real retail pages
                        </h2>
                        <p class="mt-4 text-sm leading-7 text-[#5f5950]">
                            A desktop storefront with a clean hero, a dense product grid, room for editorial banners, and visible support entry points exactly where users expect them.
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
                        <div class="rounded-[24px] border-2 border-dashed border-[#d5cec2] bg-white/72 p-4">
                            <div class="aspect-[1.15/0.9] rounded-[20px] border border-[#e4ddd2] bg-[linear-gradient(180deg,#fdfcf9_0%,#f0ebe4_100%)] p-4">
                                <div class="flex h-full flex-col">
                                    <div class="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.16em] text-[#8b8479]">
                                        <span>Editorial image</span>
                                        <span>Desktop promo</span>
                                    </div>
                                    <div class="relative mt-4 flex-1 overflow-hidden rounded-[16px] border border-[#e5dfd5] bg-[linear-gradient(135deg,#ffffff_0%,#f2ede6_50%,#ebe5dc_100%)]">
                                        <div class="absolute left-[9%] top-[16%] h-[56%] w-[30%] rounded-[22px] border border-[#dfd8cc] bg-white/65" />
                                        <div class="absolute right-[10%] bottom-[12%] h-[58%] w-[42%] rounded-[30px] border border-[#dfd8cc] bg-white/72" />
                                        <div class="absolute inset-0 bg-[linear-gradient(135deg,transparent_49.3%,#d7d1c6_49.3%,#d7d1c6_50.7%,transparent_50.7%),linear-gradient(45deg,transparent_49.3%,#d7d1c6_49.3%,#d7d1c6_50.7%,transparent_50.7%)]" />
                                    </div>
                                </div>
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
                            <div class="rounded-[20px] border border-[#ece7df] bg-[#f3efe8] p-4">
                                <div class="aspect-[1.2/0.78] rounded-[18px] border-2 border-dashed border-[#d4cdc1] bg-[#faf7f1] p-3">
                                    <div class="flex h-full flex-col">
                                        <div class="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.16em] text-[#8a8377]">
                                            <span>Category card</span>
                                            <span>{{ card.label }}</span>
                                        </div>
                                        <div class="relative mt-3 flex-1 overflow-hidden rounded-[14px] border border-[#e5dfd5] bg-[linear-gradient(180deg,#ffffff_0%,#f1ece5_100%)]">
                                            <div class="absolute inset-0 bg-[linear-gradient(135deg,transparent_49.2%,#d7d1c6_49.2%,#d7d1c6_50.8%,transparent_50.8%),linear-gradient(45deg,transparent_49.2%,#d7d1c6_49.2%,#d7d1c6_50.8%,transparent_50.8%)]" />
                                        </div>
                                    </div>
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
                            <div class="text-base font-semibold tracking-[-0.03em] text-white">Air Supply for homes and needs</div>
                            <p class="mt-3 text-sm leading-7 text-white/72">
                                A desktop retail layout with visible support hooks. If something breaks, open the widget and send the page directly to support.
                            </p>
                            <button type="button" :class="`${outlineButtonClass} mt-5 border-white/20 bg-white text-[#181818]`" data-testid="footer-support" @click="openSupportWidget">
                                Report a bug
                            </button>
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
                            <button type="button" :class="iconButtonClass" aria-label="Social link">X</button>
                            <button type="button" :class="iconButtonClass" aria-label="Social link">f</button>
                            <button type="button" :class="iconButtonClass" aria-label="Social link">in</button>
                            <button type="button" :class="iconButtonClass" aria-label="Social link">ig</button>
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
