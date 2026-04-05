<script setup>
import { Link, usePage } from '@inertiajs/vue3';
import { computed } from 'vue';
import BrandMark from '@/Shared/BrandMark.vue';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const props = defineProps({
    wide: {
        type: Boolean,
        default: false,
    },
});

const page = usePage();

const shellClass = computed(() => (props.wide ? 'max-w-3xl' : 'max-w-xl'));
const hasAuthenticatedUser = computed(() => Boolean(page.props.auth?.user));
const currentComponent = computed(() => page.component ?? '');
const alternateAction = computed(() => {
    if (hasAuthenticatedUser.value) {
        return {
            href: route('dashboard'),
            label: 'Dashboard',
        };
    }

    if (currentComponent.value === 'Auth/Login') {
        return {
            href: route('register'),
            label: 'Register',
        };
    }

    return {
        href: route('login'),
        label: 'Log in',
    };
});
</script>

<template>
    <div class="min-h-screen bg-muted/30 px-4 py-6 md:px-6">
        <div :class="['mx-auto flex min-h-[calc(100vh-3rem)] flex-col gap-6', shellClass]">
            <header class="flex items-center justify-between gap-4">
                <BrandMark :href="route('home')" logo-class="size-10" text-class="text-xl" />

                <Link :href="alternateAction.href" :class="buttonVariants({ variant: 'outline', size: 'sm' })">
                    {{ alternateAction.label }}
                </Link>
            </header>

            <main class="flex flex-1 items-center">
                <Card :class="cn('w-full border-border/80 bg-card/95')">
                    <CardContent class="space-y-6 p-6 sm:p-8">
                        <slot />
                    </CardContent>
                </Card>
            </main>

            <p class="text-center text-sm text-muted-foreground">
                Account access and recovery stay inside the same Snag shell.
            </p>
        </div>
    </div>
</template>
