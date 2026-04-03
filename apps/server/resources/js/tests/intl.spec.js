import { beforeEach, describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, getAppLocale } from '@/lib/intl';

describe('intl helpers', () => {
    beforeEach(() => {
        document.documentElement.lang = 'en';
    });

    it('reads the app locale from the document root', () => {
        document.documentElement.lang = 'fi';

        expect(getAppLocale()).toBe('fi');
    });

    it('formats date and date-time values with the active app locale', () => {
        const timestamp = '2026-04-03T10:30:00.000Z';
        document.documentElement.lang = 'de';

        expect(formatDateTime(timestamp)).toBe(
            new Intl.DateTimeFormat('de', {
                dateStyle: 'medium',
                timeStyle: 'short',
            }).format(new Date(timestamp)),
        );

        expect(formatDate(timestamp)).toBe(
            new Intl.DateTimeFormat('de', {
                dateStyle: 'medium',
            }).format(new Date(timestamp)),
        );
    });

    it('returns the configured fallback for missing values', () => {
        expect(formatDateTime(null, { fallback: 'Never' })).toBe('Never');
        expect(formatDate(undefined, { fallback: 'n/a' })).toBe('n/a');
    });
});
