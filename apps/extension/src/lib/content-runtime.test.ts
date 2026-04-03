import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    disableReportingContentRuntime,
    hasReportingHostAccess,
    isReportablePage,
    reconcileReportingContentRuntime,
    requestAndEnableReportingRuntime,
} from './content-runtime';

describe('content runtime permissions', () => {
    const permissionsContains = vi.fn();
    const permissionsRequest = vi.fn();
    const getRegisteredContentScripts = vi.fn();
    const registerContentScripts = vi.fn();
    const unregisterContentScripts = vi.fn();
    const executeScript = vi.fn();

    beforeEach(() => {
        vi.resetAllMocks();
        vi.stubGlobal('chrome', {
            runtime: {},
            permissions: {
                contains: permissionsContains,
                request: permissionsRequest,
            },
            scripting: {
                getRegisteredContentScripts,
                registerContentScripts,
                unregisterContentScripts,
                executeScript,
            },
        });

        permissionsContains.mockImplementation((_options, callback) => callback(true));
        permissionsRequest.mockImplementation((_options, callback) => callback(true));
        getRegisteredContentScripts.mockImplementation((_options, callback) => callback([]));
        registerContentScripts.mockImplementation((_scripts, callback) => callback());
        unregisterContentScripts.mockImplementation((_options, callback) => callback());
        executeScript.mockImplementation((_options, callback) => callback([]));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('detects reportable pages strictly by http(s) scheme', () => {
        expect(isReportablePage('https://example.com/orders/1')).toBe(true);
        expect(isReportablePage('http://localhost:8010/_diagnostics/extension-recorder')).toBe(true);
        expect(isReportablePage('chrome://extensions')).toBe(false);
        expect(isReportablePage('about:blank')).toBe(false);
        expect(isReportablePage(undefined)).toBe(false);
    });

    it('requests host access, registers the dynamic content script, and injects it into the active page', async () => {
        await expect(requestAndEnableReportingRuntime({
            id: 41,
            url: 'https://example.com/orders/1',
        })).resolves.toBe(true);

        expect(permissionsRequest).toHaveBeenCalledWith({
            origins: ['http://*/*', 'https://*/*'],
        }, expect.any(Function));
        expect(getRegisteredContentScripts).toHaveBeenCalledWith({
            ids: ['snag-reporting-content'],
        }, expect.any(Function));
        expect(registerContentScripts).toHaveBeenCalledWith([
            expect.objectContaining({
                id: 'snag-reporting-content',
                js: ['assets/content.js'],
                matches: ['http://*/*', 'https://*/*'],
                runAt: 'document_start',
                persistAcrossSessions: true,
            }),
        ], expect.any(Function));
        expect(executeScript).toHaveBeenCalledWith({
            target: { tabId: 41 },
            files: ['assets/content.js'],
        }, expect.any(Function));
    });

    it('does not register or inject when host access is denied', async () => {
        permissionsRequest.mockImplementation((_options, callback) => callback(false));

        await expect(requestAndEnableReportingRuntime({
            id: 41,
            url: 'https://example.com/orders/1',
        })).resolves.toBe(false);

        expect(registerContentScripts).not.toHaveBeenCalled();
        expect(executeScript).not.toHaveBeenCalled();
    });

    it('unregisters content injection when reporting is disabled or disconnected', async () => {
        await reconcileReportingContentRuntime({
            connected: false,
            reportingEnabled: true,
            activeTab: {
                id: 41,
                url: 'https://example.com/orders/1',
            },
        });

        expect(unregisterContentScripts).toHaveBeenCalledWith({
            ids: ['snag-reporting-content'],
        }, expect.any(Function));
        expect(registerContentScripts).not.toHaveBeenCalled();
        expect(executeScript).not.toHaveBeenCalled();
    });

    it('refuses to activate when permission is missing and reports that state', async () => {
        permissionsContains.mockImplementation((_options, callback) => callback(false));

        await expect(hasReportingHostAccess()).resolves.toBe(false);
        await expect(reconcileReportingContentRuntime({
            connected: true,
            reportingEnabled: true,
            activeTab: {
                id: 41,
                url: 'https://example.com/orders/1',
            },
        })).resolves.toEqual({
            active: false,
            permissionGranted: false,
        });

        expect(registerContentScripts).not.toHaveBeenCalled();
        expect(executeScript).not.toHaveBeenCalled();
    });

    it('does not inject into unsupported pages even when reporting runtime is active', async () => {
        await reconcileReportingContentRuntime({
            connected: true,
            reportingEnabled: true,
            activeTab: {
                id: 41,
                url: 'chrome://extensions',
            },
        });

        expect(registerContentScripts).toHaveBeenCalled();
        expect(executeScript).not.toHaveBeenCalled();
    });

    it('ignores unregister calls when the dynamic script is already absent', async () => {
        unregisterContentScripts.mockImplementation((_options, callback) => {
            vi.mocked(chrome.runtime).lastError = {
                message: 'No script with id snag-reporting-content',
            } as chrome.runtime.LastError;
            callback();
            vi.mocked(chrome.runtime).lastError = undefined;
        });

        await expect(disableReportingContentRuntime()).resolves.toBeUndefined();
    });
});
