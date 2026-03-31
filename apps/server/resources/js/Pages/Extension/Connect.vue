<script setup>
import { Link } from '@inertiajs/vue3';
import AppShell from '@/Layouts/AppShell.vue';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const props = defineProps({
    code: {
        type: String,
        required: true,
    },
    expiresInMinutes: {
        type: Number,
        required: true,
    },
    apiBaseUrl: {
        type: String,
        required: true,
    },
});

const contextItems = [
    { label: 'Code TTL', value: `${props.expiresInMinutes} min` },
    { label: 'Base URL', value: props.apiBaseUrl },
];

const installSteps = [
    'Open chrome://extensions.',
    'Enable Developer Mode.',
    'Click Load unpacked.',
    'Select apps/extension/dist.',
];

const connectSteps = [
    'Open the Snag extension popup.',
    `Set the popup API base URL to ${props.apiBaseUrl}.`,
    'Paste the one-time code from this page.',
    'Name the current device.',
    `Complete the exchange against ${props.apiBaseUrl}/api/v1/extension/tokens/exchange.`,
];

const extensionLinks = [
    { key: 'connect', label: 'Connect', href: route('settings.extension.connect') },
    { key: 'captures', label: 'Sent captures', href: route('settings.extension.captures') },
];
</script>

<template>
    <AppShell
        title="Extension Connect"
        description="Bridge the browser extension through a one-time exchange flow instead of ambient session cookies."
        section="extension"
        :context-items="contextItems"
    >
        <div class="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Extension pages</CardTitle>
                    <CardDescription>Connect a browser install or review captures already sent by this account.</CardDescription>
                </CardHeader>
                <CardContent>
                    <nav class="flex flex-wrap gap-2">
                        <Link
                            v-for="item in extensionLinks"
                            :key="item.key"
                            :href="item.href"
                            :class="cn(buttonVariants({ variant: item.key === 'connect' ? 'secondary' : 'outline', size: 'sm' }))"
                        >
                            {{ item.label }}
                        </Link>
                    </nav>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle>Install extension</CardTitle>
                            <CardDescription>
                                One-click install is not available yet because the extension is not published in the Chrome Web Store.
                            </CardDescription>
                        </div>

                        <Badge variant="outline">Local install</Badge>
                    </div>
                </CardHeader>

                <CardContent class="space-y-4">
                    <div class="rounded-md border p-4">
                        <div class="text-sm font-medium">Build path</div>
                        <div class="mt-2 font-mono text-sm">apps/extension/dist</div>
                    </div>

                    <div class="rounded-md border p-4">
                        <div class="text-sm font-medium">Rebuild command</div>
                        <pre class="mt-2 overflow-x-auto text-sm"><code>pnpm --dir apps/extension build</code></pre>
                    </div>

                    <div class="space-y-4">
                        <div class="text-sm font-medium">Load in Chrome</div>
                        <div v-for="(step, index) in installSteps" :key="step" class="space-y-4">
                            <div class="text-sm text-muted-foreground">{{ index + 1 }}. {{ step }}</div>
                            <Separator v-if="index !== installSteps.length - 1" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>One-time code</CardTitle>
                    <CardDescription>The code can be exchanged exactly once for a revocable token scoped to extension abilities.</CardDescription>
                </CardHeader>

                <CardContent class="space-y-3">
                    <div
                        data-testid="extension-one-time-code"
                        class="rounded-md border bg-muted px-4 py-6 text-center font-mono text-3xl tracking-[0.3em]"
                    >
                        {{ code }}
                    </div>
                    <p class="text-sm text-muted-foreground">Expires in {{ expiresInMinutes }} minutes.</p>
                    <div class="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                        Capture keys are not part of this flow. The extension connects only through this one-time code exchange.
                    </div>
                </CardContent>
            </Card>
        </div>

        <template #aside>
            <Card>
                <CardHeader>
                    <CardTitle class="text-base">Connect steps</CardTitle>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div v-for="(step, index) in connectSteps" :key="step" class="space-y-4">
                        <div class="text-sm text-muted-foreground">{{ index + 1 }}. {{ step }}</div>
                        <Separator v-if="index !== connectSteps.length - 1" />
                    </div>
                </CardContent>
            </Card>
        </template>
    </AppShell>
</template>
