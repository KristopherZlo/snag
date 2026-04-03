import type {
    CaptureTelemetryAction,
    CaptureTelemetryContext,
    CaptureTelemetryLog,
    CaptureTelemetryNetworkRequest,
    CaptureTelemetrySnapshot,
} from './capture-telemetry';
import { emptyTelemetrySnapshot } from './capture-telemetry';
import {
    redactTelemetryAction,
    redactTelemetryContext,
    redactTelemetryLog,
    redactTelemetryNetworkRequest,
} from './telemetry-redaction';

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
        this.state = emptyTelemetrySnapshot();
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
        const sanitizedAction = redactTelemetryAction(action);
        const previousAction = this.state.actions.at(-1);

        if (
            sanitizedAction.type === 'input'
            && previousAction?.type === 'input'
            && previousAction.selector
            && previousAction.selector === sanitizedAction.selector
        ) {
            const previousCount = Number(previousAction.payload?.event_count ?? 1);
            previousAction.happened_at = sanitizedAction.happened_at ?? previousAction.happened_at;
            previousAction.label = sanitizedAction.label ?? previousAction.label;
            previousAction.value = sanitizedAction.value ?? previousAction.value;
            previousAction.payload = {
                ...previousAction.payload,
                ...sanitizedAction.payload,
                event_count: previousCount + 1,
            };
            this.persist();

            return;
        }

        this.state.actions.push(sanitizedAction);
        this.trimCollection(this.state.actions, maxActions);
        this.persist();
    }

    public recordLog(log: CaptureTelemetryLog): void {
        this.state.logs.push(redactTelemetryLog(log));
        this.trimCollection(this.state.logs, maxLogs);
        this.persist();
    }

    public recordNetworkRequest(request: CaptureTelemetryNetworkRequest): void {
        this.state.network_requests.push(redactTelemetryNetworkRequest(request));
        this.trimCollection(this.state.network_requests, maxNetworkRequests);
        this.persist();
    }

    public updateContext(context: Partial<CaptureTelemetryContext>): void {
        this.state.context = redactTelemetryContext({
            ...(this.state.context ?? this.captureContext()),
            ...context,
        }) as CaptureTelemetryContext;
        this.persist();
    }

    private syncContext(): void {
        this.state.context = redactTelemetryContext({
            ...(this.state.context ?? {}),
            ...this.captureContext(),
        }) as CaptureTelemetryContext;
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
        };
    }

    private persist(): void {
        // Keep telemetry inside the extension's isolated content-script runtime.
    }

    private trimCollection<T>(collection: T[], maxItems: number): void {
        while (collection.length > maxItems) {
            collection.shift();
        }
    }
}
