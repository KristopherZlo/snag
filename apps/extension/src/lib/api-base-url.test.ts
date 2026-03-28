import { afterEach, describe, expect, it } from 'vitest';
import { defaultApiBaseUrl, normalizeApiBaseUrl, rememberApiBaseUrl } from './api-base-url';

describe('api base url helpers', () => {
    afterEach(() => {
        window.localStorage.clear();
    });

    it('normalizes bare xampp hosts to the /snag subpath', () => {
        expect(normalizeApiBaseUrl('http://localhost/')).toBe('http://localhost/snag');
        expect(normalizeApiBaseUrl('http://192.168.43.122/')).toBe('http://192.168.43.122/snag');
    });

    it('remembers the last successful api base url for popup defaults', () => {
        rememberApiBaseUrl('http://192.168.43.122/');

        expect(defaultApiBaseUrl()).toBe('http://192.168.43.122/snag');
    });
});
