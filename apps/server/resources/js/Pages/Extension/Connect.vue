<script setup>
import AppShell from '@/Layouts/AppShell.vue';
import Card from 'primevue/card';
import Tag from 'primevue/tag';

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
</script>

<template>
    <AppShell
        title="Extension Connect"
        description="Bridge the browser extension through a one-time exchange flow instead of ambient session cookies."
        section="extension"
        :context-items="contextItems"
    >
        <div class="page-stack">
            <Card class="workspace-card">
                <template #content>
                    <div class="report-summary-card">
                        <div class="report-summary-head">
                            <div class="report-summary-copy">
                                <h2>Install extension</h2>
                                <p>
                                    One-click install is not available yet because the extension is not published in the Chrome Web Store.
                                    For local usage, load the unpacked build from <span class="mono">apps/extension/dist</span>.
                                </p>
                            </div>
                            <Tag value="Local install" severity="secondary" />
                        </div>

                        <div class="report-summary-grid">
                            <section class="surface-note">
                                <div class="section-head">
                                    <div>
                                        <h3>Build locally</h3>
                                        <p>Rebuild the unpacked extension before loading it in Chrome.</p>
                                    </div>
                                </div>
                                <pre class="code-block mono">pnpm --dir apps/extension build</pre>
                            </section>

                            <section class="surface-note">
                                <div class="section-head">
                                    <div>
                                        <h3>Load in Chrome</h3>
                                        <p>The browser install path stays explicit until the store listing exists.</p>
                                    </div>
                                </div>
                                <ol class="list-plain muted">
                                    <li>1. Open <span class="mono">chrome://extensions</span>.</li>
                                    <li>2. Enable Developer Mode.</li>
                                    <li>3. Click Load unpacked.</li>
                                    <li>4. Select <span class="mono">apps/extension/dist</span>.</li>
                                </ol>
                            </section>
                        </div>
                    </div>
                </template>
            </Card>

            <Card class="workspace-card">
                <template #content>
                    <div class="report-summary-card">
                        <div class="section-head">
                            <div>
                                <h2>One-time code</h2>
                                <p>The code can be exchanged exactly once for a revocable token scoped to extension abilities.</p>
                            </div>
                        </div>

                        <div data-testid="extension-one-time-code" class="code-block mono extension-code-block">
                            {{ code }}
                        </div>
                        <p class="muted">Expires in {{ expiresInMinutes }} minutes.</p>
                    </div>
                </template>
            </Card>
        </div>

        <template #aside>
            <Card class="workspace-card workspace-card-tight">
                <template #content>
                    <div class="side-summary">
                        <h3>Connect steps</h3>
                        <ol class="list-plain">
                            <li>1. Open the Snag extension popup.</li>
                            <li>2. If needed, build it with <span class="mono">pnpm --dir apps/extension build</span> and load <span class="mono">apps/extension/dist</span>.</li>
                            <li>3. Set the popup API base URL to <span class="mono">{{ apiBaseUrl }}</span>.</li>
                            <li>4. Paste the one-time code from this page.</li>
                            <li>5. Name the current device.</li>
                            <li>6. Complete the exchange against <span class="mono">{{ apiBaseUrl }}/api/v1/extension/tokens/exchange</span>.</li>
                        </ol>
                    </div>
                </template>
            </Card>
        </template>
    </AppShell>
</template>
