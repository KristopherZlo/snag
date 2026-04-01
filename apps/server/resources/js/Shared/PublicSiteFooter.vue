<script setup>
import { computed } from 'vue';
import { Link, usePage } from '@inertiajs/vue3';
import { ArrowUpRight, BookText, Bug, KeyRound, Waypoints } from 'lucide-vue-next';
import BrandMark from '@/Shared/BrandMark.vue';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

defineProps({
    compact: {
        type: Boolean,
        default: false,
    },
});

const page = usePage();
const hasAuthenticatedUser = computed(() => Boolean(page.props.auth?.user));
const docsBaseHref = computed(() => route('dashboard').replace(/\/dashboard\/?$/, '/docs/'));

const workspaceLinks = computed(() => [
    { label: 'Reports queue', href: route('dashboard'), icon: Bug },
    { label: 'Bug backlog', href: route('bugs.index'), icon: Waypoints },
    { label: 'Capture settings', href: route('settings.capture-keys'), icon: KeyRound },
]);

const resourceLinks = computed(() => [
    { label: 'Documentation home', href: docsBaseHref.value },
    { label: 'Getting started', href: `${docsBaseHref.value}getting-started` },
    { label: 'API contracts', href: `${docsBaseHref.value}api` },
    { label: 'Browser extension', href: `${docsBaseHref.value}extension` },
]);
</script>

<template>
    <footer class="border-t border-border/70 pt-8" data-testid="public-site-footer">
        <div
            :class="
                cn(
                    'border border-border/70 bg-gradient-to-br from-background via-background to-muted/70 shadow-[0_24px_64px_-36px_rgba(15,23,42,0.4)]',
                    compact ? 'rounded-[24px] px-5 py-6' : 'rounded-[28px] px-6 py-8',
                )
            "
        >
            <div :class="cn('grid gap-8', compact ? 'xl:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))]' : 'lg:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))]')">
                <div class="space-y-4">
                    <div class="space-y-3">
                        <span
                            v-if="!compact"
                            class="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                        >
                            Companion workflow for evidence-first bug reporting
                        </span>
                        <BrandMark href="/" logo-class="size-10" text-class="text-[1.35rem]" />
                        <p class="max-w-md text-sm leading-6 text-muted-foreground">
                            Snag keeps screenshots, recordings, console output, network traces, and share flows together while Jira,
                            GitHub, and Trello stay focused on delivery.
                        </p>
                    </div>

                    <div class="flex flex-wrap gap-3">
                        <Link
                            :href="hasAuthenticatedUser ? route('dashboard') : route('login')"
                            :class="buttonVariants({ variant: 'default', size: 'sm' })"
                        >
                            {{ hasAuthenticatedUser ? 'Open dashboard' : 'Log in' }}
                        </Link>
                        <a :href="docsBaseHref" :class="buttonVariants({ variant: 'outline', size: 'sm' })">Read docs</a>
                        <Link
                            v-if="!hasAuthenticatedUser"
                            :href="route('register')"
                            :class="buttonVariants({ variant: 'ghost', size: 'sm' })"
                        >
                            Create workspace
                        </Link>
                    </div>
                </div>

                <div class="space-y-4">
                    <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Bug class="size-4 text-primary" />
                        <span>Workspace</span>
                    </div>

                    <ul class="space-y-3">
                        <li v-for="link in workspaceLinks" :key="link.href">
                            <Link class="group flex items-center justify-between text-sm text-muted-foreground transition-colors hover:text-foreground" :href="link.href">
                                <span class="inline-flex items-center gap-2">
                                    <component :is="link.icon" class="size-3.5 text-muted-foreground transition-colors group-hover:text-primary" />
                                    {{ link.label }}
                                </span>
                                <ArrowUpRight class="size-3.5 opacity-0 transition duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
                            </Link>
                        </li>
                    </ul>
                </div>

                <div class="space-y-4">
                    <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <BookText class="size-4 text-primary" />
                        <span>Resources</span>
                    </div>

                    <ul class="space-y-3">
                        <li v-for="link in resourceLinks" :key="link.href">
                            <a class="group flex items-center justify-between text-sm text-muted-foreground transition-colors hover:text-foreground" :href="link.href">
                                <span>{{ link.label }}</span>
                                <ArrowUpRight class="size-3.5 opacity-0 transition duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
                            </a>
                        </li>
                    </ul>
                </div>

                <div class="space-y-4" v-if="!compact">
                    <div class="text-sm font-semibold text-foreground">Why teams keep Snag nearby</div>

                    <div class="space-y-3 text-sm leading-6 text-muted-foreground">
                        <p>
                            Capture keys support widgets, forms, and external intake without opening the whole workspace to the public.
                        </p>
                        <p>
                            The extension gives fast browser capture, while the backlog keeps issue context ready for delivery handoff.
                        </p>
                        <p>
                            Share pages stay clean for stakeholders without exposing internal debugger payloads by default.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <div class="flex flex-col gap-2 px-1 pt-4 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
            <p>Snag keeps capture, evidence, and verification aligned with the tracker your team already uses.</p>
            <p :class="cn('text-left md:text-right')">Built for queue review, shareable context, and clean handoff.</p>
        </div>
    </footer>
</template>
