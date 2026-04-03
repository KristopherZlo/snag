const fallbackLocale = 'en';

export const getAppLocale = () => {
    if (typeof document === 'undefined') {
        return fallbackLocale;
    }

    return document.documentElement.lang || fallbackLocale;
};

const toDate = (value) => {
    if (!value) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDateTime = (value, options = {}) => {
    const date = toDate(value);

    if (!date) {
        return options.fallback ?? '';
    }

    return new Intl.DateTimeFormat(getAppLocale(), {
        dateStyle: options.dateStyle ?? 'medium',
        timeStyle: options.timeStyle ?? 'short',
    }).format(date);
};

export const formatDate = (value, options = {}) => {
    const date = toDate(value);

    if (!date) {
        return options.fallback ?? '';
    }

    return new Intl.DateTimeFormat(getAppLocale(), {
        dateStyle: options.dateStyle ?? 'medium',
    }).format(date);
};
