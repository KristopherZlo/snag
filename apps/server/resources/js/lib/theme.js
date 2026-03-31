export const THEME_STORAGE_KEY = 'snag-theme';

const VALID_THEMES = new Set(['light', 'dark']);

const canUseDom = () => typeof window !== 'undefined' && typeof document !== 'undefined';

export const normalizeTheme = (value) => (VALID_THEMES.has(value) ? value : null);

export const getStoredTheme = () => {
    if (!canUseDom()) {
        return null;
    }

    try {
        return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
    } catch {
        return null;
    }
};

export const getSystemTheme = () => {
    if (!canUseDom() || typeof window.matchMedia !== 'function') {
        return 'light';
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const resolveTheme = () => getStoredTheme() ?? getSystemTheme();

export const applyTheme = (theme) => {
    if (!canUseDom()) {
        return;
    }

    const resolvedTheme = normalizeTheme(theme) ?? 'light';
    const root = document.documentElement;

    root.classList.toggle('dark', resolvedTheme === 'dark');
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
};

export const persistTheme = (theme) => {
    if (!canUseDom()) {
        return;
    }

    const resolvedTheme = normalizeTheme(theme) ?? 'light';

    try {
        window.localStorage.setItem(THEME_STORAGE_KEY, resolvedTheme);
    } catch {
        // Ignore storage errors and keep the in-memory theme.
    }
};

export const initializeTheme = () => {
    const theme = resolveTheme();

    applyTheme(theme);

    return theme;
};
