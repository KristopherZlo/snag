import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const html2canvasMock = vi.hoisted(() => vi.fn());

vi.mock('html2canvas-pro', () => ({
    default: html2canvasMock,
}));

import { captureVisiblePageScreenshot } from '../embed/runtime/visible-page-capture.js';

describe('visible page capture', () => {
    beforeEach(() => {
        document.body.innerHTML = '<main><div id="target">content</div></main>';
        html2canvasMock.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('captures the current viewport from document.body with Bugzio-style options', async () => {
        const toBlob = vi.fn((callback) => callback(new Blob(['png'], { type: 'image/png' })));

        html2canvasMock.mockResolvedValue({
            toBlob,
        });

        const blob = await captureVisiblePageScreenshot();

        expect(blob).toBeInstanceOf(Blob);
        expect(html2canvasMock).toHaveBeenCalledWith(document.body, expect.objectContaining({
            useCORS: true,
            allowTaint: false,
            scale: window.devicePixelRatio || 1,
            width: window.innerWidth,
            height: window.innerHeight,
            x: window.scrollX,
            y: window.scrollY,
            scrollX: 0,
            scrollY: 0,
        }));
    });

    it('keeps current form control values inside the cloned document before rendering', async () => {
        document.body.innerHTML = `
            <main>
                <input id="search" value="typed value" />
                <textarea id="details">Changed textarea value</textarea>
                <select id="type">
                    <option value="bug">Bug</option>
                    <option value="billing" selected>Billing</option>
                </select>
            </main>
        `;

        document.getElementById('search').value = 'typed value';
        document.getElementById('details').value = 'Changed textarea value';
        document.getElementById('type').value = 'billing';

        let observedClone = null;

        html2canvasMock.mockImplementationOnce(async (_element, options) => {
            observedClone = document.implementation.createHTMLDocument('clone');
            observedClone.body.innerHTML = `
                <main>
                    <input id="search" value="" />
                    <textarea id="details"></textarea>
                    <select id="type">
                        <option value="bug">Bug</option>
                        <option value="billing">Billing</option>
                    </select>
                </main>
            `;
            options.onclone?.(observedClone);

            return {
                toBlob(callback) {
                    callback(new Blob(['png'], { type: 'image/png' }));
                },
            };
        });

        await captureVisiblePageScreenshot();

        expect(observedClone.querySelector('#search').value).toBe('typed value');
        expect(observedClone.querySelector('#search').getAttribute('value')).toBe('typed value');
        expect(observedClone.querySelector('#details').value).toBe('Changed textarea value');
        expect(observedClone.querySelector('#details').textContent).toBe('Changed textarea value');
        expect(observedClone.querySelector('#type').value).toBe('billing');
        expect(observedClone.querySelector('#type option[value="billing"]').selected).toBe(true);
    });

    it('temporarily hides the excluded widget host during capture and restores it afterward', async () => {
        const excludeElement = document.createElement('div');
        excludeElement.style.visibility = 'visible';
        excludeElement.style.pointerEvents = 'auto';
        document.body.appendChild(excludeElement);

        html2canvasMock.mockImplementation(async (_element, options) => {
            expect(excludeElement.style.visibility).toBe('hidden');
            expect(excludeElement.style.pointerEvents).toBe('none');
            expect(options.ignoreElements(excludeElement)).toBe(true);

            return {
                toBlob(callback) {
                    callback(new Blob(['png'], { type: 'image/png' }));
                },
            };
        });

        await captureVisiblePageScreenshot({ excludeElement });

        expect(excludeElement.style.visibility).toBe('visible');
        expect(excludeElement.style.pointerEvents).toBe('auto');
    });

    it('retries with remote media scrubbed out when the first DOM capture fails', async () => {
        const firstFailure = new Error('tainted canvas');
        const fallbackToBlob = vi.fn((callback) => callback(new Blob(['png'], { type: 'image/png' })));

        html2canvasMock
            .mockRejectedValueOnce(firstFailure)
            .mockImplementationOnce(async (_element, options) => {
                const clonedDocument = document.implementation.createHTMLDocument('fallback');
                const remoteImage = clonedDocument.createElement('img');
                remoteImage.setAttribute('src', 'https://images.example.test/hero.jpg');
                clonedDocument.body.appendChild(remoteImage);

                options.onclone?.(clonedDocument);

                expect(remoteImage.dataset.snagCaptureSkip).toBe('true');
                expect(remoteImage.style.visibility).toBe('hidden');

                return {
                    toBlob: fallbackToBlob,
                };
            });

        const blob = await captureVisiblePageScreenshot();

        expect(blob).toBeInstanceOf(Blob);
        expect(html2canvasMock).toHaveBeenCalledTimes(2);
        expect(html2canvasMock.mock.calls[1][0]).toBe(document.body);
        expect(html2canvasMock.mock.calls[1][1]).toEqual(expect.objectContaining({
            allowTaint: false,
            useCORS: true,
        }));
        expect(typeof html2canvasMock.mock.calls[1][1].onclone).toBe('function');
    });

    it('logs console debug details when both capture attempts fail', async () => {
        const primaryFailure = new Error('primary failure');
        const fallbackFailure = new Error('fallback failure');
        const consoleGroupSpy = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
        const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

        html2canvasMock
            .mockRejectedValueOnce(primaryFailure)
            .mockRejectedValueOnce(fallbackFailure);

        await expect(captureVisiblePageScreenshot({ debug: true })).rejects.toThrow('fallback failure');

        expect(consoleGroupSpy).toHaveBeenCalledWith('[Snag widget] visible-page-capture:primary-failed');
        expect(consoleGroupSpy).toHaveBeenCalledWith('[Snag widget] visible-page-capture:fallback-failed');
        expect(consoleInfoSpy).toHaveBeenCalledWith('url:', window.location.href);
        expect(consoleInfoSpy).toHaveBeenCalledWith('target:', 'body');
        expect(consoleErrorSpy).toHaveBeenCalledWith(primaryFailure);
        expect(consoleErrorSpy).toHaveBeenCalledWith(fallbackFailure);
        expect(consoleGroupEndSpy).toHaveBeenCalled();
    });
});
