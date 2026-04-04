import { SnagCaptureClient } from '@snag/capture-core';
import type { FinalizeReportResponse } from '@snag/shared';
import { emptyTelemetrySnapshot } from './capture-telemetry';
import { normalizeApiBaseUrl } from './api-base-url';
import { readPendingCaptureMedia } from './pending-capture-media';
import { normalizeReportTitle } from './report-title';
import type { ExtensionSession, PendingCapture } from './storage';

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const response = await fetch(dataUrl);
    return response.blob();
}

async function resolvePendingMedia(
    pendingCapture: PendingCapture,
    screenshotOverride?: Blob | null,
): Promise<{
    mediaKind: PendingCapture['kind'];
    mediaBody: Blob;
    mediaDurationSeconds?: number;
}> {
    if (pendingCapture.kind === 'screenshot') {
        return {
            mediaKind: 'screenshot',
            mediaBody: screenshotOverride ?? await dataUrlToBlob(pendingCapture.dataUrl),
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
}

export async function submitPendingCapture(options: {
    session: ExtensionSession;
    pendingCapture: PendingCapture;
    summary: string;
    screenshotOverride?: Blob | null;
    fallbackContext?: Record<string, unknown>;
}): Promise<FinalizeReportResponse> {
    const telemetry = options.pendingCapture.telemetry ?? emptyTelemetrySnapshot();
    const pageContext = {
        ...(telemetry.context ?? {}),
        ...(options.fallbackContext ?? {}),
    };
    const media = await resolvePendingMedia(options.pendingCapture, options.screenshotOverride);
    const apiBaseUrl = normalizeApiBaseUrl(options.session.apiBaseUrl);
    const client = new SnagCaptureClient({
        baseUrl: apiBaseUrl,
        defaultHeaders: {
            Authorization: `Bearer ${options.session.token}`,
        },
    });

    return client.submitAuthenticatedReport({
        upload: {
            media_kind: media.mediaKind,
            meta: {
                source: 'extension',
                captured_at: options.pendingCapture.capturedAt,
                tab_url: options.pendingCapture.url,
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
            title: normalizeReportTitle(options.pendingCapture.title),
            summary: options.summary || String(pageContext.selection ?? ''),
            visibility: 'organization',
            media_duration_seconds: media.mediaDurationSeconds,
            meta: {
                source: 'extension',
                page_context: pageContext,
                telemetry_context: telemetry.context,
            },
        },
    });
}
