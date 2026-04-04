export interface StartVideoRecordingMessage {
    type: 'start-video-recording';
    tabId?: number;
}

export interface StopVideoRecordingMessage {
    type: 'stop-video-recording';
}

export interface CaptureCurrentTabMessage {
    type: 'capture-current-tab';
}

export interface DiscardPendingCaptureMessage {
    type: 'discard-pending-capture';
}

export interface StorageGetMessage {
    type: 'storage:get';
    key: string;
}

export interface StorageSetMessage {
    type: 'storage:set';
    values: Record<string, unknown>;
}

export interface StorageRemoveMessage {
    type: 'storage:remove';
    key: string;
}

export interface StartTelemetrySessionMessage {
    type: 'telemetry:start-session';
}

export interface ReadTelemetrySnapshotMessage {
    type: 'telemetry:snapshot';
    reset?: boolean;
}

export interface SubmitPendingCaptureMessage {
    type: 'report:submit';
    payload: {
        summary: string;
        fallbackContext?: Record<string, unknown>;
        screenshotOverrideBlobKey?: string | null;
    };
}

export interface RefreshOverlayStateMessage {
    type: 'overlay:refresh-state';
}

export interface OffscreenStartVideoRecordingMessage {
    type: 'offscreen:start-video-recording';
    payload: {
        streamId: string;
        tabId: number;
        title: string;
        url: string;
        capturedAt: string;
    };
}

export interface OffscreenStopVideoRecordingMessage {
    type: 'offscreen:stop-video-recording';
}

export interface OffscreenResetVideoRecordingMessage {
    type: 'offscreen:reset-video-recording';
}

export type RuntimeMessage =
    | CaptureCurrentTabMessage
    | DiscardPendingCaptureMessage
    | OffscreenResetVideoRecordingMessage
    | OffscreenStartVideoRecordingMessage
    | OffscreenStopVideoRecordingMessage
    | RefreshOverlayStateMessage
    | ReadTelemetrySnapshotMessage
    | SubmitPendingCaptureMessage
    | StorageGetMessage
    | StorageRemoveMessage
    | StorageSetMessage
    | StartVideoRecordingMessage
    | StartTelemetrySessionMessage
    | StopVideoRecordingMessage;
