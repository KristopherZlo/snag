import { SnagCaptureClient } from '@snag/capture-core';
import { widgetStyles } from './widget-styles.js';
import { captureVisiblePageScreenshot } from './visible-page-capture.js';

const runtimeInstances = new WeakMap();

const DEFAULT_CONFIG = {
    launcher: {
        label: 'Report a bug',
    },
    intro: {
        title: 'Found something broken?',
        body: 'We can send a screenshot of this page to our support team. First click Continue. Then click the camera button. After that you can add a short note and send it.',
        continue_label: 'Continue',
        cancel_label: 'Not now',
    },
    helper: {
        text: 'Click the camera to take a screenshot of this page.',
    },
    review: {
        title: 'Add a short note',
        body: 'Tell us what you were trying to do and what went wrong.',
        placeholder: 'For example: I clicked Pay, but nothing happened.',
        send_label: 'Send report',
        cancel_label: 'Cancel',
        retake_label: 'Retake',
    },
    success: {
        title: 'Thank you',
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
    bug: `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 5.5 10.5 4m4 1.5L13.5 4M7 9H4m16 0h-3m-9.5 4H4m16 0h-3m-11 0V9.8A3.8 3.8 0 0 1 9.8 6h4.4A3.8 3.8 0 0 1 18 9.8V13a6 6 0 1 1-12 0Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
    `,
    feedback: `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 8.5A4.5 4.5 0 0 1 10.5 4h3A4.5 4.5 0 0 1 18 8.5v4A4.5 4.5 0 0 1 13.5 17H11l-4 3v-7A4.5 4.5 0 0 1 6 12.5Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
    `,
    camera: `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M8 7.25 9.6 5h4.8L16 7.25h2.25A1.75 1.75 0 0 1 20 9v7.25A1.75 1.75 0 0 1 18.25 18H5.75A1.75 1.75 0 0 1 4 16.25V9c0-.97.78-1.75 1.75-1.75ZM12 15.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
    `,
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
        || (requestedMode === 'auto'
            && typeof window !== 'undefined'
            && typeof window.matchMedia === 'function'
            && window.matchMedia('(prefers-color-scheme: dark)').matches);
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

    if (normalized.length <= maxLength) {
        return normalized;
    }

    return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
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

export class WebsiteWidgetRuntime {
    constructor(options) {
        this.script = options.script;
        this.bootstrap = options.bootstrap;
        this.baseUrl = options.baseUrl;
        this.config = resolveConfig(options.bootstrap);
        this.captureScreenshot = options.captureScreenshot ?? captureVisiblePageScreenshot;
        this.createCaptureClient = options.createCaptureClient ?? createDefaultCaptureClient;
        this.state = {
            armed: false,
            helperVisible: false,
            modal: null,
            reviewComment: '',
            inlineError: '',
            modalError: '',
            isCapturing: false,
            isSubmitting: false,
            screenshotBlob: null,
            screenshotUrl: null,
        };
        this.host = null;
        this.shadow = null;
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
        this.shadow.addEventListener('click', this.handleClick);
        this.shadow.addEventListener('keydown', this.handleKeydown);
        this.shadow.addEventListener('input', this.handleInput);
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
        revokeObjectUrl(this.state.screenshotUrl);
        this.host.remove();
        this.host = null;
        this.shadow = null;
    }

    openIntro() {
        this.state.inlineError = '';
        this.state.modal = 'intro';
        this.render();
    }

    closeModal() {
        this.state.modal = null;
        this.state.modalError = '';
        this.render();
    }

    closeSuccess() {
        this.resetReviewState();
        this.state.armed = false;
        this.state.helperVisible = false;
        this.state.inlineError = '';
        this.state.modal = null;
        this.render();
    }

    cancelReview() {
        this.resetReviewState();
        this.state.modal = null;
        this.state.helperVisible = true;
        this.render();
    }

    armCapture() {
        this.state.modal = null;
        this.state.modalError = '';
        this.state.inlineError = '';
        this.state.armed = true;
        this.state.helperVisible = true;
        this.render();
    }

    resetReviewState() {
        revokeObjectUrl(this.state.screenshotUrl);
        this.state.reviewComment = '';
        this.state.modalError = '';
        this.state.screenshotBlob = null;
        this.state.screenshotUrl = null;
    }

    setCapturedScreenshot(blob) {
        revokeObjectUrl(this.state.screenshotUrl);
        this.state.screenshotBlob = blob;
        this.state.screenshotUrl = createObjectUrl(blob);
    }

    currentOrigin() {
        if (typeof window === 'undefined') {
            return new URL(this.baseUrl).origin;
        }

        return window.location.origin;
    }

    safeContext() {
        return {
            url: typeof window === 'undefined' ? this.baseUrl : window.location.href,
            title: typeof document === 'undefined' ? this.config.meta.site_label : document.title || this.config.meta.site_label,
            viewport: {
                width: typeof window === 'undefined' ? 0 : window.innerWidth,
                height: typeof window === 'undefined' ? 0 : window.innerHeight,
            },
            locale: typeof navigator === 'undefined' ? 'en' : navigator.language || 'en',
            user_agent: typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent,
            platform: typeof navigator === 'undefined' ? 'unknown' : navigator.platform,
        };
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
        };
    }

    debuggerPayload() {
        return {
            actions: [],
            logs: [],
            network_requests: [],
            context: this.safeContext(),
            meta: this.finalizeMeta(),
        };
    }

    createDebuggerBlob() {
        return new Blob([
            JSON.stringify(this.debuggerPayload(), null, 2),
        ], { type: 'application/json' });
    }

    buildReportTitle() {
        const comment = this.state.reviewComment.trim();
        const siteLabel = this.config.meta.site_label || this.bootstrap?.widget?.name || 'Website';

        if (comment !== '') {
            return `${siteLabel}: ${truncateText(comment, 72)}`;
        }

        return `${siteLabel}: Screenshot report`;
    }

    buildReportSummary() {
        const comment = this.state.reviewComment.trim();

        if (comment !== '') {
            return comment;
        }

        return `Visitor submitted a screenshot from ${this.config.meta.site_label || 'the website'}.`;
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

    async startCapture() {
        if (this.state.isCapturing || this.state.isSubmitting) {
            return;
        }

        if (!this.bootstrap?.capture?.public_key) {
            this.state.inlineError = 'Bug reporting is not available for this website yet.';
            this.render();
            return;
        }

        this.state.inlineError = '';
        this.state.modalError = '';
        this.state.modal = null;
        this.state.helperVisible = false;
        this.state.isCapturing = true;
        this.render();

        try {
            const blob = await this.captureScreenshot({
                excludeElement: this.host,
            });

            this.setCapturedScreenshot(blob);
            this.state.modal = 'review';
        } catch (error) {
            this.state.inlineError = this.parseCaptureError(error);
        } finally {
            this.state.isCapturing = false;
            this.render();
        }
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
                { kind: 'screenshot', body: this.state.screenshotBlob },
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
            this.state.armed = false;
            this.state.helperVisible = false;
        } catch (error) {
            this.state.modalError = this.parseSubmitError(error);
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

        switch (action) {
            case 'open-intro':
                this.openIntro();
                break;
            case 'close-modal':
            case 'cancel-intro':
                this.closeModal();
                break;
            case 'overlay-close':
                if (this.state.modal === 'review') {
                    this.cancelReview();
                    break;
                }

                if (this.state.modal === 'success') {
                    this.closeSuccess();
                    break;
                }

                this.closeModal();
                break;
            case 'continue-intro':
                this.armCapture();
                break;
            case 'capture':
                void this.startCapture();
                break;
            case 'cancel-review':
                this.cancelReview();
                break;
            case 'retake-review':
                void this.startCapture();
                break;
            case 'send-report':
                void this.submitReport();
                break;
            case 'done-success':
                this.closeSuccess();
                break;
            default:
                break;
        }
    }

    handleInput(event) {
        const target = event.target instanceof HTMLTextAreaElement ? event.target : null;

        if (!target || target.getAttribute('data-field') !== 'review-comment') {
            return;
        }

        this.state.reviewComment = target.value;

        if (this.state.modalError) {
            this.state.modalError = '';
            this.render();
        }
    }

    handleKeydown(event) {
        if (event.key === 'Escape' && this.state.modal) {
            event.preventDefault();

            if (this.state.modal === 'review') {
                this.cancelReview();
                return;
            }

            if (this.state.modal === 'success') {
                this.closeSuccess();
                return;
            }

            this.closeModal();
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

    renderModal() {
        if (this.state.modal === 'intro') {
            return `
                <div class="snag-widget-overlay" data-action="overlay-close">
                    <div class="snag-widget-modal" data-snag-modal role="dialog" aria-modal="true" aria-labelledby="snag-widget-title">
                        <div class="snag-widget-modal-body">
                            <h2 id="snag-widget-title" class="snag-widget-title">${escapeHtml(this.config.intro.title)}</h2>
                            <p class="snag-widget-copy">${escapeHtml(this.config.intro.body)}</p>
                            <div class="snag-widget-actions">
                                <button
                                    type="button"
                                    class="snag-widget-action"
                                    data-action="continue-intro"
                                    data-autofocus
                                >
                                    ${escapeHtml(this.config.intro.continue_label)}
                                </button>
                                <button type="button" class="snag-widget-secondary" data-action="cancel-intro">
                                    ${escapeHtml(this.config.intro.cancel_label)}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (this.state.modal === 'review') {
            return `
                <div class="snag-widget-overlay" data-action="overlay-close">
                    <div class="snag-widget-modal" data-snag-modal role="dialog" aria-modal="true" aria-labelledby="snag-widget-title">
                        <div class="snag-widget-modal-body">
                            <h2 id="snag-widget-title" class="snag-widget-title">${escapeHtml(this.config.review.title)}</h2>
                            <p class="snag-widget-copy">${escapeHtml(this.config.review.body)}</p>
                            <p class="snag-widget-note">
                                We only send this screenshot, the page address, your browser language, screen size, and the note you write below.
                            </p>

                            ${this.state.screenshotUrl ? `
                                <div class="snag-widget-preview-frame">
                                    <img
                                        class="snag-widget-preview-image"
                                        src="${escapeHtml(this.state.screenshotUrl)}"
                                        alt="Screenshot preview of the current page"
                                    />
                                </div>
                            ` : ''}

                            <div class="snag-widget-field">
                                <label class="snag-widget-label" for="snag-widget-comment">What happened?</label>
                                <textarea
                                    id="snag-widget-comment"
                                    class="snag-widget-textarea"
                                    data-field="review-comment"
                                    data-autofocus
                                    placeholder="${escapeHtml(this.config.review.placeholder)}"
                                >${escapeHtml(this.state.reviewComment)}</textarea>
                            </div>

                            ${this.state.modalError ? `
                                <div class="snag-widget-error snag-widget-modal-error" role="alert">
                                    ${escapeHtml(this.state.modalError)}
                                </div>
                            ` : ''}

                            <div class="snag-widget-actions">
                                <button
                                    type="button"
                                    class="snag-widget-action"
                                    data-action="send-report"
                                    ${this.state.isSubmitting ? 'disabled aria-disabled="true"' : ''}
                                >
                                    ${this.state.isSubmitting ? '<span class="snag-widget-spinner" aria-hidden="true"></span>' : ''}
                                    <span>${escapeHtml(this.config.review.send_label)}</span>
                                </button>
                                <button
                                    type="button"
                                    class="snag-widget-secondary"
                                    data-action="retake-review"
                                    ${this.state.isSubmitting ? 'disabled aria-disabled="true"' : ''}
                                >
                                    ${escapeHtml(this.config.review.retake_label)}
                                </button>
                                <button
                                    type="button"
                                    class="snag-widget-secondary"
                                    data-action="cancel-review"
                                    ${this.state.isSubmitting ? 'disabled aria-disabled="true"' : ''}
                                >
                                    ${escapeHtml(this.config.review.cancel_label)}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (this.state.modal === 'success') {
            return `
                <div class="snag-widget-overlay" data-action="overlay-close">
                    <div class="snag-widget-modal" data-snag-modal role="dialog" aria-modal="true" aria-labelledby="snag-widget-title">
                        <div class="snag-widget-modal-body">
                            <h2 id="snag-widget-title" class="snag-widget-title">${escapeHtml(this.config.success.title)}</h2>
                            <p class="snag-widget-copy">${escapeHtml(this.config.success.body)}</p>
                            <p class="snag-widget-note">Your report stays inside the workspace unless the team shares it later.</p>
                            <div class="snag-widget-actions">
                                <button
                                    type="button"
                                    class="snag-widget-action"
                                    data-action="done-success"
                                    data-autofocus
                                >
                                    ${escapeHtml(this.config.success.done_label)}
                                </button>
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

        this.shadow.innerHTML = `
            <style>${widgetStyles}</style>
            <div class="snag-widget-root" style="${accentStyle}">
                <div class="snag-widget-stack">
                    ${this.state.inlineError ? `
                        <div class="snag-widget-error" role="alert">
                            ${escapeHtml(this.state.inlineError)}
                        </div>
                    ` : ''}

                    ${this.state.helperVisible && this.state.armed ? `
                        <div class="snag-widget-helper" role="status">
                            <div>${escapeHtml(this.config.helper.text)}</div>
                        </div>
                    ` : ''}

                    ${this.state.armed ? `
                        <button
                            type="button"
                            class="snag-widget-capture"
                            data-action="capture"
                            aria-label="${escapeHtml(this.config.launcher.label)}"
                            title="${escapeHtml(this.config.launcher.label)}"
                            ${this.state.isCapturing ? 'disabled aria-disabled="true"' : ''}
                        >
                            ${this.state.isCapturing
        ? '<span class="snag-widget-spinner" aria-hidden="true"></span>'
        : `<span class="snag-widget-icon">${actionIcon}</span>`}
                        </button>
                    ` : `
                        <button type="button" class="snag-widget-launcher" data-action="open-intro">
                            <span class="snag-widget-icon">${actionIcon}</span>
                            <span>${escapeHtml(this.config.launcher.label)}</span>
                        </button>
                    `}
                </div>

                ${this.renderModal()}
            </div>
        `;

        const modal = this.shadow.querySelector('[data-snag-modal]');

        if (modal instanceof HTMLElement) {
            this.focusPrimaryAction();
        }
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
