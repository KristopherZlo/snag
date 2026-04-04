import { SnagCaptureClient } from '@snag/capture-core';
import { widgetStyles } from './widget-styles.js';
import { captureVisiblePageScreenshot } from './visible-page-capture.js';
import {
    getSharedWebsiteWidgetTelemetryRecorder,
    normalizeWidgetUserContext,
} from './widget-telemetry-runtime.js';
import {
    EDITOR_STROKE_SWATCHES,
    EDITOR_TOOL_OPTIONS,
    arrowHeadPath,
    beginEditorAnnotation,
    clearEditorAnnotations,
    commitEditorAnnotationDraft,
    createScreenshotEditorState,
    exportEditedScreenshotBlob,
    getEditorAnnotationCount,
    getEditorToolLabel,
    polylinePath,
    redoEditorAnnotation,
    resetScreenshotEditorState,
    svgStrokeWidth,
    undoEditorAnnotation,
    updateEditorAnnotationDraft,
} from './screenshot-editor-runtime.js';

const runtimeInstances = new WeakMap();

const DEFAULT_CONFIG = {
    launcher: { label: 'Report a bug' },
    intro: {
        title: 'Found something broken?',
        body: 'We can send a screenshot of this page to our support team. First click Continue. Then click the camera button. After that you can add a short note and send it.',
        continue_label: 'Continue',
        cancel_label: 'Not now',
    },
    helper: { text: 'Click the camera to take a screenshot of this page.' },
    review: {
        title: 'Screenshot ready',
        body: 'Add context before sending this capture to Snag.',
        placeholder: 'Describe what happened, what you expected, and whether the issue is stable.',
        send_label: 'Continue',
        cancel_label: 'Keep draft',
        retake_label: 'Discard',
    },
    success: {
        title: 'Feedback sent',
        body: 'Your report was sent to our support team.',
        done_label: 'Done',
    },
    meta: {
        support_team_name: 'Support team',
        site_label: 'Website',
    },
    theme: {
        accent_color: '#d97706',
        mode: 'auto',
        offset_x: 20,
        offset_y: 20,
        icon_style: 'camera',
    },
};

const ICONS = {
    bug: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 5.5 10.5 4m4 1.5L13.5 4M7 9H4m16 0h-3m-9.5 4H4m16 0h-3m-11 0V9.8A3.8 3.8 0 0 1 9.8 6h4.4A3.8 3.8 0 0 1 18 9.8V13a6 6 0 1 1-12 0Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" /></svg>',
    feedback: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 8.5A4.5 4.5 0 0 1 10.5 4h3A4.5 4.5 0 0 1 18 8.5v4A4.5 4.5 0 0 1 13.5 17H11l-4 3v-7A4.5 4.5 0 0 1 6 12.5Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" /></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 7.25 9.6 5h4.8L16 7.25h2.25A1.75 1.75 0 0 1 20 9v7.25A1.75 1.75 0 0 1 18.25 18H5.75A1.75 1.75 0 0 1 4 16.25V9c0-.97.78-1.75 1.75-1.75ZM12 15.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" /></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 19 14-14m0 0v10m0-10H9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>',
    brush: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 16c-1.66 0-3 1.34-3 3 0 .55-.45 1-1 1m4-4 8.59-8.59a2 2 0 1 1 2.82 2.82L10.83 18.8A6 6 0 0 1 6.6 20H5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>',
    blur: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7.5h16M4 12h16M4 16.5h16M6.5 4v16M12 4v16M17.5 4v16" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" /></svg>',
    palette: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18h1.1a2.4 2.4 0 0 0 0-4.8H12a1.9 1.9 0 0 1 0-3.8h2.75A5.25 5.25 0 0 0 20 7.15 4.15 4.15 0 0 0 15.85 3Zm-4 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm3-2a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm4 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 14 4 9m0 0 5-5M4 9h9a7 7 0 1 1 0 14h-1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>',
    redo: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 14 5-5m0 0-5-5m5 5h-9a7 7 0 1 0 0 14h1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 6h18M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6m-9 0 .6 11.4A2 2 0 0 0 9.59 19.3h4.82a2 2 0 0 0 1.99-1.9L17 6m-6 4.25v5.5m4-5.5v5.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" /></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 11.5 20.5 4 14 20l-2.7-6.3L3 11.5Zm8.8 2.2L20.5 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" /></svg>',
};

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function cloneValue(value) {
    return JSON.parse(JSON.stringify(value));
}

function deepMerge(base, override) {
    if (!override || typeof override !== 'object') {
        return cloneValue(base);
    }

    const output = Array.isArray(base) ? [...base] : { ...base };

    Object.entries(override).forEach(([key, value]) => {
        const current = output[key];

        if (value && typeof value === 'object' && !Array.isArray(value) && current && typeof current === 'object' && !Array.isArray(current)) {
            output[key] = deepMerge(current, value);
            return;
        }

        output[key] = value;
    });

    return output;
}

function resolveConfig(bootstrap) {
    return deepMerge(DEFAULT_CONFIG, bootstrap?.config ?? {});
}

function resolveThemeVariables(config) {
    const requestedMode = config.theme?.mode || DEFAULT_CONFIG.theme.mode;
    const isDark = requestedMode === 'dark'
        || (requestedMode === 'auto' && typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const palette = isDark
        ? {
            surface: '#18181b',
            card: '#27272a',
            text: '#fafafa',
            muted: '#d4d4d8',
            border: 'rgba(255, 255, 255, 0.12)',
            launcherBackground: '#09090b',
            launcherText: '#fafafa',
            overlay: 'rgba(9, 9, 11, 0.72)',
        }
        : {
            surface: '#ffffff',
            card: '#f4f4f5',
            text: '#18181b',
            muted: '#52525b',
            border: 'rgba(24, 24, 27, 0.1)',
            launcherBackground: '#18181b',
            launcherText: '#ffffff',
            overlay: 'rgba(24, 24, 27, 0.56)',
        };

    return [
        `--snag-widget-accent: ${config.theme?.accent_color || DEFAULT_CONFIG.theme.accent_color}`,
        `--snag-widget-offset-x: ${(config.theme?.offset_x ?? DEFAULT_CONFIG.theme.offset_x)}px`,
        `--snag-widget-offset-y: ${(config.theme?.offset_y ?? DEFAULT_CONFIG.theme.offset_y)}px`,
        `--snag-widget-surface: ${palette.surface}`,
        `--snag-widget-card: ${palette.card}`,
        `--snag-widget-text: ${palette.text}`,
        `--snag-widget-muted: ${palette.muted}`,
        `--snag-widget-border: ${palette.border}`,
        `--snag-widget-launcher-bg: ${palette.launcherBackground}`,
        `--snag-widget-launcher-text: ${palette.launcherText}`,
        `--snag-widget-overlay: ${palette.overlay}`,
    ].join('; ');
}

function iconMarkup(style) {
    return ICONS[style] || ICONS.camera;
}

function truncateText(value, maxLength) {
    const normalized = String(value ?? '').trim().replace(/\s+/g, ' ');
    return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

function formatCapturedAt() {
    try {
        return new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(new Date());
    } catch {
        return new Date().toLocaleString();
    }
}

function createObjectUrl(blob) {
    if (!(blob instanceof Blob) || typeof URL?.createObjectURL !== 'function') {
        return null;
    }

    return URL.createObjectURL(blob);
}

function revokeObjectUrl(url) {
    if (typeof url === 'string' && typeof URL?.revokeObjectURL === 'function') {
        URL.revokeObjectURL(url);
    }
}

function parseErrorPayload(raw) {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function createDefaultCaptureClient(options) {
    return new SnagCaptureClient({ baseUrl: options.baseUrl });
}

async function readImageDimensions(url) {
    if (!url) {
        return { width: 1600, height: 1000 };
    }

    return await new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve({
            width: image.naturalWidth || image.width || 1600,
            height: image.naturalHeight || image.height || 1000,
        });
        image.onerror = () => resolve({ width: 1600, height: 1000 });
        image.src = url;
    });
}

function editorFrameStyle(size) {
    return size?.width && size?.height ? `style="aspect-ratio: ${size.width} / ${size.height};"` : '';
}

export class WebsiteWidgetRuntime {
    constructor(options) {
        this.script = options.script;
        this.bootstrap = options.bootstrap;
        this.baseUrl = options.baseUrl;
        this.config = resolveConfig(options.bootstrap);
        this.captureScreenshot = options.captureScreenshot ?? captureVisiblePageScreenshot;
        this.createCaptureClient = options.createCaptureClient ?? createDefaultCaptureClient;
        this.telemetryRecorder = options.telemetryRecorder ?? getSharedWebsiteWidgetTelemetryRecorder();
        this.userContext = normalizeWidgetUserContext(options.initialUserContext);
        this.state = {
            modal: null,
            reviewComment: '',
            inlineError: '',
            modalError: '',
            isCapturing: false,
            isSubmitting: false,
            screenshotBlob: null,
            screenshotUrl: null,
            screenshotSize: { width: 1600, height: 1000 },
            capturedAtLabel: '',
            editor: createScreenshotEditorState(),
        };
        this.host = null;
        this.shadow = null;
        this.previousModal = null;
        this.pointerState = { active: false, pointerId: null };
        this.screenshotRevision = 0;
    }

    mount() {
        if (this.host) {
            return this;
        }

        this.host = document.createElement('div');
        this.host.dataset.snagWidgetHost = this.bootstrap?.widget?.public_id || '';
        document.body.appendChild(this.host);
        this.shadow = this.host.attachShadow({ mode: 'open' });
        this.handleClick = this.handleClick.bind(this);
        this.handleKeydown = this.handleKeydown.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
        this.shadow.addEventListener('click', this.handleClick);
        this.shadow.addEventListener('keydown', this.handleKeydown);
        this.shadow.addEventListener('input', this.handleInput);
        this.shadow.addEventListener('pointerdown', this.handlePointerDown);
        this.telemetryRecorder.start({ baseUrl: this.baseUrl });
        this.recordWidgetAction('widget_ready', 'Widget loaded');
        this.render();

        return this;
    }

    destroy() {
        if (!this.shadow || !this.host) {
            return;
        }

        this.shadow.removeEventListener('click', this.handleClick);
        this.shadow.removeEventListener('keydown', this.handleKeydown);
        this.shadow.removeEventListener('input', this.handleInput);
        this.shadow.removeEventListener('pointerdown', this.handlePointerDown);
        this.cleanupEditorPointerListeners();
        revokeObjectUrl(this.state.screenshotUrl);
        this.host.remove();
        this.telemetryRecorder.stop();
        this.host = null;
        this.shadow = null;
    }

    openIntro() {
        void this.launchCapture();
    }

    closeModal() {
        this.state.modal = null;
        this.state.modalError = '';
        this.render();
    }

    closeSuccess() {
        this.resetReviewState();
        this.state.inlineError = '';
        this.state.modal = null;
        this.render();
    }

    cancelReview() {
        this.resetReviewState();
        this.state.modal = null;
        this.render();
    }

    closeReviewToDraft() {
        this.state.modalError = '';
        this.state.modal = null;
        this.render();
    }

    openConfirmDialog() {
        if (!(this.state.screenshotBlob instanceof Blob)) {
            return;
        }

        this.state.modalError = '';
        this.state.modal = 'confirm';
        this.render();
    }

    cancelConfirmDialog() {
        this.state.modalError = '';
        this.state.modal = 'review';
        this.render();
    }

    discardCurrentCapture() {
        this.resetReviewState();
        this.state.inlineError = '';
        this.state.modal = null;
        this.render();
    }

    resetReviewState() {
        this.cleanupEditorPointerListeners();
        this.screenshotRevision += 1;
        revokeObjectUrl(this.state.screenshotUrl);
        this.state.reviewComment = '';
        this.state.modalError = '';
        this.state.screenshotBlob = null;
        this.state.screenshotUrl = null;
        this.state.screenshotSize = { width: 1600, height: 1000 };
        this.state.capturedAtLabel = '';
        resetScreenshotEditorState(this.state.editor);
    }

    setCapturedScreenshot(blob) {
        this.screenshotRevision += 1;
        const currentRevision = this.screenshotRevision;
        revokeObjectUrl(this.state.screenshotUrl);
        resetScreenshotEditorState(this.state.editor);
        this.state.screenshotBlob = blob;
        this.state.screenshotUrl = createObjectUrl(blob);
        this.state.screenshotSize = { width: 1600, height: 1000 };
        this.state.capturedAtLabel = formatCapturedAt();

        if (!this.state.screenshotUrl) {
            return;
        }

        void readImageDimensions(this.state.screenshotUrl)
            .then((size) => {
                if (this.screenshotRevision !== currentRevision || this.state.screenshotUrl === null) {
                    return;
                }

                this.state.screenshotSize = size;

                if (this.state.modal === 'review') {
                    this.render();
                }
            })
            .catch(() => {});
    }

    currentOrigin() {
        return typeof window === 'undefined' ? new URL(this.baseUrl).origin : window.location.origin;
    }

    setUserContext(value) {
        const incoming = normalizeWidgetUserContext(value);

        if (!incoming) {
            return;
        }

        this.userContext = normalizeWidgetUserContext({
            ...(this.userContext ?? {}),
            ...incoming,
        });
    }

    recordWidgetAction(type, label, payload = {}) {
        this.telemetryRecorder.recordAction({
            type,
            label,
            selector: 'website_widget',
            value: null,
            payload: {
                widget_id: this.bootstrap?.widget?.public_id ?? null,
                ...payload,
            },
            happened_at: new Date().toISOString(),
        });
    }

    safeContext() {
        const context = {
            url: typeof window === 'undefined' ? this.baseUrl : window.location.href,
            title: typeof document === 'undefined' ? this.config.meta.site_label : document.title || this.config.meta.site_label,
            viewport: {
                width: typeof window === 'undefined' ? 0 : window.innerWidth,
                height: typeof window === 'undefined' ? 0 : window.innerHeight,
            },
            locale: typeof navigator === 'undefined' ? 'en' : navigator.language || 'en',
            language: typeof navigator === 'undefined' ? 'en' : navigator.language || 'en',
            user_agent: typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent,
            platform: typeof navigator === 'undefined' ? 'unknown' : navigator.platform,
            timezone: typeof Intl === 'undefined' ? 'UTC' : Intl.DateTimeFormat().resolvedOptions().timeZone,
            screen: {
                width: typeof window === 'undefined' ? 0 : window.screen.width,
                height: typeof window === 'undefined' ? 0 : window.screen.height,
            },
            referrer: typeof document === 'undefined' ? null : document.referrer || null,
        };

        if (this.userContext) {
            context.user = this.userContext;
        }

        return context;
    }

    sessionMeta() {
        const context = this.safeContext();
        return {
            source: 'website_widget',
            website_widget_id: this.bootstrap?.widget?.public_id ?? null,
            widget_name: this.bootstrap?.widget?.name ?? null,
            site_label: this.config.meta.site_label,
            support_team_name: this.config.meta.support_team_name,
            page_title: context.title,
            page_url: context.url,
            locale: context.locale,
            viewport: context.viewport,
            ...(this.userContext ? { user: this.userContext } : {}),
        };
    }

    finalizeMeta() {
        const context = this.safeContext();
        const comment = this.state.reviewComment.trim();

        return {
            source: 'website_widget',
            website_widget_id: this.bootstrap?.widget?.public_id ?? null,
            widget_name: this.bootstrap?.widget?.name ?? null,
            site_label: this.config.meta.site_label,
            support_team_name: this.config.meta.support_team_name,
            user_comment: comment === '' ? null : comment,
            locale: context.locale,
            page_title: context.title,
            page_url: context.url,
            viewport: context.viewport,
            user_agent: context.user_agent,
            annotation_count: this.state.editor.annotations.length,
            ...(this.userContext ? { user: this.userContext } : {}),
        };
    }

    debuggerPayload() {
        const telemetry = this.telemetryRecorder.snapshot(false);
        const context = {
            ...this.safeContext(),
            ...(telemetry.context ?? {}),
        };

        if (this.userContext) {
            context.user = this.userContext;
        }

        return {
            actions: telemetry.actions ?? [],
            logs: telemetry.logs ?? [],
            network_requests: telemetry.network_requests ?? [],
            context,
            meta: this.finalizeMeta(),
        };
    }

    createDebuggerBlob() {
        return new Blob([JSON.stringify(this.debuggerPayload(), null, 2)], { type: 'application/json' });
    }

    buildReportTitle() {
        const comment = this.state.reviewComment.trim();
        const siteLabel = this.config.meta.site_label || this.bootstrap?.widget?.name || 'Website';

        return comment !== '' ? `${siteLabel}: ${truncateText(comment, 72)}` : `${siteLabel}: Screenshot report`;
    }

    buildReportSummary() {
        const comment = this.state.reviewComment.trim();
        return comment !== '' ? comment : `Visitor submitted a screenshot from ${this.config.meta.site_label || 'the website'}.`;
    }

    parseCaptureError(error) {
        const raw = error instanceof Error ? error.message : 'We could not take a screenshot of this page.';

        if (raw.includes('tainted')) {
            return 'We could not capture this page because it blocks screenshot rendering. Please try again or contact support directly.';
        }

        return 'We could not take a screenshot of this page. Please try again.';
    }

    parseSubmitError(error) {
        const raw = error instanceof Error ? error.message : 'We could not send your report right now.';

        if (raw.includes('forbidden_origin')) {
            return 'Bug reporting is not turned on for this website yet.';
        }

        if (raw.includes('invalid_capture_token')) {
            return 'Bug reporting is temporarily unavailable. Please try again in a moment.';
        }

        const payload = parseErrorPayload(raw);

        if (typeof payload?.message === 'string' && payload.message.trim() !== '') {
            return payload.message;
        }

        return 'We could not send your report right now. Please try again.';
    }

    isCaptureDebugEnabled() {
        if (this.bootstrap?.runtime?.debug_capture === true) {
            return true;
        }

        if (this.script?.dataset?.snagDebug === 'true') {
            return true;
        }

        if (typeof window === 'undefined') {
            return false;
        }

        try {
            return new URLSearchParams(window.location.search).get('snagWidgetDebug') === '1';
        } catch {
            return false;
        }
    }

    hasDraftCapture() {
        return this.state.screenshotBlob instanceof Blob && Boolean(this.state.screenshotUrl);
    }

    async launchCapture() {
        if (this.hasDraftCapture() && !this.state.modal && !this.state.isCapturing && !this.state.isSubmitting) {
            this.state.inlineError = '';
            this.state.modalError = '';
            this.state.modal = 'review';
            this.render();
            return;
        }

        await this.startCapture();
    }

    async startCapture() {
        if (this.state.isCapturing || this.state.isSubmitting) {
            return;
        }

        if (!this.bootstrap?.capture?.public_key) {
            this.state.inlineError = 'Bug reporting is not available for this website yet.';
            this.render();
            return;
        }

        this.cleanupEditorPointerListeners();
        this.state.inlineError = '';
        this.state.modalError = '';
        this.state.modal = null;
        this.state.isCapturing = true;
        this.recordWidgetAction('capture_requested', 'Requested screenshot');
        this.render();

        try {
            const blob = await this.captureScreenshot({
                excludeElement: this.host,
                ...(this.isCaptureDebugEnabled() ? { debug: true } : {}),
            });

            this.setCapturedScreenshot(blob);
            this.state.modal = 'review';
            this.recordWidgetAction('capture_completed', 'Captured screenshot');
        } catch (error) {
            this.state.inlineError = this.parseCaptureError(error);
            this.recordWidgetAction('capture_failed', 'Screenshot capture failed', {
                message: error instanceof Error ? error.message : String(error),
            });
        } finally {
            this.state.isCapturing = false;
            this.render();
        }
    }

    async resolveScreenshotBlobForSubmit() {
        if (!(this.state.screenshotBlob instanceof Blob)) {
            throw new Error('Screenshot is unavailable.');
        }

        if (!this.state.editor.annotations.length || !this.state.screenshotUrl) {
            return this.state.screenshotBlob;
        }

        return await exportEditedScreenshotBlob({
            imageUrl: this.state.screenshotUrl,
            annotations: this.state.editor.annotations,
        });
    }

    async submitReport() {
        if (this.state.isSubmitting || !(this.state.screenshotBlob instanceof Blob)) {
            return;
        }

        this.state.modalError = '';
        this.state.inlineError = '';
        this.state.isSubmitting = true;
        this.render();

        const publicKey = this.bootstrap?.capture?.public_key;
        const origin = this.currentOrigin();
        const client = this.createCaptureClient({ baseUrl: this.baseUrl });

        try {
            const screenshotBlob = await this.resolveScreenshotBlobForSubmit();
            const createToken = await client.issuePublicCaptureToken({
                public_key: publicKey,
                origin,
                mode: 'browser',
                action: 'create',
            });

            const session = await client.createPublicUploadSession({
                public_key: publicKey,
                capture_token: createToken.capture_token,
                origin,
                mode: 'browser',
                media_kind: 'screenshot',
                meta: this.sessionMeta(),
            });

            await client.uploadArtifacts(session, [
                { kind: 'screenshot', body: screenshotBlob },
                { kind: 'debugger', body: this.createDebuggerBlob() },
            ]);

            const finalizeToken = await client.issuePublicCaptureToken({
                public_key: publicKey,
                origin,
                mode: 'browser',
                action: 'finalize',
            });

            await client.finalizePublicReport({
                public_key: publicKey,
                capture_token: finalizeToken.capture_token,
                upload_session_token: session.upload_session_token,
                finalize_token: session.finalize_token,
                title: this.buildReportTitle(),
                summary: this.buildReportSummary(),
                visibility: 'organization',
                origin,
                mode: 'browser',
                meta: this.finalizeMeta(),
            });

            this.state.modal = 'success';
            this.recordWidgetAction('report_submitted', 'Submitted support report', {
                annotation_count: this.state.editor.annotations.length,
            });
        } catch (error) {
            this.state.modalError = this.parseSubmitError(error);
            this.recordWidgetAction('report_submit_failed', 'Report submission failed', {
                message: error instanceof Error ? error.message : String(error),
            });
        } finally {
            this.state.isSubmitting = false;
            this.render();
        }
    }

    handleClick(event) {
        const actionTarget = event.target instanceof Element ? event.target.closest('[data-action]') : null;

        if (!actionTarget) {
            return;
        }

        const action = actionTarget.getAttribute('data-action');

        if (action === 'overlay-close' && event.target !== actionTarget) {
            return;
        }

        switch (action) {
            case 'launch-capture':
            case 'capture':
                void this.launchCapture();
                break;
            case 'keep-draft':
                this.recordWidgetAction('review_kept', 'Kept capture draft');
                this.closeReviewToDraft();
                break;
            case 'discard-review':
                this.recordWidgetAction('review_discarded', 'Discarded capture draft');
                this.discardCurrentCapture();
                break;
            case 'continue-review':
                this.recordWidgetAction('review_continued', 'Continued to send step', {
                    comment_length: this.state.reviewComment.trim().length,
                });
                this.openConfirmDialog();
                break;
            case 'cancel-confirm':
                this.cancelConfirmDialog();
                break;
            case 'overlay-close':
                if (this.state.modal === 'success') {
                    this.closeSuccess();
                }
                break;
            case 'send-feedback':
                void this.submitReport();
                break;
            case 'done-success':
                this.closeSuccess();
                break;
            case 'editor-tool':
                this.state.editor.activeTool = actionTarget.getAttribute('data-editor-tool') || 'arrow';
                this.recordWidgetAction('editor_tool_selected', 'Changed annotation tool', {
                    tool: this.state.editor.activeTool,
                });
                this.render();
                break;
            case 'editor-color':
                this.state.editor.strokeColor = actionTarget.getAttribute('data-editor-color') || EDITOR_STROKE_SWATCHES[0];
                this.recordWidgetAction('editor_color_selected', 'Changed annotation color');
                this.render();
                break;
            case 'editor-undo':
                undoEditorAnnotation(this.state.editor);
                this.recordWidgetAction('editor_undo', 'Undid annotation');
                this.render();
                break;
            case 'editor-redo':
                redoEditorAnnotation(this.state.editor);
                this.recordWidgetAction('editor_redo', 'Redid annotation');
                this.render();
                break;
            case 'editor-clear':
                clearEditorAnnotations(this.state.editor);
                this.recordWidgetAction('editor_cleared', 'Cleared annotations');
                this.render();
                break;
            default:
                break;
        }
    }

    handleInput(event) {
        const target = event.target;

        if (target instanceof HTMLTextAreaElement && target.getAttribute('data-field') === 'review-comment') {
            this.state.reviewComment = target.value;

            this.telemetryRecorder.recordAction({
                type: 'input',
                label: 'Typed support comment',
                selector: 'website_widget > review-comment',
                value: null,
                payload: {
                    widget_id: this.bootstrap?.widget?.public_id ?? null,
                    field_type: 'textarea',
                    field_length: target.value.length,
                },
                happened_at: new Date().toISOString(),
            });

            if (this.state.modalError) {
                this.state.modalError = '';
            }

            return;
        }

        if (target instanceof HTMLInputElement && target.getAttribute('data-field') === 'editor-width') {
            this.state.editor.strokeWidth = Number(target.value || 6);
            this.recordWidgetAction('editor_width_changed', 'Changed annotation width', {
                width: this.state.editor.strokeWidth,
            });
            this.render();
            return;
        }

        if (target instanceof HTMLInputElement && target.getAttribute('data-field') === 'editor-color') {
            this.state.editor.strokeColor = target.value || EDITOR_STROKE_SWATCHES[0];
            this.render();
        }
    }

    handleKeydown(event) {
        if (event.key === 'Escape' && this.state.modal) {
            event.preventDefault();

            if (this.state.modal === 'review') {
                this.closeReviewToDraft();
                return;
            }

            if (this.state.modal === 'confirm') {
                this.cancelConfirmDialog();
                return;
            }

            if (this.state.modal === 'success') {
                this.closeSuccess();
            }

            return;
        }

        if (event.key === 'Tab' && this.state.modal) {
            this.maintainFocusTrap(event);
        }
    }

    maintainFocusTrap(event) {
        const modal = this.shadow?.querySelector('[data-snag-modal]');

        if (!(modal instanceof HTMLElement)) {
            return;
        }

        const focusable = Array.from(
            modal.querySelectorAll('button, [href], textarea, input, select, [tabindex]:not([tabindex="-1"])'),
        ).filter((node) => !node.hasAttribute('disabled'));

        if (focusable.length === 0) {
            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = this.shadow?.activeElement || document.activeElement;

        if (event.shiftKey && active === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
        }
    }

    focusPrimaryAction() {
        queueMicrotask(() => {
            const target = this.shadow?.querySelector('[data-autofocus]');

            if (target instanceof HTMLElement) {
                target.focus();
            }
        });
    }

    getEditorFrame() {
        return this.shadow?.querySelector('[data-editor-frame]') ?? null;
    }

    getRelativeEditorPoint(event) {
        const frame = this.getEditorFrame();

        if (!(frame instanceof HTMLElement)) {
            return null;
        }

        const bounds = frame.getBoundingClientRect();

        if (!bounds.width || !bounds.height) {
            return null;
        }

        return {
            x: Math.min(Math.max((event.clientX - bounds.left) / bounds.width, 0), 1),
            y: Math.min(Math.max((event.clientY - bounds.top) / bounds.height, 0), 1),
            width: bounds.width,
            height: bounds.height,
        };
    }

    cleanupEditorPointerListeners() {
        this.pointerState.active = false;
        this.pointerState.pointerId = null;
        window.removeEventListener('pointermove', this.handlePointerMove);
        window.removeEventListener('pointerup', this.handlePointerUp);
        window.removeEventListener('pointercancel', this.handlePointerUp);
    }

    handlePointerDown(event) {
        if (this.state.modal !== 'review' || event.button !== 0) {
            return;
        }

        const frame = event.target instanceof Element ? event.target.closest('[data-editor-frame]') : null;

        if (!(frame instanceof HTMLElement)) {
            return;
        }

        const point = this.getRelativeEditorPoint(event);

        if (!point) {
            return;
        }

        event.preventDefault();
        beginEditorAnnotation(this.state.editor, point);
        this.pointerState.active = true;
        this.pointerState.pointerId = event.pointerId;
        window.addEventListener('pointermove', this.handlePointerMove);
        window.addEventListener('pointerup', this.handlePointerUp);
        window.addEventListener('pointercancel', this.handlePointerUp);
        this.render();
    }

    handlePointerMove(event) {
        if (!this.pointerState.active || event.pointerId !== this.pointerState.pointerId) {
            return;
        }

        const point = this.getRelativeEditorPoint(event);

        if (!point) {
            return;
        }

        updateEditorAnnotationDraft(this.state.editor, point, point.width, point.height);
        this.render();
    }

    handlePointerUp(event) {
        if (!this.pointerState.active || event.pointerId !== this.pointerState.pointerId) {
            return;
        }

        commitEditorAnnotationDraft(this.state.editor);
        this.cleanupEditorPointerListeners();
        this.render();
    }

    renderEditorToolbar() {
        const annotationCount = getEditorAnnotationCount(this.state.editor);
        const activeToolLabel = getEditorToolLabel(this.state.editor);

        return `
            <div class="snag-widget-editor-toolbar">
                <div class="snag-widget-editor-tools">
                    ${EDITOR_TOOL_OPTIONS.map((tool) => `
                        <button
                            type="button"
                            class="snag-widget-editor-tool ${this.state.editor.activeTool === tool.id ? 'is-active' : ''}"
                            data-action="editor-tool"
                            data-editor-tool="${tool.id}"
                            title="${tool.label}"
                            aria-label="${tool.label}"
                            aria-pressed="${this.state.editor.activeTool === tool.id ? 'true' : 'false'}"
                        >
                            <span class="snag-widget-icon snag-widget-icon--sm">${iconMarkup(tool.id)}</span>
                        </button>
                    `).join('')}
                </div>
                <div class="snag-widget-editor-swatches">
                    ${EDITOR_STROKE_SWATCHES.map((color) => `
                        <button
                            type="button"
                            class="snag-widget-editor-swatch ${this.state.editor.strokeColor === color ? 'is-active' : ''}"
                            data-action="editor-color"
                            data-editor-color="${color}"
                            style="background-color: ${color};"
                            title="Select ${color}"
                            aria-label="Select ${color}"
                        ></button>
                    `).join('')}
                    <label class="snag-widget-editor-color-label" aria-label="Pick a color">
                        <span class="snag-widget-icon snag-widget-icon--sm">${iconMarkup('palette')}</span>
                        <input
                            class="snag-widget-editor-color-input"
                            type="color"
                            data-field="editor-color"
                            value="${escapeHtml(this.state.editor.strokeColor)}"
                            aria-label="Pick a color"
                        />
                    </label>
                </div>
                <label class="snag-widget-editor-width">
                    <span>Width</span>
                    <input type="range" min="2" max="18" step="1" data-field="editor-width" value="${escapeHtml(this.state.editor.strokeWidth)}" />
                    <span>${escapeHtml(this.state.editor.strokeWidth)}px</span>
                </label>
                <div class="snag-widget-editor-badge">
                    ${escapeHtml(activeToolLabel)} - ${annotationCount} mark${annotationCount === 1 ? '' : 's'}
                </div>
                <div class="snag-widget-editor-actions-inline">
                    <button type="button" class="snag-widget-editor-tool" title="Undo" aria-label="Undo" data-action="editor-undo" ${!this.state.editor.annotations.length ? 'disabled aria-disabled="true"' : ''}>
                        <span class="snag-widget-icon snag-widget-icon--sm">${iconMarkup('undo')}</span>
                    </button>
                    <button type="button" class="snag-widget-editor-tool" title="Redo" aria-label="Redo" data-action="editor-redo" ${!this.state.editor.redoStack.length ? 'disabled aria-disabled="true"' : ''}>
                        <span class="snag-widget-icon snag-widget-icon--sm">${iconMarkup('redo')}</span>
                    </button>
                    <button type="button" class="snag-widget-editor-mini" data-action="editor-clear" ${!this.state.editor.annotations.length ? 'disabled aria-disabled="true"' : ''}>Clear</button>
                </div>
            </div>
        `;
    }

    renderBlurBoxes(collection) {
        return collection
            .filter((item) => item.type === 'blur')
            .map((annotation) => `
                <div class="snag-widget-editor-blur-box" style="left:${annotation.x * 100}%;top:${annotation.y * 100}%;width:${annotation.width * 100}%;height:${annotation.height * 100}%;"></div>
            `)
            .join('');
    }

    renderPathAnnotations(collection, viewWidth, viewHeight) {
        return collection
            .filter((item) => item.type !== 'blur')
            .map((annotation) => `
                <path d="${escapeHtml(polylinePath(annotation.points, viewWidth, viewHeight))}" fill="none" stroke="${escapeHtml(annotation.color)}" stroke-linecap="round" stroke-linejoin="round" stroke-width="${svgStrokeWidth(annotation.width)}" vector-effect="non-scaling-stroke"></path>
                ${annotation.type === 'arrow'
        ? `<path d="${escapeHtml(arrowHeadPath(annotation.points, annotation.width, viewWidth, viewHeight))}" fill="none" stroke="${escapeHtml(annotation.color)}" stroke-linecap="round" stroke-linejoin="round" stroke-width="${svgStrokeWidth(annotation.width)}" vector-effect="non-scaling-stroke"></path>`
        : ''}
            `)
            .join('');
    }

    renderDraftPath(viewWidth, viewHeight) {
        const draft = this.state.editor.draftAnnotation;

        if (!draft || (draft.type !== 'arrow' && draft.type !== 'brush')) {
            return '';
        }

        return `
            <path d="${escapeHtml(polylinePath(draft.points, viewWidth, viewHeight))}" fill="none" stroke="${escapeHtml(draft.color)}" stroke-linecap="round" stroke-linejoin="round" stroke-width="${svgStrokeWidth(draft.width)}" vector-effect="non-scaling-stroke" ${draft.type === 'arrow' ? 'stroke-dasharray="2 1.5"' : ''}></path>
            ${draft.type === 'arrow'
        ? `<path d="${escapeHtml(arrowHeadPath(draft.points, draft.width, viewWidth, viewHeight))}" fill="none" stroke="${escapeHtml(draft.color)}" stroke-linecap="round" stroke-linejoin="round" stroke-width="${svgStrokeWidth(draft.width)}" vector-effect="non-scaling-stroke"></path>`
        : ''}
        `;
    }

    renderEditor() {
        if (!this.state.screenshotUrl) {
            return '';
        }

        const viewWidth = this.state.screenshotSize?.width || 1600;
        const viewHeight = this.state.screenshotSize?.height || 1000;

        return `
            ${this.renderEditorToolbar()}
            <div class="snag-widget-editor-shell">
                <div class="snag-widget-editor-frame" data-editor-frame ${editorFrameStyle(this.state.screenshotSize)}>
                    <img class="snag-widget-editor-image" src="${escapeHtml(this.state.screenshotUrl)}" alt="Screenshot preview of the current page" draggable="false" />
                    ${this.renderBlurBoxes(this.state.editor.annotations)}
                    ${this.state.editor.draftAnnotation?.type === 'blur' ? this.renderBlurBoxes([this.state.editor.draftAnnotation]) : ''}
                    <svg class="snag-widget-editor-svg" viewBox="0 0 ${viewWidth} ${viewHeight}" aria-hidden="true">
                        ${this.renderPathAnnotations(this.state.editor.annotations, viewWidth, viewHeight)}
                        ${this.renderDraftPath(viewWidth, viewHeight)}
                    </svg>
                </div>
                <p class="snag-widget-note">Arrow and brush follow freehand strokes. Blur keeps a boxed redaction workflow for sensitive data.</p>
            </div>
        `;
    }

    renderModal() {
        if (this.state.modal === 'review') {
            return `
                <div class="snag-widget-overlay">
                    <div class="snag-widget-modal snag-widget-modal--editor" data-snag-modal role="dialog" aria-modal="true" aria-labelledby="snag-widget-title">
                        <div class="snag-widget-modal-body snag-widget-modal-body--editor">
                            <h2 id="snag-widget-title" class="snag-widget-title">${escapeHtml(this.config.review.title)}</h2>
                            <p class="snag-widget-copy">${escapeHtml(this.config.review.body)}</p>
                            ${this.renderEditor()}
                            <div class="snag-widget-field">
                                <label class="snag-widget-label" for="snag-widget-comment">Comment</label>
                                <textarea id="snag-widget-comment" class="snag-widget-textarea" data-field="review-comment" placeholder="${escapeHtml(this.config.review.placeholder)}">${escapeHtml(this.state.reviewComment)}</textarea>
                            </div>
                            ${this.state.modalError ? `<div class="snag-widget-error snag-widget-modal-error" role="alert">${escapeHtml(this.state.modalError)}</div>` : ''}
                            <div class="snag-widget-actions snag-widget-actions--end">
                                <button type="button" class="snag-widget-secondary" data-action="keep-draft" ${this.state.isSubmitting ? 'disabled aria-disabled="true"' : ''}>${escapeHtml(this.config.review.cancel_label)}</button>
                                <button type="button" class="snag-widget-secondary" data-action="discard-review" ${this.state.isSubmitting ? 'disabled aria-disabled="true"' : ''}>
                                    <span class="snag-widget-icon snag-widget-icon--sm">${iconMarkup('trash')}</span>
                                    <span>${escapeHtml(this.config.review.retake_label)}</span>
                                </button>
                                <button type="button" class="snag-widget-action" data-action="continue-review" ${this.state.isSubmitting ? 'disabled aria-disabled="true"' : ''}>${escapeHtml(this.config.review.send_label)}</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (this.state.modal === 'confirm') {
            return `
                <div class="snag-widget-overlay">
                    <div class="snag-widget-modal snag-widget-modal--confirm" data-snag-modal role="dialog" aria-modal="true" aria-labelledby="snag-widget-title">
                        <div class="snag-widget-modal-body">
                            <h2 id="snag-widget-title" class="snag-widget-title">Send this feedback?</h2>
                            <p class="snag-widget-copy">Make sure the capture and comment are ready before sending.</p>
                            <div class="snag-widget-summary-card">
                                <div class="snag-widget-summary-row">
                                    <span class="snag-widget-badge">Screenshot</span>
                                    <span class="snag-widget-summary-muted">${escapeHtml(this.state.capturedAtLabel || 'Just now')}</span>
                                </div>
                                <p class="snag-widget-summary-text">${escapeHtml(this.state.reviewComment.trim() || 'No comment attached yet.')}</p>
                            </div>
                            ${this.state.modalError ? `<div class="snag-widget-error snag-widget-modal-error" role="alert">${escapeHtml(this.state.modalError)}</div>` : ''}
                            <div class="snag-widget-actions snag-widget-actions--end">
                                <button type="button" class="snag-widget-secondary" data-action="cancel-confirm" ${this.state.isSubmitting ? 'disabled aria-disabled="true"' : ''}>Keep editing</button>
                                <button type="button" class="snag-widget-action" data-action="send-feedback" data-autofocus ${this.state.isSubmitting ? 'disabled aria-disabled="true"' : ''}>
                                    ${this.state.isSubmitting ? '<span class="snag-widget-spinner" aria-hidden="true"></span>' : `<span class="snag-widget-icon snag-widget-icon--sm">${iconMarkup('send')}</span>`}
                                    <span>Send feedback</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (this.state.modal === 'success') {
            return `
                <div class="snag-widget-overlay">
                    <div class="snag-widget-modal" data-snag-modal role="dialog" aria-modal="true" aria-labelledby="snag-widget-title">
                        <div class="snag-widget-modal-body">
                            <h2 id="snag-widget-title" class="snag-widget-title">${escapeHtml(this.config.success.title)}</h2>
                            <p class="snag-widget-copy">${escapeHtml(this.config.success.body)}</p>
                            <div class="snag-widget-actions snag-widget-actions--end">
                                <button type="button" class="snag-widget-action" data-action="done-success" data-autofocus>${escapeHtml(this.config.success.done_label)}</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        return '';
    }

    render() {
        if (!this.shadow) {
            return;
        }

        const accentStyle = resolveThemeVariables(this.config);
        const actionIcon = iconMarkup(this.config.theme?.icon_style);
        const currentModal = this.state.modal;

        this.shadow.innerHTML = `
            <style>${widgetStyles}</style>
            <div class="snag-widget-root" style="${accentStyle}">
                <div class="snag-widget-stack">
                    ${this.state.inlineError ? `<div class="snag-widget-error" role="alert">${escapeHtml(this.state.inlineError)}</div>` : ''}
                    <button type="button" class="snag-widget-launcher" data-action="launch-capture" aria-label="${escapeHtml(this.config.launcher.label)}" title="${escapeHtml(this.config.launcher.label)}" ${this.state.isCapturing ? 'disabled aria-disabled="true"' : ''}>
                        ${this.state.isCapturing ? '<span class="snag-widget-spinner" aria-hidden="true"></span>' : `<span class="snag-widget-icon">${actionIcon}</span>`}
                        <span>${escapeHtml(this.config.launcher.label)}</span>
                    </button>
                </div>
                ${this.renderModal()}
            </div>
        `;

        if (currentModal && currentModal !== this.previousModal) {
            const modal = this.shadow.querySelector('[data-snag-modal]');

            if (modal instanceof HTMLElement) {
                this.focusPrimaryAction();
            }
        }

        this.previousModal = currentModal;
    }
}

export function mountWebsiteWidget(options) {
    if (runtimeInstances.has(options.script)) {
        return runtimeInstances.get(options.script);
    }

    const runtime = new WebsiteWidgetRuntime(options).mount();
    runtimeInstances.set(options.script, runtime);

    return runtime;
}
