import { widgetStyles } from './widget-styles.js';

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
    return [
        `--snag-widget-accent: ${config.theme?.accent_color || DEFAULT_CONFIG.theme.accent_color}`,
        `--snag-widget-offset-x: ${(config.theme?.offset_x ?? DEFAULT_CONFIG.theme.offset_x)}px`,
        `--snag-widget-offset-y: ${(config.theme?.offset_y ?? DEFAULT_CONFIG.theme.offset_y)}px`,
    ].join('; ');
}

function iconMarkup(style) {
    return ICONS[style] || ICONS.camera;
}

export class WebsiteWidgetRuntime {
    constructor(options) {
        this.script = options.script;
        this.bootstrap = options.bootstrap;
        this.baseUrl = options.baseUrl;
        this.config = resolveConfig(options.bootstrap);
        this.state = {
            armed: false,
            helperVisible: false,
            modal: null,
        };
        this.host = null;
        this.shadow = null;
        this.focusTrapCleanup = null;
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
        this.shadow.addEventListener('click', this.handleClick);
        this.shadow.addEventListener('keydown', this.handleKeydown);
        this.render();

        return this;
    }

    destroy() {
        if (!this.shadow || !this.host) {
            return;
        }

        this.shadow.removeEventListener('click', this.handleClick);
        this.shadow.removeEventListener('keydown', this.handleKeydown);
        this.releaseFocusTrap();
        this.host.remove();
        this.host = null;
        this.shadow = null;
    }

    openIntro() {
        this.state.modal = 'intro';
        this.render();
    }

    closeModal() {
        this.state.modal = null;
        this.render();
    }

    armCapture() {
        this.state.modal = null;
        this.state.armed = true;
        this.state.helperVisible = true;
        this.render();
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
            case 'overlay-close':
                this.closeModal();
                break;
            case 'continue-intro':
                this.armCapture();
                break;
            case 'dismiss-helper':
                this.state.helperVisible = false;
                this.render();
                break;
            default:
                break;
        }
    }

    handleKeydown(event) {
        if (event.key === 'Escape' && this.state.modal) {
            event.preventDefault();
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

    releaseFocusTrap() {
        if (typeof this.focusTrapCleanup === 'function') {
            this.focusTrapCleanup();
            this.focusTrapCleanup = null;
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
                        >
                            <span class="snag-widget-icon">${actionIcon}</span>
                        </button>
                    ` : `
                        <button type="button" class="snag-widget-launcher" data-action="open-intro">
                            <span class="snag-widget-icon">${actionIcon}</span>
                            <span>${escapeHtml(this.config.launcher.label)}</span>
                        </button>
                    `}
                </div>

                ${this.state.modal === 'intro' ? `
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
                ` : ''}
            </div>
        `;

        const overlay = this.shadow.querySelector('.snag-widget-overlay');
        const modal = this.shadow.querySelector('[data-snag-modal]');

        if (overlay instanceof HTMLElement && modal instanceof HTMLElement) {
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) {
                    this.closeModal();
                }
            }, { once: true });
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
