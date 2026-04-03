import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountPopup } from './popup-root';
import * as storage from './lib/storage';
import * as chromeHelpers from './lib/chrome';
import * as contentRuntime from './lib/content-runtime';

vi.mock('./lib/storage', () => ({
    getSession: vi.fn(),
    setSession: vi.fn(),
    clearSession: vi.fn(),
    getReportingEnabled: vi.fn(),
    getOverlayDebugEntries: vi.fn(),
    setReportingEnabled: vi.fn(),
    rememberCaptureAccessGrant: vi.fn(),
}));

vi.mock('./lib/chrome', () => ({
    queryActiveTab: vi.fn(),
    requestOverlayDebugSnapshot: vi.fn(),
}));

vi.mock('./lib/content-runtime', () => ({
    disableReportingContentRuntime: vi.fn(),
    reconcileReportingContentRuntime: vi.fn(),
    requestAndEnableReportingRuntime: vi.fn(),
}));

function flushPromises(): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
}

async function flushUi(): Promise<void> {
    await flushPromises();
    await flushPromises();
}

function connectedSession() {
    return {
        apiBaseUrl: 'http://localhost/snag',
        token: 'token-1',
        device_name: 'Chrome Recorder',
        expires_at: '2099-04-10T09:00:00.000Z',
        organization: {
            id: 7,
            name: 'Studio Org',
            slug: 'studio-org',
        },
        user: {
            id: 11,
            email: 'test@mail.com',
            name: 'Test User',
        },
    };
}

describe('popup root', () => {
    const tabsCreate = vi.fn();
    const tabsQuery = vi.fn();
    const addStorageListener = vi.fn();
    const removeStorageListener = vi.fn();
    const clipboardWriteText = vi.fn();

    beforeEach(() => {
        vi.resetAllMocks();
        document.head.innerHTML = '';
        document.body.innerHTML = '<div id="app"></div>';
        document.documentElement.dataset.surface = 'popup';
        document.body.dataset.surface = 'popup';
        window.localStorage.clear();
        Object.defineProperty(navigator, 'clipboard', {
            value: {
                writeText: clipboardWriteText,
            },
            configurable: true,
        });
        vi.stubGlobal('fetch', vi.fn());
        vi.stubGlobal('chrome', {
            tabs: {
                create: tabsCreate,
                query: tabsQuery,
            },
            storage: {
                onChanged: {
                    addListener: addStorageListener,
                    removeListener: removeStorageListener,
                },
            },
        });

        tabsCreate.mockResolvedValue(undefined);
        tabsQuery.mockImplementation((_queryInfo, callback) => callback([{
            id: 41,
            url: 'https://example.com/orders/1',
        }]));
        vi.mocked(storage.getSession).mockResolvedValue(null);
        vi.mocked(storage.getReportingEnabled).mockResolvedValue(false);
        vi.mocked(storage.setSession).mockResolvedValue();
        vi.mocked(storage.clearSession).mockResolvedValue();
        vi.mocked(storage.setReportingEnabled).mockResolvedValue();
        vi.mocked(storage.getOverlayDebugEntries).mockResolvedValue([]);
        vi.mocked(storage.rememberCaptureAccessGrant).mockResolvedValue();
        vi.mocked(chromeHelpers.queryActiveTab).mockResolvedValue({
            id: 41,
            title: 'Orders',
            url: 'https://example.com/orders/1',
        });
        vi.mocked(contentRuntime.disableReportingContentRuntime).mockResolvedValue();
        vi.mocked(contentRuntime.reconcileReportingContentRuntime).mockResolvedValue({
            active: false,
            permissionGranted: false,
        });
        vi.mocked(contentRuntime.requestAndEnableReportingRuntime).mockResolvedValue(true);
        vi.mocked(chromeHelpers.requestOverlayDebugSnapshot).mockResolvedValue({
            page: {
                url: 'https://example.com/orders/1',
            },
        });
        clipboardWriteText.mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('mounts the disconnected popup shell with connection instructions', async () => {
        const target = document.getElementById('app');

        expect(target).not.toBeNull();
        expect(() => mountPopup(target as HTMLElement)).not.toThrow();

        await flushUi();

        expect(document.querySelector('[data-testid="popup-root"]')).not.toBeNull();
        expect(document.querySelectorAll('input')).toHaveLength(3);
        expect((document.querySelector('input[placeholder="http://192.168.x.x/snag"]') as HTMLInputElement | null)?.value).toBe(
            'http://localhost/snag',
        );
        expect(document.body.textContent).toContain('Connect extension');
        expect(document.body.textContent).toContain('Connect the extension to enable the floating recorder on every page.');
        expect(document.body.textContent).toContain('Open settings');
        expect(addStorageListener).toHaveBeenCalledTimes(1);
        expect(contentRuntime.reconcileReportingContentRuntime).toHaveBeenCalledWith({
            connected: false,
            reportingEnabled: false,
            activeTab: expect.objectContaining({
                id: 41,
                url: 'https://example.com/orders/1',
            }),
        });
        expect(storage.rememberCaptureAccessGrant).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 41,
                url: 'https://example.com/orders/1',
            }),
        );
    });

    it('uses the normalized xampp base url when exchanging the one-time code', async () => {
        vi.mocked(storage.getSession)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(connectedSession());

        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({
                token: 'token-1',
                device_name: 'Chrome Recorder',
                expires_at: '2099-04-10T09:00:00.000Z',
                organization: {
                    id: 7,
                    name: 'Studio Org',
                    slug: 'studio-org',
                },
                user: {
                    id: 11,
                    email: 'test@mail.com',
                    name: 'Test User',
                },
            }),
        } as Response);

        const target = document.getElementById('app');

        mountPopup(target as HTMLElement);
        await flushUi();

        const baseUrlInput = document.querySelector('input[placeholder="http://192.168.x.x/snag"]') as HTMLInputElement;
        const codeInput = document.querySelector('input[placeholder="Paste code from settings"]') as HTMLInputElement;
        const exchangeButton = Array.from(document.querySelectorAll('button')).find((button) =>
            button.textContent?.includes('Exchange code'),
        ) as HTMLButtonElement | undefined;

        baseUrlInput.value = 'http://localhost/';
        baseUrlInput.dispatchEvent(new Event('input', { bubbles: true }));
        codeInput.value = 'ABC123';
        codeInput.dispatchEvent(new Event('input', { bubbles: true }));
        await flushUi();

        exchangeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await flushUi();

        expect(fetchMock).toHaveBeenCalledWith(
            'http://localhost/snag/api/v1/extension/tokens/exchange',
            expect.objectContaining({
                method: 'POST',
            }),
        );
        expect(storage.setSession).toHaveBeenCalledWith(
            expect.objectContaining({
                apiBaseUrl: 'http://localhost/snag',
            }),
        );
        expect(document.body.textContent).toContain('Connected to Studio Org.');
    });

    it('renders the connected session, toggles reporting, and opens sent captures', async () => {
        vi.mocked(storage.getSession).mockResolvedValue(connectedSession());
        vi.mocked(storage.getReportingEnabled).mockResolvedValue(false);

        const target = document.getElementById('app');

        mountPopup(target as HTMLElement);
        await flushUi();

        expect(document.body.textContent).toContain('Reporting');
        expect(document.body.textContent).toContain('Current session');
        expect(document.body.textContent).toContain('Studio Org');
        expect(document.body.textContent).toContain('test@mail.com');

        const toggle = document.querySelector('[data-testid="popup-reporting-toggle"]') as HTMLElement | null;
        const openCapturesButton = document.querySelector('[data-testid="popup-open-captures"]') as HTMLButtonElement | null;

        expect(toggle).not.toBeNull();
        expect(openCapturesButton).not.toBeNull();

        toggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await flushUi();

        expect(contentRuntime.requestAndEnableReportingRuntime).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 41,
                url: 'https://example.com/orders/1',
            }),
        );
        expect(storage.setReportingEnabled).toHaveBeenCalledWith(true);
        expect(document.body.textContent).toContain('Start reporting is enabled.');

        openCapturesButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(tabsCreate).toHaveBeenCalledWith({
            url: 'http://localhost/snag/settings/extension/captures',
        });
    });

    it('copies the active page debug log from the connected popup', async () => {
        vi.mocked(storage.getSession).mockResolvedValue(connectedSession());
        vi.mocked(storage.getReportingEnabled).mockResolvedValue(false);
        vi.mocked(storage.getOverlayDebugEntries).mockResolvedValue([{
            id: 'overlay-debug-1',
            source: 'content',
            level: 'info',
            event: 'overlay:mounted',
            url: 'https://example.com/orders/1',
            tabId: null,
            happenedAt: '2026-04-01T09:00:00.000Z',
            payload: {},
        }]);

        const target = document.getElementById('app');

        mountPopup(target as HTMLElement);
        await flushUi();

        const copyDebugButton = document.querySelector('[data-testid="popup-copy-debug-log"]') as HTMLButtonElement | null;

        expect(copyDebugButton).not.toBeNull();

        copyDebugButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await flushUi();

        expect(chromeHelpers.requestOverlayDebugSnapshot).toHaveBeenCalledWith(41);
        expect(clipboardWriteText).toHaveBeenCalledTimes(1);
        expect(document.body.textContent).toContain('Page debug log copied to clipboard.');
    });

    it('clears the connected session and disables reporting', async () => {
        vi.mocked(storage.getSession)
            .mockResolvedValueOnce(connectedSession())
            .mockResolvedValueOnce(null);
        vi.mocked(storage.getReportingEnabled).mockResolvedValue(false);
        const fetchMock = vi.mocked(fetch);

        fetchMock.mockResolvedValue({
            ok: true,
            status: 204,
        } as Response);

        const target = document.getElementById('app');

        mountPopup(target as HTMLElement);
        await flushUi();

        const clearButton = document.querySelector('[data-testid="popup-clear-session"]') as HTMLButtonElement | null;

        expect(clearButton).not.toBeNull();

        clearButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await flushUi();

        expect(fetchMock).toHaveBeenCalledWith(
            'http://localhost/snag/api/v1/extension/session',
            expect.objectContaining({
                method: 'DELETE',
                headers: expect.objectContaining({
                    Authorization: 'Bearer token-1',
                }),
            }),
        );
        expect(storage.clearSession).toHaveBeenCalled();
        expect(storage.setReportingEnabled).toHaveBeenCalledWith(false);
        expect(contentRuntime.disableReportingContentRuntime).toHaveBeenCalled();
        expect(document.body.textContent).toContain('Extension session cleared.');
        expect(document.body.textContent).toContain('Connect extension');
    });

    it('shows a controlled status when extension storage is unavailable during hydration', async () => {
        vi.mocked(storage.getSession).mockRejectedValue(new Error('Chrome extension storage is unavailable.'));

        const target = document.getElementById('app');

        mountPopup(target as HTMLElement);
        await flushUi();

        expect(document.body.textContent).toContain('Chrome extension storage is unavailable.');
    });
});
