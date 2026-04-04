export const EDITOR_TOOL_OPTIONS = [
    { id: 'arrow', label: 'Arrow' },
    { id: 'brush', label: 'Brush' },
    { id: 'blur', label: 'Blur' },
];

export const EDITOR_STROKE_SWATCHES = ['#ff6b6b', '#f59e0b', '#ffffff', '#60a5fa', '#4ade80'];

export function createScreenshotEditorState() {
    return {
        activeTool: 'arrow',
        strokeColor: EDITOR_STROKE_SWATCHES[0],
        strokeWidth: 6,
        annotations: [],
        redoStack: [],
        draftAnnotation: null,
    };
}

export function resetScreenshotEditorState(state) {
    state.activeTool = 'arrow';
    state.strokeColor = EDITOR_STROKE_SWATCHES[0];
    state.strokeWidth = 6;
    state.annotations = [];
    state.redoStack = [];
    state.draftAnnotation = null;
}

export function getEditorToolLabel(state) {
    return EDITOR_TOOL_OPTIONS.find((tool) => tool.id === state.activeTool)?.label ?? 'Tool';
}

export function getEditorAnnotationCount(state) {
    return state.annotations.length;
}

function clampUnit(value) {
    return Math.min(Math.max(value, 0), 1);
}

function distanceBetweenPoints(pointA, pointB) {
    return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y);
}

function toCanvasPoint(point, width, height) {
    return {
        x: point.x * width,
        y: point.y * height,
    };
}

function normalizeBox(startPoint, endPoint) {
    return {
        x: Math.min(startPoint.x, endPoint.x),
        y: Math.min(startPoint.y, endPoint.y),
        width: Math.abs(endPoint.x - startPoint.x),
        height: Math.abs(endPoint.y - startPoint.y),
    };
}

function findArrowDirectionPoint(points, headLength, width, height) {
    const endPoint = toCanvasPoint(points.at(-1), width, height);
    let traversed = 0;
    let previousPoint = endPoint;

    for (let index = points.length - 2; index >= 0; index -= 1) {
        const candidate = toCanvasPoint(points[index], width, height);
        traversed += distanceBetweenPoints(previousPoint, candidate);

        if (traversed >= Math.max(12, headLength * 0.9)) {
            return candidate;
        }

        previousPoint = candidate;
    }

    return points.length > 1 ? toCanvasPoint(points[0], width, height) : null;
}

export function polylinePath(points, width, height) {
    if (!points?.length) {
        return '';
    }

    return points
        .map((point, index) => {
            const canvasPoint = toCanvasPoint(point, width, height);
            return `${index === 0 ? 'M' : 'L'} ${canvasPoint.x} ${canvasPoint.y}`;
        })
        .join(' ');
}

export function arrowHeadPath(points, strokeWidth, width, height) {
    if (!points?.length || points.length < 2) {
        return '';
    }

    const end = toCanvasPoint(points.at(-1), width, height);
    const headLength = Math.max(12, Number(strokeWidth) * 2);
    const previous = findArrowDirectionPoint(points, headLength, width, height);

    if (!previous) {
        return '';
    }

    const deltaX = end.x - previous.x;
    const deltaY = end.y - previous.y;
    const length = Math.hypot(deltaX, deltaY);

    if (!length) {
        return '';
    }

    const unitX = deltaX / length;
    const unitY = deltaY / length;
    const perpendicularX = -unitY;
    const perpendicularY = unitX;
    const wing = headLength * 0.5;
    const baseX = end.x - unitX * headLength;
    const baseY = end.y - unitY * headLength;
    const leftX = baseX + perpendicularX * wing;
    const leftY = baseY + perpendicularY * wing;
    const rightX = baseX - perpendicularX * wing;
    const rightY = baseY - perpendicularY * wing;

    return `M ${leftX} ${leftY} L ${end.x} ${end.y} L ${rightX} ${rightY}`;
}

export function svgStrokeWidth(width) {
    return Math.max(2, Number(width));
}

export function beginEditorAnnotation(state, point) {
    const normalizedPoint = {
        x: clampUnit(point.x),
        y: clampUnit(point.y),
    };

    if (state.activeTool === 'blur') {
        state.draftAnnotation = {
            id: `draft-${Date.now()}`,
            type: 'blur',
            start: normalizedPoint,
            x: normalizedPoint.x,
            y: normalizedPoint.y,
            width: 0,
            height: 0,
        };

        return;
    }

    state.draftAnnotation = {
        id: `draft-${Date.now()}`,
        type: state.activeTool,
        color: state.strokeColor,
        width: Number(state.strokeWidth),
        points: [normalizedPoint],
    };
}

export function updateEditorAnnotationDraft(state, point, frameWidth, frameHeight) {
    if (!state.draftAnnotation) {
        return;
    }

    const normalizedPoint = {
        x: clampUnit(point.x),
        y: clampUnit(point.y),
    };

    if (state.draftAnnotation.type === 'blur') {
        state.draftAnnotation = {
            ...state.draftAnnotation,
            ...normalizeBox(state.draftAnnotation.start, normalizedPoint),
        };

        return;
    }

    const lastPoint = state.draftAnnotation.points.at(-1);

    if (!lastPoint) {
        return;
    }

    const minimumDistance = Math.max(2.5, Number(state.draftAnnotation.width ?? state.strokeWidth) * 0.45);
    const lastCanvasPoint = toCanvasPoint(lastPoint, frameWidth, frameHeight);
    const nextCanvasPoint = toCanvasPoint(normalizedPoint, frameWidth, frameHeight);

    if (distanceBetweenPoints(lastCanvasPoint, nextCanvasPoint) < minimumDistance) {
        return;
    }

    state.draftAnnotation = {
        ...state.draftAnnotation,
        points: [...state.draftAnnotation.points, normalizedPoint],
    };
}

export function commitEditorAnnotationDraft(state) {
    if (!state.draftAnnotation) {
        return false;
    }

    if (state.draftAnnotation.type === 'blur') {
        const nextBlur = {
            id: state.draftAnnotation.id,
            type: 'blur',
            x: state.draftAnnotation.x,
            y: state.draftAnnotation.y,
            width: state.draftAnnotation.width,
            height: state.draftAnnotation.height,
        };

        state.draftAnnotation = null;

        if (nextBlur.width > 0.02 && nextBlur.height > 0.02) {
            state.annotations = [...state.annotations, nextBlur];
            state.redoStack = [];
            return true;
        }

        return false;
    }

    const points = state.draftAnnotation.points;
    const totalDistance = points.slice(1).reduce((distance, point, index) => {
        return distance + distanceBetweenPoints(point, points[index]);
    }, 0);

    const committed = points.length > 1 && totalDistance > 0.012;

    if (committed) {
        state.annotations = [...state.annotations, {
            id: state.draftAnnotation.id,
            type: state.draftAnnotation.type,
            color: state.draftAnnotation.color,
            width: state.draftAnnotation.width,
            points,
        }];
        state.redoStack = [];
    }

    state.draftAnnotation = null;

    return committed;
}

export function undoEditorAnnotation(state) {
    if (!state.annotations.length) {
        return;
    }

    const next = state.annotations.at(-1);
    state.annotations = state.annotations.slice(0, -1);
    state.redoStack = [next, ...state.redoStack];
}

export function redoEditorAnnotation(state) {
    if (!state.redoStack.length) {
        return;
    }

    const [next, ...rest] = state.redoStack;
    state.redoStack = rest;
    state.annotations = [...state.annotations, next];
}

export function clearEditorAnnotations(state) {
    state.annotations = [];
    state.redoStack = [];
}

async function loadImage(imageUrl) {
    return await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Unable to load screenshot image.'));
        image.src = imageUrl;
    });
}

function drawFreehandPath(context, annotation, width, height) {
    const points = annotation.points.map((point) => toCanvasPoint(point, width, height));

    if (points.length < 2) {
        return;
    }

    context.save();
    context.strokeStyle = annotation.color;
    context.lineWidth = annotation.width;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);

    for (let index = 1; index < points.length; index += 1) {
        context.lineTo(points[index].x, points[index].y);
    }

    context.stroke();

    if (annotation.type === 'arrow') {
        const headLength = Math.max(12, annotation.width * 2);
        const end = points.at(-1);
        let traversed = 0;
        let previous = end;
        let directionPoint = points[0];

        for (let index = points.length - 2; index >= 0; index -= 1) {
            const candidate = points[index];
            traversed += distanceBetweenPoints(previous, candidate);

            if (traversed >= Math.max(12, headLength * 0.9)) {
                directionPoint = candidate;
                break;
            }

            previous = candidate;
        }

        const deltaX = end.x - directionPoint.x;
        const deltaY = end.y - directionPoint.y;
        const length = Math.hypot(deltaX, deltaY);

        if (length) {
            const unitX = deltaX / length;
            const unitY = deltaY / length;
            const perpendicularX = -unitY;
            const perpendicularY = unitX;
            const wing = headLength * 0.5;
            const baseX = end.x - unitX * headLength;
            const baseY = end.y - unitY * headLength;

            context.beginPath();
            context.moveTo(baseX + perpendicularX * wing, baseY + perpendicularY * wing);
            context.lineTo(end.x, end.y);
            context.lineTo(baseX - perpendicularX * wing, baseY - perpendicularY * wing);
            context.stroke();
        }
    }

    context.restore();
}

function drawBlurRegion(context, image, annotation, width, height) {
    const x = annotation.x * width;
    const y = annotation.y * height;
    const regionWidth = annotation.width * width;
    const regionHeight = annotation.height * height;

    if (!regionWidth || !regionHeight) {
        return;
    }

    context.save();
    context.beginPath();
    context.rect(x, y, regionWidth, regionHeight);
    context.clip();
    context.filter = `blur(${Math.max(10, Math.round(Math.max(regionWidth, regionHeight) * 0.02))}px)`;
    context.drawImage(image, 0, 0, width, height);
    context.restore();

    context.save();
    context.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    context.lineWidth = 1;
    context.strokeRect(x, y, regionWidth, regionHeight);
    context.restore();
}

export async function exportEditedScreenshotBlob({ imageUrl, annotations = [] }) {
    const image = await loadImage(imageUrl);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error('Canvas rendering context is unavailable.');
    }

    context.drawImage(image, 0, 0, width, height);

    for (const annotation of annotations.filter((item) => item.type === 'blur')) {
        drawBlurRegion(context, image, annotation, width, height);
    }

    for (const annotation of annotations.filter((item) => item.type !== 'blur')) {
        drawFreehandPath(context, annotation, width, height);
    }

    return await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Unable to export edited screenshot.'));
                return;
            }

            resolve(blob);
        }, 'image/png');
    });
}
