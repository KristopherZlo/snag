import html2canvas from 'html2canvas-pro';

const explicitDebugQueryParam = 'snagWidgetDebug';

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

function shouldLogCaptureDebug(debug) {
    if (debug === true) {
        return true;
    }

    if (typeof window === 'undefined') {
        return false;
    }

    try {
        const search = new URLSearchParams(window.location.search);

        return search.get(explicitDebugQueryParam) === '1';
    } catch {
        return false;
    }
}

function logCaptureDebug(enabled, stage, details = {}) {
    if (!enabled || typeof console === 'undefined') {
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

function getCaptureTarget() {
    return document.body ?? document.documentElement;
}

function pageBackgroundColor() {
    const bodyColor = window.getComputedStyle(document.body).backgroundColor;

    if (bodyColor && bodyColor !== 'rgba(0, 0, 0, 0)' && bodyColor !== 'transparent') {
        return bodyColor;
    }

    const rootColor = window.getComputedStyle(document.documentElement).backgroundColor;

    if (rootColor && rootColor !== 'rgba(0, 0, 0, 0)' && rootColor !== 'transparent') {
        return rootColor;
    }

    return '#ffffff';
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

function resolveMediaSource(element) {
    if (element instanceof HTMLImageElement) {
        return element.currentSrc || element.getAttribute('src') || '';
    }

    if (element instanceof HTMLVideoElement) {
        return element.currentSrc || element.getAttribute('src') || element.getAttribute('poster') || '';
    }

    return element.getAttribute('src') || element.getAttribute('data') || '';
}

function hideProblematicCloneMedia(clonedDocument) {
    let scrubbedCount = 0;

    clonedDocument.querySelectorAll('img, video, iframe, embed, object').forEach((element) => {
        if (!isRemoteUrl(resolveMediaSource(element))) {
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

function syncClonedControlState(sourceDocument, clonedDocument) {
    const sourceControls = sourceDocument.querySelectorAll('input, textarea, select');
    const clonedControls = clonedDocument.querySelectorAll('input, textarea, select');

    sourceControls.forEach((sourceElement, index) => {
        const clonedElement = clonedControls[index];

        if (!clonedElement) {
            return;
        }

        if (sourceElement instanceof HTMLInputElement && clonedElement instanceof HTMLInputElement) {
            clonedElement.value = sourceElement.value;
            clonedElement.checked = sourceElement.checked;

            if (sourceElement.checked) {
                clonedElement.setAttribute('checked', '');
            } else {
                clonedElement.removeAttribute('checked');
            }

            if (sourceElement.value !== '') {
                clonedElement.setAttribute('value', sourceElement.value);
            } else {
                clonedElement.removeAttribute('value');
            }

            return;
        }

        if (sourceElement instanceof HTMLTextAreaElement && clonedElement instanceof HTMLTextAreaElement) {
            clonedElement.value = sourceElement.value;
            clonedElement.textContent = sourceElement.value;
            return;
        }

        if (sourceElement instanceof HTMLSelectElement && clonedElement instanceof HTMLSelectElement) {
            clonedElement.value = sourceElement.value;

            Array.from(clonedElement.options).forEach((option, optionIndex) => {
                option.selected = sourceElement.options[optionIndex]?.selected === true;
            });
        }
    });
}

function syncClonedImageState(sourceDocument, clonedDocument) {
    const sourceImages = sourceDocument.querySelectorAll('img');
    const clonedImages = clonedDocument.querySelectorAll('img');

    sourceImages.forEach((sourceImage, index) => {
        const clonedImage = clonedImages[index];

        if (!(clonedImage instanceof HTMLImageElement)) {
            return;
        }

        const resolvedSource = sourceImage.currentSrc || sourceImage.src || sourceImage.getAttribute('src') || '';

        if (resolvedSource !== '') {
            clonedImage.src = resolvedSource;
        }

        clonedImage.loading = 'eager';
        clonedImage.decoding = 'sync';
        clonedImage.removeAttribute('srcset');
        clonedImage.removeAttribute('sizes');

        const computedStyle = window.getComputedStyle(sourceImage);

        if (computedStyle.objectFit) {
            clonedImage.style.objectFit = computedStyle.objectFit;
        }

        if (computedStyle.objectPosition) {
            clonedImage.style.objectPosition = computedStyle.objectPosition;
        }
    });
}

function captureOptions({ excludeElement, scrubRemoteMedia = false, onClone = null }) {
    return {
        backgroundColor: pageBackgroundColor(),
        logging: false,
        useCORS: true,
        allowTaint: false,
        imageTimeout: 4000,
        scale: window.devicePixelRatio || 1,
        width: window.innerWidth,
        height: window.innerHeight,
        x: window.scrollX,
        y: window.scrollY,
        scrollX: 0,
        scrollY: 0,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
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
        onclone: (clonedDocument) => {
            syncClonedControlState(document, clonedDocument);
            syncClonedImageState(document, clonedDocument);

            const stats = {
                scrubbedRemoteMedia: scrubRemoteMedia ? hideProblematicCloneMedia(clonedDocument) : 0,
            };

            onClone?.(clonedDocument, stats);
        },
    };
}

export async function captureVisiblePageScreenshot(options = {}) {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('Visible page capture is only available in the browser.');
    }

    const excludeElement = options.excludeElement instanceof HTMLElement ? options.excludeElement : null;
    const previousVisibility = excludeElement?.style.visibility ?? '';
    const previousPointerEvents = excludeElement?.style.pointerEvents ?? '';
    const debugEnabled = shouldLogCaptureDebug(options.debug);
    const captureTarget = getCaptureTarget();
    const captureContext = {
        target: captureTarget.tagName.toLowerCase(),
        url: window.location.href,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        scroll: `${window.scrollX},${window.scrollY}`,
        mediaCount: document.querySelectorAll('img, video, iframe, embed, object').length,
    };
    let fallbackStats = { scrubbedRemoteMedia: 0 };

    if (excludeElement) {
        excludeElement.style.visibility = 'hidden';
        excludeElement.style.pointerEvents = 'none';
        await waitForPaint();
    }

    try {
        try {
            const canvas = await html2canvas(captureTarget, captureOptions({ excludeElement }));

            return await canvasToBlob(canvas);
        } catch (primaryError) {
            logCaptureDebug(debugEnabled, 'primary-failed', {
                ...captureContext,
                error: primaryError,
            });

            try {
                const fallbackCanvas = await html2canvas(captureTarget, captureOptions({
                    excludeElement,
                    scrubRemoteMedia: true,
                    onClone: (_clonedDocument, stats) => {
                        fallbackStats = stats;
                        logCaptureDebug(debugEnabled, 'fallback-clone-scrubbed', {
                            ...captureContext,
                            scrubbedRemoteMedia: stats.scrubbedRemoteMedia,
                        });
                    },
                }));

                const blob = await canvasToBlob(fallbackCanvas);

                logCaptureDebug(debugEnabled, 'fallback-succeeded', {
                    ...captureContext,
                    scrubbedRemoteMedia: fallbackStats.scrubbedRemoteMedia,
                });

                return blob;
            } catch (fallbackError) {
                logCaptureDebug(debugEnabled, 'fallback-failed', {
                    ...captureContext,
                    scrubbedRemoteMedia: fallbackStats.scrubbedRemoteMedia,
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
