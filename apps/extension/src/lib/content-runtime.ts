const reportingContentScriptId = 'snag-reporting-content';
const reportingOrigins = ['http://*/*', 'https://*/*'];
const reportingScriptFile = 'assets/content.js';

type ReportableTab = Pick<chrome.tabs.Tab, 'id' | 'url'>;

function runtimeError(): Error | null {
    const message = chrome.runtime?.lastError?.message;

    return message ? new Error(message) : null;
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

    return withChromeCallback((callback) => {
        chrome.scripting.getRegisteredContentScripts({
            ids: [reportingContentScriptId],
        }, callback);
    });
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

    await withChromeVoidCallback((callback) => {
        chrome.scripting.registerContentScripts([{
            id: reportingContentScriptId,
            js: [reportingScriptFile],
            matches: reportingOrigins,
            runAt: 'document_start',
            persistAcrossSessions: true,
        }], callback);
    });
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
        if (error instanceof Error && /No script with id|No matching content scripts/i.test(error.message)) {
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
