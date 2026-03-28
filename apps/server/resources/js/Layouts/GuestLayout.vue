<script setup>
import { Link } from '@inertiajs/vue3';

defineProps({
    wide: {
        type: Boolean,
        default: false,
    },
});
</script>

<template>
    <div class="auth-wrap">
        <div class="auth-shell">
            <aside class="auth-side">
                <div class="auth-side-eyebrow">Workspace reporting</div>
                <div class="auth-side-brand">
                    <Link href="/">Snag</Link>
                </div>
                <p class="auth-side-copy">
                    Capture bugs into organization-bound reports, keep telemetry readable, and share only the access level you intend.
                </p>

                <ul class="auth-feature-list">
                    <li>Direct uploads for screenshots and video reports.</li>
                    <li>Readable triage workspace with steps, console, and network context.</li>
                    <li>Controlled organization access, invitations, and public share boundaries.</li>
                </ul>
            </aside>

            <section class="auth-card" :class="{ 'auth-card-wide': wide }">
                <slot />
            </section>
        </div>
    </div>
</template>
