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

function logCaptureDebug(stage, details = {}) {
    if (typeof console === 'undefined') {
        return;
    }

    const label = `[Snag widget] visible-page-capture:${stage}`;

    if (typeof console.groupCollapsed === 'function') {
        console.groupCollapsed(label);
    } else if (typeof console.warn === 'function') {
        console.warn(label);
    }

    Object.entries(details).forEach(([key, value]) => {
        if (key === 'error') {
            return;
        }

        if (typeof console.info === 'function') {
            console.info(`${key}:`, value);
            return;
        }

        if (typeof console.log === 'function') {
            console.log(`${key}:`, value);
        }
    });

    if (details.error instanceof Error && typeof console.error === 'function') {
        console.error(details.error);
    }

    if (typeof console.groupEnd === 'function') {
        console.groupEnd();
    }
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
    let scrubbedCount = 0;

    clonedDocument.querySelectorAll('img, video, iframe, canvas, embed, object').forEach((element) => {
        const source = element.getAttribute('src')
            || element.getAttribute('currentSrc')
            || element.getAttribute('poster')
            || '';

        if (!isRemoteUrl(source)) {
            return;
        }

        element.setAttribute('data-snag-capture-skip', 'true');
        scrubbedCount += 1;

        if (element instanceof HTMLElement) {
            element.style.visibility = 'hidden';
            element.style.background = '#e5e7eb';
        }
    });

    return scrubbedCount;
}

function captureOptions({ excludeElement, scrubRemoteMedia = false, onClone = null }) {
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
                const scrubbedRemoteMedia = hideProblematicCloneMedia(clonedDocument);
                onClone?.(clonedDocument, scrubbedRemoteMedia);
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
    let fallbackScrubbedMediaCount = 0;

    if (excludeElement) {
        excludeElement.style.visibility = 'hidden';
        excludeElement.style.pointerEvents = 'none';
        await waitForPaint();
    }

    try {
        try {
            const canvas = await html2canvas(document.documentElement, captureOptions({ excludeElement }));

            return canvasToBlob(canvas);
        } catch (primaryError) {
            logCaptureDebug('primary-failed', {
                url: window.location.href,
                viewport: `${window.innerWidth}x${window.innerHeight}`,
                mediaCount: document.querySelectorAll('img, video, iframe, canvas, embed, object').length,
                error: primaryError,
            });

            try {
                const fallbackCanvas = await html2canvas(document.documentElement, captureOptions({
                    excludeElement,
                    scrubRemoteMedia: true,
                    onClone: (_clonedDocument, scrubbedRemoteMedia) => {
                        fallbackScrubbedMediaCount = scrubbedRemoteMedia;
                        logCaptureDebug('fallback-clone-scrubbed', {
                            url: window.location.href,
                            scrubbedRemoteMedia: fallbackScrubbedMediaCount,
                        });
                    },
                }));

                const blob = await canvasToBlob(fallbackCanvas);

                logCaptureDebug('fallback-succeeded', {
                    url: window.location.href,
                    scrubbedRemoteMedia: fallbackScrubbedMediaCount,
                });

                return blob;
            } catch (fallbackError) {
                logCaptureDebug('fallback-failed', {
                    url: window.location.href,
                    scrubbedRemoteMedia: fallbackScrubbedMediaCount,
                    error: fallbackError,
                });

                throw fallbackError;
            }
        }
    } finally {
        if (excludeElement) {
            excludeElement.style.visibility = previousVisibility;
            excludeElement.style.pointerEvents = previousPointerEvents;
        }
    }
}
