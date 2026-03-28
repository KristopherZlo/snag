import { SnagCaptureClient } from '@snag/capture-core';
import { KeyValueList, SectionCard, ensureUiStyles } from '@snag/ui';
import { createApp, defineComponent, h, reactive } from 'vue';
import type { FinalizeReportResponse, ReportVisibility } from '@snag/shared';

export interface CaptureWidgetOptions {
    apiBaseUrl: string;
    publicKey: string;
    mount: HTMLElement;
    origin?: string;
    title?: string;
    visibility?: ReportVisibility | 'org';
    onSubmitted?: (response: FinalizeReportResponse) => void;
}

function normalizeVisibility(visibility?: CaptureWidgetOptions['visibility']): ReportVisibility {
    if (visibility === 'org') {
        return 'organization';
    }

    return visibility ?? 'public';
}

export class CaptureWidget {
    private app?: ReturnType<typeof createApp>;

    public constructor(private readonly options: CaptureWidgetOptions) {}

    public mount(): void {
        const root = this.options.mount.shadowRoot ?? this.options.mount.attachShadow({ mode: 'open' });
        root.innerHTML = '<div id="snag-capture-widget" class="snag-ui"></div>';
        ensureUiStyles(root);

        const client = new SnagCaptureClient({
            baseUrl: this.options.apiBaseUrl,
        });

        const origin = this.options.origin ?? window.location.origin;

        const WidgetRoot = defineComponent({
            name: 'CaptureWidgetRoot',
            setup: () => {
                const state = reactive({
                    title: this.options.title ?? 'Website capture',
                    summary: '',
                    status: 'Select a screenshot or video file to submit a public report.',
                    busy: false,
                    file: null as File | null,
                });

                const onFileChange = (event: Event) => {
                    const target = event.target as HTMLInputElement;
                    state.file = target.files?.[0] ?? null;
                    state.status = state.file
                        ? `Selected ${state.file.name}`
                        : 'Select a screenshot or video file to submit a public report.';
                };

                const submit = async () => {
                    if (!state.file || state.busy) {
                        return;
                    }

                    state.busy = true;
                    state.status = 'Requesting signed upload session...';

                    try {
                        const mediaKind = state.file.type.startsWith('video/') ? 'video' : 'screenshot';
                        const mediaDurationSeconds = mediaKind === 'video'
                            ? await readVideoDurationSeconds(state.file)
                            : undefined;
                        const createToken = await client.issuePublicCaptureToken({
                            public_key: this.options.publicKey,
                            origin,
                            action: 'create',
                        });

                        const session = await client.createPublicUploadSession({
                            capture_token: createToken.capture_token,
                            public_key: this.options.publicKey,
                            origin,
                            media_kind: mediaKind,
                            meta: {
                                source: 'sdk-widget',
                                file_name: state.file.name,
                            },
                        });

                        state.status = 'Uploading artifacts...';

                        await client.uploadArtifacts(session, [
                            {
                                kind: mediaKind,
                                body: state.file,
                            },
                            {
                                kind: 'debugger',
                                body: new Blob(
                                    [
                                        JSON.stringify({
                                            actions: [],
                                            logs: [],
                                            network_requests: [],
                                            meta: {
                                                origin,
                                                source: 'sdk-widget',
                                            },
                                        }),
                                    ],
                                    { type: 'application/json' },
                                ),
                            },
                        ]);

                        const finalizeToken = await client.issuePublicCaptureToken({
                            public_key: this.options.publicKey,
                            origin,
                            action: 'finalize',
                        });

                        const result = await client.finalizePublicReport({
                            capture_token: finalizeToken.capture_token,
                            public_key: this.options.publicKey,
                            origin,
                            upload_session_token: session.upload_session_token,
                            finalize_token: session.finalize_token,
                            title: state.title,
                            summary: state.summary,
                            visibility: normalizeVisibility(this.options.visibility),
                            media_duration_seconds: mediaDurationSeconds,
                            meta: {
                                source: 'sdk-widget',
                            },
                        });

                        const destinationUrl = result.report.share_url ?? result.report.report_url;
                        state.status = destinationUrl
                            ? `Report created: ${destinationUrl}`
                            : 'Report created.';
                        this.options.onSubmitted?.(result);
                    } catch (error) {
                        state.status = error instanceof Error ? error.message : 'Unable to submit report.';
                    } finally {
                        state.busy = false;
                    }
                };

                return () =>
                    h('div', { style: 'display:grid;gap:12px;' }, [
                        h(
                            SectionCard,
                            {
                                title: 'Capture widget',
                                description: 'Public embed shell with direct-to-storage upload flow.',
                            },
                            {
                                default: () => [
                                    h(KeyValueList, {
                                        items: [
                                            { label: 'Origin', value: origin },
                                            { label: 'Public key', value: this.options.publicKey },
                                        ],
                                    }),
                                ],
                            },
                        ),
                        h(
                            SectionCard,
                            {
                                title: 'Submit report',
                                description: 'The widget requests short-lived capture tokens for create and finalize actions.',
                            },
                            {
                                default: () => [
                                    h('div', { style: 'display:grid;gap:10px;' }, [
                                        h('input', {
                                            value: state.title,
                                            placeholder: 'Title',
                                            onInput: (event: Event) => {
                                                state.title = (event.target as HTMLInputElement).value;
                                            },
                                        }),
                                        h('textarea', {
                                            value: state.summary,
                                            placeholder: 'Summary',
                                            rows: 4,
                                            onInput: (event: Event) => {
                                                state.summary = (event.target as HTMLTextAreaElement).value;
                                            },
                                        }),
                                        h('input', {
                                            type: 'file',
                                            accept: 'image/*,video/*,application/json',
                                            onChange: onFileChange,
                                        }),
                                        h('div', { class: 'ck-actions' }, [
                                            h(
                                                'button',
                                                {
                                                    class: 'ck-button',
                                                    disabled: state.busy || !state.file,
                                                    onClick: submit,
                                                },
                                                state.busy ? 'Submitting...' : 'Submit capture',
                                            ),
                                        ]),
                                        h('div', { class: 'ck-meta' }, state.status),
                                    ]),
                                ],
                            },
                        ),
                    ]);
            },
        });

        this.app = createApp(WidgetRoot);
        this.app.mount(root.getElementById('snag-capture-widget')!);
    }

    public destroy(): void {
        this.app?.unmount();
    }
}

async function readVideoDurationSeconds(file: File): Promise<number | undefined> {
    const objectUrl = URL.createObjectURL(file);

    try {
        return await new Promise<number | undefined>((resolve) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                const duration = Number.isFinite(video.duration) ? Math.ceil(video.duration) : undefined;
                URL.revokeObjectURL(objectUrl);
                resolve(duration);
            };
            video.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                resolve(undefined);
            };
            video.src = objectUrl;
        });
    } catch {
        URL.revokeObjectURL(objectUrl);
        return undefined;
    }
}
