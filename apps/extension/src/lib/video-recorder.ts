import { deletePendingCaptureMedia, writePendingCaptureMedia } from './pending-capture-media';
import {
    clearPendingCapture,
    clearRecordingState,
    getPendingCapture,
    setPendingCapture,
    setRecordingState,
    type RecordingState,
    type VideoPendingCapture,
} from './storage';

export interface StartVideoRecordingPayload {
    streamId: string;
    tabId: number;
    title: string;
    url: string;
    capturedAt: string;
}

export interface VideoRecorderDependencies {
    createMediaStream: (streamId: string) => Promise<MediaStream>;
    createMediaRecorder: (stream: MediaStream, options?: MediaRecorderOptions) => MediaRecorder;
    isMimeTypeSupported: (mimeType: string) => boolean;
    now: () => number;
}

interface ActiveRecording {
    recorder: MediaRecorder;
    stream: MediaStream;
    chunks: BlobPart[];
    tabId: number;
    title: string;
    url: string;
    capturedAt: string;
    startedAt: string;
}

export class VideoRecorderService {
    private activeRecording: ActiveRecording | null = null;

    public constructor(private readonly dependencies: VideoRecorderDependencies) {}

    public async start(payload: StartVideoRecordingPayload): Promise<RecordingState> {
        if (this.activeRecording) {
            throw new Error('A video recording is already in progress.');
        }

        const stream = await this.dependencies.createMediaStream(payload.streamId);
        const recorder = this.dependencies.createMediaRecorder(stream, this.recorderOptions());
        const startedAt = new Date(this.dependencies.now()).toISOString();
        const activeRecording: ActiveRecording = {
            recorder,
            stream,
            chunks: [],
            title: payload.title,
            url: payload.url,
            capturedAt: payload.capturedAt,
            startedAt,
            tabId: payload.tabId,
        };

        recorder.addEventListener('dataavailable', (event) => {
            if (event.data && event.data.size > 0) {
                activeRecording.chunks.push(event.data);
            }
        });

        recorder.addEventListener('stop', () => {
            this.stopStream(activeRecording.stream);
        });

        recorder.addEventListener('error', () => {
            this.stopStream(activeRecording.stream);
        });

        recorder.start();
        this.activeRecording = activeRecording;

        const state: RecordingState = {
            status: 'recording',
            tabId: payload.tabId,
            title: payload.title,
            url: payload.url,
            capturedAt: payload.capturedAt,
            startedAt,
        };

        await setRecordingState(state);

        return state;
    }

    public async stop(): Promise<VideoPendingCapture> {
        if (!this.activeRecording) {
            throw new Error('No video recording is in progress.');
        }

        const activeRecording = this.activeRecording;

        const capture = await new Promise<VideoPendingCapture>((resolve, reject) => {
            const handleStop = async () => {
                try {
                    const durationSeconds = Math.max(
                        1,
                        Math.ceil((this.dependencies.now() - Date.parse(activeRecording.startedAt)) / 1000),
                    );
                    const blob = new Blob(activeRecording.chunks, { type: 'video/webm' });
                    const previousCapture = await getPendingCapture();

                    if (previousCapture?.kind === 'video') {
                        await deletePendingCaptureMedia(previousCapture.blobKey);
                    }

                    const blobKey = await writePendingCaptureMedia(blob);
                    const capture: VideoPendingCapture = {
                        kind: 'video',
                        blobKey,
                        mimeType: blob.type || 'video/webm',
                        byteSize: blob.size,
                        durationSeconds,
                        title: activeRecording.title,
                        url: activeRecording.url,
                        capturedAt: activeRecording.capturedAt,
                        telemetry: null,
                    };

                    await setPendingCapture(capture);
                    await clearRecordingState();
                    this.activeRecording = null;
                    resolve(capture);
                } catch (error) {
                    this.activeRecording = null;
                    await clearRecordingState();
                    reject(error instanceof Error ? error : new Error('Unable to save the video recording.'));
                }
            };

            const handleError = async () => {
                this.activeRecording = null;
                await clearRecordingState();
                reject(new Error('Video recording failed.'));
            };

            activeRecording.recorder.addEventListener('stop', () => {
                void handleStop();
            }, { once: true });
            activeRecording.recorder.addEventListener('error', () => {
                void handleError();
            }, { once: true });
            activeRecording.recorder.stop();
        });

        return capture;
    }

    public async reset(): Promise<void> {
        if (!this.activeRecording) {
            await clearRecordingState();

            return;
        }

        const activeRecording = this.activeRecording;

        this.activeRecording = null;

        try {
            if (activeRecording.recorder.state !== 'inactive') {
                activeRecording.recorder.stop();
            }
        } catch {
            // Ignore stale recorder state from a previously interrupted offscreen document.
        }

        this.stopStream(activeRecording.stream);
        await clearRecordingState();
    }

    public isRecording(): boolean {
        return this.activeRecording !== null;
    }

    public async discardPendingCapture(): Promise<void> {
        await clearPendingCapture();
    }

    private recorderOptions(): MediaRecorderOptions | undefined {
        const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
        const mimeType = candidates.find((candidate) => this.dependencies.isMimeTypeSupported(candidate));

        return mimeType ? { mimeType } : undefined;
    }

    private stopStream(stream: MediaStream): void {
        for (const track of stream.getTracks()) {
            track.stop();
        }
    }
}

export function createDefaultVideoRecorderService(): VideoRecorderService {
    return new VideoRecorderService({
        createMediaStream: async (streamId) => {
            const constraints = {
                audio: false,
                video: {
                    mandatory: {
                        chromeMediaSource: 'tab',
                        chromeMediaSourceId: streamId,
                    },
                } as MediaTrackConstraints,
            };

            return navigator.mediaDevices.getUserMedia(constraints);
        },
        createMediaRecorder: (stream, options) => new MediaRecorder(stream, options),
        isMimeTypeSupported: (mimeType) => {
            if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
                return mimeType === 'video/webm';
            }

            return MediaRecorder.isTypeSupported(mimeType);
        },
        now: () => Date.now(),
    });
}
