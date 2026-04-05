/**
 * @vitest-environment node
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import createViteConfig from '../../../vite.config.js';

const restoreEnv = (key, value) => {
    if (typeof value === 'undefined') {
        delete process.env[key];
        return;
    }

    process.env[key] = value;
};

describe('vite server configuration', () => {
    it('allows lan-served xampp pages to load dev assets over cors', () => {
        const config = createViteConfig({ command: 'serve', mode: 'test' });

        expect(config.server.cors).toBe(true);
        expect(config.server.headers).toEqual(
            expect.objectContaining({
                'Access-Control-Allow-Origin': '*',
            }),
        );
    });

    it('switches vite asset origin and hmr to https/wss for https app urls', () => {
        const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'snag-vite-'));
        const keyPath = path.join(temporaryDirectory, 'server.key');
        const certPath = path.join(temporaryDirectory, 'server.crt');

        fs.writeFileSync(keyPath, 'fake-key');
        fs.writeFileSync(certPath, 'fake-cert');

        const previous = {
            APP_URL: process.env.APP_URL,
            VITE_DEV_SERVER_HOST: process.env.VITE_DEV_SERVER_HOST,
            VITE_DEV_SERVER_PORT: process.env.VITE_DEV_SERVER_PORT,
            VITE_DEV_SERVER_KEY: process.env.VITE_DEV_SERVER_KEY,
            VITE_DEV_SERVER_CERT: process.env.VITE_DEV_SERVER_CERT,
            VITE_DEV_SERVER_HTTPS: process.env.VITE_DEV_SERVER_HTTPS,
        };

        process.env.APP_URL = 'https://192.168.43.122/snag';
        process.env.VITE_DEV_SERVER_HOST = '192.168.43.122';
        process.env.VITE_DEV_SERVER_PORT = '5173';
        process.env.VITE_DEV_SERVER_KEY = keyPath;
        process.env.VITE_DEV_SERVER_CERT = certPath;
        process.env.VITE_DEV_SERVER_HTTPS = 'true';

        const config = createViteConfig({ command: 'serve', mode: 'test' });

        expect(config.server.origin).toBe('https://192.168.43.122:5173');
        expect(config.server.hmr).toEqual(
            expect.objectContaining({
                host: '192.168.43.122',
                port: 5173,
                clientPort: 5173,
                protocol: 'wss',
            }),
        );
        expect(config.server.https).toEqual(
            expect.objectContaining({
                key: expect.any(Buffer),
                cert: expect.any(Buffer),
            }),
        );

        restoreEnv('APP_URL', previous.APP_URL);
        restoreEnv('VITE_DEV_SERVER_HOST', previous.VITE_DEV_SERVER_HOST);
        restoreEnv('VITE_DEV_SERVER_PORT', previous.VITE_DEV_SERVER_PORT);
        restoreEnv('VITE_DEV_SERVER_KEY', previous.VITE_DEV_SERVER_KEY);
        restoreEnv('VITE_DEV_SERVER_CERT', previous.VITE_DEV_SERVER_CERT);
        restoreEnv('VITE_DEV_SERVER_HTTPS', previous.VITE_DEV_SERVER_HTTPS);
        fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    });
});
