export interface CaptureTelemetryContext {
    url: string;
    title: string;
    user_agent: string;
    platform: string;
    language: string;
    timezone: string;
    viewport: {
        width: number;
        height: number;
    };
    screen: {
        width: number;
        height: number;
    };
    referrer: string | null;
    selection?: string;
}

export interface CaptureTelemetryAction {
    type: string;
    label?: string | null;
    selector?: string | null;
    value?: string | null;
    payload?: Record<string, unknown>;
    happened_at?: string | null;
}

export interface CaptureTelemetryLog {
    level: string;
    message: string;
    context?: Record<string, unknown>;
    happened_at?: string | null;
}

export interface CaptureTelemetryNetworkRequest {
    method: string;
    url: string;
    status_code?: number | null;
    duration_ms?: number | null;
    request_headers?: Record<string, string>;
    response_headers?: Record<string, string>;
    meta?: Record<string, unknown>;
    happened_at?: string | null;
}

export interface CaptureTelemetrySnapshot {
    context: CaptureTelemetryContext | null;
    actions: CaptureTelemetryAction[];
    logs: CaptureTelemetryLog[];
    network_requests: CaptureTelemetryNetworkRequest[];
}

export function emptyTelemetrySnapshot(): CaptureTelemetrySnapshot {
    return {
        context: null,
        actions: [],
        logs: [],
        network_requests: [],
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeStringRecord(value: unknown): Record<string, string> | undefined {
    if (!isRecord(value)) {
        return undefined;
    }

    return Object.entries(value).reduce<Record<string, string>>((carry, [key, entry]) => {
        if (typeof entry === 'string') {
            carry[key] = entry;
        }

        return carry;
    }, {});
}

export function normalizeTelemetryContext(value: unknown): CaptureTelemetryContext | null {
    if (!isRecord(value)) {
        return null;
    }

    const viewport = isRecord(value.viewport)
        ? {
            width: typeof value.viewport.width === 'number' ? value.viewport.width : 0,
            height: typeof value.viewport.height === 'number' ? value.viewport.height : 0,
        }
        : {
            width: 0,
            height: 0,
        };
    const screen = isRecord(value.screen)
        ? {
            width: typeof value.screen.width === 'number' ? value.screen.width : 0,
            height: typeof value.screen.height === 'number' ? value.screen.height : 0,
        }
        : {
            width: 0,
            height: 0,
        };

    return {
        url: typeof value.url === 'string' ? value.url : '',
        title: typeof value.title === 'string' ? value.title : '',
        user_agent: typeof value.user_agent === 'string' ? value.user_agent : '',
        platform: typeof value.platform === 'string' ? value.platform : '',
        language: typeof value.language === 'string' ? value.language : '',
        timezone: typeof value.timezone === 'string' ? value.timezone : '',
        viewport,
        screen,
        referrer: typeof value.referrer === 'string' ? value.referrer : null,
        selection: typeof value.selection === 'string' ? value.selection : undefined,
    };
}

export function normalizeTelemetryAction(value: unknown): CaptureTelemetryAction | null {
    if (!isRecord(value) || typeof value.type !== 'string') {
        return null;
    }

    return {
        type: value.type,
        label: typeof value.label === 'string' ? value.label : null,
        selector: typeof value.selector === 'string' ? value.selector : null,
        value: typeof value.value === 'string' ? value.value : null,
        payload: isRecord(value.payload) ? value.payload : undefined,
        happened_at: typeof value.happened_at === 'string' ? value.happened_at : null,
    };
}

export function normalizeTelemetryLog(value: unknown): CaptureTelemetryLog | null {
    if (!isRecord(value) || typeof value.level !== 'string' || typeof value.message !== 'string') {
        return null;
    }

    return {
        level: value.level,
        message: value.message,
        context: isRecord(value.context) ? value.context : undefined,
        happened_at: typeof value.happened_at === 'string' ? value.happened_at : null,
    };
}

export function normalizeTelemetryNetworkRequest(value: unknown): CaptureTelemetryNetworkRequest | null {
    if (!isRecord(value) || typeof value.method !== 'string' || typeof value.url !== 'string') {
        return null;
    }

    return {
        method: value.method,
        url: value.url,
        status_code: typeof value.status_code === 'number' ? value.status_code : null,
        duration_ms: typeof value.duration_ms === 'number' ? value.duration_ms : null,
        request_headers: normalizeStringRecord(value.request_headers),
        response_headers: normalizeStringRecord(value.response_headers),
        meta: isRecord(value.meta) ? value.meta : undefined,
        happened_at: typeof value.happened_at === 'string' ? value.happened_at : null,
    };
}

export function normalizeTelemetrySnapshot(value: unknown): CaptureTelemetrySnapshot | null {
    if (!isRecord(value)) {
        return null;
    }

    return {
        context: normalizeTelemetryContext(value.context),
        actions: Array.isArray(value.actions)
            ? value.actions
                .map((entry) => normalizeTelemetryAction(entry))
                .filter((entry): entry is CaptureTelemetryAction => entry !== null)
            : [],
        logs: Array.isArray(value.logs)
            ? value.logs
                .map((entry) => normalizeTelemetryLog(entry))
                .filter((entry): entry is CaptureTelemetryLog => entry !== null)
            : [],
        network_requests: Array.isArray(value.network_requests)
            ? value.network_requests
                .map((entry) => normalizeTelemetryNetworkRequest(entry))
                .filter((entry): entry is CaptureTelemetryNetworkRequest => entry !== null)
            : [],
    };
}
