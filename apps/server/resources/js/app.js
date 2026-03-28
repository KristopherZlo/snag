import './bootstrap';
import '../css/app.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import 'primeicons/primeicons.css';

import { createInertiaApp } from '@inertiajs/vue3';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import { createApp, h } from 'vue';
import { ZiggyVue } from '../../vendor/tightenco/ziggy';
import SnagPreset from './primevue/preset';

const pages = import.meta.glob('./Pages/**/*.vue');

createInertiaApp({
    title: (title) => (title ? `${title} | Snag` : 'Snag'),
    resolve: async (name) => {
        const page = pages[`./Pages/${name}.vue`];

        if (!page) {
            throw new Error(`Unknown Inertia page: ${name}`);
        }

        return page();
    },
    setup({ el, App, props, plugin }) {
        createApp({ render: () => h(App, props) })
            .use(plugin)
            .use(createPinia())
            .use(PrimeVue, {
                ripple: false,
                inputVariant: 'filled',
                theme: {
                    preset: SnagPreset,
                    options: {
                        darkModeSelector: false,
                        cssLayer: {
                            name: 'primevue',
                            order: 'theme, base, primevue',
                        },
                    },
                },
            })
            .use(ZiggyVue)
            .mount(el);
    },
});
