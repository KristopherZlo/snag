<script setup>
import { computed } from 'vue';
import { usePage } from '@inertiajs/vue3';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageLoading } from '@/lib/runtime/page-loading';

const page = usePage();
const { isPageLoading, loadingTargetUrl } = usePageLoading();

const cards = Array.from({ length: 6 }, (_, index) => index);
const columns = Array.from({ length: 4 }, (_, index) => index);
const settingsTabs = Array.from({ length: 6 }, (_, index) => index);
const pageComponent = computed(() => page.component ?? '');

const resolveLoadingIntentFromUrl = (candidateUrl) => {
    if (!candidateUrl) {
        return null;
    }

    try {
        const url = new URL(candidateUrl, globalThis.window?.location?.origin ?? 'http://localhost');
        const pathname = url.pathname.toLowerCase();

        if (/\/bugs\/share\/[^/]+$/.test(pathname) || /\/share\/[^/]+$/.test(pathname)) {
            return { variant: 'share', workspace: false, settingsSection: null };
        }

        if (/\/settings\/extension(?:\/|$)/.test(pathname)) {
            return { variant: 'extension', workspace: true, settingsSection: null };
        }

        if (/\/settings\/members$/.test(pathname)) {
            return { variant: 'settings', workspace: true, settingsSection: 'members' };
        }

        if (/\/settings\/billing$/.test(pathname)) {
            return { variant: 'settings', workspace: true, settingsSection: 'billing' };
        }

        if (/\/settings\/capture-keys$/.test(pathname)) {
            return { variant: 'settings', workspace: true, settingsSection: 'capture-keys' };
        }

        if (/\/settings\/integrations$/.test(pathname)) {
            return { variant: 'settings', workspace: true, settingsSection: 'integrations' };
        }

        if (/\/settings$/.test(pathname)) {
            return { variant: 'settings', workspace: true, settingsSection: 'profile' };
        }

        if (/\/dashboard$/.test(pathname)) {
            return { variant: 'dashboard', workspace: true, settingsSection: null };
        }

        if (/\/bugs$/.test(pathname)) {
            return { variant: 'bugs-index', workspace: true, settingsSection: null };
        }

        if (/\/bugs\/[^/]+$/.test(pathname)) {
            return { variant: 'bug', workspace: true, settingsSection: null };
        }

        if (/\/reports\/[^/]+$/.test(pathname)) {
            return { variant: 'report', workspace: true, settingsSection: null };
        }

        if (/\/(login|register|forgot-password|verify-email|confirm-password)$/.test(pathname) || /\/reset-password\/[^/]+$/.test(pathname)) {
            return { variant: 'auth', workspace: false, settingsSection: null };
        }
    } catch {
        return null;
    }

    return null;
};

const currentPageIntent = computed(() => {
    const workspace = Boolean(
        page.props.auth?.user
        && !pageComponent.value.startsWith('Auth/')
        && pageComponent.value !== 'Error'
        && !pageComponent.value.endsWith('/Share'),
    );

    if (pageComponent.value === 'Dashboard') return { variant: 'dashboard', workspace, settingsSection: null };
    if (pageComponent.value === 'Reports/Show') return { variant: 'report', workspace, settingsSection: null };
    if (pageComponent.value === 'Bugs/Show') return { variant: 'bug', workspace, settingsSection: null };
    if (pageComponent.value === 'Bugs/Index') return { variant: 'bugs-index', workspace, settingsSection: null };
    if (pageComponent.value.startsWith('Settings/')) return { variant: 'settings', workspace, settingsSection: page.props.section ?? 'profile' };
    if (pageComponent.value.startsWith('Extension/')) return { variant: 'extension', workspace, settingsSection: null };
    if (pageComponent.value.startsWith('Auth/')) return { variant: 'auth', workspace: false, settingsSection: null };
    if (pageComponent.value === 'Error') return { variant: 'error', workspace: false, settingsSection: null };
    if (pageComponent.value.endsWith('/Share')) return { variant: 'share', workspace: false, settingsSection: null };

    return { variant: workspace ? 'workspace' : 'guest', workspace, settingsSection: null };
});

const activePageIntent = computed(() => resolveLoadingIntentFromUrl(loadingTargetUrl.value) ?? currentPageIntent.value);

const showWorkspaceShell = computed(() => {
    return activePageIntent.value.workspace;
});

const pageVariant = computed(() => activePageIntent.value.variant);
const settingsSection = computed(() => activePageIntent.value.settingsSection ?? page.props.section ?? 'profile');

const hasAside = computed(() => ['report', 'bug', 'extension'].includes(pageVariant.value));
</script>

<template>
    <div
        v-if="isPageLoading"
        class="pointer-events-none fixed inset-0 z-[120] bg-background/96 backdrop-blur-sm"
        data-testid="global-page-loading-overlay"
        aria-live="polite"
        aria-busy="true"
    >
        <div v-if="showWorkspaceShell" class="flex h-full">
            <aside class="hidden w-64 shrink-0 border-r bg-sidebar lg:flex lg:flex-col">
                <div class="flex items-center justify-between gap-3 border-b px-5 py-4">
                    <Skeleton class="h-10 w-28 bg-foreground/8" />
                    <Skeleton class="h-8 w-8 bg-foreground/8" />
                </div>
                <div class="border-b px-5 py-3">
                    <Skeleton class="h-4 w-32 bg-foreground/8" />
                    <Skeleton class="mt-2 h-4 w-24 bg-foreground/8" />
                </div>
                <div class="flex-1 space-y-5 overflow-y-auto px-3 py-4">
                    <div class="space-y-2">
                        <Skeleton class="h-3 w-20 bg-foreground/8" />
                        <Skeleton v-for="item in 3" :key="`nav-a-${item}`" class="h-8 w-full bg-foreground/8" />
                    </div>
                    <div class="space-y-2">
                        <Skeleton class="h-3 w-24 bg-foreground/8" />
                        <Skeleton v-for="item in 4" :key="`nav-b-${item}`" class="h-8 w-full bg-foreground/8" />
                    </div>
                </div>
                <div class="border-t p-3">
                    <Skeleton class="h-12 w-full bg-foreground/8" />
                </div>
            </aside>

            <div class="flex min-w-0 flex-1 flex-col">
                <header class="border-b bg-background px-4 py-4 md:px-6">
                    <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div class="space-y-3">
                            <div class="flex items-center gap-2">
                                <Skeleton class="h-4 w-24 bg-foreground/8" />
                                <Skeleton class="h-4 w-4 bg-foreground/8" />
                                <Skeleton class="h-4 w-36 bg-foreground/8" />
                            </div>
                            <Skeleton class="h-8 w-64 max-w-full bg-foreground/8" />
                            <Skeleton class="h-4 w-[34rem] max-w-full bg-foreground/8" />
                        </div>
                        <Skeleton class="h-10 w-full max-w-80 bg-foreground/8" />
                    </div>
                    <div class="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                        <Skeleton v-for="item in 4" :key="`context-${item}`" class="h-4 w-24 bg-foreground/8" />
                    </div>
                </header>

                <div class="flex-1 px-4 py-6 md:px-6">
                    <div :class="hasAside ? 'grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_288px]' : 'space-y-6'">
                        <main class="min-w-0 space-y-6">
                            <template v-if="pageVariant === 'dashboard'">
                                <div class="rounded-lg border bg-card" data-testid="page-loading-dashboard">
                                    <div class="space-y-5 border-b px-6 py-5">
                                        <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                            <div class="space-y-2">
                                                <Skeleton class="h-6 w-40 bg-foreground/8" />
                                                <Skeleton class="h-4 w-[28rem] max-w-full bg-foreground/8" />
                                            </div>
                                            <div class="flex gap-2">
                                                <Skeleton class="h-9 w-24 bg-foreground/8" />
                                                <Skeleton class="h-9 w-24 bg-foreground/8" />
                                            </div>
                                        </div>
                                        <div class="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_200px_220px_auto]">
                                            <Skeleton class="h-10 w-full bg-foreground/8" />
                                            <Skeleton class="h-10 w-full bg-foreground/8" />
                                            <Skeleton class="h-10 w-full bg-foreground/8" />
                                            <Skeleton class="hidden h-4 w-28 self-center lg:block bg-foreground/8" />
                                        </div>
                                    </div>
                                    <div class="grid gap-4 p-6 md:grid-cols-2 2xl:grid-cols-3">
                                        <div v-for="item in cards" :key="`dashboard-card-${item}`" class="overflow-hidden rounded-lg border">
                                            <Skeleton class="aspect-[16/9] w-full rounded-none bg-foreground/8" />
                                            <div class="space-y-3 p-4">
                                                <Skeleton class="h-5 w-2/3 bg-foreground/8" />
                                                <Skeleton class="h-4 w-full bg-foreground/8" />
                                                <Skeleton class="h-4 w-5/6 bg-foreground/8" />
                                                <div class="flex gap-2">
                                                    <Skeleton class="h-6 w-20 rounded-md bg-foreground/8" />
                                                    <Skeleton class="h-6 w-16 rounded-md bg-foreground/8" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </template>

                            <template v-else-if="pageVariant === 'bugs-index'">
                                <div class="rounded-lg border bg-card" data-testid="page-loading-bugs-index">
                                    <div class="space-y-5 border-b px-6 py-5">
                                        <div class="flex flex-wrap gap-x-5 gap-y-2">
                                            <Skeleton v-for="item in 6" :key="`bug-summary-${item}`" class="h-4 w-24 bg-foreground/8" />
                                        </div>
                                        <div class="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_220px_220px_220px_auto]">
                                            <Skeleton class="h-10 w-full bg-foreground/8" />
                                            <Skeleton class="h-10 w-full bg-foreground/8" />
                                            <Skeleton class="h-10 w-full bg-foreground/8" />
                                            <Skeleton class="h-10 w-full bg-foreground/8" />
                                            <Skeleton class="hidden h-10 w-28 lg:block bg-foreground/8" />
                                        </div>
                                    </div>
                                    <div class="overflow-x-auto bg-muted/30 p-4">
                                        <div class="flex min-w-[72rem] gap-4">
                                            <section v-for="column in columns" :key="`bug-column-${column}`" class="w-[18rem] shrink-0 space-y-3 rounded-lg border bg-background p-3">
                                                <Skeleton class="h-4 w-24 bg-foreground/8" />
                                                <Skeleton v-for="item in 3" :key="`bug-card-${column}-${item}`" class="h-36 w-full bg-foreground/8" />
                                            </section>
                                        </div>
                                    </div>
                                </div>
                            </template>

                            <template v-else-if="pageVariant === 'report'">
                                <div class="space-y-6" data-testid="page-loading-report">
                                    <Skeleton class="h-72 w-full bg-foreground/8" />
                                    <Skeleton class="aspect-[16/9] w-full bg-foreground/8" />
                                    <Skeleton class="h-80 w-full bg-foreground/8" />
                                </div>
                            </template>

                            <template v-else-if="pageVariant === 'bug'">
                                <div class="space-y-6" data-testid="page-loading-bug">
                                    <Skeleton class="h-96 w-full bg-foreground/8" />
                                    <Skeleton class="h-96 w-full bg-foreground/8" />
                                    <Skeleton class="h-64 w-full bg-foreground/8" />
                                </div>
                            </template>

                            <template v-else-if="pageVariant === 'settings'">
                                <div class="space-y-6" data-testid="page-loading-settings">
                                    <div class="border-b pb-4">
                                        <div class="flex flex-wrap gap-2">
                                            <Skeleton v-for="item in settingsTabs" :key="`settings-tab-${item}`" class="h-9 w-24 bg-foreground/8" />
                                        </div>
                                    </div>
                                    <Skeleton v-if="settingsSection === 'profile'" class="h-40 w-full bg-foreground/8" />
                                    <template v-else-if="settingsSection === 'members'">
                                        <Skeleton class="h-72 w-full bg-foreground/8" />
                                        <Skeleton class="h-40 w-full bg-foreground/8" />
                                        <Skeleton class="h-64 w-full bg-foreground/8" />
                                    </template>
                                    <template v-else-if="settingsSection === 'capture-keys'">
                                        <div class="grid gap-4 lg:grid-cols-2">
                                            <Skeleton class="h-32 w-full bg-foreground/8" />
                                            <Skeleton class="h-32 w-full bg-foreground/8" />
                                        </div>
                                        <Skeleton class="h-56 w-full bg-foreground/8" />
                                        <Skeleton class="h-72 w-full bg-foreground/8" />
                                    </template>
                                    <template v-else-if="settingsSection === 'integrations'">
                                        <Skeleton class="h-32 w-full bg-foreground/8" />
                                        <Skeleton class="h-80 w-full bg-foreground/8" />
                                        <Skeleton class="h-80 w-full bg-foreground/8" />
                                    </template>
                                    <template v-else>
                                        <Skeleton class="h-48 w-full bg-foreground/8" />
                                        <Skeleton class="h-72 w-full bg-foreground/8" />
                                    </template>
                                </div>
                            </template>

                            <template v-else-if="pageVariant === 'extension'">
                                <div class="space-y-6" data-testid="page-loading-extension">
                                    <Skeleton class="h-24 w-full bg-foreground/8" />
                                    <Skeleton class="h-64 w-full bg-foreground/8" />
                                    <Skeleton class="h-48 w-full bg-foreground/8" />
                                    <Skeleton class="h-64 w-full bg-foreground/8" />
                                </div>
                            </template>

                            <template v-else>
                                <div class="space-y-6" data-testid="page-loading-workspace">
                                    <Skeleton class="h-48 w-full bg-foreground/8" />
                                    <Skeleton class="h-64 w-full bg-foreground/8" />
                                </div>
                            </template>
                        </main>

                        <aside v-if="pageVariant === 'report'" class="space-y-6">
                            <Skeleton class="h-56 w-full bg-foreground/8" />
                            <Skeleton class="h-72 w-full bg-foreground/8" />
                            <Skeleton class="h-48 w-full bg-foreground/8" />
                        </aside>
                        <aside v-else-if="pageVariant === 'bug'" class="space-y-6">
                            <Skeleton class="h-80 w-full bg-foreground/8" />
                            <Skeleton class="h-72 w-full bg-foreground/8" />
                        </aside>
                        <aside v-else-if="pageVariant === 'extension'" class="space-y-6">
                            <Skeleton class="h-72 w-full bg-foreground/8" />
                        </aside>
                    </div>
                </div>
            </div>
        </div>

        <div v-else class="min-h-screen px-4 py-6 md:px-6">
            <div v-if="pageVariant === 'auth' || pageVariant === 'error'" class="mx-auto flex min-h-[calc(100vh-3rem)] max-w-xl flex-col gap-6">
                <div class="flex items-center justify-between gap-4">
                    <Skeleton class="h-10 w-28 bg-foreground/8" />
                    <Skeleton class="h-9 w-24 bg-foreground/8" />
                </div>
                <div class="flex flex-1 items-center">
                    <div class="w-full rounded-lg border bg-card p-6 sm:p-8" :data-testid="pageVariant === 'auth' ? 'page-loading-auth' : 'page-loading-error'">
                        <div class="space-y-6">
                            <Skeleton class="h-8 w-3/4 bg-foreground/8" />
                            <Skeleton class="h-4 w-full bg-foreground/8" />
                            <Skeleton class="h-4 w-5/6 bg-foreground/8" />
                            <Skeleton class="h-10 w-full bg-foreground/8" />
                            <Skeleton class="h-10 w-full bg-foreground/8" />
                            <div class="flex flex-wrap gap-3">
                                <Skeleton class="h-10 w-28 bg-foreground/8" />
                                <Skeleton class="h-10 w-24 bg-foreground/8" />
                                <Skeleton v-if="pageVariant === 'error'" class="h-10 w-24 bg-foreground/8" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div v-else-if="pageVariant === 'share'" class="mx-auto max-w-6xl space-y-6" data-testid="page-loading-share">
                <Skeleton class="h-6 w-28 bg-foreground/8" />
                <Skeleton class="h-10 w-[32rem] max-w-full bg-foreground/8" />
                <Skeleton class="h-4 w-[36rem] max-w-full bg-foreground/8" />
                <Skeleton class="h-40 w-full bg-foreground/8" />
                <Skeleton class="aspect-[16/8] w-full bg-foreground/8" />
                <div class="grid gap-6 xl:grid-cols-2">
                    <Skeleton class="h-80 w-full bg-foreground/8" />
                    <Skeleton class="h-80 w-full bg-foreground/8" />
                </div>
            </div>

            <div v-else class="mx-auto max-w-xl space-y-6" data-testid="page-loading-guest">
                <Skeleton class="h-10 w-28 bg-foreground/8" />
                <Skeleton class="h-56 w-full bg-foreground/8" />
            </div>
        </div>
    </div>
</template>
