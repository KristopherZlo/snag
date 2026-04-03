import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ContentTelemetryRecorder } from './content-telemetry-recorder';

describe('ContentTelemetryRecorder', () => {
    beforeEach(() => {
        window.sessionStorage.clear();
        document.body.innerHTML = '<button id="submit">Submit</button>';
    });

    afterEach(() => {
        window.sessionStorage.clear();
    });

    it('starts a session and aggregates repeated input actions', () => {
        const recorder = new ContentTelemetryRecorder();

        const started = recorder.startSession();

        recorder.recordAction({
            type: 'input',
            label: 'Type into field',
            selector: '#email',
            value: 'a',
            payload: {
                event_count: 1,
                field_length: 1,
            },
            happened_at: '2026-03-31T12:00:01Z',
        });
        recorder.recordAction({
            type: 'input',
            label: 'Type into field',
            selector: '#email',
            value: 'abc',
            payload: {
                event_count: 1,
                field_length: 3,
            },
            happened_at: '2026-03-31T12:00:02Z',
        });

        const snapshot = recorder.snapshot(false);

        expect(started.actions).toHaveLength(1);
        expect(snapshot.actions).toHaveLength(2);
        expect(snapshot.actions[1]).toMatchObject({
            type: 'input',
            selector: '#email',
            value: 'abc',
            payload: {
                event_count: 2,
                field_length: 3,
            },
        });
        expect(window.sessionStorage.getItem('__snagTelemetryStore__')).toBeNull();
    });

    it('clears in-memory telemetry when a reset snapshot is requested without writing page storage', () => {
        const recorder = new ContentTelemetryRecorder();

        recorder.recordLog({
            level: 'error',
            message: 'Boom',
            happened_at: '2026-03-31T12:00:01Z',
        });

        const snapshot = recorder.snapshot(true);

        expect(snapshot.logs).toHaveLength(1);
        expect(recorder.snapshot(false).logs).toHaveLength(0);
        expect(window.sessionStorage.getItem('__snagTelemetryStore__')).toBeNull();
    });
});
