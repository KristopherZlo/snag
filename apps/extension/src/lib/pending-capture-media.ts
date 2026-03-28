const databaseName = 'snag-extension';
const storeName = 'pending-capture-media';

function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB is unavailable in this extension context.'));
            return;
        }

        const request = indexedDB.open(databaseName, 1);

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

export async function writePendingCaptureMedia(blob: Blob, key = crypto.randomUUID()): Promise<string> {
    await runStoreRequest('readwrite', (store) => store.put(blob, key));

    return key;
}

export async function readPendingCaptureMedia(key: string): Promise<Blob | null> {
    const result = await runStoreRequest<Blob | undefined>('readonly', (store) => store.get(key));

    return result ?? null;
}

export async function deletePendingCaptureMedia(key: string): Promise<void> {
    await runStoreRequest('readwrite', (store) => store.delete(key));
}
