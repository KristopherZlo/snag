<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { ArrowUpRight, Brush, Palette, Redo2, SquareDashed, Undo2 } from 'lucide-vue-next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type FreehandAnnotation = {
    id: string;
    type: 'arrow' | 'brush';
    color: string;
    width: number;
    points: Array<{ x: number; y: number }>;
};

type BlurAnnotation = {
    id: string;
    type: 'blur';
    start?: { x: number; y: number };
    x: number;
    y: number;
    width: number;
    height: number;
};

type Annotation = FreehandAnnotation | BlurAnnotation;

const props = defineProps<{
    imageUrl: string;
    sessionKey: string;
}>();

const TOOL_OPTIONS = [
    { id: 'arrow', label: 'Arrow', icon: ArrowUpRight },
    { id: 'brush', label: 'Brush', icon: Brush },
    { id: 'blur', label: 'Blur', icon: SquareDashed },
] as const;

const STROKE_SWATCHES = ['#ff6b6b', '#f59e0b', '#ffffff', '#60a5fa', '#4ade80'];

const frameRef = ref<HTMLElement | null>(null);
const imageRef = ref<HTMLImageElement | null>(null);
const activeTool = ref<'arrow' | 'brush' | 'blur'>('arrow');
const strokeColor = ref(STROKE_SWATCHES[0]);
const strokeWidth = ref(6);
const annotations = ref<Annotation[]>([]);
const redoStack = ref<Annotation[]>([]);
const draftAnnotation = ref<Annotation | null>(null);
const canvasSize = reactive({
    width: 1600,
    height: 1000,
});

const pointerState = reactive({
    active: false,
    pointerId: null as number | null,
});

let resizeObserver: ResizeObserver | null = null;

const cursorClass = computed(() => (activeTool.value === 'blur' ? 'cursor-cell' : 'cursor-crosshair'));
const annotationCount = computed(() => annotations.value.length);
const canUndo = computed(() => annotations.value.length > 0);
const canRedo = computed(() => redoStack.value.length > 0);
const activeToolLabel = computed(() => TOOL_OPTIONS.find((tool) => tool.id === activeTool.value)?.label ?? 'Tool');

function clampUnit(value: number): number {
    return Math.min(Math.max(value, 0), 1);
}

function syncCanvasSize(): void {
    if (!frameRef.value) {
        return;
    }

    const bounds = frameRef.value.getBoundingClientRect();

    if (bounds.width > 0 && bounds.height > 0) {
        canvasSize.width = bounds.width;
        canvasSize.height = bounds.height;
    }
}

function toCanvasPoint(point: { x: number; y: number }, width = canvasSize.width, height = canvasSize.height) {
    return {
        x: point.x * width,
        y: point.y * height,
    };
}

function getRelativePoint(event: PointerEvent) {
    if (!frameRef.value) {
        return null;
    }

    const bounds = frameRef.value.getBoundingClientRect();

    return {
        x: clampUnit((event.clientX - bounds.left) / bounds.width),
        y: clampUnit((event.clientY - bounds.top) / bounds.height),
    };
}

function distanceBetweenPoints(pointA: { x: number; y: number }, pointB: { x: number; y: number }) {
    return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y);
}

function polylinePath(points: Array<{ x: number; y: number }>) {
    if (!points.length) {
        return '';
    }

    return points
        .map((point, index) => {
            const canvasPoint = toCanvasPoint(point);
            return `${index === 0 ? 'M' : 'L'} ${canvasPoint.x} ${canvasPoint.y}`;
        })
        .join(' ');
}

function findArrowDirectionPoint(points: Array<{ x: number; y: number }>, headLength: number) {
    const endPoint = toCanvasPoint(points.at(-1)!);
    let traversed = 0;
    let previousPoint = endPoint;

    for (let index = points.length - 2; index >= 0; index -= 1) {
        const candidate = toCanvasPoint(points[index]);
        traversed += distanceBetweenPoints(previousPoint, candidate);

        if (traversed >= Math.max(12, headLength * 0.9)) {
            return candidate;
        }

        previousPoint = candidate;
    }

    return points.length > 1 ? toCanvasPoint(points[0]) : null;
}

function arrowHeadPath(points: Array<{ x: number; y: number }>, width: number) {
    if (points.length < 2) {
        return '';
    }

    const end = toCanvasPoint(points.at(-1)!);
    const headLength = Math.max(12, Number(width) * 2);
    const previous = findArrowDirectionPoint(points, headLength);

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

function normalizeBox(startPoint: { x: number; y: number }, endPoint: { x: number; y: number }) {
    return {
        x: Math.min(startPoint.x, endPoint.x),
        y: Math.min(startPoint.y, endPoint.y),
        width: Math.abs(endPoint.x - startPoint.x),
        height: Math.abs(endPoint.y - startPoint.y),
    };
}

function commitAnnotation(annotation: Annotation) {
    annotations.value = [...annotations.value, annotation];
    redoStack.value = [];
}

function cleanupPointerListeners() {
    pointerState.active = false;
    pointerState.pointerId = null;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerUp);
}

function resetEditor() {
    annotations.value = [];
    redoStack.value = [];
    draftAnnotation.value = null;
    activeTool.value = 'arrow';
    strokeColor.value = STROKE_SWATCHES[0];
    strokeWidth.value = 6;
    cleanupPointerListeners();
}

function handlePointerDown(event: PointerEvent) {
    if (event.button !== 0) {
        return;
    }

    const point = getRelativePoint(event);

    if (!point) {
        return;
    }

    pointerState.active = true;
    pointerState.pointerId = event.pointerId;

    if (activeTool.value === 'blur') {
        draftAnnotation.value = {
            id: `draft-${Date.now()}`,
            type: 'blur',
            start: point,
            x: point.x,
            y: point.y,
            width: 0,
            height: 0,
        };
    } else {
        draftAnnotation.value = {
            id: `draft-${Date.now()}`,
            type: activeTool.value,
            color: strokeColor.value,
            width: Number(strokeWidth.value),
            points: [point],
        };
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
}

function handlePointerMove(event: PointerEvent) {
    if (!pointerState.active || event.pointerId !== pointerState.pointerId || !draftAnnotation.value) {
        return;
    }

    const point = getRelativePoint(event);

    if (!point) {
        return;
    }

    if (draftAnnotation.value.type === 'blur') {
        draftAnnotation.value = {
            ...draftAnnotation.value,
            ...normalizeBox(draftAnnotation.value.start!, point),
        };

        return;
    }

    const lastPoint = draftAnnotation.value.points.at(-1);

    if (!lastPoint) {
        return;
    }

    const minimumDistance = Math.max(2.5, Number(draftAnnotation.value.width ?? strokeWidth.value) * 0.45);

    if (distanceBetweenPoints(toCanvasPoint(lastPoint), toCanvasPoint(point)) < minimumDistance) {
        return;
    }

    draftAnnotation.value = {
        ...draftAnnotation.value,
        points: [...draftAnnotation.value.points, point],
    };
}

function handlePointerUp(event: PointerEvent) {
    if (!pointerState.active || event.pointerId !== pointerState.pointerId || !draftAnnotation.value) {
        return;
    }

    if (draftAnnotation.value.type === 'blur') {
        const nextBlur = {
            id: draftAnnotation.value.id,
            type: 'blur' as const,
            x: draftAnnotation.value.x,
            y: draftAnnotation.value.y,
            width: draftAnnotation.value.width,
            height: draftAnnotation.value.height,
        };

        if (nextBlur.width > 0.02 && nextBlur.height > 0.02) {
            commitAnnotation(nextBlur);
        }
    } else {
        const points = draftAnnotation.value.points;
        const totalDistance = points.slice(1).reduce((distance, point, index) => {
            return distance + distanceBetweenPoints(point, points[index]);
        }, 0);

        if (points.length > 1 && totalDistance > 0.012) {
            commitAnnotation({
                id: draftAnnotation.value.id,
                type: draftAnnotation.value.type,
                color: draftAnnotation.value.color,
                width: draftAnnotation.value.width,
                points,
            });
        }
    }

    draftAnnotation.value = null;
    cleanupPointerListeners();
}

function undoLast() {
    if (!annotations.value.length) {
        return;
    }

    const next = annotations.value.at(-1)!;

    annotations.value = annotations.value.slice(0, -1);
    redoStack.value = [next, ...redoStack.value];
}

function redoLast() {
    if (!redoStack.value.length) {
        return;
    }

    const [next, ...rest] = redoStack.value;

    redoStack.value = rest;
    annotations.value = [...annotations.value, next];
}

function clearAll() {
    annotations.value = [];
    redoStack.value = [];
}

function drawFreehandPath(
    context: CanvasRenderingContext2D,
    annotation: FreehandAnnotation,
    width: number,
    height: number,
) {
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
        const end = points.at(-1)!;
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

function drawBlurRegion(
    context: CanvasRenderingContext2D,
    image: CanvasImageSource,
    annotation: BlurAnnotation,
    width: number,
    height: number,
) {
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

async function exportBlob(): Promise<Blob> {
    const image = imageRef.value;

    if (!image) {
        throw new Error('Screenshot image is unavailable.');
    }

    if (!image.complete) {
        await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject(new Error('Unable to load screenshot image.'));
        });
    }

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

    for (const annotation of annotations.value.filter((item): item is BlurAnnotation => item.type === 'blur')) {
        drawBlurRegion(context, image, annotation, width, height);
    }

    for (const annotation of annotations.value.filter((item): item is FreehandAnnotation => item.type !== 'blur')) {
        drawFreehandPath(context, annotation, width, height);
    }

    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Unable to export edited screenshot.'));
                return;
            }

            resolve(blob);
        }, 'image/png');
    });
}

defineExpose({
    exportBlob,
});

watch(() => props.sessionKey, resetEditor, { immediate: true });

onMounted(() => {
    syncCanvasSize();

    resizeObserver = new ResizeObserver(() => {
        syncCanvasSize();
    });

    if (frameRef.value) {
        resizeObserver.observe(frameRef.value);
    }
});

onBeforeUnmount(() => {
    resizeObserver?.disconnect();
    cleanupPointerListeners();
});
</script>

<template>
    <div class="snag-extension-editor space-y-4">
        <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-2">
                <Button
                    v-for="tool in TOOL_OPTIONS"
                    :key="tool.id"
                    size="icon-sm"
                    :variant="activeTool === tool.id ? 'default' : 'outline'"
                    :title="tool.label"
                    :aria-label="tool.label"
                    :aria-pressed="activeTool === tool.id"
                    @click="activeTool = tool.id"
                >
                    <component :is="tool.icon" class="size-4" />
                </Button>
            </div>

            <div class="flex items-center gap-2">
                <button
                    v-for="color in STROKE_SWATCHES"
                    :key="color"
                    type="button"
                    class="flex size-6 items-center justify-center rounded-full border border-border transition-transform hover:scale-105"
                    :class="strokeColor === color ? 'ring-2 ring-ring ring-offset-2 ring-offset-background' : ''"
                    :style="{ backgroundColor: color }"
                    :title="`Select ${color}`"
                    @click="strokeColor = color"
                >
                    <span class="sr-only">Select color {{ color }}</span>
                </button>

                <label class="flex size-8 cursor-pointer items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
                    <Palette class="size-4" />
                    <input v-model="strokeColor" type="color" class="sr-only">
                </label>
            </div>

            <div class="flex items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2">
                <span class="text-xs text-muted-foreground">Width</span>
                <input
                    v-model="strokeWidth"
                    type="range"
                    min="2"
                    max="18"
                    step="1"
                    class="h-1 w-24 accent-primary"
                >
                <span class="min-w-9 text-right text-sm tabular-nums">{{ strokeWidth }}px</span>
            </div>

            <Badge variant="secondary" class="ml-auto">
                {{ activeToolLabel }} - {{ annotationCount }} mark{{ annotationCount === 1 ? '' : 's' }}
            </Badge>

            <div class="flex items-center gap-2">
                <Button size="icon-sm" variant="outline" :disabled="!canUndo" title="Undo" aria-label="Undo" @click="undoLast">
                    <Undo2 class="size-4" />
                </Button>

                <Button size="icon-sm" variant="outline" :disabled="!canRedo" title="Redo" aria-label="Redo" @click="redoLast">
                    <Redo2 class="size-4" />
                </Button>

                <Button size="sm" variant="outline" :disabled="!canUndo" @click="clearAll">
                    Clear
                </Button>
            </div>
        </div>

        <div class="space-y-2">
            <div
                ref="frameRef"
                class="relative aspect-[16/10] overflow-hidden rounded-lg border bg-black/90 touch-none select-none"
                :class="cursorClass"
                @pointerdown="handlePointerDown"
            >
                <img
                    ref="imageRef"
                    :src="imageUrl"
                    alt="Captured screenshot"
                    class="absolute inset-0 h-full w-full object-cover"
                    draggable="false"
                >

                <div
                    v-for="annotation in annotations.filter((item) => item.type === 'blur')"
                    :key="annotation.id"
                    class="absolute rounded-md border border-white/25 bg-white/10 backdrop-blur-md"
                    :style="{
                        left: `${annotation.x * 100}%`,
                        top: `${annotation.y * 100}%`,
                        width: `${annotation.width * 100}%`,
                        height: `${annotation.height * 100}%`,
                    }"
                />

                <div
                    v-if="draftAnnotation?.type === 'blur'"
                    class="absolute rounded-md border border-white/25 bg-white/10 backdrop-blur-md"
                    :style="{
                        left: `${draftAnnotation.x * 100}%`,
                        top: `${draftAnnotation.y * 100}%`,
                        width: `${draftAnnotation.width * 100}%`,
                        height: `${draftAnnotation.height * 100}%`,
                    }"
                />

                <svg class="absolute inset-0 h-full w-full" :viewBox="`0 0 ${canvasSize.width} ${canvasSize.height}`">
                    <template v-for="annotation in annotations.filter((item): item is FreehandAnnotation => item.type !== 'blur')" :key="annotation.id">
                        <path
                            :d="polylinePath(annotation.points)"
                            fill="none"
                            :stroke="annotation.color"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            :stroke-width="Math.max(2, Number(annotation.width))"
                            vector-effect="non-scaling-stroke"
                        />
                        <path
                            v-if="annotation.type === 'arrow'"
                            :d="arrowHeadPath(annotation.points, annotation.width)"
                            fill="none"
                            :stroke="annotation.color"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            :stroke-width="Math.max(2, Number(annotation.width))"
                            vector-effect="non-scaling-stroke"
                        />
                    </template>

                    <template v-if="draftAnnotation?.type === 'arrow' || draftAnnotation?.type === 'brush'">
                        <path
                            :d="polylinePath(draftAnnotation.points)"
                            fill="none"
                            :stroke="draftAnnotation.color"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            :stroke-width="Math.max(2, Number(draftAnnotation.width))"
                            vector-effect="non-scaling-stroke"
                        />
                        <path
                            v-if="draftAnnotation.type === 'arrow'"
                            :d="arrowHeadPath(draftAnnotation.points, draftAnnotation.width)"
                            fill="none"
                            :stroke="draftAnnotation.color"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            :stroke-width="Math.max(2, Number(draftAnnotation.width))"
                            vector-effect="non-scaling-stroke"
                        />
                    </template>
                </svg>
            </div>

            <p class="text-sm text-muted-foreground">
                Arrow and brush follow freehand strokes. Blur keeps a boxed redaction workflow for sensitive data.
            </p>
        </div>
    </div>
</template>
