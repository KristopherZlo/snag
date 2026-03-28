<script setup>
import { Head, Link } from '@inertiajs/vue3';

defineProps({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        default: '',
    },
});

const navigation = [
    { label: 'Dashboard', href: route('dashboard'), current: 'dashboard' },
    { label: 'Members', href: route('settings.members'), current: 'settings.members' },
    { label: 'Billing', href: route('settings.billing'), current: 'settings.billing' },
    { label: 'Capture Keys', href: route('settings.capture-keys'), current: 'settings.capture-keys' },
    { label: 'Extension', href: route('settings.extension.connect'), current: 'settings.extension.connect' },
];

const isActive = (item) => route().current(item.current);
</script>

<template>
    <Head :title="title" />

    <div class="app-shell">
        <aside class="rail">
            <p class="rail-title">Snag</p>
            <div class="panel panel-pad" style="margin-bottom: 18px;">
                <div style="font-size: 0.84rem; color: var(--muted);">Active organization</div>
                <div data-testid="active-organization-name" style="font-weight: 600; margin-top: 6px;">
                    {{ $page.props.organization?.name ?? 'No organization' }}
                </div>
            </div>
            <nav class="rail-nav">
                <Link
                    v-for="item in navigation"
                    :key="item.href"
                    :href="item.href"
                    :class="{ 'is-active': isActive(item) }"
                >
                    {{ item.label }}
                </Link>
            </nav>
        </aside>

        <main class="page-area">
            <header class="page-header">
                <div>
                    <h1>{{ title }}</h1>
                    <p v-if="description">{{ description }}</p>
                </div>
                <div style="color: var(--muted); font-size: 0.92rem;">
                    {{ $page.props.auth.user?.email }}
                </div>
            </header>
            <div v-if="$page.props.flash?.status" class="flash-banner">
                {{ $page.props.flash.status }}
            </div>
            <slot />
        </main>
    </div>
</template>
