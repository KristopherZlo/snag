export const assetReloadSearchParam = '__snag_asset_reload';
export const assetReloadStorageKey = 'snag:vite-preload-recovery';

function safeUrl(url) {
    try {
        return new URL(url);
    } catch {
        return null;
    }
}

export function clearAssetReloadMarker(runtime = window) {
    if (!runtime) {
        return;
    }

    try {
        runtime.sessionStorage?.removeItem(assetReloadStorageKey);
    } catch {
        // Ignore storage failures in restricted environments.
    }

    const currentUrl = safeUrl(runtime.location?.href);

    if (!currentUrl || !currentUrl.searchParams.has(assetReloadSearchParam)) {
        return;
    }

    currentUrl.searchParams.delete(assetReloadSearchParam);

    try {
        runtime.history?.replaceState?.(runtime.history?.state ?? null, '', currentUrl.toString());
    } catch {
        // Ignore history failures; the app can continue with the query param present.
    }
}

export function recoverFromPreloadError(runtime = window) {
    if (!runtime) {
        return false;
    }

    try {
        if (runtime.sessionStorage?.getItem(assetReloadStorageKey) === '1') {
            return false;
        }

        runtime.sessionStorage?.setItem(assetReloadStorageKey, '1');
    } catch {
        return false;
    }

    const currentUrl = safeUrl(runtime.location?.href);

    if (!currentUrl) {
        return false;
    }

    currentUrl.searchParams.set(assetReloadSearchParam, Date.now().toString());
    runtime.location?.replace?.(currentUrl.toString());

    return true;
}

export function setupVitePreloadRecovery(runtime = window) {
    if (!runtime?.addEventListener) {
        return () => {};
    }

    const handlePreloadError = (event) => {
        event?.preventDefault?.();
        recoverFromPreloadError(runtime);
    };

    const handleLoad = () => {
        clearAssetReloadMarker(runtime);
    };

    runtime.addEventListener('vite:preloadError', handlePreloadError);

    if (runtime.document?.readyState === 'complete') {
        handleLoad();
    } else {
        runtime.addEventListener('load', handleLoad, { once: true });
    }

    return () => {
        runtime.removeEventListener?.('vite:preloadError', handlePreloadError);
        runtime.removeEventListener?.('load', handleLoad);
    };
}
