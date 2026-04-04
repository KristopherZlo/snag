import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const html2canvasMock = vi.hoisted(() => vi.fn());

vi.mock('html2canvas', () => ({
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

    it('captures the current viewport with CORS enabled and tainting disabled', async () => {
        const toBlob = vi.fn((callback) => callback(new Blob(['png'], { type: 'image/png' })));

        html2canvasMock.mockResolvedValue({
            toBlob,
        });

        const blob = await captureVisiblePageScreenshot();

        expect(blob).toBeInstanceOf(Blob);
        expect(html2canvasMock).toHaveBeenCalledWith(document.documentElement, expect.objectContaining({
            useCORS: true,
            allowTaint: false,
            width: window.innerWidth,
            height: window.innerHeight,
            x: window.scrollX,
            y: window.scrollY,
        }));
    });

    it('normalizes unsupported oklab colors in the cloned document before rendering', async () => {
        const contextMock = {
            clearRect: vi.fn(),
            fillRect: vi.fn(),
            getImageData: vi.fn(() => ({
                data: new Uint8ClampedArray([12, 34, 56, 255]),
            })),
        };
        const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(contextMock);
        const getComputedStyleSpy = vi.spyOn(window, 'getComputedStyle').mockImplementation(() => ({
            backgroundColor: 'oklab(62% 0.1 0.1)',
            color: 'rgb(0, 0, 0)',
            borderTopColor: '',
            borderRightColor: '',
            borderBottomColor: '',
            borderLeftColor: '',
            outlineColor: '',
            textDecorationColor: '',
            caretColor: '',
            fill: '',
            stroke: '',
        }));

        html2canvasMock.mockImplementationOnce(async (_element, options) => {
            const clonedDocument = document.implementation.createHTMLDocument('clone');
            clonedDocument.body.innerHTML = '<main><div id="target">content</div></main>';
            options.onclone?.(clonedDocument);

            expect(clonedDocument.documentElement.style.backgroundColor).toBe('rgb(12, 34, 56)');

            return {
                toBlob(callback) {
                    callback(new Blob(['png'], { type: 'image/png' }));
                },
            };
        });

        await captureVisiblePageScreenshot();

        expect(getContextSpy).toHaveBeenCalled();
        expect(getComputedStyleSpy).toHaveBeenCalled();
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

        await expect(captureVisiblePageScreenshot()).rejects.toThrow('fallback failure');

        expect(consoleGroupSpy).toHaveBeenCalledWith('[Snag widget] visible-page-capture:primary-failed');
        expect(consoleGroupSpy).toHaveBeenCalledWith('[Snag widget] visible-page-capture:fallback-failed');
        expect(consoleInfoSpy).toHaveBeenCalledWith('url:', window.location.href);
        expect(consoleErrorSpy).toHaveBeenCalledWith(primaryFailure);
        expect(consoleErrorSpy).toHaveBeenCalledWith(fallbackFailure);
        expect(consoleGroupEndSpy).toHaveBeenCalled();
    });
});
