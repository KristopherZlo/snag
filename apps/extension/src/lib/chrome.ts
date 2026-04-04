import type { CaptureTelemetrySnapshot } from './capture-telemetry';
import { normalizeTelemetrySnapshot } from './capture-telemetry';

export interface ContentScriptProbeResult<T> {
    value: T | null;
    error: string | null;
}

export async function queryActiveTab(): Promise<chrome.tabs.Tab | undefined> {
    return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs[0]));
    });
}

export async function getTab(tabId: number): Promise<chrome.tabs.Tab | undefined> {
    return new Promise((resolve, reject) => {
        chrome.tabs.get(tabId, (tab) => {
            const error = chrome.runtime.lastError;

            if (error) {
                reject(new Error(error.message));
                return;
            }

            resolve(tab);
        });
    });
}

export async function captureVisibleTab(windowId: number): Promise<string> {
    return new Promise((resolve, reject) => {
        chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, (dataUrl) => {
            const error = chrome.runtime.lastError;

            if (error || !dataUrl) {
                reject(new Error(error?.message ?? 'Unable to capture the current tab.'));
                return;
            }

            resolve(dataUrl);
        });
    });
}

export async function requestPageContext(tabId: number): Promise<Record<string, string>> {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { type: 'page-context' }, (response) => {
            resolve(response ?? {});
        });
    });
}

export async function probePageContext(tabId: number): Promise<ContentScriptProbeResult<Record<string, string>>> {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { type: 'page-context' }, (response) => {
            const error = chrome.runtime.lastError;

            if (error) {
                resolve({
                    value: null,
                    error: error.message,
                });
                return;
            }

            resolve({
                value: response ?? {},
                error: null,
            });
        });
    });
}

export async function startTelemetrySession(tabId: number): Promise<CaptureTelemetrySnapshot | null> {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { type: 'telemetry:start-session' }, (response) => {
            const error = chrome.runtime.lastError;

            if (error || !response?.ok) {
                resolve(null);
                return;
            }

            resolve(normalizeTelemetrySnapshot(response.snapshot));
        });
    });
}

export async function requestTelemetrySnapshot(tabId: number, reset = false): Promise<CaptureTelemetrySnapshot | null> {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { type: 'telemetry:snapshot', reset }, (response) => {
            const error = chrome.runtime.lastError;

            if (error || !response?.ok) {
                resolve(null);
                return;
            }

            resolve(normalizeTelemetrySnapshot(response.snapshot));
        });
    });
}

export async function requestOverlayDebugSnapshot(tabId: number): Promise<Record<string, unknown> | null> {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { type: 'overlay:debug-snapshot' }, (response) => {
            const error = chrome.runtime.lastError;

            if (error || !response?.ok || !response.snapshot || typeof response.snapshot !== 'object') {
                resolve(null);
                return;
            }

            resolve(response.snapshot as Record<string, unknown>);
        });
    });
}

export async function requestOverlayStateRefresh(tabId: number): Promise<boolean> {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { type: 'overlay:refresh-state' }, (response) => {
            const error = chrome.runtime.lastError;

            if (error || !response?.ok) {
                resolve(false);
                return;
            }

            resolve(true);
        });
    });
}

export async function probeOverlayDebugSnapshot(tabId: number): Promise<ContentScriptProbeResult<Record<string, unknown>>> {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { type: 'overlay:debug-snapshot' }, (response) => {
            const error = chrome.runtime.lastError;

            if (error) {
                resolve({
                    value: null,
                    error: error.message,
                });
                return;
            }

            if (!response?.ok || !response.snapshot || typeof response.snapshot !== 'object') {
                resolve({
                    value: null,
                    error: response?.message ?? 'Content script returned no overlay snapshot.',
                });
                return;
            }

            resolve({
                value: response.snapshot as Record<string, unknown>,
                error: null,
            });
        });
    });
}

export async function sendRuntimeMessage<T>(message: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            const error = chrome.runtime.lastError;

            if (error) {
                reject(new Error(error.message));
                return;
            }

            resolve(response as T);
        });
    });
}

export async function requestTabMediaStreamId(tabId: number): Promise<string> {
    return new Promise((resolve, reject) => {
        chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (streamId) => {
            const error = chrome.runtime.lastError;

            if (error || !streamId) {
                reject(new Error(error?.message ?? 'Unable to request a tab media stream.'));
                return;
            }

            resolve(streamId);
        });
    });
}
