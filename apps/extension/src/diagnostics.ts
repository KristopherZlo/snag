import './diagnostics.css';
import { getPendingCapture, getRecordingState } from './lib/storage';

interface DiagnosticsState {
    targetUrl: string;
    selectedTabId: string;
    status: string;
    busy: boolean;
    tabs: chrome.tabs.Tab[];
}

const state: DiagnosticsState = {
    targetUrl: '',
    selectedTabId: '',
    status: 'Pick a real browser tab and inspect the live capture state. For recorder smoke tests, start and stop the recording from the target diagnostics page so Chrome grants the tab capture invocation.',
    busy: false,
    tabs: [],
};

function rootElement(): HTMLElement {
    const root = document.getElementById('app');

    if (!root) {
        throw new Error('Diagnostics root element is missing.');
    }

    return root;
}

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function telemetryTimestamps(pendingCapture: Awaited<ReturnType<typeof getPendingCapture>>): string[] {
    if (!pendingCapture?.telemetry) {
        return [];
    }

    return [
        ...pendingCapture.telemetry.actions.map((entry) => entry.happened_at),
        ...pendingCapture.telemetry.logs.map((entry) => entry.happened_at),
        ...pendingCapture.telemetry.network_requests.map((entry) => entry.happened_at),
    ].filter((value): value is string => typeof value === 'string' && value.length > 0);
}

async function queryTabs(): Promise<chrome.tabs.Tab[]> {
    return new Promise((resolve) => {
        chrome.tabs.query({}, (tabs) => {
            const filtered = tabs.filter((tab) => {
                const url = tab.url ?? '';

                return /^https?:\/\//.test(url);
            });

            resolve(filtered);
        });
    });
}

async function sendRuntimeMessage<T>(message: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            const error = chrome.runtime.lastError;

            if (error) {
                reject(new Error(error.message));
                return;
            }

            resolve(response as T);
        });
    });
}

async function refreshTabs(): Promise<void> {
    state.tabs = await queryTabs();

    const exactMatch = state.targetUrl.trim() === ''
        ? null
        : state.tabs.find((tab) => tab.url === state.targetUrl.trim()) ?? null;

    if (exactMatch?.id) {
        state.selectedTabId = String(exactMatch.id);
    } else if (!state.tabs.some((tab) => String(tab.id ?? '') === state.selectedTabId)) {
        state.selectedTabId = state.tabs[0]?.id ? String(state.tabs[0].id) : '';
    }
}

function setBusy(busy: boolean): void {
    state.busy = busy;
    render();
}

async function refreshDiagnosticsStatus(message?: string): Promise<void> {
    const [pendingCapture, recordingState] = await Promise.all([
        getPendingCapture(),
        getRecordingState(),
    ]);

    const timestamps = telemetryTimestamps(pendingCapture);
    const firstTimestamp = timestamps[0] ?? 'n/a';
    const lastTimestamp = timestamps[timestamps.length - 1] ?? 'n/a';

    const pendingMarkup = pendingCapture
        ? `
            <div class="diag-kv-item">
                <div class="diag-kv-label">Pending capture</div>
                <div class="diag-kv-value" data-testid="diagnostics-pending-kind">${escapeHtml(pendingCapture.kind)}</div>
            </div>
            <div class="diag-kv-item">
                <div class="diag-kv-label">Title</div>
                <div class="diag-kv-value">${escapeHtml(pendingCapture.title)}</div>
            </div>
            <div class="diag-kv-item">
                <div class="diag-kv-label">Byte size</div>
                <div class="diag-kv-value" data-testid="diagnostics-pending-byte-size">${'byteSize' in pendingCapture ? pendingCapture.byteSize : 0}</div>
            </div>
            <div class="diag-kv-item">
                <div class="diag-kv-label">Duration seconds</div>
                <div class="diag-kv-value">${'durationSeconds' in pendingCapture ? pendingCapture.durationSeconds : 0}</div>
            </div>
            <div class="diag-kv-item">
                <div class="diag-kv-label">Steps</div>
                <div class="diag-kv-value" data-testid="diagnostics-actions-count">${pendingCapture.telemetry?.actions.length ?? 0}</div>
            </div>
            <div class="diag-kv-item">
                <div class="diag-kv-label">Console</div>
                <div class="diag-kv-value" data-testid="diagnostics-logs-count">${pendingCapture.telemetry?.logs.length ?? 0}</div>
            </div>
            <div class="diag-kv-item">
                <div class="diag-kv-label">Network</div>
                <div class="diag-kv-value" data-testid="diagnostics-network-count">${pendingCapture.telemetry?.network_requests.length ?? 0}</div>
            </div>
            <div class="diag-kv-item">
                <div class="diag-kv-label">First timestamp</div>
                <div class="diag-kv-value" data-testid="diagnostics-first-timestamp">${escapeHtml(firstTimestamp)}</div>
            </div>
            <div class="diag-kv-item">
                <div class="diag-kv-label">Last timestamp</div>
                <div class="diag-kv-value" data-testid="diagnostics-last-timestamp">${escapeHtml(lastTimestamp)}</div>
            </div>
        `
        : `
            <div class="diag-kv-item">
                <div class="diag-kv-label">Pending capture</div>
                <div class="diag-kv-value" data-testid="diagnostics-pending-kind">none</div>
            </div>
        `;

    const recordingMarkup = `
        <div class="diag-kv-item">
            <div class="diag-kv-label">Recorder state</div>
            <div class="diag-kv-value" data-testid="diagnostics-recording-state">${escapeHtml(recordingState.status)}</div>
        </div>
        ${recordingState.startedAt ? `
            <div class="diag-kv-item">
                <div class="diag-kv-label">Started at</div>
                <div class="diag-kv-value">${escapeHtml(recordingState.startedAt)}</div>
            </div>
        ` : ''}
    `;

    state.status = message ?? state.status;

    const root = rootElement();
    const optionsMarkup = state.tabs.map((tab) => {
        const id = String(tab.id ?? '');
        const selected = id === state.selectedTabId ? ' selected' : '';
        const label = `${tab.title ?? 'Untitled tab'} | ${tab.url ?? ''}`;

        return `<option value="${escapeHtml(id)}"${selected}>${escapeHtml(label)}</option>`;
    }).join('');

    root.innerHTML = `
        <main class="diag-shell">
            <section class="diag-card">
                <h1>Extension diagnostics</h1>
                <p>Live smoke page for real tab recording. It runs the same background and offscreen runtime used by the product, but lets you target a specific browser tab.</p>
            </section>

            <section class="diag-card">
                <div class="diag-grid">
                    <label class="diag-field">
                        <span class="diag-label">Target URL</span>
                        <input class="diag-input" data-testid="diagnostics-target-url" id="target-url" type="text" placeholder="http://127.0.0.1:8010/_diagnostics/extension-recorder" value="${escapeHtml(state.targetUrl)}" />
                    </label>
                    <label class="diag-field">
                        <span class="diag-label">Target tab</span>
                        <select class="diag-select" data-testid="diagnostics-tab-select" id="tab-select">
                            ${optionsMarkup || '<option value="">No eligible tabs found</option>'}
                        </select>
                    </label>
                </div>
                <div class="diag-actions" style="margin-top: 14px;">
                    <button class="diag-button" data-testid="diagnostics-refresh-tabs" id="refresh-tabs" type="button" ${state.busy ? 'disabled' : ''}>Refresh tabs</button>
                    <button class="diag-button" data-variant="secondary" data-testid="diagnostics-open-target" id="open-target" type="button" ${state.busy || !state.selectedTabId ? 'disabled' : ''}>Activate target tab</button>
                    <button class="diag-button" data-testid="diagnostics-start-recording" id="start-recording" type="button" ${state.busy || !state.selectedTabId ? 'disabled' : ''}>Start live recording</button>
                    <button class="diag-button" data-variant="secondary" data-testid="diagnostics-stop-recording" id="stop-recording" type="button" ${state.busy ? 'disabled' : ''}>Stop live recording</button>
                </div>
                <div class="diag-status" data-testid="diagnostics-status" style="margin-top: 14px;">${escapeHtml(state.status)}</div>
            </section>

            <section class="diag-grid">
                <section class="diag-card">
                    <h2>Recorder state</h2>
                    <div class="diag-kv">
                        ${recordingMarkup}
                    </div>
                </section>
                <section class="diag-card">
                    <h2>Pending capture</h2>
                    <div class="diag-kv">
                        ${pendingMarkup}
                    </div>
                </section>
            </section>
        </main>
    `;

    wireUi();
}

async function refreshAll(message?: string): Promise<void> {
    await refreshTabs();
    await refreshDiagnosticsStatus(message);
}

async function activateSelectedTab(): Promise<void> {
    if (!state.selectedTabId) {
        return;
    }

    await chrome.tabs.update(Number(state.selectedTabId), { active: true });
}

async function startRecording(): Promise<void> {
    if (!state.selectedTabId) {
        throw new Error('Select a target tab first.');
    }

    const response = await sendRuntimeMessage<{ ok: boolean; message?: string }>({
        type: 'start-video-recording',
        tabId: Number(state.selectedTabId),
    });

    if (!response.ok) {
        throw new Error(response.message ?? 'Unable to start live recording.');
    }
}

async function stopRecording(): Promise<void> {
    const response = await sendRuntimeMessage<{ ok: boolean; message?: string }>({
        type: 'stop-video-recording',
    });

    if (!response.ok) {
        throw new Error(response.message ?? 'Unable to stop live recording.');
    }
}

function wireUi(): void {
    const targetUrlInput = document.getElementById('target-url') as HTMLInputElement | null;
    const tabSelect = document.getElementById('tab-select') as HTMLSelectElement | null;

    targetUrlInput?.addEventListener('input', (event) => {
        state.targetUrl = (event.target as HTMLInputElement).value;
    });

    tabSelect?.addEventListener('change', (event) => {
        state.selectedTabId = (event.target as HTMLSelectElement).value;
    });

    document.getElementById('refresh-tabs')?.addEventListener('click', async () => {
        setBusy(true);

        try {
            await refreshAll('Tab list refreshed.');
        } catch (error) {
            state.status = error instanceof Error ? error.message : 'Unable to refresh tabs.';
            render();
        } finally {
            setBusy(false);
        }
    });

    document.getElementById('open-target')?.addEventListener('click', async () => {
        setBusy(true);

        try {
            await activateSelectedTab();
            await refreshAll('Target tab activated.');
        } catch (error) {
            state.status = error instanceof Error ? error.message : 'Unable to activate target tab.';
            render();
        } finally {
            setBusy(false);
        }
    });

    document.getElementById('start-recording')?.addEventListener('click', async () => {
        setBusy(true);

        try {
            await startRecording();
            await refreshAll('Live recording started. Interact with the target page, then stop recording.');
        } catch (error) {
            state.status = error instanceof Error ? error.message : 'Unable to start live recording.';
            render();
        } finally {
            setBusy(false);
        }
    });

    document.getElementById('stop-recording')?.addEventListener('click', async () => {
        setBusy(true);

        try {
            await stopRecording();
            await refreshAll('Live recording stopped. Pending capture and telemetry snapshot refreshed.');
        } catch (error) {
            state.status = error instanceof Error ? error.message : 'Unable to stop live recording.';
            render();
        } finally {
            setBusy(false);
        }
    });
}

function render(): void {
    void refreshDiagnosticsStatus();
}

void refreshAll();
