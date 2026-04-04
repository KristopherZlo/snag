import { beforeEach, describe, expect, it, vi } from 'vitest';

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
});
