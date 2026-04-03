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

export interface CaptureAccessGrant {
    tabId: number;
    url: string;
    origin: string | null;
    grantedAt: string;
}

export interface OverlayDebugEntry {
    id: string;
    source: 'content' | 'popup' | 'background';
    level: 'info' | 'warn' | 'error';
    event: string;
    url: string;
    tabId: number | null;
    happenedAt: string;
    payload: Record<string, unknown>;
}

const sessionKey = 'session';
const pendingCaptureKey = 'pendingCapture';
const recordingStateKey = 'recordingState';
const reportingEnabledKey = 'reportingEnabled';
const captureAccessGrantsKey = 'captureAccessGrants';
const overlayDebugEntriesKey = 'overlayDebugEntries';
const maxOverlayDebugEntries = 80;
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

function normalizeSession(value: unknown): ExtensionSession | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const session = value as Record<string, unknown>;
    const expiresAt = typeof session.expires_at === 'string'
        ? new Date(session.expires_at)
        : null;

    if (
        typeof session.apiBaseUrl !== 'string'
        || typeof session.token !== 'string'
        || typeof session.device_name !== 'string'
        || !session.organization
        || typeof session.organization !== 'object'
        || !session.user
        || typeof session.user !== 'object'
        || !expiresAt
        || Number.isNaN(expiresAt.valueOf())
        || expiresAt.getTime() <= Date.now()
    ) {
        return null;
    }

    const organization = session.organization as Record<string, unknown>;
    const user = session.user as Record<string, unknown>;

    if (
        typeof organization.id !== 'number'
        || typeof organization.name !== 'string'
        || typeof organization.slug !== 'string'
        || typeof user.id !== 'number'
        || typeof user.name !== 'string'
        || typeof user.email !== 'string'
    ) {
        return null;
    }

    return {
        apiBaseUrl: session.apiBaseUrl,
        token: session.token,
        device_name: session.device_name,
        expires_at: expiresAt.toISOString(),
        organization: {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
        },
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
        },
    };
}

function originForUrl(url: string): string | null {
    try {
        return new URL(url).origin;
    } catch {
        return null;
    }
}

function normalizeCaptureAccessGrants(value: unknown): Record<string, CaptureAccessGrant> {
    if (!value || typeof value !== 'object') {
        return {};
    }

    const grants = value as Record<string, unknown>;
    const normalized: Record<string, CaptureAccessGrant> = {};

    for (const [key, rawGrant] of Object.entries(grants)) {
        if (!rawGrant || typeof rawGrant !== 'object') {
            continue;
        }

        const grant = rawGrant as Record<string, unknown>;
        const tabId = typeof grant.tabId === 'number' ? grant.tabId : Number(key);
        const url = typeof grant.url === 'string' ? grant.url : '';

        if (!Number.isFinite(tabId) || url === '') {
            continue;
        }

        normalized[String(tabId)] = {
            tabId,
            url,
            origin: typeof grant.origin === 'string' || grant.origin === null
                ? grant.origin as string | null
                : originForUrl(url),
            grantedAt: typeof grant.grantedAt === 'string' ? grant.grantedAt : new Date().toISOString(),
        };
    }

    return normalized;
}

function normalizeOverlayDebugEntries(value: unknown): OverlayDebugEntry[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.flatMap((entry, index) => {
        if (!entry || typeof entry !== 'object') {
            return [];
        }

        const candidate = entry as Record<string, unknown>;

        if (typeof candidate.event !== 'string' || candidate.event === '') {
            return [];
        }

        return [{
            id: typeof candidate.id === 'string' && candidate.id !== ''
                ? candidate.id
                : `overlay-debug-${index}-${Date.now()}`,
            source: candidate.source === 'popup' || candidate.source === 'background'
                ? candidate.source
                : 'content',
            level: candidate.level === 'warn' || candidate.level === 'error'
                ? candidate.level
                : 'info',
            event: candidate.event,
            url: typeof candidate.url === 'string' ? candidate.url : '',
            tabId: typeof candidate.tabId === 'number' && Number.isFinite(candidate.tabId)
                ? candidate.tabId
                : null,
            happenedAt: typeof candidate.happenedAt === 'string'
                ? candidate.happenedAt
                : new Date().toISOString(),
            payload: candidate.payload && typeof candidate.payload === 'object'
                ? candidate.payload as Record<string, unknown>
                : {},
        } satisfies OverlayDebugEntry];
    }).slice(-maxOverlayDebugEntries);
}

export async function getSession(): Promise<ExtensionSession | null> {
    const result = await withStorageBackend((backend) => backend.get(sessionKey));
    const session = normalizeSession(result[sessionKey]);

    if (session) {
        return session;
    }

    if (result[sessionKey] !== undefined) {
        await removeExtensionStorage(sessionKey).catch(() => undefined);
    }

    return null;
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

export async function getReportingEnabled(): Promise<boolean> {
    const result = await withStorageBackend((backend) => backend.get(reportingEnabledKey));

    return Boolean(result[reportingEnabledKey]);
}

export async function setReportingEnabled(enabled: boolean): Promise<void> {
    await writeExtensionStorage({ [reportingEnabledKey]: enabled });
}

export async function getCaptureAccessGrant(tabId: number): Promise<CaptureAccessGrant | null> {
    const result = await withStorageBackend((backend) => backend.get(captureAccessGrantsKey));
    const grants = normalizeCaptureAccessGrants(result[captureAccessGrantsKey]);

    return grants[String(tabId)] ?? null;
}

export async function rememberCaptureAccessGrant(tab: Pick<chrome.tabs.Tab, 'id' | 'url'>): Promise<void> {
    if (typeof tab.id !== 'number' || typeof tab.url !== 'string' || tab.url === '') {
        return;
    }

    const result = await withStorageBackend((backend) => backend.get(captureAccessGrantsKey));
    const grants = normalizeCaptureAccessGrants(result[captureAccessGrantsKey]);

    grants[String(tab.id)] = {
        tabId: tab.id,
        url: tab.url,
        origin: originForUrl(tab.url),
        grantedAt: new Date().toISOString(),
    };

    await writeExtensionStorage({ [captureAccessGrantsKey]: grants });
}

export async function clearCaptureAccessGrant(tabId: number): Promise<void> {
    const result = await withStorageBackend((backend) => backend.get(captureAccessGrantsKey));
    const grants = normalizeCaptureAccessGrants(result[captureAccessGrantsKey]);

    if (!(String(tabId) in grants)) {
        return;
    }

    delete grants[String(tabId)];
    await writeExtensionStorage({ [captureAccessGrantsKey]: grants });
}

export async function getOverlayDebugEntries(): Promise<OverlayDebugEntry[]> {
    const result = await withStorageBackend((backend) => backend.get(overlayDebugEntriesKey));

    return normalizeOverlayDebugEntries(result[overlayDebugEntriesKey]);
}

export async function appendOverlayDebugEntry(
    entry: Omit<OverlayDebugEntry, 'id' | 'happenedAt'> & Partial<Pick<OverlayDebugEntry, 'id' | 'happenedAt'>>,
): Promise<OverlayDebugEntry> {
    const result = await withStorageBackend((backend) => backend.get(overlayDebugEntriesKey));
    const entries = normalizeOverlayDebugEntries(result[overlayDebugEntriesKey]);
    const normalizedEntry: OverlayDebugEntry = {
        id: entry.id && entry.id !== ''
            ? entry.id
            : `overlay-debug-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        source: entry.source,
        level: entry.level,
        event: entry.event,
        url: entry.url,
        tabId: typeof entry.tabId === 'number' && Number.isFinite(entry.tabId) ? entry.tabId : null,
        happenedAt: entry.happenedAt && entry.happenedAt !== ''
            ? entry.happenedAt
            : new Date().toISOString(),
        payload: entry.payload && typeof entry.payload === 'object' ? entry.payload : {},
    };

    entries.push(normalizedEntry);
    await writeExtensionStorage({ [overlayDebugEntriesKey]: entries.slice(-maxOverlayDebugEntries) });

    return normalizedEntry;
}

export async function clearOverlayDebugEntries(): Promise<void> {
    await removeExtensionStorage(overlayDebugEntriesKey);
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
