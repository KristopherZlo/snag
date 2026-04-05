import { computed, ref } from 'vue';

const isPageLoading = ref(false);
const loadingTargetUrl = ref(null);
let initialized = false;

const normalizeVisitUrl = (value) => {
    if (!value) {
        return null;
    }

    if (typeof value === 'string') {
        return value;
    }

    if (typeof value.toString === 'function') {
        const normalized = value.toString();

        return normalized === '[object Object]' ? null : normalized;
    }

    return null;
};

const beginPageLoading = (event) => {
    loadingTargetUrl.value = normalizeVisitUrl(event?.detail?.visit?.url);
    isPageLoading.value = true;
};

const endPageLoading = () => {
    isPageLoading.value = false;
    loadingTargetUrl.value = null;
};

export const initializePageLoading = () => {
    if (initialized || typeof document === 'undefined') {
        return;
    }

    initialized = true;

    document.addEventListener('inertia:start', beginPageLoading);
    document.addEventListener('inertia:finish', endPageLoading);
    document.addEventListener('inertia:navigate', endPageLoading);
    document.addEventListener('inertia:invalid', endPageLoading);
    document.addEventListener('inertia:error', endPageLoading);
    document.addEventListener('inertia:exception', endPageLoading);
};

export const usePageLoading = () => ({
    isPageLoading: computed(() => isPageLoading.value),
    loadingTargetUrl: computed(() => loadingTargetUrl.value),
});

export const setPageLoadingState = (value, options = {}) => {
    isPageLoading.value = Boolean(value);
    loadingTargetUrl.value = value ? normalizeVisitUrl(options.targetUrl) : null;
};
