import { defineConfig } from '@playwright/test';
import { e2eBaseUrl } from './tests/e2e/support/e2e-env.mjs';

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: false,
    workers: 1,
    retries: 0,
    timeout: 120_000,
    expect: {
        timeout: 15_000,
    },
    use: {
        baseURL: e2eBaseUrl,
        trace: 'retain-on-failure',
        video: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    webServer: {
        command: 'node tests/e2e/support/serve-server.mjs',
        url: e2eBaseUrl,
        timeout: 120_000,
        reuseExistingServer: false,
    },
});
