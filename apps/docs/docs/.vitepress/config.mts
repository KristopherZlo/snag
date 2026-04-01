import { defineConfig } from 'vitepress';

export default defineConfig({
    title: 'Snag',
    description: 'Product documentation for bug capture, evidence review, public intake, and delivery sync handoff.',
    themeConfig: {
        search: {
            provider: 'local',
        },
        nav: [
            { text: 'Home', link: '/' },
            { text: 'Get started', link: '/getting-started' },
            { text: 'API', link: '/api' },
            { text: 'Capture', link: '/capture' },
            { text: 'Extension', link: '/extension' },
        ],
        sidebar: [
            {
                text: 'Start here',
                items: [
                    { text: 'Documentation home', link: '/' },
                    { text: 'Getting started', link: '/getting-started' },
                ],
            },
            {
                text: 'Capture flows',
                items: [
                    { text: 'Capture keys', link: '/capture' },
                    { text: 'Browser extension', link: '/extension' },
                ],
            },
            {
                text: 'Interfaces',
                items: [
                    { text: 'API Contracts', link: '/api' },
                ],
            },
        ],
        footer: {
            message: 'Snag owns capture, evidence, sharing, and verification. External trackers remain optional delivery targets.',
            copyright: 'Documentation for Snag product workflows and integration surfaces.',
        },
    },
});
