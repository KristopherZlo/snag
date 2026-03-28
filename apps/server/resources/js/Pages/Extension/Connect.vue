<script setup>
import AppShell from '@/Layouts/AppShell.vue';

defineProps({
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
</script>

<template>
    <AppShell
        title="Extension Connect"
        description="Bridge the browser extension through a one-time code exchange without relying on ambient cookies."
    >
        <div class="page-stack">
            <section class="panel panel-pad">
                <div class="section-head">
                    <div>
                        <h2>Install extension</h2>
                        <p>
                            One-click install is not available yet because the extension is not published in the Chrome Web Store.
                            For local usage, load the unpacked build from <span class="mono">apps/extension/dist</span>.
                        </p>
                    </div>
                </div>

                <div class="split">
                    <div class="surface-note">
                        <h3 style="font-size: 1rem; font-weight: 600;">Build locally</h3>
                        <pre class="code-block mono" style="margin-top: 12px;">pnpm --dir apps/extension build</pre>
                    </div>

                    <div class="surface-note">
                        <h3 style="font-size: 1rem; font-weight: 600;">Load in Chrome</h3>
                        <ol class="list-plain muted" style="margin-top: 12px;">
                            <li>1. Open <span class="mono">chrome://extensions</span>.</li>
                            <li>2. Enable Developer Mode.</li>
                            <li>3. Click Load unpacked.</li>
                            <li>4. Select <span class="mono">apps/extension/dist</span>.</li>
                        </ol>
                    </div>
                </div>
            </section>

            <div class="split">
                <section class="panel panel-pad">
                    <div class="section-head">
                        <div>
                            <h2>One-time code</h2>
                            <p>The code can be exchanged exactly once for a revocable Sanctum token scoped to extension abilities.</p>
                        </div>
                    </div>

                    <div data-testid="extension-one-time-code" class="code-block mono" style="font-size: 2rem; letter-spacing: 0.18em; text-align: center;">
                        {{ code }}
                    </div>
                    <p class="muted" style="margin-top: 12px;">
                        Expires in {{ expiresInMinutes }} minutes.
                    </p>
                </section>

                <section class="panel panel-pad">
                    <div class="section-head">
                        <div>
                            <h2>Connect steps</h2>
                            <p>Use the popup to exchange the code and bootstrap local extension state.</p>
                        </div>
                    </div>

                    <ol class="list-plain">
                        <li>1. Open the Snag extension popup.</li>
                        <li>2. If the extension is not installed yet, build it with <span class="mono">pnpm --dir apps/extension build</span> and load <span class="mono">apps/extension/dist</span> in <span class="mono">chrome://extensions</span>.</li>
                        <li>3. Set the popup API base URL to <span class="mono">{{ apiBaseUrl }}</span>.</li>
                        <li>4. Paste the one-time code from this page.</li>
                        <li>5. Name the current device so the token can be revoked later.</li>
                        <li>6. Complete the exchange against <span class="mono">{{ apiBaseUrl }}/api/v1/extension/tokens/exchange</span>.</li>
                    </ol>
                </section>
            </div>
        </div>
    </AppShell>
</template>
