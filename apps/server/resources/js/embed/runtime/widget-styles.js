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
    color: #18181b;
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
    background: #18181b;
    color: #ffffff;
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
    border: 1px solid rgba(24, 24, 27, 0.08);
    border-radius: 12px;
    background: #ffffff;
    color: #3f3f46;
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
    background: rgba(24, 24, 27, 0.56);
    z-index: 2147483647;
}

.snag-widget-modal {
    width: min(100%, 460px);
    border-radius: 16px;
    border: 1px solid rgba(24, 24, 27, 0.08);
    background: #ffffff;
    color: #18181b;
    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2);
}

.snag-widget-modal-body {
    padding: 24px;
}

.snag-widget-title {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    line-height: 1.2;
}

.snag-widget-copy {
    margin: 14px 0 0;
    font-size: 15px;
    line-height: 1.65;
    color: #52525b;
}

.snag-widget-actions {
    margin-top: 22px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.snag-widget-action,
.snag-widget-secondary {
    min-height: 40px;
    padding: 0 14px;
    border-radius: 10px;
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
    border: 1px solid rgba(24, 24, 27, 0.12);
    background: #ffffff;
    color: #27272a;
}

.snag-widget-icon {
    width: 18px;
    height: 18px;
    display: inline-flex;
}

.snag-widget-hidden {
    display: none;
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
}
`;
