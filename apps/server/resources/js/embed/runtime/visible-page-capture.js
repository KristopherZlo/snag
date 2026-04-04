import html2canvas from 'html2canvas';

const unsupportedColorPattern = /\b(?:oklab|oklch|color-mix)\(/i;
const maxDebugIssues = 12;
const explicitDebugQueryParam = 'snagWidgetDebug';
const shadowProperties = new Set(['box-shadow', 'text-shadow']);
const colorFallbackProperties = new Set([
    'background-color',
    'color',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'outline-color',
    'text-decoration-color',
    '-webkit-text-stroke-color',
    'caret-color',
    'fill',
    'stroke',
]);

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

let colorNormalizationCanvas;
let colorNormalizationContext;

function getColorNormalizationContext() {
    if (colorNormalizationContext) {
        return colorNormalizationContext;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;

    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (!context) {
        return null;
    }

    colorNormalizationCanvas = canvas;
    colorNormalizationContext = context;

    return colorNormalizationContext;
}

function normalizeUnsupportedColor(value) {
    if (typeof value !== 'string' || !unsupportedColorPattern.test(value)) {
        return value;
    }

    const context = getColorNormalizationContext();

    if (!context) {
        return value;
    }

    context.clearRect(0, 0, 1, 1);
    context.fillStyle = 'rgba(0, 0, 0, 0)';
    context.fillRect(0, 0, 1, 1);

    try {
        context.fillStyle = value;
        context.fillRect(0, 0, 1, 1);
        const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;

        if (alpha === 255) {
            return `rgb(${red}, ${green}, ${blue})`;
        }

        return `rgba(${red}, ${green}, ${blue}, ${Number((alpha / 255).toFixed(3))})`;
    } catch {
        return value;
    }
}

function createSanitizationStats() {
    return {
        sanitizedUnsupportedColors: 0,
        sanitizedProperties: 0,
        droppedProperties: 0,
        scrubbedRemoteMedia: 0,
        issueCount: 0,
        issues: [],
    };
}

function describeElement(element) {
    if (!(element instanceof Element)) {
        return 'unknown';
    }

    const tagName = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : '';
    const className = typeof element.className === 'string'
        ? element.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((token) => `.${token}`).join('')
        : '';
    const testId = element.getAttribute('data-testid');

    return `${tagName}${id}${className}${testId ? `[data-testid="${testId}"]` : ''}`;
}

function recordSanitizationIssue(stats, element, property, value, resolved, reason) {
    stats.issueCount += 1;

    if (stats.issues.length >= maxDebugIssues) {
        return;
    }

    stats.issues.push({
        element: describeElement(element),
        property,
        value: String(value ?? '').slice(0, 180),
        resolved: String(resolved ?? '').slice(0, 180),
        reason,
    });
}

function findUnsupportedColorFunctionEnd(value, startIndex) {
    let depth = 0;

    for (let index = startIndex; index < value.length; index += 1) {
        const character = value[index];

        if (character === '(') {
            depth += 1;
        } else if (character === ')') {
            depth -= 1;

            if (depth === 0) {
                return index + 1;
            }
        }
    }

    return -1;
}

function replaceUnsupportedColorFunctions(value) {
    if (typeof value !== 'string' || !unsupportedColorPattern.test(value)) {
        return {
            value,
            replacements: 0,
            failed: false,
        };
    }

    let cursor = 0;
    let replacements = 0;
    let failed = false;
    let output = '';
    const lowerCased = value.toLowerCase();

    while (cursor < value.length) {
        const names = ['oklab(', 'oklch(', 'color-mix('];
        const matchedName = names.find((name) => lowerCased.startsWith(name, cursor));

        if (!matchedName) {
            output += value[cursor];
            cursor += 1;
            continue;
        }

        const endIndex = findUnsupportedColorFunctionEnd(value, cursor + matchedName.length - 1);

        if (endIndex === -1) {
            failed = true;
            output += value.slice(cursor);
            break;
        }

        const token = value.slice(cursor, endIndex);
        const normalized = normalizeUnsupportedColor(token);

        if (typeof normalized !== 'string' || normalized === token) {
            failed = true;
            output += token;
            cursor = endIndex;
            continue;
        }

        replacements += 1;
        output += normalized;
        cursor = endIndex;
    }

    return {
        value: output,
        replacements,
        failed,
    };
}

function fallbackSanitizedValue(propertyName, value) {
    if (propertyName === 'background-image') {
        return 'none';
    }

    if (shadowProperties.has(propertyName)) {
        return 'none';
    }

    if (colorFallbackProperties.has(propertyName)) {
        const normalized = normalizeUnsupportedColor(value);

        if (typeof normalized === 'string' && normalized !== value) {
            return normalized;
        }

        return propertyName === 'color' ? 'rgb(0, 0, 0)' : 'transparent';
    }

    return '';
}

function sanitizeStyleValue(propertyName, value, stats, sourceElement) {
    if (typeof value !== 'string' || value === '' || !unsupportedColorPattern.test(value)) {
        return value;
    }

    const result = replaceUnsupportedColorFunctions(value);

    if (!result.failed && result.replacements > 0) {
        stats.sanitizedUnsupportedColors += result.replacements;
        stats.sanitizedProperties += 1;
        return result.value;
    }

    const fallbackValue = fallbackSanitizedValue(propertyName, value);
    stats.droppedProperties += 1;
    recordSanitizationIssue(stats, sourceElement, propertyName, value, fallbackValue, 'fallback');

    return fallbackValue;
}

function applySanitizedStyle(element, propertyName, value) {
    element.style.setProperty(propertyName, value, 'important');
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

function stabilizeCloneDocumentSurfaces(clonedDocument) {
    [clonedDocument.documentElement, clonedDocument.body].forEach((element) => {
        if (!(element instanceof HTMLElement)) {
            return;
        }

        element.style.setProperty('background-color', 'rgb(255, 255, 255)', 'important');
        element.style.setProperty('background-image', 'none', 'important');
    });
}

function syncClonedControlState(sourceElement, clonedElement) {
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

        Array.from(clonedElement.options).forEach((option, index) => {
            option.selected = sourceElement.options[index]?.selected === true;
        });
    }
}

function sanitizeCloneStyles(sourceDocument, clonedDocument, { excludeElement = null, scrubRemoteMedia = false } = {}) {
    const sourceBodyElements = sourceDocument.body ? [sourceDocument.body, ...sourceDocument.body.querySelectorAll('*')] : [];
    const clonedBodyElements = clonedDocument.body ? [clonedDocument.body, ...clonedDocument.body.querySelectorAll('*')] : [];
    const sourceElements = [sourceDocument.documentElement, ...sourceBodyElements];
    const clonedElements = [clonedDocument.documentElement, ...clonedBodyElements];
    const stats = createSanitizationStats();

    for (let index = 0; index < sourceElements.length; index += 1) {
        const sourceElement = sourceElements[index];
        const clonedElement = clonedElements[index];

        if (!(sourceElement instanceof Element) || !(clonedElement instanceof Element) || !('style' in clonedElement)) {
            continue;
        }

        if (
            excludeElement
            && (sourceElement === excludeElement || excludeElement.contains(sourceElement))
        ) {
            clonedElement.setAttribute('data-snag-capture-skip', 'true');

            if (clonedElement instanceof HTMLElement) {
                clonedElement.style.visibility = 'hidden';
                clonedElement.style.pointerEvents = 'none';
            }
        }

        const computedStyle = window.getComputedStyle(sourceElement);
        clonedElement.removeAttribute('style');

        for (let propertyIndex = 0; propertyIndex < computedStyle.length; propertyIndex += 1) {
            const propertyName = computedStyle[propertyIndex];

            if (propertyName.startsWith('--')) {
                continue;
            }

            const value = computedStyle.getPropertyValue(propertyName);

            if (typeof value !== 'string' || value === '') {
                continue;
            }

            const sanitizedValue = sanitizeStyleValue(propertyName, value, stats, sourceElement);

            if (sanitizedValue === '') {
                continue;
            }

            applySanitizedStyle(clonedElement, propertyName, sanitizedValue);
        }

        syncClonedControlState(sourceElement, clonedElement);
    }

    const clonedWindow = clonedDocument.defaultView;

    if (clonedWindow?.getComputedStyle) {
        clonedElements.forEach((clonedElement) => {
            if (!(clonedElement instanceof Element) || !('style' in clonedElement)) {
                return;
            }

            const clonedComputedStyle = clonedWindow.getComputedStyle(clonedElement);

            for (let propertyIndex = 0; propertyIndex < clonedComputedStyle.length; propertyIndex += 1) {
                const propertyName = clonedComputedStyle[propertyIndex];

                if (propertyName.startsWith('--')) {
                    continue;
                }

                const value = clonedComputedStyle.getPropertyValue(propertyName);

                if (typeof value !== 'string' || value === '' || !unsupportedColorPattern.test(value)) {
                    continue;
                }

                const sanitizedValue = sanitizeStyleValue(propertyName, value, stats, clonedElement);

                if (sanitizedValue === '') {
                    continue;
                }

                applySanitizedStyle(clonedElement, propertyName, sanitizedValue);
            }
        });
    }

    if (scrubRemoteMedia) {
        stats.scrubbedRemoteMedia = hideProblematicCloneMedia(clonedDocument);
    }

    stabilizeCloneDocumentSurfaces(clonedDocument);

    return stats;
}

function captureOptions({ excludeElement, scrubRemoteMedia = false, onClone = null }) {
    return {
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: false,
        imageTimeout: 4000,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
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
        onclone: (clonedDocument) => {
            const stats = sanitizeCloneStyles(document, clonedDocument, {
                excludeElement,
                scrubRemoteMedia,
            });

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
    const captureContext = {
        url: window.location.href,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        mediaCount: document.querySelectorAll('img, video, iframe, canvas, embed, object').length,
    };
    let fallbackStats = createSanitizationStats();

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
            logCaptureDebug(debugEnabled, 'primary-failed', {
                ...captureContext,
                error: primaryError,
            });

            try {
                const fallbackCanvas = await html2canvas(document.documentElement, captureOptions({
                    excludeElement,
                    scrubRemoteMedia: true,
                    onClone: (_clonedDocument, cloneStats) => {
                        fallbackStats = cloneStats;
                        logCaptureDebug(debugEnabled, 'fallback-clone-scrubbed', {
                            ...captureContext,
                            sanitizedUnsupportedColors: cloneStats.sanitizedUnsupportedColors,
                            sanitizedProperties: cloneStats.sanitizedProperties,
                            droppedProperties: cloneStats.droppedProperties,
                            scrubbedRemoteMedia: cloneStats.scrubbedRemoteMedia,
                            issueCount: cloneStats.issueCount,
                            issues: cloneStats.issues,
                        });
                    },
                }));

                const blob = await canvasToBlob(fallbackCanvas);

                logCaptureDebug(debugEnabled, 'fallback-succeeded', {
                    ...captureContext,
                    scrubbedRemoteMedia: fallbackStats.scrubbedRemoteMedia,
                    sanitizedUnsupportedColors: fallbackStats.sanitizedUnsupportedColors,
                    droppedProperties: fallbackStats.droppedProperties,
                });

                return blob;
            } catch (fallbackError) {
                logCaptureDebug(debugEnabled, 'fallback-failed', {
                    ...captureContext,
                    scrubbedRemoteMedia: fallbackStats.scrubbedRemoteMedia,
                    sanitizedUnsupportedColors: fallbackStats.sanitizedUnsupportedColors,
                    droppedProperties: fallbackStats.droppedProperties,
                    issueCount: fallbackStats.issueCount,
                    issues: fallbackStats.issues,
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
