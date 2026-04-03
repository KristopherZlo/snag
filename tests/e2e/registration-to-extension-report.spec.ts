import { chromium, expect, test, type Page } from '@playwright/test';
import { e2eBaseUrl, extensionDistDir } from './support/e2e-env.mjs';
import { generateInvitationUrl, generateVerificationUrl, grantPlan, uniqueEmail } from './support/laravel-helpers';

const defaultPassword = 'Password123!';
const extensionRecordingShortcut = process.platform === 'darwin' ? 'Meta+Shift+U' : 'Control+Shift+U';

async function registerUser(
    page: Page,
    options: {
        email?: string;
        password?: string;
        name?: string;
        prefix?: string;
    } = {},
): Promise<{ email: string; password: string; name: string }> {
    const email = options.email ?? uniqueEmail(options.prefix ?? 'playwright');
    const password = options.password ?? defaultPassword;
    const name = options.name ?? 'Playwright User';

    await page.goto(`${e2eBaseUrl}/register`);
    await page.getByLabel('Name').fill(name);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm Password').fill(password);
    await page.getByRole('button', { name: 'Register' }).click();
    await page.waitForURL(/verify-email/);

    return { email, password, name };
}

async function verifyEmail(page: Page, email: string): Promise<void> {
    await page.goto(generateVerificationUrl(email));
}

async function createOrganization(page: Page, organizationName: string): Promise<void> {
    await page.waitForURL(/onboarding\/organization/);
    await page.getByLabel('Organization name').fill(organizationName);
    await page.getByRole('button', { name: 'Create organization' }).click();
    await page.waitForURL(/dashboard/);
    await expect(page.getByTestId('active-organization-name')).toHaveText(organizationName);
}

async function registerVerifyAndCreateOrganization(
    page: Page,
    options: {
        email?: string;
        password?: string;
        name?: string;
        organizationName: string;
        prefix?: string;
    },
): Promise<{ email: string; password: string; name: string; organizationName: string }> {
    const account = await registerUser(page, options);

    await verifyEmail(page, account.email);
    await createOrganization(page, options.organizationName);

    return {
        ...account,
        organizationName: options.organizationName,
    };
}

async function resolveExtensionId(
    context: Awaited<ReturnType<typeof chromium.launchPersistentContext>>,
): Promise<string> {
    let serviceWorker = context.serviceWorkers()[0];

    if (!serviceWorker) {
        serviceWorker = await context.waitForEvent('serviceworker');
    }

    return new URL(serviceWorker.url()).hostname;
}

async function launchExtensionContext(
    userDataDir: string,
    options: {
        headless?: boolean;
    } = {},
) {
    return chromium.launchPersistentContext(userDataDir, {
        channel: 'chromium',
        headless: options.headless ?? true,
        args: [
            `--disable-extensions-except=${extensionDistDir}`,
            `--load-extension=${extensionDistDir}`,
        ],
    });
}

function extractFirstUrl(value: string): string | null {
    return value.match(/https?:\/\/\S+/)?.[0] ?? null;
}

test('registration, onboarding, and settings sections work end to end', async ({ page }) => {
    const account = await registerVerifyAndCreateOrganization(page, {
        prefix: 'settings-owner',
        name: 'Settings Owner',
        organizationName: 'Settings Lab',
    });

    await expect(page.getByText('Current plan', { exact: true })).toBeVisible();

    await page.goto(`${e2eBaseUrl}/settings`);
    await expect(page.getByRole('link', { name: 'Profile', exact: true }).last()).toBeVisible();

    await page.goto(`${e2eBaseUrl}/settings/members`);
    await expect(page.getByRole('cell', { name: account.email })).toBeVisible();

    await page.goto(`${e2eBaseUrl}/settings/capture-keys`);
    await page.getByLabel('Key name').fill('Widget Key');
    await page.getByLabel('Allowed origins').fill('https://widget.example.com');
    await page.getByRole('button', { name: 'Create key' }).click();
    await expect(page.getByText('Capture key created.')).toBeVisible();
    await expect(page.getByText('Widget Key')).toBeVisible();
    await expect(page.getByText('https://widget.example.com')).toBeVisible();

    await page.getByRole('button', { name: 'Revoke' }).click();
    await expect(page.getByText('Capture key "Widget Key" revoked.')).toBeVisible();

    await page.goto(`${e2eBaseUrl}/settings/billing`);
    await expect(page.getByText('Stripe mode')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Choose Pro' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Choose Studio' })).toBeDisabled();

    await page.goto(`${e2eBaseUrl}/settings/extension/connect`);
    await expect(page.getByTestId('active-organization-name')).toHaveText('Settings Lab');
    await expect(page.getByTestId('extension-one-time-code')).toBeVisible();
    await expect(page.getByText(`${e2eBaseUrl}/api/v1/extension/tokens/exchange`)).toBeVisible();
});

test('extension diagnostics page captures a real live video recording with telemetry @live-recording', async ({}, testInfo) => {
    test.skip(
        process.env.SNAG_ENABLE_LIVE_RECORDING !== '1',
        'Live tabCapture smoke is opt-in because Chromium requires a local desktop invocation context for extension recording.',
    );

    const context = await launchExtensionContext(testInfo.outputPath('extension-live-recording-user-data'), {
        headless: false,
    });

    try {
        const extensionId = await resolveExtensionId(context);
        const targetPage = await context.newPage();

        await targetPage.goto(`${e2eBaseUrl}/_diagnostics/extension-recorder`);
        await expect(targetPage.getByRole('heading', { name: 'Extension recorder diagnostics' })).toBeVisible();

        await targetPage.bringToFront();
        await targetPage.keyboard.press(extensionRecordingShortcut);

        const diagnosticsPage = await context.newPage();
        await diagnosticsPage.goto(`chrome-extension://${extensionId}/diagnostics.html`);
        await expect(diagnosticsPage.getByTestId('diagnostics-recording-state')).toHaveText('recording');

        await targetPage.bringToFront();
        await targetPage.getByTestId('diagnostic-input').fill('live smoke value');
        await targetPage.getByTestId('emit-console').click();
        await targetPage.getByTestId('trigger-fetch').click();
        await expect(targetPage.getByTestId('diagnostic-status')).toContainText('Fetch request finished');
        await targetPage.getByTestId('trigger-xhr').click();
        await expect(targetPage.getByTestId('diagnostic-status')).toContainText('XHR request finished');
        await targetPage.getByTestId('push-history').click();
        await expect(targetPage.getByTestId('diagnostic-status')).toContainText('History updated');
        await targetPage.waitForTimeout(1500);

        await targetPage.keyboard.press(extensionRecordingShortcut);

        await diagnosticsPage.reload();
        await diagnosticsPage.getByTestId('diagnostics-target-url').fill(targetPage.url());
        await diagnosticsPage.getByTestId('diagnostics-refresh-tabs').click();
        await expect(diagnosticsPage.getByTestId('diagnostics-status')).toContainText('Tab list refreshed');
        await expect(diagnosticsPage.getByTestId('diagnostics-pending-kind')).toHaveText('video');
        await expect(diagnosticsPage.getByTestId('diagnostics-recording-state')).toHaveText('idle');

        const byteSize = Number(await diagnosticsPage.getByTestId('diagnostics-pending-byte-size').textContent());
        const actionCount = Number(await diagnosticsPage.getByTestId('diagnostics-actions-count').textContent());
        const logCount = Number(await diagnosticsPage.getByTestId('diagnostics-logs-count').textContent());
        const networkCount = Number(await diagnosticsPage.getByTestId('diagnostics-network-count').textContent());
        const firstTimestamp = (await diagnosticsPage.getByTestId('diagnostics-first-timestamp').textContent())?.trim();
        const lastTimestamp = (await diagnosticsPage.getByTestId('diagnostics-last-timestamp').textContent())?.trim();

        expect(byteSize).toBeGreaterThan(0);
        expect(actionCount).toBeGreaterThan(0);
        expect(logCount).toBeGreaterThan(0);
        expect(networkCount).toBeGreaterThan(0);
        expect(firstTimestamp).not.toBe('n/a');
        expect(lastTimestamp).not.toBe('n/a');
    } finally {
        await context.close();
    }
});

test('member invitation acceptance works end to end', async ({ browser }) => {
    const ownerContext = await browser.newContext();
    const memberContext = await browser.newContext();

    try {
        const ownerPage = await ownerContext.newPage();
        const owner = await registerVerifyAndCreateOrganization(ownerPage, {
            prefix: 'invite-owner',
            name: 'Invite Owner',
            organizationName: 'Invitation Lab',
        });
        const invitedEmail = uniqueEmail('invited-member');

        await ownerPage.goto(`${e2eBaseUrl}/settings/members`);
        await ownerPage.getByLabel('Email').fill(invitedEmail);
        await ownerPage.getByLabel('Role').selectOption('admin');
        await ownerPage.getByRole('button', { name: 'Send invitation' }).click();

        await expect(ownerPage.getByText('Invitation sent.')).toBeVisible();
        await expect(ownerPage.getByText(invitedEmail)).toBeVisible();

        const memberPage = await memberContext.newPage();
        const member = await registerUser(memberPage, {
            email: invitedEmail,
            name: 'Invited Member',
            prefix: 'invite-member',
        });

        await verifyEmail(memberPage, member.email);
        await memberPage.waitForURL(/onboarding\/organization/);
        await memberPage.goto(generateInvitationUrl(member.email));
        await expect(memberPage.getByText(owner.organizationName)).toBeVisible();
        await memberPage.getByRole('button', { name: 'Accept invitation' }).click();

        await memberPage.waitForURL(/dashboard/);
        await expect(memberPage.getByTestId('active-organization-name')).toHaveText(owner.organizationName);

        await memberPage.goto(`${e2eBaseUrl}/settings/members`);
        await expect(memberPage.getByRole('cell', { name: owner.email })).toBeVisible();
        await expect(memberPage.getByRole('cell', { name: member.email })).toBeVisible();

        await ownerPage.reload();
        await ownerPage.goto(`${e2eBaseUrl}/settings/members`);
        await expect(ownerPage.getByText('2 active memberships')).toBeVisible();
        await expect(ownerPage.getByRole('cell', { name: invitedEmail })).toBeVisible();
    } finally {
        await Promise.all([
            ownerContext.close(),
            memberContext.close(),
        ]);
    }
});

test('extension popup submits an authenticated screenshot report end to end', async ({}, testInfo) => {
    const context = await launchExtensionContext(testInfo.outputPath('extension-user-data'));

    try {
        const extensionId = await resolveExtensionId(context);
        const page = await context.newPage();
        const owner = await registerVerifyAndCreateOrganization(page, {
            prefix: 'extension-owner',
            name: 'Extension Owner',
            organizationName: 'Extension Lab',
        });

        await expect(page.getByTestId('active-organization-name')).toHaveText(owner.organizationName);

        await page.goto(`${e2eBaseUrl}/settings/extension/connect`);
        const oneTimeCode = (await page.getByTestId('extension-one-time-code').textContent())?.trim();

        expect(oneTimeCode).toBeTruthy();

        const popup = await context.newPage();
        await popup.goto(`chrome-extension://${extensionId}/popup.html`);
        await popup.getByLabel('API base URL').fill(e2eBaseUrl);
        await popup.getByLabel('One-time code').fill(oneTimeCode ?? '');
        await popup.getByLabel('Device name').fill('Playwright Extension');
        await popup.getByRole('button', { name: 'Exchange code' }).click();

        const popupStatus = popup.getByTestId('popup-status');
        await expect(popupStatus).toContainText(`Connected to ${owner.organizationName}.`);

        await popup.evaluate(async ({ capturedAt }) => {
            await new Promise<void>((resolve, reject) => {
                chrome.storage.local.set(
                    {
                        pendingCapture: {
                            dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO3ZP6sAAAAASUVORK5CYII=',
                            title: 'Broken modal',
                            url: 'https://example.com/orders/1',
                            capturedAt,
                            telemetry: {
                                context: {
                                    url: 'https://example.com/orders/1',
                                    title: 'Broken modal',
                                    user_agent: 'Mozilla/5.0',
                                    platform: 'MacIntel',
                                    language: 'en-US',
                                    timezone: 'Europe/Helsinki',
                                    viewport: { width: 1440, height: 900 },
                                    screen: { width: 1440, height: 900 },
                                    referrer: null,
                                    selection: 'Selected order row',
                                },
                                actions: [
                                    {
                                        type: 'click',
                                        label: 'Click button',
                                        selector: '#submit',
                                        value: null,
                                        happened_at: capturedAt,
                                    },
                                ],
                                logs: [
                                    {
                                        level: 'error',
                                        message: 'Console exploded.',
                                        happened_at: capturedAt,
                                    },
                                ],
                                network_requests: [
                                    {
                                        method: 'POST',
                                        url: 'https://api.example.test/reports',
                                        status_code: 500,
                                        duration_ms: 241,
                                        request_headers: { 'content-type': 'application/json' },
                                        response_headers: { 'x-trace-id': 'trace-123' },
                                        meta: {
                                            host: 'api.example.test',
                                            query: {},
                                        },
                                        happened_at: capturedAt,
                                    },
                                ],
                            },
                        },
                    },
                    () => {
                        const error = chrome.runtime.lastError;

                        if (error) {
                            reject(new Error(error.message));
                            return;
                        }

                        resolve();
                    },
                );
            });
        }, { capturedAt: new Date().toISOString() });

        await popup.reload();
        await expect(popup.getByText('Broken modal')).toBeVisible();
        await popup.getByLabel('Summary').fill('Captured via extension e2e');
        await popup.getByRole('button', { name: 'Submit screenshot' }).click();

        await expect(popupStatus).toContainText('Report submitted:');

        const reportUrl = extractFirstUrl((await popupStatus.textContent()) ?? '');

        expect(reportUrl).toBeTruthy();

        await page.goto(reportUrl ?? '');
        await expect(page.getByText('Captured via extension e2e').first()).toBeVisible();
        await expect(page.getByText('Public sharing disabled for this report.')).toBeVisible();
        await expect(page.getByRole('link', { name: 'Open public view' })).toHaveCount(0);
        await expect(page.getByText('Isolate context')).toBeVisible();
        await expect(page.getByText('MacIntel')).toBeVisible();

        await page.getByRole('tab', { name: 'Steps' }).click();
        await expect(page.getByText('Click button')).toBeVisible();
        await expect(page.getByText('#submit').first()).toBeVisible();

        await page.getByRole('tab', { name: 'Console' }).click();
        await expect(page.getByText('Console exploded.')).toBeVisible();

        await page.getByRole('tab', { name: 'Network' }).click();
        await expect(page.getByText('https://api.example.test/reports').first()).toBeVisible();
        await expect(page.getByText('500').first()).toBeVisible();

        await page.goto(`${e2eBaseUrl}/dashboard`);
        await expect(page.getByRole('link', { name: 'Broken modal' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Public view' })).toHaveCount(0);
    } finally {
        await context.close();
    }
});

test('extension popup submits an authenticated video report end to end', async ({}, testInfo) => {
    const context = await launchExtensionContext(testInfo.outputPath('extension-video-user-data'));
    const capturedAt = new Date().toISOString();

    try {
        const extensionId = await resolveExtensionId(context);
        const page = await context.newPage();
        const owner = await registerVerifyAndCreateOrganization(page, {
            prefix: 'extension-video-owner',
            name: 'Extension Video Owner',
            organizationName: 'Extension Video Lab',
        });

        grantPlan(owner.email, 'studio');
        await page.reload();
        await expect(page.getByTestId('active-organization-name')).toHaveText(owner.organizationName);

        await page.goto(`${e2eBaseUrl}/settings/extension/connect`);
        const oneTimeCode = (await page.getByTestId('extension-one-time-code').textContent())?.trim();

        expect(oneTimeCode).toBeTruthy();

        const popup = await context.newPage();
        await popup.goto(`chrome-extension://${extensionId}/popup.html`);
        await popup.getByLabel('API base URL').fill(e2eBaseUrl);
        await popup.getByLabel('One-time code').fill(oneTimeCode ?? '');
        await popup.getByLabel('Device name').fill('Playwright Video Extension');
        await popup.getByRole('button', { name: 'Exchange code' }).click();

        const popupStatus = popup.getByTestId('popup-status');
        await expect(popupStatus).toContainText(`Connected to ${owner.organizationName}.`);

        await popup.evaluate(async ({ capturedAt }) => {
            const blob = new Blob([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3])], { type: 'video/webm' });

            await new Promise<void>((resolve, reject) => {
                const request = indexedDB.open('snag-extension', 1);

                request.onupgradeneeded = () => {
                    const database = request.result;

                    if (!database.objectStoreNames.contains('pending-capture-media')) {
                        database.createObjectStore('pending-capture-media');
                    }
                };

                request.onerror = () => reject(request.error ?? new Error('Unable to open IndexedDB.'));
                request.onsuccess = () => {
                    const database = request.result;
                    const transaction = database.transaction('pending-capture-media', 'readwrite');

                    transaction.objectStore('pending-capture-media').put(blob, 'e2e-video');
                    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to store video blob.'));
                    transaction.oncomplete = () => {
                        database.close();
                        resolve();
                    };
                };
            });

            await new Promise<void>((resolve, reject) => {
                chrome.storage.local.set(
                    {
                        pendingCapture: {
                            kind: 'video',
                            blobKey: 'e2e-video',
                            mimeType: 'video/webm',
                            byteSize: blob.size,
                            durationSeconds: 12,
                            title: 'Video regression',
                            url: 'https://example.com/checkout',
                            capturedAt,
                            telemetry: {
                                context: {
                                    url: 'https://example.com/checkout',
                                    title: 'Video regression',
                                    user_agent: 'Mozilla/5.0',
                                    platform: 'MacIntel',
                                    language: 'en-US',
                                    timezone: 'Europe/Helsinki',
                                    viewport: { width: 1512, height: 982 },
                                    screen: { width: 1512, height: 982 },
                                    referrer: null,
                                    selection: 'Checkout CTA',
                                },
                                actions: [
                                    {
                                        type: 'navigation',
                                        label: 'Navigate to /checkout',
                                        selector: null,
                                        value: 'https://example.com/checkout',
                                        happened_at: capturedAt,
                                    },
                                ],
                                logs: [
                                    {
                                        level: 'warn',
                                        message: 'Slow checkout render.',
                                        happened_at: capturedAt,
                                    },
                                ],
                                network_requests: [
                                    {
                                        method: 'GET',
                                        url: 'https://api.example.test/checkout',
                                        status_code: 200,
                                        duration_ms: 188,
                                        request_headers: { accept: 'application/json' },
                                        response_headers: { server: 'playwright' },
                                        meta: {
                                            host: 'api.example.test',
                                            query: {},
                                        },
                                        happened_at: capturedAt,
                                    },
                                ],
                            },
                        },
                    },
                    () => {
                        const error = chrome.runtime.lastError;

                        if (error) {
                            reject(new Error(error.message));
                            return;
                        }

                        resolve();
                    },
                );
            });
        }, { capturedAt });

        await popup.reload();
        await expect(popup.getByText('Video regression')).toBeVisible();
        await expect(popup.getByText('12s')).toBeVisible();
        await popup.getByLabel('Summary').fill('Captured via extension video e2e');
        await popup.getByRole('button', { name: 'Submit video' }).click();

        await expect(popupStatus).toContainText('Report submitted:');

        const reportUrl = extractFirstUrl((await popupStatus.textContent()) ?? '');

        expect(reportUrl).toBeTruthy();

        await page.goto(reportUrl ?? '');
        await expect(page.getByText('Captured via extension video e2e').first()).toBeVisible();
        await expect(page.getByTestId('report-media-kind')).toHaveText('video');
        await expect(page.getByTestId('report-content-type')).toHaveText('video/webm');
        await expect(page.getByText('Public sharing disabled for this report.')).toBeVisible();
        await expect(page.getByText('MacIntel')).toBeVisible();

        await page.getByRole('tab', { name: 'Steps' }).click();
        await expect(page.getByText('Navigate to /checkout')).toBeVisible();
        await expect(page.getByTestId('report-step-item').first().locator('time[datetime]')).toBeVisible();

        await page.getByRole('tab', { name: 'Console' }).click();
        await expect(page.getByText('Slow checkout render.')).toBeVisible();
        await expect(page.locator('tbody time[datetime]').first()).toBeVisible();

        await page.getByRole('tab', { name: 'Network' }).click();
        await expect(page.getByText('https://api.example.test/checkout').first()).toBeVisible();
        await expect(page.getByText('200').first()).toBeVisible();
        await expect(page.getByTestId('report-network-row').first().locator('time[datetime]')).toBeVisible();

        await page.goto(`${e2eBaseUrl}/dashboard`);
        await expect(page.getByRole('link', { name: 'Video regression' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Public view' })).toHaveCount(0);
    } finally {
        await context.close();
    }
});
