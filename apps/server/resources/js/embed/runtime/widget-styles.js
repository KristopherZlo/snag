export const widgetStyles = `
:host {
    all: initial;
}

.snag-widget-root,
.snag-widget-root * {
    box-sizing: border-box;
    font-family: "Manrope", Inter, system-ui, sans-serif;
}

.snag-widget-root {
    position: fixed;
    right: var(--snag-widget-offset-x, 20px);
    bottom: var(--snag-widget-offset-y, 20px);
    z-index: 2147483646;
    color: var(--snag-widget-text, #18181b);
}

.snag-widget-stack {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 12px;
}

.snag-widget-launcher,
.snag-widget-capture {
    border: 0;
    cursor: pointer;
}

.snag-widget-launcher {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-height: 48px;
    padding: 0 16px;
    border-radius: 12px;
    background: var(--snag-widget-launcher-bg, #18181b);
    color: var(--snag-widget-launcher-text, #ffffff);
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18);
}

.snag-widget-launcher:hover,
.snag-widget-capture:hover {
    opacity: 0.96;
}

.snag-widget-launcher:focus-visible,
.snag-widget-capture:focus-visible,
.snag-widget-action:focus-visible,
.snag-widget-secondary:focus-visible {
    outline: 3px solid rgba(217, 119, 6, 0.28);
    outline-offset: 2px;
}

.snag-widget-helper {
    max-width: 260px;
    padding: 10px 12px;
    border: 1px solid var(--snag-widget-border, rgba(24, 24, 27, 0.08));
    border-radius: 12px;
    background: var(--snag-widget-surface, #ffffff);
    color: var(--snag-widget-muted, #3f3f46);
    font-size: 13px;
    line-height: 1.45;
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
}

.snag-widget-error {
    max-width: 280px;
    padding: 10px 12px;
    border: 1px solid rgba(225, 29, 72, 0.18);
    border-radius: 12px;
    background: #fff1f2;
    color: #9f1239;
    font-size: 13px;
    line-height: 1.45;
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
}

.snag-widget-capture {
    width: 56px;
    height: 56px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: var(--snag-widget-accent, #d97706);
    color: #ffffff;
    box-shadow: 0 14px 32px rgba(15, 23, 42, 0.22);
}

.snag-widget-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: var(--snag-widget-overlay, rgba(24, 24, 27, 0.56));
    z-index: 2147483647;
}

.snag-widget-modal {
    width: min(100%, 460px);
    border-radius: 10px;
    border: 1px solid var(--snag-widget-border, rgba(24, 24, 27, 0.08));
    background: var(--snag-widget-surface, #ffffff);
    color: var(--snag-widget-text, #18181b);
    box-shadow: 0 16px 36px rgba(15, 23, 42, 0.18);
}

.snag-widget-modal--editor {
    width: min(100%, 1024px);
    max-height: calc(100vh - 40px);
}

.snag-widget-modal--confirm {
    width: min(100%, 448px);
}

.snag-widget-modal-body {
    padding: 24px;
}

.snag-widget-modal-body--editor {
    overflow-y: auto;
}

.snag-widget-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    line-height: 1.2;
}

.snag-widget-copy {
    margin: 4px 0 0;
    font-size: 14px;
    line-height: 1.55;
    color: var(--snag-widget-muted, #52525b);
}

.snag-widget-note {
    margin: 10px 0 0;
    font-size: 13px;
    line-height: 1.55;
    color: var(--snag-widget-muted, #71717a);
}

.snag-widget-actions {
    margin-top: 22px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.snag-widget-actions--end {
    justify-content: flex-end;
}

.snag-widget-action,
.snag-widget-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 40px;
    padding: 0 14px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
}

.snag-widget-action {
    border: 0;
    background: var(--snag-widget-accent, #d97706);
    color: #ffffff;
}

.snag-widget-secondary {
    border: 1px solid var(--snag-widget-border, rgba(24, 24, 27, 0.12));
    background: var(--snag-widget-surface, #ffffff);
    color: var(--snag-widget-text, #27272a);
}

.snag-widget-action[disabled],
.snag-widget-secondary[disabled],
.snag-widget-capture[disabled] {
    cursor: wait;
    opacity: 0.72;
}

.snag-widget-preview-frame {
    margin-top: 18px;
    overflow: hidden;
    border: 1px solid var(--snag-widget-border, rgba(24, 24, 27, 0.1));
    border-radius: 14px;
    background: var(--snag-widget-card, #f4f4f5);
}

.snag-widget-preview-image {
    display: block;
    width: 100%;
    max-height: 280px;
    object-fit: cover;
    background: var(--snag-widget-card, #e4e4e7);
}

.snag-widget-field {
    margin-top: 18px;
}

.snag-widget-label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--snag-widget-text, #3f3f46);
}

.snag-widget-textarea {
    width: 100%;
    min-height: 120px;
    resize: vertical;
    padding: 12px 13px;
    border: 1px solid var(--snag-widget-border, rgba(24, 24, 27, 0.12));
    border-radius: 8px;
    background: var(--snag-widget-surface, #ffffff);
    color: var(--snag-widget-text, #18181b);
    font-size: 14px;
    line-height: 1.6;
}

.snag-widget-textarea::placeholder {
    color: #a1a1aa;
}

.snag-widget-status-line {
    margin-top: 12px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--snag-widget-muted, #52525b);
}

.snag-widget-modal-error {
    margin-top: 18px;
}

.snag-widget-editor-shell {
    margin-top: 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.snag-widget-editor-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
}

.snag-widget-editor-tools,
.snag-widget-editor-swatches,
.snag-widget-editor-actions-inline {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.snag-widget-editor-tool,
.snag-widget-editor-mini {
    border: 1px solid var(--snag-widget-border, rgba(24, 24, 27, 0.12));
    background: var(--snag-widget-surface, #ffffff);
    color: var(--snag-widget-text, #18181b);
    border-radius: 8px;
    min-height: 36px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
}

.snag-widget-editor-tool {
    width: 36px;
    min-width: 36px;
    justify-content: center;
    padding: 0;
}

.snag-widget-editor-mini {
    padding: 0 12px;
}

.snag-widget-editor-tool.is-active {
    background: var(--snag-widget-accent, #d97706);
    border-color: var(--snag-widget-accent, #d97706);
    color: #ffffff;
}

.snag-widget-editor-swatch {
    width: 24px;
    height: 24px;
    border-radius: 999px;
    border: 1px solid var(--snag-widget-border, rgba(24, 24, 27, 0.16));
    cursor: pointer;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.snag-widget-editor-swatch.is-active {
    outline: 2px solid var(--snag-widget-accent, #d97706);
    outline-offset: 2px;
}

.snag-widget-editor-color-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
}

.snag-widget-editor-color-label {
    position: relative;
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    border: 1px solid var(--snag-widget-border, rgba(24, 24, 27, 0.12));
    background: var(--snag-widget-surface, #ffffff);
    color: var(--snag-widget-muted, #71717a);
    overflow: hidden;
}

.snag-widget-editor-width {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-height: 36px;
    padding: 0 12px;
    border-radius: 8px;
    border: 1px solid var(--snag-widget-border, rgba(24, 24, 27, 0.12));
    background: rgba(148, 163, 184, 0.12);
    color: var(--snag-widget-text, #18181b);
    font-size: 13px;
    font-weight: 600;
}

.snag-widget-editor-width input[type="range"] {
    width: 96px;
    accent-color: var(--snag-widget-accent, #d97706);
}

.snag-widget-editor-badge {
    margin-left: auto;
    min-height: 32px;
    display: inline-flex;
    align-items: center;
    padding: 0 10px;
    border-radius: 999px;
    background: rgba(148, 163, 184, 0.14);
    color: var(--snag-widget-text, #18181b);
    font-size: 12px;
    font-weight: 600;
}

.snag-widget-editor-frame {
    position: relative;
    overflow: hidden;
    border-radius: 8px;
    border: 1px solid var(--snag-widget-border, rgba(24, 24, 27, 0.12));
    background: rgba(5, 5, 5, 0.92);
    touch-action: none;
    user-select: none;
    cursor: crosshair;
}

.snag-widget-editor-frame:active {
    cursor: crosshair;
}

.snag-widget-editor-image,
.snag-widget-editor-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
}

.snag-widget-editor-image {
    object-fit: cover;
}

.snag-widget-editor-svg {
    pointer-events: none;
}

.snag-widget-editor-blur-box {
    position: absolute;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.25);
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(10px);
    pointer-events: none;
}

.snag-widget-summary-card {
    margin-top: 16px;
    border: 1px solid var(--snag-widget-border, rgba(24, 24, 27, 0.12));
    border-radius: 8px;
    background: rgba(148, 163, 184, 0.12);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.snag-widget-summary-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.snag-widget-summary-muted {
    font-size: 13px;
    color: var(--snag-widget-muted, #71717a);
}

.snag-widget-summary-text {
    margin: 0;
    font-size: 14px;
    line-height: 1.55;
    color: var(--snag-widget-text, #18181b);
}

.snag-widget-badge {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    padding: 0 8px;
    border-radius: 999px;
    border: 1px solid var(--snag-widget-border, rgba(24, 24, 27, 0.12));
    background: var(--snag-widget-surface, #ffffff);
    color: var(--snag-widget-text, #18181b);
    font-size: 12px;
    font-weight: 600;
}

.snag-widget-editor-tool:focus-visible,
.snag-widget-editor-mini:focus-visible,
.snag-widget-editor-swatch:focus-visible,
.snag-widget-editor-color-label:focus-within,
.snag-widget-editor-color-input:focus-visible,
.snag-widget-editor-width input:focus-visible {
    outline: 3px solid rgba(217, 119, 6, 0.28);
    outline-offset: 2px;
}

.snag-widget-editor-mini[disabled],
.snag-widget-editor-tool[disabled] {
    opacity: 0.55;
    cursor: not-allowed;
}

.snag-widget-icon {
    width: 18px;
    height: 18px;
    display: inline-flex;
}

.snag-widget-icon--sm {
    width: 16px;
    height: 16px;
}

.snag-widget-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.35);
    border-top-color: #ffffff;
    border-radius: 999px;
    animation: snag-widget-spin 0.9s linear infinite;
}

.snag-widget-hidden {
    display: none;
}

@keyframes snag-widget-spin {
    to {
        transform: rotate(360deg);
    }
}

@media (max-width: 640px) {
    .snag-widget-root {
        right: 16px;
        bottom: 16px;
    }

    .snag-widget-modal-body {
        padding: 20px;
    }

    .snag-widget-title {
        font-size: 20px;
    }

    .snag-widget-preview-image {
        max-height: 220px;
    }

    .snag-widget-editor-badge {
        margin-left: 0;
    }

    .snag-widget-modal--editor {
        max-height: calc(100vh - 24px);
    }
}
`;
