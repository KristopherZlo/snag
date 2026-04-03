<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { ArrowUpRight, Brush, Palette, Redo2, SquareDashed, Undo2 } from 'lucide-vue-next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const props = defineProps({
    sessionKey: {
        type: String,
        required: true,
    },
});

const TOOL_OPTIONS = [
    { id: 'arrow', label: 'Arrow', icon: ArrowUpRight },
    { id: 'brush', label: 'Brush', icon: Brush },
    { id: 'blur', label: 'Blur', icon: SquareDashed },
];

const STROKE_SWATCHES = ['#ff6b6b', '#f59e0b', '#ffffff', '#60a5fa', '#4ade80'];

const frameRef = ref(null);
const activeTool = ref('arrow');
const strokeColor = ref(STROKE_SWATCHES[0]);
const strokeWidth = ref(6);
const annotations = ref([]);
const redoStack = ref([]);
const draftAnnotation = ref(null);
const canvasSize = reactive({
    width: 1600,
    height: 1000,
});

const pointerState = reactive({
    active: false,
    pointerId: null,
});

let resizeObserver = null;

const cursorClass = computed(() => (activeTool.value === 'blur' ? 'cursor-cell' : 'cursor-crosshair'));
const annotationCount = computed(() => annotations.value.length);
const canUndo = computed(() => annotations.value.length > 0);
const canRedo = computed(() => redoStack.value.length > 0);
const activeToolLabel = computed(() => TOOL_OPTIONS.find((tool) => tool.id === activeTool.value)?.label ?? 'Tool');

function clampUnit(value) {
    return Math.min(Math.max(value, 0), 1);
}

function svgStrokeWidth(width) {
    return Math.max(2, Number(width));
}

function syncCanvasSize() {
    if (!frameRef.value) {
        return;
    }

    const bounds = frameRef.value.getBoundingClientRect();

    if (bounds.width > 0 && bounds.height > 0) {
        canvasSize.width = bounds.width;
        canvasSize.height = bounds.height;
    }
}

function toCanvasPoint(point) {
    return {
        x: point.x * canvasSize.width,
        y: point.y * canvasSize.height,
    };
}

function getRelativePoint(event) {
    if (!frameRef.value) {
        return null;
    }

    const bounds = frameRef.value.getBoundingClientRect();

    return {
        x: clampUnit((event.clientX - bounds.left) / bounds.width),
        y: clampUnit((event.clientY - bounds.top) / bounds.height),
    };
}

function distanceBetweenPoints(pointA, pointB) {
    return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y);
}

function polylinePath(points) {
    if (!points?.length) {
        return '';
    }

    return points
        .map((point, index) => {
            const canvasPoint = toCanvasPoint(point);
            return `${index === 0 ? 'M' : 'L'} ${canvasPoint.x} ${canvasPoint.y}`;
        })
        .join(' ');
}

function findArrowDirectionPoint(points, headLength) {
    const endPoint = toCanvasPoint(points.at(-1));
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

function arrowHeadPath(points, width) {
    if (!points || points.length < 2) {
        return '';
    }

    const end = toCanvasPoint(points.at(-1));
    const headLength = Math.max(12, Number(width) * 2);
    const previous = findArrowDirectionPoint(points, headLength);

    if (!previous) {
        return '';
    }

    const endX = end.x;
    const endY = end.y;
    const previousX = previous.x;
    const previousY = previous.y;
    const deltaX = endX - previousX;
    const deltaY = endY - previousY;
    const length = Math.hypot(deltaX, deltaY);

    if (!length) {
        return '';
    }

    const unitX = deltaX / length;
    const unitY = deltaY / length;
    const perpendicularX = -unitY;
    const perpendicularY = unitX;
    const wing = headLength * 0.5;
    const baseX = endX - unitX * headLength;
    const baseY = endY - unitY * headLength;
    const leftX = baseX + perpendicularX * wing;
    const leftY = baseY + perpendicularY * wing;
    const rightX = baseX - perpendicularX * wing;
    const rightY = baseY - perpendicularY * wing;

    return `M ${leftX} ${leftY} L ${endX} ${endY} L ${rightX} ${rightY}`;
}

function normalizeBox(startPoint, endPoint) {
    return {
        x: Math.min(startPoint.x, endPoint.x),
        y: Math.min(startPoint.y, endPoint.y),
        width: Math.abs(endPoint.x - startPoint.x),
        height: Math.abs(endPoint.y - startPoint.y),
    };
}

function commitAnnotation(annotation) {
    annotations.value = [...annotations.value, annotation];
    redoStack.value = [];
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

function handlePointerDown(event) {
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

function handlePointerMove(event) {
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
            ...normalizeBox(draftAnnotation.value.start, point),
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

function handlePointerUp(event) {
    if (!pointerState.active || event.pointerId !== pointerState.pointerId || !draftAnnotation.value) {
        return;
    }

    if (draftAnnotation.value.type === 'blur') {
        const nextBlur = {
            id: draftAnnotation.value.id,
            type: 'blur',
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

function cleanupPointerListeners() {
    pointerState.active = false;
    pointerState.pointerId = null;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerUp);
}

function undoLast() {
    if (!annotations.value.length) {
        return;
    }

    const next = annotations.value.at(-1);

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
    <div class="space-y-4">
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
                    <input v-model="strokeColor" type="color" class="sr-only" />
                </label>
            </div>

            <div class="flex items-center gap-3 rounded-md border bg-background px-3 py-2">
                <span class="text-xs text-muted-foreground">Width</span>
                <input
                    v-model="strokeWidth"
                    type="range"
                    min="2"
                    max="18"
                    step="1"
                    class="h-1 w-24 accent-primary"
                />
                <span class="min-w-9 text-right text-sm tabular-nums">{{ strokeWidth }}px</span>
            </div>

            <Badge variant="secondary" class="ml-auto">
                {{ activeToolLabel }} - {{ annotationCount }} mark{{ annotationCount === 1 ? '' : 's' }}
            </Badge>

            <div class="flex items-center gap-2">
                <Button
                    size="icon-sm"
                    variant="outline"
                    :disabled="!canUndo"
                    title="Undo"
                    aria-label="Undo"
                    @click="undoLast"
                >
                    <Undo2 class="size-4" />
                </Button>

                <Button
                    size="icon-sm"
                    variant="outline"
                    :disabled="!canRedo"
                    title="Redo"
                    aria-label="Redo"
                    @click="redoLast"
                >
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
                class="relative aspect-[16/10] overflow-hidden rounded-lg border bg-stone-950 touch-none select-none"
                :class="cursorClass"
                @pointerdown="handlePointerDown"
            >
                <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.08),_transparent_35%),linear-gradient(180deg,_#151515_0%,_#0c0c0c_100%)]" />

                <div class="absolute inset-x-0 top-0 flex h-10 items-center gap-2 border-b border-white/10 bg-white/5 px-4">
                    <span class="size-2 rounded-full bg-[#ff6b6b]" />
                    <span class="size-2 rounded-full bg-[#ffcc66]" />
                    <span class="size-2 rounded-full bg-[#67e8a5]" />
                    <div class="ml-4 h-6 flex-1 rounded-md border border-white/10 bg-black/20" />
                </div>

                <div class="absolute inset-x-6 top-16 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_220px]">
                    <div class="space-y-4">
                        <div class="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                            <div class="mb-3 h-4 w-40 rounded bg-white/15" />
                            <div class="grid gap-3 md:grid-cols-2">
                                <div class="h-32 rounded-lg bg-[#f8fafc] p-3">
                                    <div class="mb-2 h-3 w-24 rounded bg-slate-300" />
                                    <div class="space-y-2">
                                        <div class="h-2 rounded bg-slate-200" />
                                        <div class="h-2 w-5/6 rounded bg-slate-200" />
                                        <div class="h-2 w-2/3 rounded bg-slate-200" />
                                    </div>
                                </div>
                                <div class="h-32 rounded-lg bg-[#fff7ed] p-3">
                                    <div class="mb-2 h-3 w-28 rounded bg-amber-300/70" />
                                    <div class="space-y-2">
                                        <div class="h-2 rounded bg-amber-200/80" />
                                        <div class="h-2 w-5/6 rounded bg-amber-200/80" />
                                        <div class="h-2 w-2/3 rounded bg-amber-200/80" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                            <div class="mb-3 h-4 w-52 rounded bg-white/15" />
                            <div class="space-y-3">
                                <div class="h-10 rounded-lg bg-white/6" />
                                <div class="h-10 rounded-lg bg-white/6" />
                                <div class="h-10 rounded-lg bg-white/6" />
                            </div>
                        </div>
                    </div>

                    <div class="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                        <div class="mb-3 h-4 w-24 rounded bg-white/15" />
                        <div class="space-y-3">
                            <div class="rounded-lg border border-white/10 bg-black/20 p-3">
                                <div class="mb-2 h-3 w-20 rounded bg-white/15" />
                                <div class="h-2 w-5/6 rounded bg-white/10" />
                            </div>
                            <div class="rounded-lg border border-white/10 bg-black/20 p-3">
                                <div class="mb-2 h-3 w-28 rounded bg-white/15" />
                                <div class="h-2 w-2/3 rounded bg-white/10" />
                            </div>
                        </div>
                    </div>
                </div>

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
                    <template v-for="annotation in annotations.filter((item) => item.type !== 'blur')" :key="annotation.id">
                        <path
                            :d="polylinePath(annotation.points)"
                            fill="none"
                            :stroke="annotation.color"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            :stroke-width="svgStrokeWidth(annotation.width)"
                            vector-effect="non-scaling-stroke"
                        />
                        <path
                            v-if="annotation.type === 'arrow'"
                            :d="arrowHeadPath(annotation.points, annotation.width)"
                            fill="none"
                            :stroke="annotation.color"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            :stroke-width="svgStrokeWidth(annotation.width)"
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
                            :stroke-width="svgStrokeWidth(draftAnnotation.width)"
                            stroke-dasharray="draftAnnotation.type === 'arrow' ? '2 1.5' : ''"
                            vector-effect="non-scaling-stroke"
                        />
                        <path
                            v-if="draftAnnotation.type === 'arrow'"
                            :d="arrowHeadPath(draftAnnotation.points, draftAnnotation.width)"
                            fill="none"
                            :stroke="draftAnnotation.color"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            :stroke-width="svgStrokeWidth(draftAnnotation.width)"
                            vector-effect="non-scaling-stroke"
                        />
                    </template>
                </svg>
            </div>

            <p class="text-sm text-muted-foreground">
                Use the arrow or brush like a pen. Blur keeps the box workflow for sensitive content.
            </p>
        </div>
    </div>
</template>
