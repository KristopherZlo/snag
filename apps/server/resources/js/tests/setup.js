import { config } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { afterEach, vi } from 'vitest';
import SnagPreset from '@/primevue/preset';

config.global.plugins = [
    [
        PrimeVue,
        {
            ripple: false,
            inputVariant: 'filled',
            theme: {
                preset: SnagPreset,
                options: {
                    darkModeSelector: false,
                    cssLayer: {
                        name: 'primevue',
                        order: 'theme, base, primevue',
                    },
                },
            },
        },
    ],
];

config.global.stubs = {
    teleport: true,
};

config.global.mocks.route = (...args) => {
    if (typeof globalThis.route !== 'function') {
        throw new Error('route helper is not configured for this test');
    }

    return globalThis.route(...args);
};

if (typeof globalThis.window !== 'undefined' && typeof globalThis.window.matchMedia !== 'function') {
    const matchMedia = (query) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent() {
            return false;
        },
    });

    globalThis.window.matchMedia = matchMedia;
    globalThis.matchMedia = matchMedia;
}

if (typeof globalThis.ResizeObserver === 'undefined') {
    class ResizeObserverMock {
        observe() {}

        unobserve() {}

        disconnect() {}
    }

    globalThis.ResizeObserver = ResizeObserverMock;
}

afterEach(() => {
    vi.restoreAllMocks();
    delete globalThis.route;
});
