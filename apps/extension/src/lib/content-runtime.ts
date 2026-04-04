const reportingContentScriptId = 'snag-reporting-content';
const reportingOrigins = ['http://*/*', 'https://*/*'];
const reportingScriptFile = 'assets/content.js';

type ReportableTab = Pick<chrome.tabs.Tab, 'id' | 'url'>;

function runtimeError(): Error | null {
    const message = chrome.runtime?.lastError?.message;

    return message ? new Error(message) : null;
}

function isMissingContentScriptError(error: unknown): boolean {
    return error instanceof Error && /No script with id|No matching content scripts|Nonexistent script ID/i.test(error.message);
}

function isDuplicateContentScriptError(error: unknown): boolean {
    return error instanceof Error && /Duplicate script ID/i.test(error.message);
}

function withChromeCallback<T>(invoke: (callback: (value: T) => void) => void): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        invoke((value) => {
            const error = runtimeError();

            if (error) {
                reject(error);
                return;
            }

            resolve(value);
        });
    });
}

function withChromeVoidCallback(invoke: (callback: () => void) => void): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        invoke(() => {
            const error = runtimeError();

            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
}

export function isReportablePage(url?: string | null): boolean {
    return typeof url === 'string' && /^https?:\/\//i.test(url);
}

async function getRegisteredReportingScripts(): Promise<chrome.scripting.RegisteredContentScript[]> {
    if (!chrome.scripting?.getRegisteredContentScripts) {
        return [];
    }

    try {
        return await withChromeCallback((callback) => {
            chrome.scripting.getRegisteredContentScripts({
                ids: [reportingContentScriptId],
            }, callback);
        });
    } catch (error) {
        if (isMissingContentScriptError(error)) {
            return [];
        }

        throw error;
    }
}

async function refreshReportingOverlayState(tab?: ReportableTab | null): Promise<void> {
    if (!tab?.id || !chrome.tabs?.sendMessage) {
        return;
    }

    await withChromeCallback((callback) => {
        chrome.tabs.sendMessage(tab.id!, { type: 'overlay:refresh-state' }, () => callback(undefined));
    }).catch(() => undefined);
}

export async function hasReportingHostAccess(): Promise<boolean> {
    if (!chrome.permissions?.contains) {
        return false;
    }

    return withChromeCallback((callback) => {
        chrome.permissions.contains({
            origins: reportingOrigins,
        }, callback);
    });
}

export async function getReportingRuntimeDiagnostics(activeTab?: ReportableTab | null): Promise<{
    permissionGranted: boolean | null;
    permissionError: string | null;
    registeredScriptIds: string[];
    registeredScriptCount: number;
    registeredScriptsError: string | null;
    reportablePage: boolean;
    activeTabId: number | null;
    activeTabUrl: string | null;
}> {
    let permissionGranted: boolean | null = null;
    let permissionError: string | null = null;
    let registeredScriptIds: string[] = [];
    let registeredScriptsError: string | null = null;

    try {
        permissionGranted = await hasReportingHostAccess();
    } catch (error) {
        permissionError = error instanceof Error ? error.message : 'Unable to read optional host permission state.';
    }

    try {
        const scripts = await getRegisteredReportingScripts();
        registeredScriptIds = scripts.map((script) => script.id);
    } catch (error) {
        registeredScriptsError = error instanceof Error ? error.message : 'Unable to inspect registered content scripts.';
    }

    return {
        permissionGranted,
        permissionError,
        registeredScriptIds,
        registeredScriptCount: registeredScriptIds.length,
        registeredScriptsError,
        reportablePage: isReportablePage(activeTab?.url),
        activeTabId: typeof activeTab?.id === 'number' ? activeTab.id : null,
        activeTabUrl: typeof activeTab?.url === 'string' ? activeTab.url : null,
    };
}

export async function requestReportingHostAccess(): Promise<boolean> {
    if (!chrome.permissions?.request) {
        return false;
    }

    return withChromeCallback((callback) => {
        chrome.permissions.request({
            origins: reportingOrigins,
        }, callback);
    });
}

export async function registerReportingContentRuntime(): Promise<void> {
    if (!chrome.scripting?.registerContentScripts) {
        return;
    }

    const existingScripts = await getRegisteredReportingScripts();

    if (existingScripts.some((script) => script.id === reportingContentScriptId)) {
        return;
    }

    try {
        await withChromeVoidCallback((callback) => {
            chrome.scripting.registerContentScripts([{
                id: reportingContentScriptId,
                js: [reportingScriptFile],
                matches: reportingOrigins,
                runAt: 'document_start',
                persistAcrossSessions: true,
            }], callback);
        });
    } catch (error) {
        if (isDuplicateContentScriptError(error)) {
            return;
        }

        throw error;
    }
}

export async function disableReportingContentRuntime(): Promise<void> {
    if (!chrome.scripting?.unregisterContentScripts) {
        return;
    }

    try {
        await withChromeVoidCallback((callback) => {
            chrome.scripting.unregisterContentScripts({
                ids: [reportingContentScriptId],
            }, callback);
        });
    } catch (error) {
        if (isMissingContentScriptError(error)) {
            return;
        }

        throw error;
    }
}

export async function injectReportingContentRuntime(tab?: ReportableTab | null): Promise<void> {
    if (!tab?.id || !isReportablePage(tab.url) || !chrome.scripting?.executeScript) {
        return;
    }

    await withChromeCallback((callback) => {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: [reportingScriptFile],
        }, callback);
    });

    await refreshReportingOverlayState(tab);
}

export async function requestAndEnableReportingRuntime(tab?: ReportableTab | null): Promise<boolean> {
    const granted = await requestReportingHostAccess();

    if (!granted) {
        return false;
    }

    await registerReportingContentRuntime();
    await injectReportingContentRuntime(tab);

    return true;
}

export async function reconcileReportingContentRuntime(options: {
    connected: boolean;
    reportingEnabled: boolean;
    activeTab?: ReportableTab | null;
}): Promise<{
    active: boolean;
    permissionGranted: boolean;
}> {
    if (!options.connected || !options.reportingEnabled) {
        await disableReportingContentRuntime();

        return {
            active: false,
            permissionGranted: false,
        };
    }

    const permissionGranted = await hasReportingHostAccess();

    if (!permissionGranted) {
        await disableReportingContentRuntime();

        return {
            active: false,
            permissionGranted: false,
        };
    }

    await registerReportingContentRuntime();
    await injectReportingContentRuntime(options.activeTab);

    return {
        active: true,
        permissionGranted: true,
    };
}
