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
        const canvas = await html2canvas(document.documentElement, {
            backgroundColor: '#ffffff',
            logging: false,
            useCORS: true,
            allowTaint: false,
            width: window.innerWidth,
            height: window.innerHeight,
            x: window.scrollX,
            y: window.scrollY,
            ignoreElements: (element) => excludeElement
                ? element === excludeElement || excludeElement.contains(element)
                : false,
        });

        return canvasToBlob(canvas);
    } finally {
        if (excludeElement) {
            excludeElement.style.visibility = previousVisibility;
            excludeElement.style.pointerEvents = previousPointerEvents;
        }
    }
}
