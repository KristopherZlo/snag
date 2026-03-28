import type { ExtensionTokenExchangeResponse } from '@snag/shared';
import { normalizeTelemetrySnapshot, type CaptureTelemetrySnapshot } from './capture-telemetry';
import { deletePendingCaptureMedia } from './pending-capture-media';

export interface ScreenshotPendingCapture {
    kind: 'screenshot';
    dataUrl: string;
    title: string;
    url: string;
    capturedAt: string;
    telemetry: CaptureTelemetrySnapshot | null;
}

export interface VideoPendingCapture {
    kind: 'video';
    blobKey: string;
    mimeType: string;
    byteSize: number;
    durationSeconds: number;
    title: string;
    url: string;
    capturedAt: string;
    telemetry: CaptureTelemetrySnapshot | null;
}

export type PendingCapture = ScreenshotPendingCapture | VideoPendingCapture;

export interface RecordingState {
    status: 'idle' | 'recording';
    title?: string;
    url?: string;
    capturedAt?: string;
    startedAt?: string;
    tabId?: number;
}

export interface ExtensionSession extends ExtensionTokenExchangeResponse {
    apiBaseUrl: string;
}

const sessionKey = 'session';
const pendingCaptureKey = 'pendingCapture';
const recordingStateKey = 'recordingState';
const storageUnavailableMessage = 'Chrome extension storage is unavailable. Reload the unpacked extension and try again.';
const fallbackStorage = new Map<string, unknown>();

interface StorageBackend {
    readonly name: string;
    get: (key: string) => Promise<Record<string, unknown>>;
    set: (values: Record<string, unknown>) => Promise<void>;
    remove: (key: string) => Promise<void>;
}

function createChromeStorageBackend(area: chrome.storage.StorageArea, name: string): StorageBackend {
    return {
        name,
        get: async (key) => area.get(key),
        set: async (values) => {
            await area.set(values);
        },
        remove: async (key) => {
            await area.remove(key);
        },
    };
}

function createRuntimeProxyBackend(): StorageBackend | null {
    if (typeof window === 'undefined' || typeof chrome === 'undefined' || !chrome.runtime?.id || !chrome.runtime.sendMessage) {
        return null;
    }

    return {
        name: 'chrome.runtime.proxy',
        get: async (key) => {
            const response = await chrome.runtime.sendMessage({
                type: 'storage:get',
                key,
            });

            if (!response?.ok) {
                throw new Error(response?.message ?? storageUnavailableMessage);
            }

            return response.values ?? {};
        },
        set: async (values) => {
            const response = await chrome.runtime.sendMessage({
                type: 'storage:set',
                values,
            });

            if (!response?.ok) {
                throw new Error(response?.message ?? storageUnavailableMessage);
            }
        },
        remove: async (key) => {
            const response = await chrome.runtime.sendMessage({
                type: 'storage:remove',
                key,
            });

            if (!response?.ok) {
                throw new Error(response?.message ?? storageUnavailableMessage);
            }
        },
    };
}

function createLocalStorageBackend(): StorageBackend | null {
    if (typeof window === 'undefined' || !window.localStorage) {
        return null;
    }

    return {
        name: 'window.localStorage',
        get: async (key) => {
            const rawValue = window.localStorage.getItem(key);

            if (rawValue === null) {
                return {};
            }

            return {
                [key]: JSON.parse(rawValue) as unknown,
            };
        },
        set: async (values) => {
            for (const [key, value] of Object.entries(values)) {
                window.localStorage.setItem(key, JSON.stringify(value));
            }
        },
        remove: async (key) => {
            window.localStorage.removeItem(key);
        },
    };
}

function createMemoryStorageBackend(): StorageBackend {
    return {
        name: 'in-memory',
        get: async (key) => (fallbackStorage.has(key) ? { [key]: fallbackStorage.get(key) } : {}),
        set: async (values) => {
            for (const [key, value] of Object.entries(values)) {
                fallbackStorage.set(key, value);
            }
        },
        remove: async (key) => {
            fallbackStorage.delete(key);
        },
    };
}

function storageBackends(): StorageBackend[] {
    const backends: StorageBackend[] = [];

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        backends.push(createChromeStorageBackend(chrome.storage.local, 'chrome.storage.local'));
    }

    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
        backends.push(createChromeStorageBackend(chrome.storage.session, 'chrome.storage.session'));
    }

    const runtimeProxyBackend = createRuntimeProxyBackend();

    if (runtimeProxyBackend) {
        backends.push(runtimeProxyBackend);
    }

    const localStorageBackend = createLocalStorageBackend();

    if (localStorageBackend) {
        backends.push(localStorageBackend);
    }

    backends.push(createMemoryStorageBackend());

    return backends;
}

function normalizeStorageError(error: unknown): Error {
    if (error instanceof Error) {
        return error;
    }

    return new Error(storageUnavailableMessage);
}

async function withStorageBackend<T>(operation: (backend: StorageBackend) => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (const backend of storageBackends()) {
        try {
            return await operation(backend);
        } catch (error) {
            lastError = normalizeStorageError(error);
        }
    }

    throw lastError ?? new Error(storageUnavailableMessage);
}

function normalizePendingCapture(value: unknown): PendingCapture | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const capture = value as Record<string, unknown>;

    if (capture.kind === 'screenshot' && typeof capture.dataUrl === 'string') {
        return {
            kind: 'screenshot',
            dataUrl: capture.dataUrl,
            title: typeof capture.title === 'string' ? capture.title : 'Browser capture',
            url: typeof capture.url === 'string' ? capture.url : '',
            capturedAt: typeof capture.capturedAt === 'string' ? capture.capturedAt : new Date().toISOString(),
            telemetry: normalizeTelemetrySnapshot(capture.telemetry),
        };
    }

    if (capture.kind === 'video' && typeof capture.blobKey === 'string') {
        return {
            kind: 'video',
            blobKey: capture.blobKey,
            mimeType: typeof capture.mimeType === 'string' ? capture.mimeType : 'video/webm',
            byteSize: typeof capture.byteSize === 'number' ? capture.byteSize : 0,
            durationSeconds: typeof capture.durationSeconds === 'number' ? capture.durationSeconds : 0,
            title: typeof capture.title === 'string' ? capture.title : 'Browser capture',
            url: typeof capture.url === 'string' ? capture.url : '',
            capturedAt: typeof capture.capturedAt === 'string' ? capture.capturedAt : new Date().toISOString(),
            telemetry: normalizeTelemetrySnapshot(capture.telemetry),
        };
    }

    if (typeof capture.dataUrl === 'string') {
        return {
            kind: 'screenshot',
            dataUrl: capture.dataUrl,
            title: typeof capture.title === 'string' ? capture.title : 'Browser capture',
            url: typeof capture.url === 'string' ? capture.url : '',
            capturedAt: typeof capture.capturedAt === 'string' ? capture.capturedAt : new Date().toISOString(),
            telemetry: normalizeTelemetrySnapshot(capture.telemetry),
        };
    }

    return null;
}

export async function getSession(): Promise<ExtensionSession | null> {
    const result = await withStorageBackend((backend) => backend.get(sessionKey));

    return (result[sessionKey] as ExtensionSession | undefined) ?? null;
}

export async function setSession(session: ExtensionSession): Promise<void> {
    await writeExtensionStorage({ [sessionKey]: session });
}

export async function clearSession(): Promise<void> {
    await removeExtensionStorage(sessionKey);
}

export async function getPendingCapture(): Promise<PendingCapture | null> {
    const result = await withStorageBackend((backend) => backend.get(pendingCaptureKey));

    return normalizePendingCapture(result[pendingCaptureKey]);
}

export async function setPendingCapture(capture: PendingCapture): Promise<void> {
    const previousCapture = await getPendingCapture();

    if (previousCapture?.kind === 'video' && previousCapture.blobKey !== ('blobKey' in capture ? capture.blobKey : undefined)) {
        await deletePendingCaptureMedia(previousCapture.blobKey);
    }

    await writeExtensionStorage({ [pendingCaptureKey]: capture });
}

export async function clearPendingCapture(): Promise<void> {
    const capture = await getPendingCapture();

    if (capture?.kind === 'video') {
        await deletePendingCaptureMedia(capture.blobKey);
    }

    await removeExtensionStorage(pendingCaptureKey);
}

export async function getRecordingState(): Promise<RecordingState> {
    const result = await withStorageBackend((backend) => backend.get(recordingStateKey));

    return (result[recordingStateKey] as RecordingState | undefined) ?? { status: 'idle' };
}

export async function setRecordingState(state: RecordingState): Promise<void> {
    await writeExtensionStorage({ [recordingStateKey]: state });
}

export async function clearRecordingState(): Promise<void> {
    await writeExtensionStorage({
        [recordingStateKey]: {
            status: 'idle',
        } satisfies RecordingState,
    });
}

export async function readExtensionStorage(key: string): Promise<unknown> {
    const result = await withStorageBackend((backend) => backend.get(key));

    return result[key];
}

export async function writeExtensionStorage(values: Record<string, unknown>): Promise<void> {
    await withStorageBackend((backend) => backend.set(values));
}

export async function removeExtensionStorage(key: string): Promise<void> {
    await withStorageBackend((backend) => backend.remove(key));
}
