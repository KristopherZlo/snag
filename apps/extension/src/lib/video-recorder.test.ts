import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./pending-capture-media', () => ({
    deletePendingCaptureMedia: vi.fn(),
    writePendingCaptureMedia: vi.fn(),
}));

vi.mock('./storage', () => ({
    getPendingCapture: vi.fn(),
    setPendingCapture: vi.fn(),
    setRecordingState: vi.fn(),
    clearRecordingState: vi.fn(),
    clearPendingCapture: vi.fn(),
}));

import { writePendingCaptureMedia } from './pending-capture-media';
import { clearRecordingState, getPendingCapture, setPendingCapture, setRecordingState } from './storage';
import { VideoRecorderService } from './video-recorder';

class FakeMediaRecorder {
    private readonly listeners = new Map<string, Array<(event?: Event | { data?: Blob }) => void>>();

    public constructor(public readonly stream: MediaStream) {}

    public addEventListener(type: string, listener: (event?: Event | { data?: Blob }) => void): void {
        this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
    }

    public start(): void {}

    public stop(): void {
        this.emit('stop');
    }

    public emitData(data: Blob): void {
        this.emit('dataavailable', { data });
    }

    private emit(type: string, event?: Event | { data?: Blob }): void {
        for (const listener of this.listeners.get(type) ?? []) {
            listener(event);
        }
    }
}

describe('VideoRecorderService', () => {
    const stopTrack = vi.fn();
    const stream = {
        getTracks: () => [{ stop: stopTrack }],
    } as unknown as MediaStream;

    beforeEach(() => {
        vi.mocked(writePendingCaptureMedia).mockResolvedValue('blob-key-1');
        vi.mocked(getPendingCapture).mockResolvedValue(null);
        vi.mocked(setPendingCapture).mockResolvedValue();
        vi.mocked(setRecordingState).mockResolvedValue();
        vi.mocked(clearRecordingState).mockResolvedValue();
        stopTrack.mockReset();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('starts recording and persists a pending video capture on stop', async () => {
        const now = vi.fn()
            .mockReturnValueOnce(Date.parse('2026-03-31T12:00:00Z'))
            .mockReturnValueOnce(Date.parse('2026-03-31T12:00:08Z'));
        const recorder = new FakeMediaRecorder(stream);
        const service = new VideoRecorderService({
            createMediaStream: async () => stream,
            createMediaRecorder: () => recorder as unknown as MediaRecorder,
            isMimeTypeSupported: (mimeType) => mimeType === 'video/webm',
            now,
        });

        await service.start({
            streamId: 'stream-id-1',
            tabId: 41,
            title: 'Checkout failure',
            url: 'https://example.com/checkout',
            capturedAt: '2026-03-31T12:00:00Z',
        });

        recorder.emitData(new Blob(['video-bytes'], { type: 'video/webm' }));

        const capture = await service.stop();

        expect(setRecordingState).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'recording',
                tabId: 41,
                title: 'Checkout failure',
            }),
        );
        expect(writePendingCaptureMedia).toHaveBeenCalledWith(expect.any(Blob));
        expect(capture).toMatchObject({
            kind: 'video',
            blobKey: 'blob-key-1',
            durationSeconds: 8,
            title: 'Checkout failure',
        });
        expect(setPendingCapture).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: 'video',
                blobKey: 'blob-key-1',
                telemetry: null,
            }),
        );
        expect(clearRecordingState).toHaveBeenCalled();
        expect(stopTrack).toHaveBeenCalled();
        expect(service.isRecording()).toBe(false);
    });

    it('rejects duplicate starts while a recording is already active', async () => {
        const recorder = new FakeMediaRecorder(stream);
        const service = new VideoRecorderService({
            createMediaStream: async () => stream,
            createMediaRecorder: () => recorder as unknown as MediaRecorder,
            isMimeTypeSupported: () => true,
            now: () => Date.parse('2026-03-31T12:00:00Z'),
        });

        await service.start({
            streamId: 'stream-id-1',
            tabId: 41,
            title: 'Checkout failure',
            url: 'https://example.com/checkout',
            capturedAt: '2026-03-31T12:00:00Z',
        });

        await expect(service.start({
            streamId: 'stream-id-2',
            tabId: 42,
            title: 'Second recording',
            url: 'https://example.com/second',
            capturedAt: '2026-03-31T12:01:00Z',
        })).rejects.toThrow('A video recording is already in progress.');
    });
});
