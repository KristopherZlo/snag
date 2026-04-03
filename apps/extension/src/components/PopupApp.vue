<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive } from 'vue';
import { CheckCircle2, CircleAlert, ExternalLink, LoaderCircle, PlugZap, Shield, Unplug } from 'lucide-vue-next';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { buildApiUrl, defaultApiBaseUrl, normalizeApiBaseUrl, readApiError, rememberApiBaseUrl } from '@/lib/api-base-url';
import { queryActiveTab, requestOverlayDebugSnapshot } from '@/lib/chrome';
import {
    disableReportingContentRuntime,
    reconcileReportingContentRuntime,
    requestAndEnableReportingRuntime,
} from '@/lib/content-runtime';
import {
    clearSession,
    getOverlayDebugEntries,
    getReportingEnabled,
    getSession,
    rememberCaptureAccessGrant,
    setReportingEnabled,
    setSession,
    type ExtensionSession,
} from '@/lib/storage';

const state = reactive({
    apiBaseUrl: defaultApiBaseUrl(),
    code: '',
    deviceName: 'Chromium extension',
    status: 'Connect the extension to enable the floating recorder on every page.',
    busy: false,
    session: null as ExtensionSession | null,
    reportingEnabled: false,
});

function updateStatus(message: string) {
    state.status = message;
}

function updateStatusFromError(error: unknown, fallbackMessage: string) {
    updateStatus(error instanceof Error ? error.message : fallbackMessage);
}

const openUrl = async (url: string) => {
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
        await chrome.tabs.create({ url });
        return;
    }

    window.open(url, '_blank', 'noopener');
};

const refreshState = async () => {
    const [session, reportingEnabled] = await Promise.all([
        getSession(),
        getReportingEnabled(),
    ]);

    if (session) {
        const apiBaseUrl = normalizeApiBaseUrl(session.apiBaseUrl);
        state.session = { ...session, apiBaseUrl };
        state.apiBaseUrl = apiBaseUrl;
    } else {
        state.session = null;
    }

    state.reportingEnabled = reportingEnabled;
};

async function hydrateState() {
    try {
        await refreshState();
        await reconcileReportingRuntimeState();
    } catch (error) {
        updateStatusFromError(error, 'Unable to load extension state.');
    }
}

async function rememberCurrentTabCaptureAccess() {
    try {
        if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
            return;
        }

        const activeTab = await new Promise<chrome.tabs.Tab | undefined>((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs[0]));
        });

        if (!activeTab) {
            return;
        }

        await rememberCaptureAccessGrant(activeTab);
    } catch {
        // The popup should stay usable even if the current-tab grant cannot be cached.
    }
}

const sessionRows = computed(() => {
    if (!state.session) {
        return [];
    }

    return [
        { label: 'Device', value: state.session.device_name },
        { label: 'Organization', value: state.session.organization.name },
        { label: 'User', value: state.session.user.email },
        { label: 'Expires', value: new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(state.session.expires_at)) },
        { label: 'Base URL', value: state.session.apiBaseUrl },
    ];
});

const connectSettingsUrl = computed(() => buildApiUrl(state.apiBaseUrl, '/settings/extension/connect'));
const sentCapturesUrl = computed(() => buildApiUrl(state.session?.apiBaseUrl ?? state.apiBaseUrl, '/settings/extension/captures'));
const canCopyDebugLog = computed(() => Boolean(state.session));

const revokeRemoteSession = async (session: ExtensionSession) => {
    const apiBaseUrl = normalizeApiBaseUrl(session.apiBaseUrl);
    const response = await fetch(buildApiUrl(apiBaseUrl, '/api/v1/extension/session'), {
        method: 'DELETE',
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${session.token}`,
        },
    });

    if (response.status === 401 || response.status === 403) {
        return;
    }

    if (!response.ok) {
        throw new Error(await readApiError(response, apiBaseUrl));
    }
};

async function reconcileReportingRuntimeState() {
    const activeTab = await queryActiveTab().catch(() => undefined);
    const runtimeState = await reconcileReportingContentRuntime({
        connected: Boolean(state.session),
        reportingEnabled: state.reportingEnabled,
        activeTab,
    });

    if (!state.reportingEnabled || runtimeState.active) {
        return;
    }

    await setReportingEnabled(false);
    state.reportingEnabled = false;
    updateStatus(state.session
        ? 'Start reporting was reset. Grant page access from the popup when you want the recorder on a site.'
        : 'Start reporting was reset because the extension is not connected.');
}

const connect = async () => {
    state.busy = true;

    try {
        const apiBaseUrl = normalizeApiBaseUrl(state.apiBaseUrl);
        const response = await fetch(buildApiUrl(apiBaseUrl, '/api/v1/extension/tokens/exchange'), {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                code: state.code,
                device_name: state.deviceName,
            }),
        });

        if (!response.ok) {
            throw new Error(await readApiError(response, apiBaseUrl));
        }

        const payload = (await response.json()) as ExtensionSession;
        await setSession({ ...payload, apiBaseUrl });
        rememberApiBaseUrl(apiBaseUrl);
        state.code = '';
        updateStatus(`Connected to ${payload.organization.name}. Turn on Start reporting when you want the floating recorder on the page.`);
        await refreshState();
        await reconcileReportingRuntimeState();
    } catch (error) {
        updateStatusFromError(error, 'Unable to connect extension.');
    } finally {
        state.busy = false;
    }
};

const clearConnection = async () => {
    state.busy = true;

    try {
        if (state.session) {
            await revokeRemoteSession(state.session);
        }

        await disableReportingContentRuntime();
        await clearSession();
        await setReportingEnabled(false);
        updateStatus('Extension session cleared.');
        await refreshState();
    } catch (error) {
        updateStatusFromError(error, 'Unable to revoke the extension session.');
    } finally {
        state.busy = false;
    }
};

const updateReporting = async (enabled: boolean) => {
    const previousEnabled = state.reportingEnabled;
    state.reportingEnabled = enabled;
    state.busy = true;

    try {
        if (enabled) {
            const granted = await requestAndEnableReportingRuntime(await queryActiveTab().catch(() => undefined));

            if (!granted) {
                state.reportingEnabled = false;
                updateStatus('Page access was not granted. Start reporting stays off until you explicitly allow Snag on regular http(s) pages.');
                return;
            }
        } else {
            await disableReportingContentRuntime();
        }

        await setReportingEnabled(enabled);
        updateStatus(enabled
            ? 'Start reporting is enabled. The recorder can run only on allowed regular http(s) pages.'
            : 'Start reporting is disabled. Future page injections are blocked until you enable it again.');
    } catch (error) {
        state.reportingEnabled = previousEnabled;

        if (!previousEnabled && enabled) {
            await disableReportingContentRuntime().catch(() => undefined);
        }

        updateStatusFromError(error, 'Unable to update Start reporting.');
    } finally {
        state.busy = false;
    }
};

const copyPageDebugLog = async () => {
    state.busy = true;

    try {
        const activeTab = await queryActiveTab();

        if (!activeTab?.id || !activeTab.url || !/^https?:\/\//.test(activeTab.url)) {
            throw new Error('Open a regular http(s) page first, then run Copy page debug log again.');
        }

        const [snapshot, debugEntries] = await Promise.all([
            requestOverlayDebugSnapshot(activeTab.id),
            getOverlayDebugEntries(),
        ]);
        const payload = {
            generated_at: new Date().toISOString(),
            extension: {
                id: chrome.runtime?.id ?? null,
                version: chrome.runtime?.getManifest?.().version ?? null,
            },
            active_tab: {
                id: activeTab.id,
                title: activeTab.title ?? null,
                url: activeTab.url,
            },
            content_script_reachable: Boolean(snapshot),
            note: snapshot
                ? 'Live overlay snapshot included.'
                : 'Content script did not answer. This usually means the page was not reloaded after installing the extension, the content script is not running on this origin, or the page is not a regular http(s) document.',
            recent_overlay_events: debugEntries
                .filter((entry) => entry.url === activeTab.url)
                .slice(-20),
            overlay_snapshot: snapshot,
        };

        await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
        updateStatus(snapshot
            ? 'Page debug log copied to clipboard.'
            : 'Copied a fallback debug log. The content script did not respond on the active page.');
    } catch (error) {
        updateStatusFromError(error, 'Unable to copy the page debug log.');
    } finally {
        state.busy = false;
    }
};

function handleStorageChange(changes: Record<string, chrome.storage.StorageChange>, areaName: string) {
    if (areaName !== 'local' && areaName !== 'session') {
        return;
    }

    if ('session' in changes || 'reportingEnabled' in changes) {
        void hydrateState();
    }
}

onMounted(() => {
    void hydrateState();
    void rememberCurrentTabCaptureAccess();
    chrome.storage?.onChanged?.addListener(handleStorageChange);
});

onBeforeUnmount(() => {
    chrome.storage?.onChanged?.removeListener(handleStorageChange);
});
</script>

<template>
    <div data-testid="popup-root" class="flex min-h-[560px] w-[392px] flex-col bg-background">
        <div class="border-b bg-background px-4 py-4">
            <div class="flex items-center justify-between gap-3">
                <div>
                    <div class="text-base font-semibold">Snag Extension</div>
                    <p class="text-sm text-muted-foreground">Connect once, then control on-page reporting from here.</p>
                </div>
                <Badge :variant="state.session ? 'secondary' : 'outline'">
                    {{ state.session ? 'Connected' : 'Not connected' }}
                </Badge>
            </div>
        </div>

        <div class="flex-1 space-y-4 overflow-y-auto p-4">
            <Card v-if="!state.session">
                <CardHeader>
                    <CardTitle class="flex items-center gap-2 text-base">
                        <PlugZap class="size-4" />
                        <span>Connect extension</span>
                    </CardTitle>
                    <CardDescription>Use the one-time code from the website settings page.</CardDescription>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div class="space-y-2">
                        <Label for="popup-api-base-url">API base URL</Label>
                        <Input
                            id="popup-api-base-url"
                            v-model="state.apiBaseUrl"
                            placeholder="http://192.168.x.x/snag"
                        />
                        <p class="text-sm text-muted-foreground">Use the LAN URL shown by `php artisan snag:xampp`.</p>
                    </div>

                    <div class="space-y-2">
                        <Label for="popup-one-time-code">One-time code</Label>
                        <Input
                            id="popup-one-time-code"
                            v-model="state.code"
                            placeholder="Paste code from settings"
                        />
                    </div>

                    <div class="space-y-2">
                        <Label for="popup-device-name">Device name</Label>
                        <Input
                            id="popup-device-name"
                            v-model="state.deviceName"
                            placeholder="Chromium extension"
                        />
                    </div>

                    <div class="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                        1. Open extension connect on the site.
                        <br>
                        2. Copy the one-time code.
                        <br>
                        3. Paste it here and exchange it for the extension session.
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                        <Button data-testid="popup-connect-action" :disabled="state.busy || !state.code.trim()" @click="connect">
                            <LoaderCircle v-if="state.busy" class="size-4 animate-spin" />
                            <span>Exchange code</span>
                        </Button>
                        <Button data-testid="popup-open-settings" variant="outline" :disabled="state.busy" @click="openUrl(connectSettingsUrl)">
                            <ExternalLink class="size-4" />
                            <span>Open settings</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <template v-else>
                <Card>
                    <CardHeader>
                        <CardTitle class="flex items-center gap-2 text-base">
                            <Shield class="size-4" />
                            <span>Reporting</span>
                        </CardTitle>
                        <CardDescription>Turn the floating recorder on or off for pages where the content script is running.</CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        <div class="flex items-start justify-between gap-4 rounded-md border bg-background p-4">
                            <div class="space-y-1">
                                <Label for="popup-reporting-toggle" class="text-base">Start reporting</Label>
                                <p class="text-sm text-muted-foreground">
                                    Show the draggable recorder on every connected page.
                                </p>
                            </div>

                            <Switch
                                id="popup-reporting-toggle"
                                data-testid="popup-reporting-toggle"
                                :model-value="state.reportingEnabled"
                                :disabled="state.busy"
                                @update:model-value="updateReporting"
                            />
                        </div>

                        <div class="grid gap-2">
                            <Button data-testid="popup-open-captures" variant="outline" :disabled="state.busy" @click="openUrl(sentCapturesUrl)">
                                <ExternalLink class="size-4" />
                                <span>Sent captures</span>
                            </Button>
                            <Button
                                data-testid="popup-copy-debug-log"
                                variant="outline"
                                :disabled="state.busy || !canCopyDebugLog"
                                @click="copyPageDebugLog"
                            >
                                <ExternalLink class="size-4" />
                                <span>Copy page debug log</span>
                            </Button>
                            <Button data-testid="popup-clear-session" variant="outline" :disabled="state.busy" @click="clearConnection">
                                <Unplug class="size-4" />
                                <span>Clear session</span>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle class="flex items-center gap-2 text-base">
                            <CheckCircle2 class="size-4" />
                            <span>Current session</span>
                        </CardTitle>
                        <CardDescription>Connected workspace context used for all captures sent from the page overlay.</CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-3">
                        <div v-for="row in sessionRows" :key="row.label" class="space-y-1">
                            <p class="text-sm font-medium">{{ row.label }}</p>
                            <p class="break-all text-sm text-muted-foreground">{{ row.value }}</p>
                            <Separator v-if="row.label !== sessionRows.at(-1)?.label" />
                        </div>
                    </CardContent>
                </Card>
            </template>

            <Alert data-testid="popup-status" :class="state.status ? '' : 'hidden'">
                <CircleAlert class="size-4" />
                <AlertDescription>{{ state.status }}</AlertDescription>
            </Alert>
        </div>
    </div>
</template>
