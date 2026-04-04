<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive } from 'vue';
import { CheckCircle2, CircleAlert, ExternalLink, LoaderCircle, PlugZap, Shield, Unplug, X } from 'lucide-vue-next';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { assertSecureApiBaseUrl, buildApiUrl, defaultApiBaseUrl, readApiError, rememberApiBaseUrl } from '@/lib/api-base-url';
import { probeOverlayDebugSnapshot, probePageContext, queryActiveTab } from '@/lib/chrome';
import {
    disableReportingContentRuntime,
    getReportingRuntimeDiagnostics,
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

const DEFAULT_DISCONNECTED_STATUS = 'Connect the extension to enable the floating recorder on every page.';

const state = reactive({
    apiBaseUrl: defaultApiBaseUrl(),
    code: '',
    deviceName: 'Chromium extension',
    status: DEFAULT_DISCONNECTED_STATUS,
    busy: false,
    session: null as ExtensionSession | null,
    reportingEnabled: false,
});

function updateStatus(message: string) {
    state.status = message;
}

function clearStatus() {
    state.status = '';
}

function updateStatusFromError(error: unknown, fallbackMessage: string) {
    updateStatus(error instanceof Error ? error.message : fallbackMessage);
}

function validateApiBaseUrl(value: string): string {
    return assertSecureApiBaseUrl(value);
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
        try {
            const apiBaseUrl = validateApiBaseUrl(session.apiBaseUrl);
            state.session = { ...session, apiBaseUrl };
            state.apiBaseUrl = apiBaseUrl;
            if (state.status === DEFAULT_DISCONNECTED_STATUS) {
                state.status = '';
            }
        } catch {
            await clearSession();
            state.session = null;
            state.apiBaseUrl = defaultApiBaseUrl();
            updateStatus('Stored extension session was cleared because it used an insecure HTTP base URL. Reconnect using HTTPS or localhost.');
        }
    } else {
        state.session = null;
        if (!state.status) {
            state.status = DEFAULT_DISCONNECTED_STATUS;
        }
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

const apiBaseUrlError = computed(() => {
    try {
        validateApiBaseUrl(state.apiBaseUrl);

        return null;
    } catch (error) {
        return error instanceof Error ? error.message : 'Enter a valid Snag base URL.';
    }
});

const connectSettingsUrl = computed(() => {
    try {
        return buildApiUrl(validateApiBaseUrl(state.apiBaseUrl), '/settings/extension/connect');
    } catch {
        return null;
    }
});

const sentCapturesUrl = computed(() => {
    try {
        return buildApiUrl(validateApiBaseUrl(state.session?.apiBaseUrl ?? state.apiBaseUrl), '/settings/extension/captures');
    } catch {
        return null;
    }
});
const canCopyDebugLog = computed(() => Boolean(state.session));
const connectionBadgeLabel = computed(() => {
    if (!state.session) {
        return 'Not connected';
    }

    return state.reportingEnabled ? 'Reporting on' : 'Reporting off';
});

const revokeRemoteSession = async (session: ExtensionSession) => {
    const apiBaseUrl = validateApiBaseUrl(session.apiBaseUrl);
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

const openConnectSettings = async () => {
    if (!connectSettingsUrl.value) {
        updateStatus(apiBaseUrlError.value ?? 'Enter a valid Snag base URL first.');
        return;
    }

    await openUrl(connectSettingsUrl.value);
};

const openSentCaptures = async () => {
    if (!sentCapturesUrl.value) {
        updateStatus('Reconnect the extension with a secure base URL before opening sent captures.');
        return;
    }

    await openUrl(sentCapturesUrl.value);
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
        const apiBaseUrl = validateApiBaseUrl(state.apiBaseUrl);
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
        const activeTab = await queryActiveTab().catch(() => undefined);
        const granted = await requestAndEnableReportingRuntime(activeTab);

        await setReportingEnabled(granted);

        updateStatus(granted
            ? `Connected to ${payload.organization.name}. Start reporting is enabled.`
            : `Connected to ${payload.organization.name}, but reporting is still off. Allow page access and turn on Start reporting to show the floating recorder.`);
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

        const [pageContextProbe, overlaySnapshotProbe, runtimeDiagnostics, debugEntries] = await Promise.all([
            probePageContext(activeTab.id),
            probeOverlayDebugSnapshot(activeTab.id),
            getReportingRuntimeDiagnostics({
                id: activeTab.id,
                url: activeTab.url,
            }),
            getOverlayDebugEntries(),
        ]);
        const snapshot = overlaySnapshotProbe.value;
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
            popup_state: {
                connected: Boolean(state.session),
                reportingEnabled: state.reportingEnabled,
                activeTabReportable: /^https?:\/\//.test(activeTab.url),
            },
            content_runtime: runtimeDiagnostics,
            content_script_probe: {
                page_context: {
                    reachable: Boolean(pageContextProbe.value),
                    error: pageContextProbe.error,
                    payload: pageContextProbe.value,
                },
                overlay_debug_snapshot: {
                    reachable: Boolean(overlaySnapshotProbe.value),
                    error: overlaySnapshotProbe.error,
                },
            },
            content_script_reachable: Boolean(snapshot),
            note: snapshot
                ? 'Live overlay snapshot included.'
                : overlaySnapshotProbe.error
                    ? `Content script did not answer: ${overlaySnapshotProbe.error}`
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
                    {{ connectionBadgeLabel }}
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
                            placeholder="https://snag.example.com"
                        />
                        <p class="text-sm text-muted-foreground">Use your HTTPS Snag URL. Plain HTTP is allowed only for localhost during local development.</p>
                        <p v-if="apiBaseUrlError" class="text-sm text-destructive">{{ apiBaseUrlError }}</p>
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
                        <Button data-testid="popup-connect-action" :disabled="state.busy || !state.code.trim() || Boolean(apiBaseUrlError)" @click="connect">
                            <LoaderCircle v-if="state.busy" class="size-4 animate-spin" />
                            <span>Exchange code</span>
                        </Button>
                        <Button data-testid="popup-open-settings" variant="outline" :disabled="state.busy || !connectSettingsUrl" @click="openConnectSettings">
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
                                <p class="text-xs font-medium" :class="state.reportingEnabled ? 'text-emerald-700' : 'text-amber-700'">
                                    {{ state.reportingEnabled ? 'Recorder is on for allowed pages.' : 'Recorder is off. Turn this on to show the floating button.' }}
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
                            <Button data-testid="popup-open-captures" variant="outline" :disabled="state.busy || !sentCapturesUrl" @click="openSentCaptures">
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

            <Alert data-testid="popup-status" :class="['relative pr-10', state.status ? '' : 'hidden']">
                <CircleAlert class="size-4" />
                <AlertDescription>{{ state.status }}</AlertDescription>
                <button
                    data-testid="popup-status-dismiss"
                    type="button"
                    class="absolute right-3 top-3 inline-flex size-5 items-center justify-center rounded-sm text-current/65 transition-colors hover:text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                    aria-label="Dismiss notification"
                    @click="clearStatus"
                >
                    <X class="size-3.5" />
                </button>
            </Alert>
        </div>
    </div>
</template>
