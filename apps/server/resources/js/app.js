import './bootstrap';
import '../css/app.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/manrope/800.css';

import { createInertiaApp } from '@inertiajs/vue3';
import { createPinia } from 'pinia';
import { createApp, h } from 'vue';
import { ZiggyVue } from '../../vendor/tightenco/ziggy';
import AppRoot from '@/AppRoot.vue';
import { initializeDomLocalization, translateDocumentTitle } from '@/lib/i18n/runtime';
import { setupVitePreloadRecovery } from '@/lib/runtime/vite-preload-recovery';
import { initializeTheme } from '@/lib/theme';

const pages = import.meta.glob('./Pages/**/*.vue');

initializeTheme();
setupVitePreloadRecovery();

createInertiaApp({
    title: (title) => {
        const locale = typeof document !== 'undefined' ? document.documentElement.lang : 'en';
        const translated = title ? translateDocumentTitle(title, locale) : 'Snag';

        return translated ? `${translated} | Snag` : 'Snag';
    },
    resolve: async (name) => {
        const page = pages[`./Pages/${name}.vue`];

        if (!page) {
            throw new Error(`Unknown Inertia page: ${name}`);
        }

        return page();
    },
    setup({ el, App, props, plugin }) {
        initializeDomLocalization({
            root: el,
            locale: props.initialPage?.props?.localization?.locale ?? document.documentElement.lang,
        });

        createApp({ render: () => h(AppRoot, { inertiaApp: App, inertiaProps: props }) })
            .use(plugin)
            .use(createPinia())
            .use(ZiggyVue)
            .mount(el);
    },
});
