import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import LocaleSwitcher from '@/Shared/LocaleSwitcher.vue';

const pageState = vi.hoisted(() => ({
    props: {
        localization: {
            locale: 'en',
            cookie_name: 'snag_locale',
            cookie_minutes: 60,
            available_locales: [
                { code: 'en', native_name: 'English' },
                { code: 'de', native_name: 'Deutsch' },
            ],
        },
    },
}));

vi.mock('@inertiajs/vue3', () => ({
    usePage: () => pageState,
}));

import { useLocalePreference } from '@/lib/locale';

describe('locale preference', () => {
    beforeEach(() => {
        document.cookie = 'snag_locale=; Max-Age=0; Path=/';
        document.documentElement.lang = 'en';
        globalThis.route = vi.fn((name, parameters) => {
            if (name !== 'locale.switch') {
                return null;
            }

            return `/snag/locale/${parameters.locale}?redirect=${encodeURIComponent(parameters.redirect)}`;
        });
    });

    it('navigates through the locale switch route and updates the cookie immediately', async () => {
        const assign = vi.fn();
        const reload = vi.fn();

        Object.defineProperty(window, 'location', {
            value: {
                pathname: '/snag/profile',
                search: '?tab=security',
                hash: '#language',
                assign,
                reload,
            },
            writable: true,
        });

        const Probe = defineComponent({
            setup() {
                return useLocalePreference();
            },
            render() {
                return h('button');
            },
        });

        const wrapper = mount(Probe);

        wrapper.vm.updateLocale('de');

        expect(document.documentElement.lang).toBe('de');
        expect(document.cookie).toContain('snag_locale=de');
        expect(assign).toHaveBeenCalledWith('/snag/locale/de?redirect=%2Fsnag%2Fprofile%3Ftab%3Dsecurity%23language');
        expect(reload).not.toHaveBeenCalled();
    });

    it('uses a wider compact select so language names do not clip', () => {
        const wrapper = mount(LocaleSwitcher, {
            props: {
                compact: true,
            },
        });

        const select = wrapper.get('[data-testid="locale-switcher-select"]');

        expect(select.classes()).toContain('min-w-[9.5rem]');
        expect(select.classes()).toContain('pr-10');
    });
});
