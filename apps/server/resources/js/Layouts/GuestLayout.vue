<script setup>
import { Link } from '@inertiajs/vue3';
</script>

<template>
    <div class="auth-wrap">
        <div class="auth-card">
            <div class="auth-brand">
                <Link href="/">Snag</Link>
                <p>Capture bugs with direct uploads, shareable reports, and a strict organization boundary.</p>
            </div>
            <slot />
        </div>
    </div>
</template>
