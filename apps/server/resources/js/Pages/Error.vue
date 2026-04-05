<script setup>
import { Head, Link, router, usePage } from '@inertiajs/vue3';
import { Clock3, SearchX, ServerCrash, ShieldAlert, Wrench } from 'lucide-vue-next';
import { computed } from 'vue';
import GuestLayout from '@/Layouts/GuestLayout.vue';
import { Button } from '@/components/ui/button';

const props = defineProps({
    status: {
        type: Number,
        required: true,
    },
});

const page = usePage();

const hasAuthenticatedUser = computed(() => Boolean(page.props.auth?.user));
const fallbackHref = computed(() => (hasAuthenticatedUser.value ? route('dashboard') : route('home')));

const errorMeta = computed(() => {
    switch (props.status) {
        case 403:
            return {
                title: 'This area is outside the current access boundary.',
                description: 'The link is valid, but the current account or workspace does not have permission to open it.',
                label: 'Forbidden',
                icon: ShieldAlert,
                hint: 'Check the current organization or the account role attached to this route.',
            };
        case 404:
            return {
                title: 'The page or resource could not be found.',
                description: 'The route may be outdated, the report may have been removed, or the share link no longer points to an active record.',
                label: 'Not found',
                icon: SearchX,
                hint: 'Try opening the dashboard and navigating from the current workspace instead of reusing the old URL.',
            };
        case 429:
            return {
                title: 'Too many requests hit this route in a short window.',
                description: 'Snag is rate-limiting the current flow to protect shared workspace infrastructure and auth endpoints.',
                label: 'Too many requests',
                icon: Clock3,
                hint: 'Wait a moment before retrying the same action.',
            };
        case 503:
            return {
                title: 'The service is temporarily unavailable.',
                description: 'Snag is up enough to answer the request, but the application is not ready to serve this route right now.',
                label: 'Service unavailable',
                icon: Wrench,
                hint: 'Try again shortly if the workspace is deploying or recovering.',
            };
        default:
            return {
                title: 'The server hit an unexpected failure.',
                description: 'The request reached Snag, but the application could not finish the response cleanly.',
                label: 'Server error',
                icon: ServerCrash,
                hint: 'If it happens again, keep the URL and the exact steps that led here.',
            };
    }
});

const primaryAction = computed(() => ({
    href: fallbackHref.value,
    label: hasAuthenticatedUser.value ? 'Open dashboard' : 'Go home',
}));

const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
        window.history.back();

        return;
    }

    router.visit(fallbackHref.value);
};
</script>

<template>
    <GuestLayout>
        <Head :title="`${status} ${errorMeta.label}`" />

        <div class="space-y-6">
            <div class="flex items-start gap-3">
                <component :is="errorMeta.icon" class="mt-1 size-5 text-primary" />
                <div class="space-y-3">
                    <div class="text-sm font-medium text-muted-foreground">{{ status }} {{ errorMeta.label }}</div>
                    <h1 class="text-3xl font-semibold tracking-tight text-balance">{{ errorMeta.title }}</h1>
                </div>
            </div>

            <div class="space-y-3">
                <p class="text-sm leading-6 text-muted-foreground">
                    {{ errorMeta.description }}
                </p>
                <p class="text-sm leading-6 text-muted-foreground">
                    {{ errorMeta.hint }}
                </p>
            </div>

            <div class="flex flex-wrap gap-3">
                <Button as-child>
                    <Link :href="primaryAction.href">{{ primaryAction.label }}</Link>
                </Button>

                <Button variant="outline" as-child>
                    <Link :href="route('docs.index')">Read docs</Link>
                </Button>

                <Button variant="ghost" @click="goBack">Go back</Button>
            </div>
        </div>
    </GuestLayout>
</template>
