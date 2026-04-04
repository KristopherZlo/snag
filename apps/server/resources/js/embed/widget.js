import { mountWebsiteWidget } from './runtime/widget-runtime.js';
import { normalizeWidgetUserContext } from './runtime/widget-telemetry-runtime.js';

const initializedScripts = new WeakSet();
const pendingUserContexts = new Map();
let defaultUserContext = null;

function trimTrailingSlash(value) {
    return String(value || '').replace(/\/+$/, '');
}

function mergeUserContext(base, override) {
    return normalizeWidgetUserContext({
        ...(base ?? {}),
        ...(override ?? {}),
    });
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

function readDatasetUserContext(script) {
    const rawJson = script.dataset.snagUser;
    let parsed = {};

    if (typeof rawJson === 'string' && rawJson.trim() !== '') {
        try {
            parsed = JSON.parse(rawJson);
        } catch {
            parsed = {};
        }
    }

    return normalizeWidgetUserContext({
        ...parsed,
        id: script.dataset.snagUserId ?? parsed.id,
        email: script.dataset.snagUserEmail ?? parsed.email,
        name: script.dataset.snagUserName ?? parsed.name,
        account_id: script.dataset.snagAccountId ?? parsed.account_id,
        account_name: script.dataset.snagAccountName ?? parsed.account_name,
        role: script.dataset.snagUserRole ?? parsed.role,
        plan: script.dataset.snagUserPlan ?? parsed.plan,
        segment: script.dataset.snagUserSegment ?? parsed.segment,
    });
}

function resolveInitialUserContext(script, widgetId) {
    return mergeUserContext(
        mergeUserContext(defaultUserContext, widgetId ? pendingUserContexts.get(widgetId) : null),
        readDatasetUserContext(script),
    );
}

function activeRuntimeFor(script) {
    return script?._snagWidgetRuntime ?? null;
}

function setUserContext(widgetIdOrContext, maybeContext) {
    const widgetId = typeof widgetIdOrContext === 'string' ? widgetIdOrContext : null;
    const payload = normalizeWidgetUserContext(widgetId ? maybeContext : widgetIdOrContext);

    if (!payload) {
        return null;
    }

    if (widgetId) {
        pendingUserContexts.set(widgetId, mergeUserContext(pendingUserContexts.get(widgetId), payload));
    } else {
        defaultUserContext = mergeUserContext(defaultUserContext, payload);
    }

    discoverScripts().forEach((script) => {
        if (widgetId && script.dataset.snagWidget !== widgetId) {
            return;
        }

        if (!widgetId && script.dataset.snagWidget) {
            pendingUserContexts.set(script.dataset.snagWidget, mergeUserContext(pendingUserContexts.get(script.dataset.snagWidget), payload));
        }

        activeRuntimeFor(script)?.setUserContext?.(payload);
    });

    return payload;
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
        initialUserContext: resolveInitialUserContext(script, widgetId),
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
    setUserContext,
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
    setUserContext,
};
