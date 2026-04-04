import { describe, expect, it } from 'vitest';
import { MAX_REPORT_TITLE_LENGTH, normalizeReportTitle } from './report-title';

describe('normalizeReportTitle', () => {
    it('keeps short titles intact', () => {
        expect(normalizeReportTitle('Checkout failure')).toBe('Checkout failure');
    });

    it('falls back when the title is empty', () => {
        expect(normalizeReportTitle('   ')).toBe('Browser capture');
    });

    it('truncates long titles to the API limit', () => {
        const title = 'a'.repeat(MAX_REPORT_TITLE_LENGTH + 50);
        const normalized = normalizeReportTitle(title);

        expect(normalized).toHaveLength(MAX_REPORT_TITLE_LENGTH);
        expect(normalized.endsWith('...')).toBe(true);
    });
});
