<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { Head, Link, router, usePage } from '@inertiajs/vue3';
import {
    CreditCard,
    FolderKanban,
    ListTodo,
    X,
    KeyRound,
    Menu,
    PanelLeftClose,
    PanelLeftOpen,
    PlugZap,
    Search,
    UsersRound,
} from 'lucide-vue-next';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/Components/ui/breadcrumb';
import { buttonVariants, Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/Components/ui/sheet';
import BrandMark from '@/Shared/BrandMark.vue';
import WorkspaceAccountMenu from '@/Shared/WorkspaceAccountMenu.vue';
import { cn } from '@/lib/utils';

const props = defineProps({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        default: '',
    },
    section: {
        type: String,
        default: 'reports',
    },
    contextItems: {
        type: Array,
        default: () => [],
    },
});

const page = usePage();
const quickJump = ref('');
const mobileNavVisible = ref(false);
const visibleFlashStatus = ref('');
const sidebarCollapsed = ref(false);

const FLASH_STATUS_TIMEOUT_MS = 5000;
const SIDEBAR_STORAGE_KEY = 'snag-sidebar-collapsed';
let flashStatusTimerId = null;

const navigationGroups = [
    {
        label: 'Workspace',
        items: [
            { label: 'Reports', href: route('dashboard'), current: ['dashboard', 'reports.show'], icon: FolderKanban },
            { label: 'Backlog', href: route('bugs.index'), current: ['bugs.index', 'bugs.show'], icon: ListTodo },
            { label: 'Team', href: route('settings.members'), current: 'settings.members', icon: UsersRound },
        ],
    },
    {
        label: 'Configuration',
        items: [
            { label: 'Capture', href: route('settings.capture-keys'), current: 'settings.capture-keys', icon: KeyRound },
            { label: 'Billing', href: route('settings.billing'), current: 'settings.billing', icon: CreditCard },
            { label: 'Integrations', href: route('settings.integrations'), current: 'settings.integrations', icon: PlugZap },
            { label: 'Extension', href: route('settings.extension.connect'), current: 'settings.extension.connect', icon: PlugZap },
        ],
    },
];

const isActive = (item) => {
    const current = Array.isArray(item.current) ? item.current : [item.current];

    return current.some((candidate) => route().current(candidate));
};

const navLinkClass = (item) =>
    cn(
        buttonVariants({ variant: 'ghost', size: 'sm' }),
        'h-8 w-full rounded-md text-sm',
        sidebarCollapsed.value ? 'justify-center px-0' : 'justify-start gap-2 px-2.5',
        isActive(item)
            ? 'bg-accent/70 text-foreground hover:bg-accent'
            : 'text-muted-foreground',
    );

const currentUserInitial = computed(() => (page.props.auth?.user?.name ?? 'S').slice(0, 1).toUpperCase());
const currentUserLabel = computed(() => page.props.auth?.user?.name ?? 'Signed user');
const currentUserEmail = computed(() => page.props.auth?.user?.email ?? 'No email available');
const organizationName = computed(() => page.props.organization?.name ?? 'No organization');
const pageFlashStatus = computed(() => page.props.flash?.status ?? '');
const organizationInitial = computed(() => organizationName.value.slice(0, 1).toUpperCase());

const loadSidebarCollapsed = () => {
    if (typeof window === 'undefined') {
        return false;
    }

    try {
        return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
};

sidebarCollapsed.value = loadSidebarCollapsed();

const clearFlashStatusTimer = () => {
    if (flashStatusTimerId !== null) {
        globalThis.clearTimeout(flashStatusTimerId);
        flashStatusTimerId = null;
    }
};

const dismissFlashStatus = () => {
    clearFlashStatusTimer();
    visibleFlashStatus.value = '';
};

watch(
    pageFlashStatus,
    (status) => {
        clearFlashStatusTimer();
        visibleFlashStatus.value = status;

        if (!status) {
            return;
        }

        flashStatusTimerId = globalThis.setTimeout(() => {
            visibleFlashStatus.value = '';
            flashStatusTimerId = null;
        }, FLASH_STATUS_TIMEOUT_MS);
    },
    { immediate: true },
);

onBeforeUnmount(() => {
    clearFlashStatusTimer();
});

watch(sidebarCollapsed, (value) => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, value ? 'true' : 'false');
    } catch {
        // Ignore storage failures and keep the current in-memory state.
    }
});

const submitQuickJump = () => {
    const query = quickJump.value.trim();

    if (query === '') {
        return;
    }

    router.get(route('dashboard'), { search: query }, {
        preserveState: false,
        preserveScroll: false,
    });
};

const toggleSidebarCollapsed = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value;
};
</script>

<template>
    <Head :title="title" />

    <div class="min-h-screen bg-background">
        <Sheet :open="mobileNavVisible" @update:open="mobileNavVisible = $event">
            <SheetContent side="left" class="w-64 p-0 sm:max-w-64">
                <SheetHeader class="sr-only">
                    <SheetTitle>Workspace navigation</SheetTitle>
                </SheetHeader>

                <div class="flex h-full flex-col">
                    <div class="border-b px-5 py-4">
                        <BrandMark :href="route('dashboard')" logo-class="size-10" text-class="text-lg" />
                    </div>

                    <div class="border-b px-5 py-3">
                        <div class="truncate text-sm font-medium">{{ organizationName }}</div>
                        <p class="mt-1 text-sm text-muted-foreground">Active workspace</p>
                    </div>

                    <div class="flex-1 space-y-5 overflow-y-auto px-3 py-4">
                        <section v-for="group in navigationGroups" :key="group.label" class="space-y-2">
                            <p class="px-2 text-xs font-medium text-muted-foreground">{{ group.label }}</p>

                            <nav class="space-y-1">
                                <Link
                                    v-for="item in group.items"
                                    :key="item.href"
                                    :href="item.href"
                                    :class="navLinkClass(item)"
                                    :aria-current="isActive(item) ? 'page' : undefined"
                                    @click="mobileNavVisible = false"
                                >
                                    <component :is="item.icon" class="size-4" />
                                    <span>{{ item.label }}</span>
                                </Link>
                            </nav>
                        </section>
                    </div>

                    <div class="border-t p-3" data-testid="workspace-sheet-user-menu">
                        <WorkspaceAccountMenu :initial="currentUserInitial" :name="currentUserLabel" :email="currentUserEmail" />
                    </div>
                </div>
            </SheetContent>
        </Sheet>

        <div class="flex min-h-screen">
            <aside
                :class="sidebarCollapsed ? 'workspace-sidebar hidden w-16 shrink-0 border-r bg-sidebar transition-[width] duration-200 lg:sticky lg:top-0 lg:flex lg:h-screen lg:self-start lg:flex-col' : 'workspace-sidebar hidden w-64 shrink-0 border-r bg-sidebar transition-[width] duration-200 lg:sticky lg:top-0 lg:flex lg:h-screen lg:self-start lg:flex-col'"
                data-testid="workspace-sidebar"
            >
                <div :class="sidebarCollapsed ? 'flex flex-col items-center gap-2 border-b px-2 py-3' : 'flex items-center justify-between gap-3 border-b px-5 py-4'">
                    <BrandMark
                        :href="route('dashboard')"
                        logo-class="size-10"
                        text-class="text-lg"
                        :hide-text="sidebarCollapsed"
                        :class="sidebarCollapsed ? 'justify-center' : undefined"
                    />
                    <Button
                        v-if="!sidebarCollapsed"
                        variant="ghost"
                        size="icon"
                        class="hidden lg:inline-flex"
                        data-testid="workspace-sidebar-toggle"
                        @click="toggleSidebarCollapsed"
                    >
                        <PanelLeftClose class="size-4" />
                        <span class="sr-only">Collapse sidebar</span>
                    </Button>
                    <Button
                        v-else
                        variant="ghost"
                        size="icon"
                        class="hidden size-8 lg:inline-flex"
                        data-testid="workspace-sidebar-toggle"
                        @click="toggleSidebarCollapsed"
                    >
                        <PanelLeftOpen class="size-4" />
                        <span class="sr-only">Expand sidebar</span>
                    </Button>
                </div>

                <div v-if="!sidebarCollapsed" class="border-b px-5 py-3">
                    <div data-testid="active-organization-name" class="truncate text-sm font-medium">
                        {{ organizationName }}
                    </div>
                    <p class="mt-1 text-sm text-muted-foreground">Active workspace</p>
                </div>

                <div :class="sidebarCollapsed ? 'flex-1 space-y-4 overflow-y-auto px-2 py-4' : 'flex-1 space-y-5 overflow-y-auto px-3 py-4'">
                    <section v-for="group in navigationGroups" :key="group.label" class="space-y-2">
                        <p v-if="!sidebarCollapsed" class="px-2 text-xs font-medium text-muted-foreground">{{ group.label }}</p>

                        <nav class="space-y-1">
                            <Link
                                v-for="item in group.items"
                                :key="item.href"
                                :href="item.href"
                                :class="navLinkClass(item)"
                                :title="sidebarCollapsed ? item.label : undefined"
                                :aria-current="isActive(item) ? 'page' : undefined"
                            >
                                <component :is="item.icon" class="size-4" />
                                <span v-if="!sidebarCollapsed">{{ item.label }}</span>
                            </Link>
                        </nav>
                    </section>
                </div>

                <div class="border-t p-3" data-testid="workspace-sidebar-user-menu">
                    <div v-if="sidebarCollapsed" class="mb-3 flex justify-center">
                        <div
                            class="grid size-8 place-items-center rounded-md border bg-muted/40 text-xs font-medium text-muted-foreground"
                            :title="organizationName"
                        >
                            {{ organizationInitial }}
                        </div>
                    </div>
                    <WorkspaceAccountMenu
                        :initial="currentUserInitial"
                        :name="currentUserLabel"
                        :email="currentUserEmail"
                        :collapsed="sidebarCollapsed"
                    />
                </div>
            </aside>

            <div class="flex min-w-0 flex-1 flex-col">
                <header class="border-b bg-background">
                    <div class="flex flex-col gap-3 px-4 py-3 md:px-6">
                        <div class="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                            <div class="flex min-w-0 items-start gap-3">
                                <Button variant="outline" size="icon" class="lg:hidden" @click="mobileNavVisible = true">
                                    <Menu class="size-4" />
                                    <span class="sr-only">Open navigation</span>
                                </Button>

                                <div class="min-w-0 space-y-1.5">
                                    <Breadcrumb>
                                        <BreadcrumbList>
                                            <BreadcrumbItem>
                                                <BreadcrumbLink as-child>
                                                    <Link :href="route('dashboard')">Dashboard</Link>
                                                </BreadcrumbLink>
                                            </BreadcrumbItem>
                                            <BreadcrumbSeparator />
                                            <BreadcrumbItem>
                                                <BreadcrumbPage>{{ title }}</BreadcrumbPage>
                                            </BreadcrumbItem>
                                        </BreadcrumbList>
                                    </Breadcrumb>

                                    <h1 class="text-2xl font-semibold">{{ title }}</h1>

                                    <p v-if="description" class="max-w-3xl text-sm text-muted-foreground">
                                        {{ description }}
                                    </p>
                                </div>
                            </div>

                            <div class="relative min-w-0 md:w-80 xl:w-80">
                                <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    v-model="quickJump"
                                    class="h-10 pl-9"
                                    placeholder="Quick jump to a report"
                                    @keydown.enter.prevent="submitQuickJump"
                                />
                            </div>
                        </div>

                        <div v-if="contextItems.length || visibleFlashStatus" class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div v-if="contextItems.length" class="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
                                <div v-for="item in contextItems" :key="item.label" class="flex items-center gap-1.5">
                                    <span>{{ item.label }}</span>
                                    <span class="font-medium text-foreground">{{ item.value }}</span>
                                </div>
                            </div>

                            <div
                                v-if="visibleFlashStatus"
                                class="inline-flex w-fit items-center gap-1 rounded-md border bg-background px-2 py-1 text-sm"
                                data-testid="app-shell-flash-status"
                            >
                                <span>{{ visibleFlashStatus }}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    class="size-5 shrink-0 text-muted-foreground hover:text-foreground"
                                    @click="dismissFlashStatus"
                                >
                                    <X class="size-3.5" />
                                    <span class="sr-only">Dismiss status</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </header>

                <div class="flex-1 px-4 py-6 md:px-6">
                    <div :class="$slots.aside ? 'grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_288px]' : 'space-y-6'">
                        <main class="min-w-0">
                            <slot />
                        </main>

                        <aside v-if="$slots.aside" class="space-y-6">
                            <slot name="aside" />
                        </aside>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
