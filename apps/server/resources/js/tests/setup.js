import { config } from '@vue/test-utils';
import { afterEach, vi } from 'vitest';

config.global.mocks.route = (...args) => {
    if (typeof globalThis.route !== 'function') {
        throw new Error('route helper is not configured for this test');
    }

    return globalThis.route(...args);
};

afterEach(() => {
    vi.restoreAllMocks();
    delete globalThis.route;
});
