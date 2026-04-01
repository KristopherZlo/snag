import path from 'node:path';
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ command }) => ({
    base: command === 'build' ? './' : undefined,
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'resources/js'),
            '@snag/capture-core': path.resolve(__dirname, '../../packages/capture-core/src/index.ts'),
            '@snag/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
        },
    },
    plugins: [
        vue(),
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.js'],
            refresh: true,
        }),
        tailwindcss(),
    ],
    server: {
        cors: true,
        headers: {
            'Access-Control-Allow-Origin': '*',
        },
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./resources/js/tests/setup.js'],
    },
}));
