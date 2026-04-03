import { computed } from 'vue';
import { usePage } from '@inertiajs/vue3';

const defaultCookieName = 'snag_locale';
const defaultCookieMinutes = 60 * 24 * 365;

const writeLocaleCookie = (name, locale, minutes) => {
    if (typeof document === 'undefined') {
        return;
    }

    const maxAge = Math.max(60, Number(minutes || defaultCookieMinutes) * 60);
    document.cookie = `${name}=${encodeURIComponent(locale)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
};

const normalizeAvailableLocales = (availableLocales) =>
    Array.isArray(availableLocales)
        ? availableLocales.filter((locale) => locale?.code)
        : [];

const buildLocaleSwitchUrl = (locale) => {
    if (typeof window === 'undefined' || typeof route !== 'function') {
        return null;
    }

    return route('locale.switch', {
        locale,
        redirect: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    });
};

export const setPreferredLocale = (locale, options = {}) => {
    const cookieName = options.cookieName || defaultCookieName;
    const cookieMinutes = options.cookieMinutes || defaultCookieMinutes;

    writeLocaleCookie(cookieName, locale, cookieMinutes);

    if (typeof document !== 'undefined') {
        document.documentElement.lang = locale;
    }
};

export const useLocalePreference = () => {
    const page = usePage();

    const localization = computed(() => page.props.localization ?? {});
    const currentLocale = computed(() => localization.value.locale ?? 'en');
    const availableLocales = computed(() => normalizeAvailableLocales(localization.value.available_locales));
    const cookieName = computed(() => localization.value.cookie_name ?? defaultCookieName);
    const cookieMinutes = computed(() => localization.value.cookie_minutes ?? defaultCookieMinutes);

    const updateLocale = (locale, { reload = true } = {}) => {
        if (!availableLocales.value.some((item) => item.code === locale)) {
            return;
        }

        setPreferredLocale(locale, {
            cookieName: cookieName.value,
            cookieMinutes: cookieMinutes.value,
        });

        if (reload && typeof window !== 'undefined') {
            const switchUrl = buildLocaleSwitchUrl(locale);

            if (switchUrl) {
                window.location.assign(switchUrl);
                return;
            }

            window.location.reload();
        }
    };

    return {
        currentLocale,
        availableLocales,
        updateLocale,
    };
};
