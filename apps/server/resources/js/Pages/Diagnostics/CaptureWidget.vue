<script setup>
import { ref } from 'vue';
import { Head } from '@inertiajs/vue3';
import {
    ArrowRight,
    Building2,
    Compass,
    Mountain,
    Search,
    ShieldCheck,
    Sparkles,
    Wind,
} from 'lucide-vue-next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    { label: 'Collections', href: '#collections' },
    { label: 'For teams', href: '#teams' },
    { label: 'Packages', href: '#packages' },
    { label: 'How it works', href: '#process' },
];

const reserveCollections = [
    {
        name: 'Coastal Dawn',
        region: 'Sea line reserve',
        price: 'EUR 24',
        copy: 'Salted morning air sealed before the shoreline fills up.',
        metric: '4.8',
        image: 'https://images.pexels.com/photos/11340553/pexels-photo-11340553.jpeg?auto=compress&cs=tinysrgb&w=900',
    },
    {
        name: 'Summit Noon',
        region: 'Cold ridge batch',
        price: 'EUR 31',
        copy: 'Dry mountain air bottled at midday for sharper rooms and calmer heads.',
        metric: '4.9',
        image: 'https://images.pexels.com/photos/31934680/pexels-photo-31934680.jpeg?auto=compress&cs=tinysrgb&w=900',
    },
    {
        name: 'Pine Window',
        region: 'Forest reserve',
        price: 'EUR 27',
        copy: 'Fresh green air for studios that forgot what an open window feels like.',
        metric: '4.7',
        image: 'https://images.pexels.com/photos/29579816/pexels-photo-29579816.jpeg?auto=compress&cs=tinysrgb&w=900',
    },
    {
        name: 'Studio Reset',
        region: 'Late-night refill',
        price: 'EUR 19',
        copy: 'Neutral clean air for long editing sessions and dense office afternoons.',
        metric: '4.6',
        image: 'https://images.pexels.com/photos/3361046/pexels-photo-3361046.jpeg?auto=compress&cs=tinysrgb&w=900',
    },
];

const trustPoints = [
    {
        title: 'Clear batch provenance',
        copy: 'Every reserve includes source notes, seal time, and the route it took before delivery.',
        icon: Compass,
    },
    {
        title: 'Straightforward ordering',
        copy: 'Single-bottle gifts, office refills, and event stock all use the same reserve flow.',
        icon: Wind,
    },
    {
        title: 'Actual support when checkout fails',
        copy: 'Customers can send a support request with automatic page context instead of typing a novel.',
        icon: ShieldCheck,
    },
];

const proofStats = [
    { value: '12k', label: 'sealed bottles delivered' },
    { value: '96%', label: 'repeat reserve rate' },
    { value: '24/7', label: 'response coverage' },
];

const segmentCards = [
    {
        title: 'Creative teams',
        copy: 'For studios that want the room to feel fresher before the next pitch, review, or launch call.',
        icon: Sparkles,
    },
    {
        title: 'Hospitality',
        copy: 'Small reserve programs for suites, lobbies, tasting rooms, and guest welcome packs.',
        icon: Building2,
    },
    {
        title: 'Retreats and events',
        copy: 'Limited-run air drops for gatherings that want a more memorable opening note than prosecco.',
        icon: Mountain,
    },
];

const packageHighlights = [
    {
        title: 'Morning Room Reset',
        copy: 'A clean starter pack for shared studios, client rooms, and teams that open laptops before windows.',
        image: 'https://images.pexels.com/photos/31911501/pexels-photo-31911501.jpeg?auto=compress&cs=tinysrgb&w=1200',
    },
    {
        title: 'Pitch Deck Recovery',
        copy: 'Sharper air for long afternoons that turned into six rounds of edits and one too many rehearsals.',
        image: 'https://images.pexels.com/photos/32924160/pexels-photo-32924160.jpeg?auto=compress&cs=tinysrgb&w=1200',
    },
];

const purchaseSteps = [
    {
        step: '01',
        title: 'Choose the reserve',
        copy: 'Pick the climate you want in the room: coastal, alpine, forest, or neutral studio air.',
    },
    {
        step: '02',
        title: 'Schedule delivery',
        copy: 'Set a one-time drop or recurring refill for desks, suites, editing bays, or launch spaces.',
    },
    {
        step: '03',
        title: 'Ask for support if anything breaks',
        copy: 'The support drawer captures the current storefront automatically so the team starts with context.',
    },
];

const heroImage = 'https://images.pexels.com/photos/36194614/pexels-photo-36194614.jpeg?auto=compress&cs=tinysrgb&w=1600';
</script>

<template>
    <div class="min-h-screen bg-[#cdd8dd] px-4 py-5 text-[#17212a] md:px-6 lg:px-8">
        <Head title="Air Supply Co." />

        <div class="mx-auto max-w-[1320px] overflow-hidden rounded-[18px] border border-[#d6d1c7] bg-[#f7f5f0] shadow-[0_18px_50px_rgba(73,91,99,0.12)]">
            <header class="border-b border-[#e1ddd5] px-5 py-4 md:px-8">
                <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div class="flex flex-wrap items-center gap-6">
                        <div class="flex items-center gap-3">
                            <div class="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#182c45] text-white">
                                <Wind class="size-4" />
                            </div>
                            <div class="text-lg font-semibold tracking-[-0.03em]">Air Supply Co.</div>
                        </div>

                        <nav class="hidden items-center gap-5 text-sm text-[#56636d] lg:flex">
                            <a
                                v-for="item in navigationItems"
                                :key="item.label"
                                :href="item.href"
                                class="transition-colors hover:text-[#17212a]"
                            >
                                {{ item.label }}
                            </a>
                        </nav>
                    </div>

                    <div class="flex flex-col gap-3 md:flex-row md:items-center">
                        <div class="relative min-w-0 flex-1 md:w-[320px]">
                            <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#6d777e]" />
                            <Input
                                type="text"
                                value="Search by climate, mood, or altitude"
                                readonly
                                class="h-10 border-[#d7d3cc] bg-white pl-10 text-[#6d777e] shadow-none"
                            />
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            class="border-[#d2cec6] bg-white text-[#17212a] hover:bg-[#f2f0eb]"
                            data-testid="capture-widget-open"
                            @click="openSupportWidget"
                        >
                            Need help?
                        </Button>

                        <Button type="button" class="bg-[#182c45] text-white hover:bg-[#102033]">
                            Reserve now
                        </Button>
                    </div>
                </div>
            </header>

            <main class="space-y-8 px-5 py-5 md:px-8 md:py-8">
                <section class="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
                    <div class="relative overflow-hidden rounded-[18px] border border-[#cbd5d8]">
                        <img :src="heroImage" alt="Air Supply landscape reserve" class="h-[460px] w-full object-cover" />
                        <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(18,32,40,0.64)_0%,rgba(18,32,40,0.34)_34%,rgba(18,32,40,0.06)_68%)]" />

                        <div class="absolute left-0 top-0 w-full p-6 md:p-8">
                            <div class="flex items-start justify-between gap-4">
                                <Badge class="border-0 bg-white/92 text-[#13233a]">Bottled weekly from limited reserves</Badge>
                                <Badge class="border-0 bg-white/82 text-[#5e4d3a]">Limited release</Badge>
                            </div>
                        </div>

                        <div class="absolute bottom-0 left-0 w-full p-6 md:p-8">
                            <div class="max-w-[560px]">
                                <div class="text-[clamp(3.2rem,11vw,6.4rem)] font-semibold leading-none tracking-[-0.08em] text-white">
                                    BREATHE
                                </div>
                                <p class="mt-4 max-w-[520px] text-sm leading-7 text-white/90 md:text-[15px]">
                                    Curated air reserves from coastlines, ridges, and pine valleys. Built for teams, hotels, and spaces
                                    that want the room to feel reset the moment someone walks in.
                                </p>
                                <div class="mt-6 flex flex-wrap gap-3">
                                    <Button type="button" class="bg-white text-[#17212a] hover:bg-white/92">
                                        Shop collections
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        class="border-white/40 bg-white/12 text-white hover:bg-white/18"
                                        @click="openSupportWidget"
                                    >
                                        Report a checkout issue
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <aside class="space-y-4 rounded-[18px] border border-[#d9d3c8] bg-white p-5">
                        <div class="flex items-start justify-between gap-3">
                            <div>
                                <div class="text-sm text-[#6d777e]">Today&apos;s reserve</div>
                                <div class="mt-2 text-[1.55rem] font-semibold tracking-[-0.04em] text-[#17212a]">
                                    Summit Noon Reserve
                                </div>
                            </div>
                            <Badge class="border-[#d9d1c5] bg-[#f4eee4] text-[#6b563f]">Small batch</Badge>
                        </div>

                        <p class="text-sm leading-7 text-[#5c6872]">
                            Cold mountain air bottled for rooms that need focus, calm, and a more expensive story than &quot;we opened a
                            window.&quot;
                        </p>

                        <div class="rounded-[14px] border border-[#e3ddd2] bg-[#faf8f4] p-4">
                            <div class="flex items-center justify-between text-sm">
                                <span class="text-[#68727b]">Mountain reserve</span>
                                <span class="font-semibold text-[#17212a]">EUR 39</span>
                            </div>
                            <div class="mt-3 flex items-center justify-between text-sm">
                                <span class="text-[#68727b]">Glass bottle deposit</span>
                                <span class="font-semibold text-[#17212a]">EUR 4</span>
                            </div>
                            <div class="mt-3 flex items-center justify-between text-sm">
                                <span class="text-[#68727b]">Dispatch window</span>
                                <span class="font-semibold text-[#17212a]">Same day</span>
                            </div>
                            <div class="mt-4 border-t border-[#e4ddd1] pt-4">
                                <div class="flex items-center justify-between">
                                    <span class="text-sm text-[#68727b]">Expected total</span>
                                    <span class="text-[1.35rem] font-semibold tracking-[-0.04em] text-[#17212a]">EUR 43</span>
                                </div>
                            </div>
                        </div>

                        <Button type="button" class="h-11 w-full bg-[#d97706] text-white hover:bg-[#b96508]">
                            Reserve this batch
                        </Button>

                        <button
                            type="button"
                            class="flex w-full items-center justify-between rounded-[12px] border border-[#ddd6ca] bg-white px-4 py-3 text-left transition-colors hover:bg-[#f7f5f0]"
                            @click="openSupportWidget"
                        >
                            <div class="flex items-center gap-3">
                                <div class="flex size-10 items-center justify-center rounded-[10px] bg-[#eef2f4] text-[#20313c]">
                                    <span class="text-sm font-semibold">?</span>
                                </div>
                                <div>
                                    <div class="text-sm font-semibold text-[#17212a]">Checkout not working?</div>
                                    <div class="text-sm text-[#64707a]">Send the current page to support with one form.</div>
                                </div>
                            </div>
                            <ArrowRight class="size-4 text-[#4f5d68]" />
                        </button>
                    </aside>
                </section>

                <section id="teams" class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                    <div>
                        <div class="text-[1.9rem] font-semibold tracking-[-0.04em] text-[#17212a]">
                            Why design studios, hotels, and launch teams keep ordering air.
                        </div>
                        <p class="mt-3 max-w-[620px] text-sm leading-7 text-[#58636c]">
                            Our product is theatrical, but the service is not. Ordering stays clean, delivery stays predictable, and support
                            starts with context instead of a blank ticket.
                        </p>

                        <div class="mt-6 grid gap-4 md:grid-cols-3">
                            <article
                                v-for="item in trustPoints"
                                :key="item.title"
                                class="rounded-[16px] border border-[#d9d4ca] bg-white p-5"
                            >
                                <div class="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#eef2f4] text-[#20313c]">
                                    <component :is="item.icon" class="size-5" />
                                </div>
                                <div class="mt-4 text-base font-semibold tracking-[-0.02em] text-[#17212a]">{{ item.title }}</div>
                                <p class="mt-2 text-sm leading-6 text-[#5a6570]">{{ item.copy }}</p>
                            </article>
                        </div>
                    </div>

                    <div class="grid gap-4">
                        <article
                            v-for="item in segmentCards"
                            :key="item.title"
                            class="rounded-[16px] border border-[#d9d4ca] bg-[#e8edf1] p-5"
                        >
                            <div class="flex h-11 w-11 items-center justify-center rounded-[12px] bg-white text-[#20313c]">
                                <component :is="item.icon" class="size-5" />
                            </div>
                            <div class="mt-4 text-base font-semibold tracking-[-0.02em] text-[#17212a]">{{ item.title }}</div>
                            <p class="mt-2 text-sm leading-6 text-[#55616c]">{{ item.copy }}</p>
                        </article>
                    </div>
                </section>

                <section class="grid gap-4 md:grid-cols-3">
                    <div
                        v-for="item in proofStats"
                        :key="item.label"
                        class="rounded-[16px] border border-[#d9d4ca] bg-white px-5 py-6 text-center"
                    >
                        <div class="text-[1.75rem] font-semibold tracking-[-0.04em] text-[#17212a]">{{ item.value }}</div>
                        <div class="mt-2 text-sm leading-6 text-[#5e6870]">{{ item.label }}</div>
                    </div>
                </section>

                <section id="collections" class="rounded-[18px] border border-[#d8d4cc] bg-[#e6ecef] px-5 py-6 md:px-6">
                    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <div class="text-[1.65rem] font-semibold tracking-[-0.04em] text-[#17212a]">Seasonal reserves</div>
                            <p class="mt-2 max-w-[560px] text-sm leading-6 text-[#54606b]">
                                Four atmosphere profiles for different rooms, schedules, and levels of oxygen-related desperation.
                            </p>
                        </div>

                        <Button type="button" variant="outline" class="border-[#cad1d5] bg-white text-[#17212a] hover:bg-[#f4f6f8]">
                            View all reserves
                        </Button>
                    </div>

                    <div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <article
                            v-for="item in reserveCollections"
                            :key="item.name"
                            class="overflow-hidden rounded-[16px] border border-[#d8d4cc] bg-white"
                        >
                            <div class="p-4">
                                <img :src="item.image" :alt="item.name" class="h-[170px] w-full rounded-[14px] object-cover" loading="lazy" />
                            </div>

                            <div class="space-y-3 px-4 pb-4">
                                <div class="flex items-start justify-between gap-3">
                                    <div>
                                        <div class="text-base font-semibold tracking-[-0.02em] text-[#17212a]">{{ item.name }}</div>
                                        <div class="mt-1 text-sm text-[#5e6870]">{{ item.region }}</div>
                                    </div>
                                    <span class="text-sm font-semibold text-[#17212a]">{{ item.price }}</span>
                                </div>

                                <p class="text-sm leading-6 text-[#58636b]">{{ item.copy }}</p>

                                <div class="flex items-center justify-between gap-3 text-sm">
                                    <span class="text-[#5d6770]">Customer score</span>
                                    <span class="font-medium text-[#17212a]">{{ item.metric }}/5</span>
                                </div>
                            </div>
                        </article>
                    </div>
                </section>

                <section id="packages" class="grid gap-4 lg:grid-cols-[320px_repeat(2,minmax(0,1fr))]">
                    <article class="rounded-[18px] border border-[#d9d4ca] bg-[#d7e1e9] p-6">
                        <div class="text-[1.55rem] font-semibold tracking-[-0.04em] text-[#17212a]">Signature packs</div>
                        <p class="mt-3 text-sm leading-7 text-[#54606b]">
                            Bundled reserves for launch days, guest experiences, and shared rooms that need a cleaner starting point.
                        </p>
                        <Button type="button" class="mt-6 bg-[#182c45] text-white hover:bg-[#102033]">
                            Browse all packs
                        </Button>
                    </article>

                    <article
                        v-for="item in packageHighlights"
                        :key="item.title"
                        class="overflow-hidden rounded-[18px] border border-[#d9d4ca] bg-white"
                    >
                        <div class="relative h-[230px] overflow-hidden">
                            <img :src="item.image" :alt="item.title" class="h-full w-full object-cover" loading="lazy" />
                            <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,24,31,0.08)_0%,rgba(15,24,31,0.44)_100%)]" />
                        </div>
                        <div class="space-y-3 p-5">
                            <div class="text-xl font-semibold tracking-[-0.04em] text-[#17212a]">{{ item.title }}</div>
                            <p class="text-sm leading-7 text-[#58636c]">{{ item.copy }}</p>
                        </div>
                    </article>
                </section>

                <section id="process" class="rounded-[18px] border border-[#d9d4ca] bg-white px-5 py-6 md:px-6">
                    <div class="max-w-[640px]">
                        <div class="text-[1.7rem] font-semibold tracking-[-0.04em] text-[#17212a]">
                            Ordering air is still simple when the story sounds expensive.
                        </div>
                        <p class="mt-2 text-sm leading-7 text-[#58636c]">
                            The storefront stays readable, the reserve flow stays short, and support starts from the exact page the customer
                            was on.
                        </p>
                    </div>

                    <div class="mt-6 grid gap-4 md:grid-cols-3">
                        <article
                            v-for="item in purchaseSteps"
                            :key="item.step"
                            class="rounded-[16px] border border-[#e3ddd2] bg-[#fbf8f2] p-5"
                        >
                            <div class="text-sm font-semibold tracking-[0.18em] text-[#6a7680]">{{ item.step }}</div>
                            <div class="mt-4 text-lg font-semibold tracking-[-0.03em] text-[#17212a]">{{ item.title }}</div>
                            <p class="mt-2 text-sm leading-7 text-[#58636c]">{{ item.copy }}</p>
                        </article>
                    </div>
                </section>
            </main>

            <footer class="border-t border-[#e1ddd5] px-5 py-5 md:px-8">
                <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div class="text-base font-semibold tracking-[-0.03em] text-[#17212a]">Air Supply Co.</div>
                        <p class="mt-1 text-sm text-[#5b636a]">
                            Private reserves for spaces that want the room to feel deliberately reset.
                        </p>
                    </div>

                    <div class="flex flex-wrap items-center gap-4 text-sm text-[#57636c]">
                        <a href="#collections" class="hover:text-[#17212a]">Collections</a>
                        <a href="#teams" class="hover:text-[#17212a]">For teams</a>
                        <a href="#packages" class="hover:text-[#17212a]">Packages</a>
                        <button type="button" class="font-medium text-[#17212a] hover:underline" @click="openSupportWidget">
                            Support
                        </button>
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
