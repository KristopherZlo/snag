import { captureVisibleTab, getTab, queryActiveTab, requestTabMediaStreamId, requestTelemetrySnapshot, startTelemetrySession } from './lib/chrome';
import { emptyTelemetrySnapshot } from './lib/capture-telemetry';
import { readPendingCaptureMedia, deletePendingCaptureMedia } from './lib/pending-capture-media';
import { normalizeReportTitle } from './lib/report-title';
import { submitPendingCapture } from './lib/report-submit';
import type { RuntimeMessage } from './lib/runtime-messages';
import {
    clearCaptureAccessGrant,
    clearPendingCapture,
    getCaptureAccessGrant,
    getPendingCapture,
    getRecordingState,
    getSession,
    readExtensionStorage,
    removeExtensionStorage,
    setPendingCapture,
    writeExtensionStorage,
} from './lib/storage';

const offscreenDocumentPath = 'offscreen.html';

function originForUrl(url?: string): string | null {
    if (typeof url !== 'string' || url === '') {
        return null;
    }

    try {
        return new URL(url).origin;
    } catch {
        return null;
    }
}

function normalizeCaptureErrorMessage(message: string, mode: 'screenshot' | 'recording'): string {
    if (!/not been invoked|cannot be captured|activeTab/i.test(message)) {
        return message;
    }

    if (mode === 'recording') {
        return 'Open the Snag extension popup once on this tab, then start recording again. Chrome only allows tab recording after an explicit extension invocation on the current page, and internal browser pages still cannot be captured.';
    }

    return 'Open the Snag extension popup once on this page, then try the screenshot again. Chrome sometimes blocks tab capture until the extension has been opened on the current tab, and protected browser pages still cannot be captured.';
}

async function assertVideoRecordingGrant(tab: chrome.tabs.Tab, explicitTabId?: number, senderTab?: chrome.tabs.Tab) {
    if (typeof explicitTabId === 'number' || !senderTab?.id || !tab.id) {
        return;
    }

    const grant = await getCaptureAccessGrant(senderTab.id);
    const currentOrigin = originForUrl(tab.url);

    if (!grant || grant.tabId !== senderTab.id || grant.origin !== currentOrigin) {
        throw new Error(
            'Open the Snag extension popup once on this tab, then start recording again. Chrome only allows tab recording after an explicit extension invocation on the current page.',
        );
    }
}

async function captureCurrentTab(explicitTabId?: number, senderTab?: chrome.tabs.Tab) {
    const tab = senderTab?.id
        ? await getTab(senderTab.id)
        : await resolveTargetTab(explicitTabId);

    const windowId = senderTab?.windowId ?? tab?.windowId;

    if (!windowId) {
        throw new Error('No active tab available for capture.');
    }

    const telemetry = tab.id
        ? await requestTelemetrySnapshot(tab.id, true)
        : null;

    const dataUrl = await captureVisibleTab(windowId).catch((error) => {
        throw new Error(
            normalizeCaptureErrorMessage(
                error instanceof Error ? error.message : 'Unable to capture the current tab.',
                'screenshot',
            ),
        );
    });
    const pendingCapture = {
        kind: 'screenshot' as const,
        dataUrl,
        title: normalizeReportTitle(tab.title),
        url: tab.url ?? '',
        capturedAt: new Date().toISOString(),
        telemetry: telemetry ?? emptyTelemetrySnapshot(),
    };

    await setPendingCapture(pendingCapture);

    return pendingCapture;
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const response = await fetch(dataUrl);

    return response.blob();
}

async function resolveTargetTab(explicitTabId?: number): Promise<chrome.tabs.Tab | undefined> {
    if (typeof explicitTabId === 'number') {
        return getTab(explicitTabId);
    }

    return queryActiveTab();
}

async function hasOffscreenDocument(): Promise<boolean> {
    if (!chrome.runtime.getContexts) {
        return false;
    }

    const contexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL(offscreenDocumentPath)],
    });

    return contexts.length > 0;
}

async function ensureOffscreenDocument(): Promise<void> {
    if (await hasOffscreenDocument()) {
        return;
    }

    await chrome.offscreen.createDocument({
        url: offscreenDocumentPath,
        reasons: ['USER_MEDIA'],
        justification: 'Record current-tab video captures for bug reports.',
    });
}

async function closeOffscreenDocument(): Promise<void> {
    if (!await hasOffscreenDocument()) {
        return;
    }

    await chrome.offscreen.closeDocument();
}

async function resetOffscreenRecording(): Promise<void> {
    await ensureOffscreenDocument();

    const response = await chrome.runtime.sendMessage({
        type: 'offscreen:reset-video-recording',
    });

    if (!response?.ok) {
        throw new Error(response?.message ?? 'Unable to reset video recording.');
    }
}

async function startVideoRecording(explicitTabId?: number) {
    const tab = await resolveTargetTab(explicitTabId);

    if (!tab?.id) {
        throw new Error('No active tab available for recording.');
    }

    await ensureOffscreenDocument();
    await resetOffscreenRecording();
    await startTelemetrySession(tab.id);

    const streamId = await requestTabMediaStreamId(tab.id).catch(async (error) => {
        await clearCaptureAccessGrant(tab.id);

        throw new Error(
            normalizeCaptureErrorMessage(
                error instanceof Error ? error.message : 'Unable to request a tab media stream.',
                'recording',
            ),
        );
    });
    const response = await chrome.runtime.sendMessage({
        type: 'offscreen:start-video-recording',
        payload: {
            streamId,
            tabId: tab.id,
            title: normalizeReportTitle(tab.title),
            url: tab.url ?? '',
            capturedAt: new Date().toISOString(),
        },
    });

    if (!response?.ok) {
        throw new Error(response?.message ?? 'Unable to start video recording.');
    }

    return response.recordingState;
}

async function stopVideoRecording() {
    await ensureOffscreenDocument();
    const recordingState = await getRecordingState();

    const response = await chrome.runtime.sendMessage({
        type: 'offscreen:stop-video-recording',
    });

    await closeOffscreenDocument();

    if (!response?.ok) {
        throw new Error(response?.message ?? 'Unable to stop video recording.');
    }

    if (!response.capture) {
        throw new Error('Offscreen recorder did not return a pending capture.');
    }

    const telemetry = recordingState.tabId
        ? await requestTelemetrySnapshot(recordingState.tabId, true)
        : null;

    const capture = {
        ...response.capture,
        telemetry: telemetry ?? emptyTelemetrySnapshot(),
    };

    await setPendingCapture(capture);

    return capture;
}

async function toggleVideoRecording() {
    const recordingState = await getRecordingState();

    if (recordingState.status === 'recording') {
        return stopVideoRecording();
    }

    return startVideoRecording();
}

async function submitStoredPendingCapture(options: {
    summary: string;
    fallbackContext?: Record<string, unknown>;
    screenshotOverrideDataUrl?: string | null;
}) {
    const [session, pendingCapture] = await Promise.all([
        getSession(),
        getPendingCapture(),
    ]);

    if (!session) {
        throw new Error('Extension is not connected. Reconnect it and try again.');
    }

    if (!pendingCapture) {
        throw new Error('No pending capture is available.');
    }

    let screenshotOverride: Blob | null = null;

    if (options.screenshotOverrideDataUrl) {
        screenshotOverride = await dataUrlToBlob(options.screenshotOverrideDataUrl);
    }

    return await submitPendingCapture({
        session,
        pendingCapture,
        summary: options.summary,
        screenshotOverride,
        fallbackContext: options.fallbackContext,
    });
}

chrome.commands.onCommand.addListener((command) => {
    if (command === 'capture-current-tab') {
        void captureCurrentTab();
    }

    if (command === 'toggle-video-recording') {
        void toggleVideoRecording();
    }
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
    if (message?.type === 'storage:get') {
        readExtensionStorage(message.key)
            .then((value) => sendResponse({ ok: true, values: value === undefined ? {} : { [message.key]: value } }))
            .catch((error) => sendResponse({ ok: false, message: error instanceof Error ? error.message : 'Unable to read extension storage.' }));

        return true;
    }

    if (message?.type === 'storage:set') {
        writeExtensionStorage(message.values)
            .then(() => sendResponse({ ok: true }))
            .catch((error) => sendResponse({ ok: false, message: error instanceof Error ? error.message : 'Unable to write extension storage.' }));

        return true;
    }

    if (message?.type === 'storage:remove') {
        removeExtensionStorage(message.key)
            .then(() => sendResponse({ ok: true }))
            .catch((error) => sendResponse({ ok: false, message: error instanceof Error ? error.message : 'Unable to remove extension storage.' }));

        return true;
    }

    if (message?.type === 'capture-current-tab') {
        captureCurrentTab(undefined, _sender.tab)
            .then((capture) => sendResponse({ ok: true, capture }))
            .catch((error) => sendResponse({ ok: false, message: error instanceof Error ? error.message : 'Capture failed.' }));

        return true;
    }

    if (message?.type === 'start-video-recording') {
        resolveTargetTab(message.tabId ?? _sender.tab?.id)
            .then(async (tab) => {
                if (!tab?.id) {
                    throw new Error('No active tab available for recording.');
                }

                await assertVideoRecordingGrant(tab, message.tabId, _sender.tab);

                return startVideoRecording(message.tabId ?? _sender.tab?.id);
            })
            .then((recordingState) => sendResponse({ ok: true, recordingState }))
            .catch((error) => sendResponse({
                ok: false,
                message: normalizeCaptureErrorMessage(
                    error instanceof Error ? error.message : 'Unable to start video recording.',
                    'recording',
                ),
            }));

        return true;
    }

    if (message?.type === 'stop-video-recording') {
        stopVideoRecording()
            .then((capture) => sendResponse({ ok: true, capture }))
            .catch((error) => sendResponse({ ok: false, message: error instanceof Error ? error.message : 'Unable to stop video recording.' }));

        return true;
    }

    if (message?.type === 'discard-pending-capture') {
        clearPendingCapture()
            .then(() => sendResponse({ ok: true }))
            .catch((error) => sendResponse({ ok: false, message: error instanceof Error ? error.message : 'Unable to clear the pending capture.' }));

        return true;
    }

    if (message?.type === 'report:submit') {
        submitStoredPendingCapture(message.payload)
            .then((result) => sendResponse({ ok: true, result }))
            .catch((error) => sendResponse({ ok: false, message: error instanceof Error ? error.message : 'Unable to submit capture.' }));

        return true;
    }

    return false;
});
