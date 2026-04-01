<script setup>
import { Head, Link } from '@inertiajs/vue3';
import { ArrowUpRight, Bug, LockKeyhole, Waypoints } from 'lucide-vue-next';
import BrandMark from '@/Shared/BrandMark.vue';
import PublicSiteFooter from '@/Shared/PublicSiteFooter.vue';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

defineProps({
    canLogin: {
        type: Boolean,
    },
    canRegister: {
        type: Boolean,
    },
    laravelVersion: {
        type: String,
        required: true,
    },
    phpVersion: {
        type: String,
        required: true,
    },
});

const steps = [
    {
        title: 'Capture',
        description: 'Browser extension or SDK creates a report with screenshot or recording.',
        icon: Bug,
    },
    {
        title: 'Review',
        description: 'Workspace users inspect steps, console output, and request metadata in one place.',
        icon: Waypoints,
    },
    {
        title: 'Control',
        description: 'Organizations, invitations, billing, and public sharing all stay explicit.',
        icon: LockKeyhole,
    },
];

</script>

<template>
    <Head title="Welcome" />

    <div class="min-h-screen bg-muted/30">
        <div class="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 md:px-6">
            <header class="flex flex-col gap-4 border-b bg-background px-6 py-5 md:flex-row md:items-center md:justify-between">
                <div class="space-y-1">
                    <BrandMark href="/" logo-class="size-10" text-class="text-xl" />
                    <p class="max-w-2xl text-sm text-muted-foreground">
                        Bug reporting with screenshots, recordings, console output, and network traces attached to the same review flow.
                    </p>
                </div>

                <nav v-if="canLogin" class="flex flex-wrap gap-2">
                    <Link
                        v-if="$page.props.auth.user"
                        :href="route('dashboard')"
                        :class="buttonVariants({ variant: 'default', size: 'sm' })"
                    >
                        Dashboard
                    </Link>

                    <template v-else>
                        <Link :href="route('login')" :class="buttonVariants({ variant: 'outline', size: 'sm' })">
                            Log in
                        </Link>

                        <Link
                            v-if="canRegister"
                            :href="route('register')"
                            :class="buttonVariants({ variant: 'default', size: 'sm' })"
                        >
                            Register
                        </Link>
                    </template>
                </nav>
            </header>

            <main class="flex-1 py-6">
                <div class="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_320px]">
                    <Card>
                        <CardHeader>
                            <CardTitle class="text-3xl md:text-4xl">Capture the bug and the context around it.</CardTitle>
                            <CardDescription class="max-w-3xl text-base leading-7">
                                Snag keeps uploads, debugger traces, invitations, capture keys, and share boundaries in one workspace,
                                so triage decisions do not depend on scattered tools and side channels.
                            </CardDescription>
                        </CardHeader>

                        <CardContent class="space-y-4">
                            <div v-for="(step, index) in steps" :key="step.title" class="space-y-4">
                                <div class="flex items-start gap-3">
                                    <component :is="step.icon" class="mt-0.5 size-4 text-muted-foreground" />
                                    <div class="space-y-1">
                                        <div class="font-medium">{{ step.title }}</div>
                                        <p class="text-sm text-muted-foreground">{{ step.description }}</p>
                                    </div>
                                </div>

                                <Separator v-if="index !== steps.length - 1" />
                            </div>
                        </CardContent>
                    </Card>

                    <div class="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Open the workspace</CardTitle>
                                <CardDescription>Move from setup into the queue without a separate product landing flow.</CardDescription>
                            </CardHeader>
                            <CardContent class="space-y-4">
                                <Link
                                    v-if="$page.props.auth.user"
                                    :href="route('dashboard')"
                                    :class="cn(buttonVariants({ variant: 'default' }), 'w-full justify-between')"
                                >
                                    <span>Open dashboard</span>
                                    <ArrowUpRight class="size-4" />
                                </Link>
                                <Link
                                    v-else
                                    :href="route('login')"
                                    :class="cn(buttonVariants({ variant: 'default' }), 'w-full justify-between')"
                                >
                                    <span>Log in</span>
                                    <ArrowUpRight class="size-4" />
                                </Link>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle class="text-base">Included flows</CardTitle>
                            </CardHeader>
                            <CardContent class="space-y-2 text-sm text-muted-foreground">
                                <p>Extension connect through one-time exchange codes.</p>
                                <p>Capture keys for embedded or public report creation.</p>
                                <p>Public report view with internal debugger context kept private.</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            <PublicSiteFooter />
        </div>
    </div>
</template>
