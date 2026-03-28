import type {
    CaptureTelemetryAction,
    CaptureTelemetryContext,
    CaptureTelemetryLog,
    CaptureTelemetryNetworkRequest,
    CaptureTelemetrySnapshot,
} from './capture-telemetry';
import { emptyTelemetrySnapshot } from './capture-telemetry';

const telemetryStorageKey = '__snagTelemetryStore__';
const maxActions = 200;
const maxLogs = 150;
const maxNetworkRequests = 200;

interface StoredTelemetryState {
    context: CaptureTelemetryContext | null;
    actions: CaptureTelemetryAction[];
    logs: CaptureTelemetryLog[];
    network_requests: CaptureTelemetryNetworkRequest[];
}

export class ContentTelemetryRecorder {
    private state: StoredTelemetryState;

    public constructor() {
        this.state = this.read();
        this.syncContext();
    }

    public startSession(): CaptureTelemetrySnapshot {
        this.state = emptyTelemetrySnapshot();
        this.syncContext();
        this.recordAction({
            type: 'capture_session_started',
            label: 'Start capture session',
            selector: null,
            value: window.location.href,
            payload: {
                title: document.title,
            },
            happened_at: new Date().toISOString(),
        });

        return this.snapshot(false);
    }

    public snapshot(reset: boolean): CaptureTelemetrySnapshot {
        this.syncContext();

        const snapshot: CaptureTelemetrySnapshot = {
            context: this.state.context,
            actions: [...this.state.actions],
            logs: [...this.state.logs],
            network_requests: [...this.state.network_requests],
        };

        if (reset) {
            this.state = emptyTelemetrySnapshot();
            this.persist();
        }

        return snapshot;
    }

    public recordAction(action: CaptureTelemetryAction): void {
        const previousAction = this.state.actions.at(-1);

        if (
            action.type === 'input'
            && previousAction?.type === 'input'
            && previousAction.selector
            && previousAction.selector === action.selector
        ) {
            const previousCount = Number(previousAction.payload?.event_count ?? 1);
            previousAction.happened_at = action.happened_at ?? previousAction.happened_at;
            previousAction.label = action.label ?? previousAction.label;
            previousAction.value = action.value ?? previousAction.value;
            previousAction.payload = {
                ...previousAction.payload,
                ...action.payload,
                event_count: previousCount + 1,
            };
            this.persist();

            return;
        }

        this.state.actions.push(action);
        this.trimCollection(this.state.actions, maxActions);
        this.persist();
    }

    public recordLog(log: CaptureTelemetryLog): void {
        this.state.logs.push(log);
        this.trimCollection(this.state.logs, maxLogs);
        this.persist();
    }

    public recordNetworkRequest(request: CaptureTelemetryNetworkRequest): void {
        this.state.network_requests.push(request);
        this.trimCollection(this.state.network_requests, maxNetworkRequests);
        this.persist();
    }

    public updateContext(context: Partial<CaptureTelemetryContext>): void {
        this.state.context = {
            ...(this.state.context ?? this.captureContext()),
            ...context,
        };
        this.persist();
    }

    private syncContext(): void {
        this.state.context = {
            ...(this.state.context ?? {}),
            ...this.captureContext(),
            selection: window.getSelection()?.toString().trim() ?? '',
        };
        this.persist();
    }

    private captureContext(): CaptureTelemetryContext {
        return {
            url: window.location.href,
            title: document.title,
            user_agent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
            },
            screen: {
                width: window.screen.width,
                height: window.screen.height,
            },
            referrer: document.referrer || null,
            selection: window.getSelection()?.toString().trim() ?? '',
        };
    }

    private read(): StoredTelemetryState {
        try {
            const raw = window.sessionStorage.getItem(telemetryStorageKey);

            if (!raw) {
                return emptyTelemetrySnapshot();
            }

            const decoded = JSON.parse(raw) as StoredTelemetryState;

            return {
                context: decoded.context ?? null,
                actions: Array.isArray(decoded.actions) ? decoded.actions : [],
                logs: Array.isArray(decoded.logs) ? decoded.logs : [],
                network_requests: Array.isArray(decoded.network_requests) ? decoded.network_requests : [],
            };
        } catch {
            return emptyTelemetrySnapshot();
        }
    }

    private persist(): void {
        try {
            window.sessionStorage.setItem(telemetryStorageKey, JSON.stringify(this.state));
        } catch {
            // Ignore restricted contexts and quota failures. The current
            // in-memory snapshot still lets the user submit the capture.
        }
    }

    private trimCollection<T>(collection: T[], maxItems: number): void {
        while (collection.length > maxItems) {
            collection.shift();
        }
    }
}
