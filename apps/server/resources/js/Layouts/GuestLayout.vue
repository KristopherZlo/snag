<script setup>
import { KeyRound, ShieldCheck, Video } from 'lucide-vue-next';
import { computed } from 'vue';
import BrandMark from '@/Shared/BrandMark.vue';
import PublicSiteFooter from '@/Shared/PublicSiteFooter.vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const props = defineProps({
    wide: {
        type: Boolean,
        default: false,
    },
});

const shellClass = computed(() => (props.wide ? 'max-w-[1500px]' : 'max-w-5xl'));
const contentGridClass = computed(() =>
    props.wide ? 'xl:grid-cols-[240px_minmax(0,1fr)]' : 'lg:grid-cols-[280px_minmax(0,1fr)]',
);
const railVisibilityClass = computed(() => (props.wide ? 'hidden xl:block' : 'hidden lg:block'));

const featureItems = [
    {
        title: 'Organization scope',
        description: 'Invitations, public shares, and access boundaries stay attached to the same workspace.',
        icon: ShieldCheck,
    },
    {
        title: 'Artifacts and telemetry',
        description: 'Screenshots, recordings, console output, and requests remain in one review flow.',
        icon: Video,
    },
    {
        title: 'Capture flows',
        description: 'Extension exchange codes and capture keys live beside the rest of the product controls.',
        icon: KeyRound,
    },
];
</script>

<template>
    <div class="min-h-screen bg-muted/30 px-4 py-6 md:px-6">
        <div :class="['mx-auto flex min-h-[calc(100vh-3rem)] flex-col gap-6', shellClass]">
            <div :class="['grid flex-1 gap-6', contentGridClass]">
                <Card :class="railVisibilityClass">
                    <CardHeader>
                        <BrandMark href="/" logo-class="size-10" text-class="text-xl" />
                        <CardDescription>
                            Capture browser bugs with artifacts, console history, network activity, and organization rules in one place.
                        </CardDescription>
                    </CardHeader>

                    <CardContent class="space-y-4">
                        <div v-for="(item, index) in featureItems" :key="item.title" class="space-y-4">
                            <div class="flex items-start gap-3">
                                <component :is="item.icon" class="mt-0.5 size-4 text-muted-foreground" />
                                <div class="space-y-1">
                                    <div class="text-sm font-medium">{{ item.title }}</div>
                                    <p class="text-sm text-muted-foreground">{{ item.description }}</p>
                                </div>
                            </div>

                            <Separator v-if="index !== featureItems.length - 1" />
                        </div>
                    </CardContent>
                </Card>

                <Card :class="wide ? 'w-full' : 'mx-auto w-full max-w-xl lg:mx-0 lg:max-w-none'">
                    <CardContent class="space-y-6 p-6">
                        <slot />
                    </CardContent>
                </Card>
            </div>

            <PublicSiteFooter />
        </div>
    </div>
</template>
