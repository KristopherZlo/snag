/**
 * @vitest-environment node
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { build } from 'vite';
import { createExtensionBuilds } from './build-config.mjs';

const temporaryDirectories: string[] = [];

async function createTemporaryDirectory(): Promise<string> {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'snag-extension-build-'));

    temporaryDirectories.push(directory);

    return directory;
}

afterEach(async () => {
    await Promise.all(
        temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
    );
});

describe('extension build configuration', () => {
    it('builds content script as a self-contained classic bundle', async () => {
        const temporaryDirectory = await createTemporaryDirectory();
        const config = createExtensionBuilds().find(
            (candidate) => candidate.build?.lib?.fileName?.() === 'assets/content.js',
        );

        expect(config).toBeDefined();

        await build({
            ...config,
            build: {
                ...config.build,
                outDir: temporaryDirectory,
            },
        });

        const bundle = await fs.readFile(path.join(temporaryDirectory, 'assets', 'content.js'), 'utf8');

        expect(bundle).not.toMatch(/^\s*import\s/m);
        expect(bundle).not.toContain('export ');
    });

    it('keeps popup, diagnostics, and offscreen pages in the html build', () => {
        const config = createExtensionBuilds()[0];
        const input = config.build?.rollupOptions?.input;

        expect(input).toEqual(
            expect.objectContaining({
                diagnostics: expect.stringContaining('diagnostics.html'),
                offscreen: expect.stringContaining('offscreen.html'),
                popup: expect.stringContaining('popup.html'),
            }),
        );
    });
});
