import { defineConfig } from 'vitepress';

export default defineConfig({
    title: 'Snag',
    description: 'Direct-upload bug capture platform documentation.',
    themeConfig: {
        nav: [
            { text: 'Guide', link: '/' },
            { text: 'API', link: '/api' },
            { text: 'Extension', link: '/extension' },
        ],
        sidebar: [
            {
                text: 'Getting Started',
                items: [
                    { text: 'Overview', link: '/' },
                    { text: 'API Contracts', link: '/api' },
                    { text: 'Browser Extension', link: '/extension' },
                ],
            },
        ],
    },
});
