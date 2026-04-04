import html2canvas from 'html2canvas';

function waitForPaint() {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
        });
    });
}

function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob instanceof Blob) {
                resolve(blob);
                return;
            }

            reject(new Error('Failed to create the page screenshot.'));
        }, 'image/png');
    });
}

function isRemoteUrl(value) {
    if (typeof value !== 'string' || value.trim() === '') {
        return false;
    }

    try {
        const url = new URL(value, window.location.href);

        if (url.protocol === 'data:' || url.protocol === 'blob:') {
            return false;
        }

        return url.origin !== window.location.origin;
    } catch {
        return false;
    }
}

function hideProblematicCloneMedia(clonedDocument) {
    clonedDocument.querySelectorAll('img, video, iframe, canvas, embed, object').forEach((element) => {
        const source = element.getAttribute('src')
            || element.getAttribute('currentSrc')
            || element.getAttribute('poster')
            || '';

        if (!isRemoteUrl(source)) {
            return;
        }

        element.setAttribute('data-snag-capture-skip', 'true');

        if (element instanceof HTMLElement) {
            element.style.visibility = 'hidden';
            element.style.background = '#e5e7eb';
        }
    });
}

function captureOptions({ excludeElement, scrubRemoteMedia = false }) {
    return {
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: false,
        imageTimeout: 4000,
        width: window.innerWidth,
        height: window.innerHeight,
        x: window.scrollX,
        y: window.scrollY,
        ignoreElements: (element) => {
            if (excludeElement && (element === excludeElement || excludeElement.contains(element))) {
                return true;
            }

            if (
                scrubRemoteMedia
                && element instanceof HTMLElement
                && element.dataset.snagCaptureSkip === 'true'
            ) {
                return true;
            }

            return false;
        },
        onclone: scrubRemoteMedia
            ? (clonedDocument) => {
                hideProblematicCloneMedia(clonedDocument);
            }
            : undefined,
    };
}

export async function captureVisiblePageScreenshot(options = {}) {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('Visible page capture is only available in the browser.');
    }

    const excludeElement = options.excludeElement instanceof HTMLElement ? options.excludeElement : null;
    const previousVisibility = excludeElement?.style.visibility ?? '';
    const previousPointerEvents = excludeElement?.style.pointerEvents ?? '';

    if (excludeElement) {
        excludeElement.style.visibility = 'hidden';
        excludeElement.style.pointerEvents = 'none';
        await waitForPaint();
    }

    try {
        try {
            const canvas = await html2canvas(document.documentElement, captureOptions({ excludeElement }));

            return canvasToBlob(canvas);
        } catch {
            const fallbackCanvas = await html2canvas(document.documentElement, captureOptions({
                excludeElement,
                scrubRemoteMedia: true,
            }));

            return canvasToBlob(fallbackCanvas);
        }
    } finally {
        if (excludeElement) {
            excludeElement.style.visibility = previousVisibility;
            excludeElement.style.pointerEvents = previousPointerEvents;
        }
    }
}
