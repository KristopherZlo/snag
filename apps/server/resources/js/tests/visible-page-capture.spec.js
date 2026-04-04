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
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            scrollX: window.scrollX,
            scrollY: window.scrollY,
            width: window.innerWidth,
            height: window.innerHeight,
            x: window.scrollX,
            y: window.scrollY,
        }));
    });

    it('sanitizes unsupported modern color functions in the cloned document before rendering', async () => {
        document.body.innerHTML = '<main><input id="target" value="typed value" /></main>';

        const contextMock = {
            clearRect: vi.fn(),
            fillRect: vi.fn(),
            getImageData: vi.fn(() => ({
                data: new Uint8ClampedArray([12, 34, 56, 255]),
            })),
        };
        const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(contextMock);
        let observedClone = null;
        const getComputedStyleSpy = vi.spyOn(window, 'getComputedStyle').mockImplementation(() => ({
            0: 'background-color',
            1: 'box-shadow',
            2: 'text-shadow',
            3: 'color',
            length: 4,
            getPropertyValue(property) {
                switch (property) {
                    case 'background-color':
                        return 'oklab(62% 0.1 0.1)';
                    case 'box-shadow':
                        return '0 0 0 1px color-mix(in oklab, white 50%, black)';
                    case 'text-shadow':
                        return '0 1px 2px oklch(62% 0.1 0.1)';
                    case 'color':
                        return 'rgb(0, 0, 0)';
                    default:
                        return '';
                }
            },
        }));

        html2canvasMock.mockImplementationOnce(async (_element, options) => {
            observedClone = document.implementation.createHTMLDocument('clone');
            observedClone.body.innerHTML = '<main><input id="target" value="typed value" /></main>';
            options.onclone?.(observedClone);

            return {
                toBlob(callback) {
                    callback(new Blob(['png'], { type: 'image/png' }));
                },
            };
        });

        await captureVisiblePageScreenshot();

        expect(observedClone.documentElement.style.backgroundColor).toBe('rgb(255, 255, 255)');
        expect(observedClone.body.style.backgroundImage).toBe('none');
        expect(observedClone.querySelector('#target').style.backgroundColor).toBe('rgb(12, 34, 56)');
        expect(observedClone.querySelector('#target').style.boxShadow).toContain('rgb(12, 34, 56)');
        expect(observedClone.querySelector('#target').style.textShadow).toContain('rgb(12, 34, 56)');
        expect(observedClone.querySelector('#target').value).toBe('typed value');
        expect(getContextSpy).toHaveBeenCalled();
        expect(getComputedStyleSpy).toHaveBeenCalled();
    });

    it('sanitizes unsupported colors that only appear in the cloned iframe computed styles', async () => {
        document.body.innerHTML = '<main><input id="target" value="typed value" /></main>';

        const contextMock = {
            clearRect: vi.fn(),
            fillRect: vi.fn(),
            getImageData: vi.fn(() => ({
                data: new Uint8ClampedArray([10, 20, 30, 255]),
            })),
        };
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(contextMock);
        vi.spyOn(window, 'getComputedStyle').mockImplementation(() => ({
            0: 'background-color',
            1: 'color',
            length: 2,
            getPropertyValue(property) {
                switch (property) {
                    case 'background-color':
                        return 'rgb(255, 255, 255)';
                    case 'color':
                        return 'rgb(0, 0, 0)';
                    default:
                        return '';
                }
            },
        }));

        let observedClone = null;

        html2canvasMock.mockImplementationOnce(async (_element, options) => {
            observedClone = document.implementation.createHTMLDocument('clone');
            observedClone.body.innerHTML = '<main><input id="target" value="typed value" /></main>';

            Object.defineProperty(observedClone, 'defaultView', {
                configurable: true,
                value: {
                    getComputedStyle(element) {
                        if (element.id === 'target') {
                            return {
                                0: 'background-color',
                                1: 'border-top-color',
                                length: 2,
                                getPropertyValue(property) {
                                    switch (property) {
                                        case 'background-color':
                                            return 'oklab(62% 0.1 0.1)';
                                        case 'border-top-color':
                                            return 'color-mix(in oklab, white 50%, black)';
                                        default:
                                            return '';
                                    }
                                },
                            };
                        }

                        return {
                            length: 0,
                            getPropertyValue() {
                                return '';
                            },
                        };
                    },
                },
            });

            options.onclone?.(observedClone);

            return {
                toBlob(callback) {
                    callback(new Blob(['png'], { type: 'image/png' }));
                },
            };
        });

        await captureVisiblePageScreenshot();

        expect(observedClone.querySelector('#target').style.backgroundColor).toMatch(/^rgb\(/);
        expect(observedClone.querySelector('#target').style.backgroundColor).not.toContain('oklab');
        expect(observedClone.querySelector('#target').style.borderTopColor).toMatch(/^rgb\(/);
        expect(observedClone.querySelector('#target').style.borderTopColor).not.toContain('color-mix');
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

        await expect(captureVisiblePageScreenshot({ debug: true })).rejects.toThrow('fallback failure');

        expect(consoleGroupSpy).toHaveBeenCalledWith('[Snag widget] visible-page-capture:primary-failed');
        expect(consoleGroupSpy).toHaveBeenCalledWith('[Snag widget] visible-page-capture:fallback-failed');
        expect(consoleInfoSpy).toHaveBeenCalledWith('url:', window.location.href);
        expect(consoleErrorSpy).toHaveBeenCalledWith(primaryFailure);
        expect(consoleErrorSpy).toHaveBeenCalledWith(fallbackFailure);
        expect(consoleGroupEndSpy).toHaveBeenCalled();
    });
});
