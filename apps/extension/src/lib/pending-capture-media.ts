const databaseName = 'snag-extension';
const databaseVersion = 2;
const storeName = 'pending-capture-media';

export const pendingCaptureMediaTtlMs = 2 * 60 * 60 * 1000;

interface PendingCaptureMediaRecord {
    blob: Blob;
    createdAt: string;
}

function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB is unavailable in this extension context.'));
            return;
        }

        const request = indexedDB.open(databaseName, databaseVersion);

        request.onupgradeneeded = () => {
            const database = request.result;

            if (!database.objectStoreNames.contains(storeName)) {
                database.createObjectStore(storeName);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Unable to open pending capture media database.'));
    });
}

function normalizePendingCaptureMediaRecord(value: unknown): PendingCaptureMediaRecord | null {
    if (value instanceof Blob) {
        return {
            blob: value,
            createdAt: '',
        };
    }

    if (!value || typeof value !== 'object') {
        return null;
    }

    const candidate = value as Record<string, unknown>;

    if (!(candidate.blob instanceof Blob)) {
        return null;
    }

    return {
        blob: candidate.blob,
        createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : '',
    };
}

function isPendingCaptureMediaExpired(record: PendingCaptureMediaRecord): boolean {
    if (record.createdAt === '') {
        return false;
    }

    const createdAt = Date.parse(record.createdAt);

    if (Number.isNaN(createdAt)) {
        return false;
    }

    return createdAt + pendingCaptureMediaTtlMs <= Date.now();
}

async function runStoreRequest<T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
    const database = await openDatabase();

    return new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = run(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
        transaction.oncomplete = () => database.close();
        transaction.onabort = () => {
            reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
            database.close();
        };
        transaction.onerror = () => {
            reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
            database.close();
        };
    });
}

async function iterateStore(
    mode: IDBTransactionMode,
    iterate: (cursor: IDBCursorWithValue, store: IDBObjectStore) => void,
): Promise<void> {
    const database = await openDatabase();

    return new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = store.openCursor();

        request.onsuccess = () => {
            const cursor = request.result;

            if (!cursor) {
                return;
            }

            try {
                iterate(cursor, store);
                cursor.continue();
            } catch (error) {
                transaction.abort();
                reject(error instanceof Error ? error : new Error('IndexedDB cursor iteration failed.'));
            }
        };

        request.onerror = () => reject(request.error ?? new Error('IndexedDB cursor request failed.'));
        transaction.oncomplete = () => {
            database.close();
            resolve();
        };
        transaction.onabort = () => {
            reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
            database.close();
        };
        transaction.onerror = () => {
            reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
            database.close();
        };
    });
}

export async function writePendingCaptureMedia(blob: Blob, key = crypto.randomUUID()): Promise<string> {
    await runStoreRequest('readwrite', (store) => store.put({
        blob,
        createdAt: new Date().toISOString(),
    } satisfies PendingCaptureMediaRecord, key));

    return key;
}

export async function readPendingCaptureMedia(key: string): Promise<Blob | null> {
    const result = await runStoreRequest<unknown>('readonly', (store) => store.get(key));
    const record = normalizePendingCaptureMediaRecord(result);

    if (!record) {
        if (result !== undefined) {
            await deletePendingCaptureMedia(key).catch(() => undefined);
        }

        return null;
    }

    if (isPendingCaptureMediaExpired(record)) {
        await deletePendingCaptureMedia(key).catch(() => undefined);

        return null;
    }

    return record.blob;
}

export async function deletePendingCaptureMedia(key: string): Promise<void> {
    await runStoreRequest('readwrite', (store) => store.delete(key));
}

export async function clearPendingCaptureMediaStore(): Promise<void> {
    await runStoreRequest('readwrite', (store) => store.clear());
}

export async function purgeExpiredPendingCaptureMedia(): Promise<void> {
    await iterateStore('readwrite', (cursor, store) => {
        const record = normalizePendingCaptureMediaRecord(cursor.value);

        if (!record) {
            store.delete(cursor.primaryKey);
            return;
        }

        if (isPendingCaptureMediaExpired(record)) {
            store.delete(cursor.primaryKey);
        }
    });
}
