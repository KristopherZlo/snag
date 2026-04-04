import { describe, expect, it, vi } from 'vitest';
import {
    assetReloadSearchParam,
    assetReloadStorageKey,
    clearAssetReloadMarker,
    recoverFromPreloadError,
    setupVitePreloadRecovery,
} from '../lib/runtime/vite-preload-recovery.js';

function createFakeRuntime({
    href = 'https://snag.example.test/dashboard',
    readyState = 'loading',
} = {}) {
    const store = new Map();
    const listeners = new Map();
    const location = {
        href,
        replace: vi.fn((nextHref) => {
            location.href = nextHref;
        }),
    };

    return {
        location,
        document: { readyState },
        history: {
            state: { from: 'test' },
            replaceState: vi.fn((_state, _title, nextHref) => {
                location.href = nextHref;
            }),
        },
        sessionStorage: {
            getItem: vi.fn((key) => store.get(key) ?? null),
            setItem: vi.fn((key, value) => {
                store.set(key, value);
            }),
            removeItem: vi.fn((key) => {
                store.delete(key);
            }),
        },
        addEventListener: vi.fn((event, handler) => {
            listeners.set(event, handler);
        }),
        removeEventListener: vi.fn((event, handler) => {
            if (listeners.get(event) === handler) {
                listeners.delete(event);
            }
        }),
        dispatch(event, payload = {}) {
            listeners.get(event)?.(payload);
        },
    };
}

describe('vite preload recovery', () => {
    it('forces one cache-busting reload when a preload error occurs', () => {
        const runtime = createFakeRuntime();

        expect(recoverFromPreloadError(runtime)).toBe(true);
        expect(runtime.sessionStorage.setItem).toHaveBeenCalledWith(assetReloadStorageKey, '1');
        expect(runtime.location.replace).toHaveBeenCalledTimes(1);
        expect(new URL(runtime.location.href).searchParams.has(assetReloadSearchParam)).toBe(true);
        expect(recoverFromPreloadError(runtime)).toBe(false);
    });

    it('clears the reload marker and removes the recovery query param after load', () => {
        const runtime = createFakeRuntime({
            href: 'https://snag.example.test/dashboard?__snag_asset_reload=123',
            readyState: 'complete',
        });

        runtime.sessionStorage.setItem(assetReloadStorageKey, '1');

        clearAssetReloadMarker(runtime);

        expect(runtime.sessionStorage.removeItem).toHaveBeenCalledWith(assetReloadStorageKey);
        expect(runtime.history.replaceState).toHaveBeenCalledTimes(1);
        expect(new URL(runtime.location.href).searchParams.has(assetReloadSearchParam)).toBe(false);
    });

    it('registers a vite preload listener and cleans up the handler', () => {
        const runtime = createFakeRuntime();
        const dispose = setupVitePreloadRecovery(runtime);

        expect(runtime.addEventListener).toHaveBeenCalledWith('vite:preloadError', expect.any(Function));
        expect(runtime.addEventListener).toHaveBeenCalledWith('load', expect.any(Function), { once: true });

        runtime.dispatch('vite:preloadError', { preventDefault: vi.fn() });

        expect(runtime.location.replace).toHaveBeenCalledTimes(1);

        dispose();

        expect(runtime.removeEventListener).toHaveBeenCalledWith('vite:preloadError', expect.any(Function));
        expect(runtime.removeEventListener).toHaveBeenCalledWith('load', expect.any(Function));
    });
});
