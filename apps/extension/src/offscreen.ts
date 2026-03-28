import type { RuntimeMessage } from './lib/runtime-messages';
import { createDefaultVideoRecorderService } from './lib/video-recorder';

const recorder = createDefaultVideoRecorderService();

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
    if (message?.type === 'offscreen:start-video-recording') {
        recorder
            .start(message.payload)
            .then((recordingState) => sendResponse({ ok: true, recordingState }))
            .catch((error) => sendResponse({ ok: false, message: error instanceof Error ? error.message : 'Unable to start video recording.' }));

        return true;
    }

    if (message?.type === 'offscreen:stop-video-recording') {
        recorder
            .stop()
            .then((capture) => sendResponse({ ok: true, capture }))
            .catch((error) => sendResponse({ ok: false, message: error instanceof Error ? error.message : 'Unable to stop video recording.' }));

        return true;
    }

    if (message?.type === 'offscreen:reset-video-recording') {
        recorder
            .reset()
            .then(() => sendResponse({ ok: true }))
            .catch((error) => sendResponse({ ok: false, message: error instanceof Error ? error.message : 'Unable to reset video recording.' }));

        return true;
    }

    return false;
});
