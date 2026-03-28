<script setup>
import { Head, Link, router } from '@inertiajs/vue3';
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';
import Drawer from 'primevue/drawer';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import { ref } from 'vue';

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

const quickJump = ref('');
const mobileNavVisible = ref(false);

const navigationGroups = [
    {
        label: 'Operations',
        items: [
            { label: 'Reports', href: route('dashboard'), current: 'dashboard' },
            { label: 'Team', href: route('settings.members'), current: 'settings.members' },
        ],
    },
    {
        label: 'Configuration',
        items: [
            { label: 'Capture', href: route('settings.capture-keys'), current: 'settings.capture-keys' },
            { label: 'Billing', href: route('settings.billing'), current: 'settings.billing' },
            { label: 'Extension', href: route('settings.extension.connect'), current: 'settings.extension.connect' },
            { label: 'Profile', href: route('profile.edit'), current: 'profile.edit' },
        ],
    },
];

const sectionTag = {
    reports: 'Reports',
    team: 'Team',
    capture: 'Capture',
    billing: 'Billing',
    extension: 'Extension',
    profile: 'Profile',
};

const isActive = (item) => route().current(item.current);

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
</script>

<template>
    <Head :title="title" />

    <div class="workspace-shell">
        <Drawer v-model:visible="mobileNavVisible" class="workspace-drawer" position="left">
            <div class="workspace-sidebar-scroll">
                <div class="workspace-brand">
                    <div class="workspace-brand-title">Snag</div>
                    <div class="workspace-brand-meta">Bug reporting workspace</div>
                </div>

                <section class="workspace-org-card">
                    <div class="workspace-org-label">Active organization</div>
                    <div data-testid="active-organization-name" class="workspace-org-name">
                        {{ $page.props.organization?.name ?? 'No organization' }}
                    </div>
                </section>

                <div v-for="group in navigationGroups" :key="group.label" class="workspace-nav-group">
                    <div class="workspace-nav-group-label">{{ group.label }}</div>
                    <nav class="workspace-nav">
                        <Link
                            v-for="item in group.items"
                            :key="item.href"
                            :href="item.href"
                            class="workspace-nav-link"
                            :class="{ 'is-active': isActive(item) }"
                            @click="mobileNavVisible = false"
                        >
                            {{ item.label }}
                        </Link>
                    </nav>
                </div>
            </div>
        </Drawer>

        <aside class="workspace-sidebar">
            <div class="workspace-sidebar-scroll">
                <div class="workspace-brand">
                    <div class="workspace-brand-title">Snag</div>
                    <div class="workspace-brand-meta">Bug reporting workspace</div>
                </div>

                <section class="workspace-org-card">
                    <div class="workspace-org-label">Active organization</div>
                    <div data-testid="active-organization-name" class="workspace-org-name">
                        {{ $page.props.organization?.name ?? 'No organization' }}
                    </div>
                </section>

                <div v-for="group in navigationGroups" :key="group.label" class="workspace-nav-group">
                    <div class="workspace-nav-group-label">{{ group.label }}</div>
                    <nav class="workspace-nav">
                        <Link
                            v-for="item in group.items"
                            :key="item.href"
                            :href="item.href"
                            class="workspace-nav-link"
                            :class="{ 'is-active': isActive(item) }"
                        >
                            {{ item.label }}
                        </Link>
                    </nav>
                </div>
            </div>
        </aside>

        <div class="workspace-content">
            <header class="workspace-topbar">
                <div class="workspace-topbar-main">
                    <div class="workspace-mobile-toggle">
                        <Button
                            icon="pi pi-bars"
                            label="Menu"
                            severity="secondary"
                            text
                            @click="mobileNavVisible = true"
                        />
                    </div>

                    <div class="workspace-title-block">
                        <div class="workspace-title-row">
                            <h1>{{ title }}</h1>
                            <Tag :value="sectionTag[section] ?? 'Workspace'" severity="contrast" />
                        </div>
                        <p v-if="description">{{ description }}</p>
                    </div>
                </div>

                <div class="workspace-topbar-actions">
                    <IconField class="workspace-quick-jump">
                        <InputIcon class="pi pi-search" />
                        <InputText
                            v-model="quickJump"
                            placeholder="Quick jump to a report"
                            @keydown.enter.prevent="submitQuickJump"
                        />
                    </IconField>

                    <div class="workspace-account">
                        <Avatar
                            :label="($page.props.auth.user?.name ?? 'S').slice(0, 1).toUpperCase()"
                            shape="circle"
                        />
                        <div class="workspace-account-copy">
                            <div class="workspace-account-name">{{ $page.props.auth.user?.name ?? 'Signed user' }}</div>
                            <div class="workspace-account-email">{{ $page.props.auth.user?.email }}</div>
                        </div>
                        <Link :href="route('profile.edit')" class="workspace-account-link">
                            Profile
                        </Link>
                    </div>
                </div>
            </header>

            <div v-if="contextItems.length || $page.props.flash?.status" class="workspace-context">
                <div v-if="contextItems.length" class="workspace-context-list">
                    <Tag
                        v-for="item in contextItems"
                        :key="item.label"
                        :value="`${item.label}: ${item.value}`"
                        severity="secondary"
                    />
                </div>

                <div v-if="$page.props.flash?.status" class="workspace-flash">
                    {{ $page.props.flash.status }}
                </div>
            </div>

            <div class="workspace-frame">
                <main class="workspace-canvas">
                    <slot />
                </main>
                <aside v-if="$slots.aside" class="workspace-aside">
                    <slot name="aside" />
                </aside>
            </div>
        </div>
    </div>
</template>
