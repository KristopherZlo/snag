import { mountWebsiteWidget } from './runtime/widget-runtime.js';

const initializedScripts = new WeakSet();

function trimTrailingSlash(value) {
    return String(value || '').replace(/\/+$/, '');
}

function resolveBaseUrl(script) {
    const explicitBase = script.dataset.snagBaseUrl;

    if (typeof explicitBase === 'string' && explicitBase.trim() !== '') {
        return trimTrailingSlash(explicitBase.trim());
    }

    const scriptUrl = new URL(script.src, window.location.href);
    const pathname = scriptUrl.pathname.replace(/\/embed\/widget\.js$/, '');

    return trimTrailingSlash(`${scriptUrl.origin}${pathname}`);
}

function buildBootstrapUrl(baseUrl, widgetId) {
    return `${trimTrailingSlash(baseUrl)}/api/v1/public/widgets/${encodeURIComponent(widgetId)}/bootstrap`;
}

async function bootstrapScript(script) {
    if (!(script instanceof HTMLScriptElement) || initializedScripts.has(script)) {
        return script?._snagWidgetBootstrap ?? null;
    }

    const widgetId = script.dataset.snagWidget;

    if (!widgetId) {
        return null;
    }

    initializedScripts.add(script);

    const bootstrapUrl = buildBootstrapUrl(resolveBaseUrl(script), widgetId);
    const response = await window.fetch(bootstrapUrl, {
        headers: {
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to bootstrap widget "${widgetId}".`);
    }

    const payload = await response.json();
    script._snagWidgetBootstrap = payload;
    script._snagWidgetRuntime = mountWebsiteWidget({
        script,
        bootstrap: payload,
        baseUrl: resolveBaseUrl(script),
    });
    script.dispatchEvent(new CustomEvent('snag:widget-bootstrap', { detail: payload }));

    return payload;
}

function discoverScripts() {
    return Array.from(document.querySelectorAll('script[data-snag-widget]'));
}

async function mountAll() {
    const scripts = discoverScripts();

    await Promise.all(scripts.map((script) => bootstrapScript(script).catch((error) => {
        script.dispatchEvent(new CustomEvent('snag:widget-error', { detail: error }));
        return null;
    })));
}

window.SnagWebsiteWidget = {
    mountAll,
    bootstrapScript,
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        void mountAll();
    }, { once: true });
} else {
    void mountAll();
}

export {
    bootstrapScript,
    buildBootstrapUrl,
    mountAll,
    resolveBaseUrl,
};
