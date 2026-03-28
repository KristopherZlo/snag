import { SnagCaptureClient } from '@snag/capture-core';
import { KeyValueList, SectionCard, ensureUiStyles } from '@snag/ui';
import { createApp, defineComponent, h, onMounted, reactive } from 'vue';
import { buildApiUrl, defaultApiBaseUrl, normalizeApiBaseUrl, readApiError, rememberApiBaseUrl } from './lib/api-base-url';
import { queryActiveTab, requestPageContext, sendRuntimeMessage } from './lib/chrome';
import { emptyTelemetrySnapshot } from './lib/capture-telemetry';
import { readPendingCaptureMedia } from './lib/pending-capture-media';
import {
    clearSession,
    getPendingCapture,
    getRecordingState,
    getSession,
    setSession,
    type ExtensionSession,
    type PendingCapture,
    type RecordingState,
} from './lib/storage';

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const response = await fetch(dataUrl);
    return response.blob();
}

export const PopupRoot = defineComponent({
    name: 'PopupRoot',
    setup: () => {
        ensureUiStyles(document);

        const state = reactive({
            apiBaseUrl: defaultApiBaseUrl(),
            code: '',
            deviceName: 'Chromium extension',
            summary: '',
            status: 'Connect the extension and capture the current tab.',
            busy: false,
            session: null as ExtensionSession | null,
            pendingCapture: null as PendingCapture | null,
            recordingState: { status: 'idle' } as RecordingState,
        });

        const refreshState = async () => {
            try {
                const session = await getSession();
                state.pendingCapture = await getPendingCapture();
                state.recordingState = await getRecordingState();

                if (session) {
                    const apiBaseUrl = normalizeApiBaseUrl(session.apiBaseUrl);

                    state.session = {
                        ...session,
                        apiBaseUrl,
                    };
                    state.apiBaseUrl = apiBaseUrl;
                    return;
                }

                state.session = null;
            } catch (error) {
                state.session = null;
                state.pendingCapture = null;
                state.recordingState = { status: 'idle' };
                state.status = error instanceof Error ? error.message : 'Unable to read extension storage.';
            }
        };

        onMounted(() => {
            void refreshState();
        });

        const connect = async () => {
            state.busy = true;

            try {
                const apiBaseUrl = normalizeApiBaseUrl(state.apiBaseUrl);
                const response = await fetch(buildApiUrl(apiBaseUrl, '/api/v1/extension/tokens/exchange'), {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        code: state.code,
                        device_name: state.deviceName,
                    }),
                });

                if (!response.ok) {
                    throw new Error(await readApiError(response, apiBaseUrl));
                }

                const payload = (await response.json()) as ExtensionSession;
                await setSession({ ...payload, apiBaseUrl });
                rememberApiBaseUrl(apiBaseUrl);
                state.apiBaseUrl = apiBaseUrl;
                state.status = `Connected to ${payload.organization.name}.`;
                state.code = '';
                await refreshState();
            } catch (error) {
                state.status = error instanceof Error ? error.message : 'Unable to connect extension.';
            } finally {
                state.busy = false;
            }
        };

        const logout = async () => {
            await clearSession();
            state.session = null;
            state.status = 'Extension session cleared.';
        };

        const captureNow = async () => {
            state.busy = true;

            try {
                const response = await sendRuntimeMessage<{ ok: boolean; message?: string }>({
                    type: 'capture-current-tab',
                });

                if (!response.ok) {
                    throw new Error(response.message ?? 'Unable to capture the current tab.');
                }

                await refreshState();
                state.status = 'Screenshot captured and stored for submission.';
            } catch (error) {
                state.status = error instanceof Error ? error.message : 'Unable to capture the current tab.';
            } finally {
                state.busy = false;
            }
        };

        const startVideoRecording = async () => {
            state.busy = true;

            try {
                const response = await sendRuntimeMessage<{ ok: boolean; message?: string }>({
                    type: 'start-video-recording',
                });

                if (!response.ok) {
                    throw new Error(response.message ?? 'Unable to start video recording.');
                }

                await refreshState();
                state.status = 'Video recording started. Stop recording to save the pending capture.';
            } catch (error) {
                state.status = error instanceof Error ? error.message : 'Unable to start video recording.';
            } finally {
                state.busy = false;
            }
        };

        const stopVideoRecording = async () => {
            state.busy = true;

            try {
                const response = await sendRuntimeMessage<{ ok: boolean; message?: string }>({
                    type: 'stop-video-recording',
                });

                if (!response.ok) {
                    throw new Error(response.message ?? 'Unable to stop video recording.');
                }

                await refreshState();
                state.status = 'Video recording saved and ready for submission.';
            } catch (error) {
                state.status = error instanceof Error ? error.message : 'Unable to stop video recording.';
            } finally {
                state.busy = false;
            }
        };

        const discardPendingCapture = async (message = 'Pending capture cleared.') => {
            const response = await sendRuntimeMessage<{ ok: boolean; message?: string }>({
                type: 'discard-pending-capture',
            });

            if (!response.ok) {
                throw new Error(response.message ?? 'Unable to discard the pending capture.');
            }

            await refreshState();
            state.summary = '';
            state.status = message;
        };

        const resolvePendingMedia = async (pendingCapture: PendingCapture): Promise<{
            mediaKind: PendingCapture['kind'];
            mediaBody: Blob;
            mediaDurationSeconds?: number;
        }> => {
            if (pendingCapture.kind === 'screenshot') {
                return {
                    mediaKind: 'screenshot',
                    mediaBody: await dataUrlToBlob(pendingCapture.dataUrl),
                };
            }

            const mediaBody = await readPendingCaptureMedia(pendingCapture.blobKey);

            if (!mediaBody) {
                throw new Error('The recorded video is no longer available. Record it again before submitting.');
            }

            return {
                mediaKind: 'video',
                mediaBody,
                mediaDurationSeconds: pendingCapture.durationSeconds,
            };
        };

        const submitCapture = async () => {
            if (!state.session || !state.pendingCapture) {
                return;
            }

            state.busy = true;

            try {
                const activeTab = await queryActiveTab();
                const fallbackContext = activeTab?.id ? await requestPageContext(activeTab.id) : {};
                const telemetry = state.pendingCapture.telemetry ?? emptyTelemetrySnapshot();
                const pageContext = {
                    ...(telemetry.context ?? {}),
                    ...fallbackContext,
                };
                const media = await resolvePendingMedia(state.pendingCapture);
                const apiBaseUrl = normalizeApiBaseUrl(state.session.apiBaseUrl);

                const client = new SnagCaptureClient({
                    baseUrl: apiBaseUrl,
                    defaultHeaders: {
                        Authorization: `Bearer ${state.session.token}`,
                    },
                });

                const result = await client.submitAuthenticatedReport({
                    upload: {
                        media_kind: media.mediaKind,
                        meta: {
                            source: 'extension',
                            captured_at: state.pendingCapture.capturedAt,
                            tab_url: state.pendingCapture.url,
                        },
                    },
                    artifacts: [
                        { kind: media.mediaKind, body: media.mediaBody },
                        {
                            kind: 'debugger',
                            body: new Blob(
                                [
                                    JSON.stringify({
                                        context: telemetry.context,
                                        actions: telemetry.actions,
                                        logs: telemetry.logs,
                                        network_requests: telemetry.network_requests,
                                        meta: {
                                            source: 'extension',
                                            page_context: pageContext,
                                        },
                                    }),
                                ],
                                { type: 'application/json' },
                            ),
                        },
                    ],
                    finalize: {
                        title: state.pendingCapture.title,
                        summary: state.summary || String(pageContext.selection ?? ''),
                        visibility: 'organization',
                        media_duration_seconds: media.mediaDurationSeconds,
                        meta: {
                            source: 'extension',
                            page_context: pageContext,
                            telemetry_context: telemetry.context,
                        },
                    },
                });

                await discardPendingCapture();
                const destinationUrl = result.report.report_url ?? result.report.share_url;
                state.status = destinationUrl
                    ? `Report submitted: ${destinationUrl}`
                    : 'Report submitted.';
            } catch (error) {
                if (error instanceof Error && /unauthenticated/i.test(error.message)) {
                    await clearSession();
                    await refreshState();
                    state.status = 'Extension session was rejected. Exchange a new one-time code and submit again.';
                } else {
                    state.status = error instanceof Error ? error.message : 'Unable to submit capture.';
                }
            } finally {
                state.busy = false;
            }
        };

        const discardCapture = async () => {
            state.busy = true;

            try {
                await discardPendingCapture();
            } catch (error) {
                state.status = error instanceof Error ? error.message : 'Unable to discard the pending capture.';
            } finally {
                state.busy = false;
            }
        };

        return () => {
            const session = state.session;
            const pendingCapture = state.pendingCapture;
            const recordingState = state.recordingState;
            const submitLabel = pendingCapture?.kind === 'video' ? 'Submit video' : 'Submit screenshot';

            return h('div', { class: 'snag-ui ck-popup-shell' }, [
                h(
                    SectionCard,
                    {
                        title: 'Connection',
                        description: 'Use the one-time code from the first-party settings page.',
                    },
                    {
                        default: () => [
                            h('div', { style: 'display:grid;gap:10px;' }, [
                                h('label', { class: 'ck-field' }, [
                                    h('span', { class: 'ck-label' }, 'API base URL'),
                                    h('input', {
                                        class: 'ck-input',
                                        value: state.apiBaseUrl,
                                        placeholder: 'http://192.168.x.x/snag',
                                        onInput: (event: Event) => {
                                            state.apiBaseUrl = (event.target as HTMLInputElement).value;
                                        },
                                    }),
                                ]),
                                h('div', { class: 'ck-inline-note' }, 'Use the LAN URL shown by php artisan snag:xampp.'),
                                h('label', { class: 'ck-field' }, [
                                    h('span', { class: 'ck-label' }, 'One-time code'),
                                    h('input', {
                                        class: 'ck-input',
                                        value: state.code,
                                        placeholder: 'Paste code from settings',
                                        onInput: (event: Event) => {
                                            state.code = (event.target as HTMLInputElement).value;
                                        },
                                    }),
                                ]),
                                h('label', { class: 'ck-field' }, [
                                    h('span', { class: 'ck-label' }, 'Device name'),
                                    h('input', {
                                        class: 'ck-input',
                                        value: state.deviceName,
                                        placeholder: 'Chromium extension',
                                        onInput: (event: Event) => {
                                            state.deviceName = (event.target as HTMLInputElement).value;
                                        },
                                    }),
                                ]),
                                h('div', { class: 'ck-actions' }, [
                                    h(
                                        'button',
                                        {
                                            class: 'ck-button',
                                            disabled: state.busy || !state.code,
                                            onClick: connect,
                                        },
                                        'Exchange code',
                                    ),
                                    h(
                                        'button',
                                        {
                                            class: 'ck-button',
                                            'data-variant': 'secondary',
                                            disabled: state.busy || !state.session,
                                            onClick: logout,
                                        },
                                        'Clear session',
                                    ),
                                ]),
                            ]),
                        ],
                    },
                ),
                session
                    ? h(
                          SectionCard,
                          {
                              title: 'Current session',
                              description: 'Revocable token scoped to extension capture abilities.',
                          },
                          {
                              default: () => [
                                  h(KeyValueList, {
                                      items: [
                                          { label: 'Organization', value: session.organization.name },
                                          { label: 'User', value: session.user.email },
                                      ],
                                  }),
                              ],
                          },
                      )
                    : null,
                h(
                    SectionCard,
                    {
                        title: 'Capture current tab',
                        description: 'Screenshots and video recordings stay in extension storage until you submit or discard them.',
                    },
                    {
                        default: () => [
                            h('div', { class: 'ck-actions' }, [
                                h(
                                    'button',
                                    {
                                        class: 'ck-button',
                                        disabled: state.busy || recordingState.status === 'recording',
                                        onClick: captureNow,
                                    },
                                    'Capture visible tab',
                                ),
                                h(
                                    'button',
                                    {
                                        class: 'ck-button',
                                        'data-variant': 'secondary',
                                        disabled: state.busy,
                                        onClick: recordingState.status === 'recording'
                                            ? stopVideoRecording
                                            : startVideoRecording,
                                    },
                                    recordingState.status === 'recording'
                                        ? 'Stop video recording'
                                        : 'Start video recording',
                                ),
                            ]),
                            h('div', { class: 'ck-actions' }, [
                                h(
                                    'button',
                                    {
                                        class: 'ck-button',
                                        disabled: state.busy || !state.session || !pendingCapture || recordingState.status === 'recording',
                                        onClick: submitCapture,
                                    },
                                    submitLabel,
                                ),
                                h(
                                    'button',
                                    {
                                        class: 'ck-button',
                                        'data-variant': 'secondary',
                                        disabled: state.busy || !pendingCapture || recordingState.status === 'recording',
                                        onClick: discardCapture,
                                    },
                                    'Discard pending capture',
                                ),
                            ]),
                            recordingState.status === 'recording'
                                ? h(KeyValueList, {
                                      items: [
                                          { label: 'Recording', value: 'In progress' },
                                          { label: 'Title', value: recordingState.title ?? 'Browser capture' },
                                          { label: 'URL', value: recordingState.url ?? '' },
                                      ],
                                  })
                                : null,
                            pendingCapture
                                ? h(KeyValueList, {
                                      items: [
                                          { label: 'Capture type', value: pendingCapture.kind },
                                          { label: 'Title', value: pendingCapture.title },
                                          { label: 'URL', value: pendingCapture.url },
                                          ...(pendingCapture.kind === 'video'
                                              ? [{ label: 'Duration', value: `${pendingCapture.durationSeconds}s` }]
                                              : []),
                                      ],
                                  })
                                : null,
                            h('label', { class: 'ck-field' }, [
                                h('span', { class: 'ck-label' }, 'Summary'),
                                h('textarea', {
                                    class: 'ck-textarea',
                                    value: state.summary,
                                    placeholder: 'Optional summary',
                                    rows: 4,
                                    onInput: (event: Event) => {
                                        state.summary = (event.target as HTMLTextAreaElement).value;
                                    },
                                }),
                            ]),
                        ],
                    },
                ),
                h('div', { class: 'ck-card ck-meta ck-status', 'data-testid': 'popup-status' }, state.status),
            ]);
        };
    },
});

export function mountPopup(target: HTMLElement): void {
    createApp(PopupRoot).mount(target);
}
