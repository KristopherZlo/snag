import { afterEach, describe, expect, it } from 'vitest';
import { assertSecureApiBaseUrl, defaultApiBaseUrl, normalizeApiBaseUrl, rememberApiBaseUrl } from './api-base-url';

describe('api base url helpers', () => {
    afterEach(() => {
        window.localStorage.clear();
    });

    it('normalizes localhost and preserves https remote origins', () => {
        expect(normalizeApiBaseUrl('http://localhost/')).toBe('http://localhost/snag');
        expect(normalizeApiBaseUrl('https://snag.example.com/')).toBe('https://snag.example.com');
    });

    it('rejects insecure remote http base urls', () => {
        expect(() => assertSecureApiBaseUrl('http://example.com/snag')).toThrow(
            'Use https:// for the API base URL. Plain http:// is allowed only for localhost during local development.',
        );
        expect(assertSecureApiBaseUrl('http://localhost/')).toBe('http://localhost/snag');
        expect(assertSecureApiBaseUrl('https://snag.example.com/')).toBe('https://snag.example.com');
    });

    it('remembers only secure base urls for popup defaults', () => {
        rememberApiBaseUrl('https://snag.example.com/');

        expect(defaultApiBaseUrl()).toBe('https://snag.example.com');

        rememberApiBaseUrl('http://example.com/snag');

        expect(defaultApiBaseUrl()).toBe('http://localhost/snag');
    });
});
