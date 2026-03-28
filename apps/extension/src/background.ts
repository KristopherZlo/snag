import { captureVisibleTab, getTab, queryActiveTab, requestTabMediaStreamId, requestTelemetrySnapshot, startTelemetrySession } from './lib/chrome';
import { emptyTelemetrySnapshot } from './lib/capture-telemetry';
import type { RuntimeMessage } from './lib/runtime-messages';
import { clearPendingCapture, getRecordingState, readExtensionStorage, removeExtensionStorage, setPendingCapture, writeExtensionStorage } from './lib/storage';

const offscreenDocumentPath = 'offscreen.html';

async function captureCurrentTab() {
    const tab = await queryActiveTab();

    if (!tab?.windowId) {
        throw new Error('No active tab available for capture.');
    }

    const telemetry = tab.id
        ? await requestTelemetrySnapshot(tab.id, true)
        : null;

    const dataUrl = await captureVisibleTab(tab.windowId);
    const pendingCapture = {
        kind: 'screenshot' as const,
        dataUrl,
        title: tab.title ?? 'Browser capture',
        url: tab.url ?? '',
        capturedAt: new Date().toISOString(),
        telemetry: telemetry ?? emptyTelemetrySnapshot(),
    };

    await setPendingCapture(pendingCapture);

    return pendingCapture;
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

    const streamId = await requestTabMediaStreamId(tab.id);
    const response = await chrome.runtime.sendMessage({
        type: 'offscreen:start-video-recording',
        payload: {
            streamId,
            tabId: tab.id,
            title: tab.title ?? 'Browser capture',
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
        captureCurrentTab()
            .then((capture) => sendResponse({ ok: true, capture }))
            .catch((error) => sendResponse({ ok: false, message: error instanceof Error ? error.message : 'Capture failed.' }));

        return true;
    }

    if (message?.type === 'start-video-recording') {
        startVideoRecording(message.tabId ?? _sender.tab?.id)
            .then((recordingState) => sendResponse({ ok: true, recordingState }))
            .catch((error) => sendResponse({ ok: false, message: error instanceof Error ? error.message : 'Unable to start video recording.' }));

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

    return false;
});
