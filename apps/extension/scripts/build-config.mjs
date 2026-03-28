import path from 'node:path';
import { fileURLToPath } from 'node:url';

const assetOutput = {
    assetFileNames: 'assets/[name][extname]',
    chunkFileNames: 'assets/[name].js',
    entryFileNames: 'assets/[name].js',
};

const classicScriptNames = ['background', 'content', 'page-bridge'];

function packageRootFrom(importMetaUrl) {
    const scriptDirectory = path.dirname(fileURLToPath(importMetaUrl));

    return path.resolve(scriptDirectory, '..');
}

function createHtmlBuild(rootDirectory) {
    return {
        build: {
            emptyOutDir: true,
            outDir: path.resolve(rootDirectory, 'dist'),
            rollupOptions: {
                input: {
                    diagnostics: path.resolve(rootDirectory, 'diagnostics.html'),
                    offscreen: path.resolve(rootDirectory, 'offscreen.html'),
                    popup: path.resolve(rootDirectory, 'popup.html'),
                },
                output: assetOutput,
            },
        },
        configFile: false,
        root: rootDirectory,
    };
}

function createClassicScriptBuild(rootDirectory, entryName) {
    return {
        build: {
            emptyOutDir: false,
            lib: {
                entry: path.resolve(rootDirectory, 'src', `${entryName}.ts`),
                fileName: () => `assets/${entryName}.js`,
                formats: ['iife'],
                name: `snag${entryName.replace(/(^|-)([a-z])/g, (_, __, letter) => letter.toUpperCase())}`,
            },
            outDir: path.resolve(rootDirectory, 'dist'),
            rollupOptions: {
                output: {
                    inlineDynamicImports: true,
                },
            },
        },
        configFile: false,
        root: rootDirectory,
    };
}

export function createExtensionBuilds(rootDirectory = packageRootFrom(import.meta.url)) {
    return [
        createHtmlBuild(rootDirectory),
        ...classicScriptNames.map((entryName) => createClassicScriptBuild(rootDirectory, entryName)),
    ];
}

export { classicScriptNames };
