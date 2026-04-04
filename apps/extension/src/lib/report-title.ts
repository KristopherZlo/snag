export const MAX_REPORT_TITLE_LENGTH = 255;

export function normalizeReportTitle(value: unknown, fallback = 'Browser capture'): string {
    const normalized = typeof value === 'string' ? value.trim() : '';
    const resolved = normalized === '' ? fallback : normalized;

    if (resolved.length <= MAX_REPORT_TITLE_LENGTH) {
        return resolved;
    }

    return `${resolved.slice(0, MAX_REPORT_TITLE_LENGTH - 3).trimEnd()}...`;
}
