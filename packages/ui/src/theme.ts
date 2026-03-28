export const uiStyles = `
:host {
  color-scheme: light;
}

.snag-ui {
  --ck-bg: #f7f2ea;
  --ck-surface: #fffdf9;
  --ck-line: #d8c8b0;
  --ck-text: #2f271d;
  --ck-muted: #6f6559;
  --ck-accent: #8b5e34;
  font-family: "IBM Plex Sans", "Noto Sans", sans-serif;
  color: var(--ck-text);
}

.ck-card {
  background: var(--ck-surface);
  border: 1px solid var(--ck-line);
  border-radius: 12px;
  padding: 16px;
}

.ck-head {
  display: grid;
  gap: 6px;
  margin-bottom: 14px;
}

.ck-head h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.ck-head p {
  color: var(--ck-muted);
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
}

.ck-code {
  background: #f1e7d9;
  border: 1px solid var(--ck-line);
  border-radius: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  letter-spacing: 0.08em;
  padding: 12px 14px;
}

.ck-list {
  display: grid;
  gap: 10px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.ck-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.ck-button {
  align-items: center;
  background: var(--ck-text);
  border: 1px solid var(--ck-text);
  border-radius: 9px;
  color: white;
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  justify-content: center;
  min-height: 38px;
  padding: 0 14px;
}

.ck-button[data-variant="secondary"] {
  background: white;
  border-color: var(--ck-line);
  color: var(--ck-text);
}

.ck-meta {
  color: var(--ck-muted);
  display: grid;
  gap: 6px;
  font-size: 13px;
}
`;

export function ensureUiStyles(target: Document | ShadowRoot): void {
    const marker = 'data-snag-ui-styles';

    if (target.querySelector(`[${marker}]`)) {
        return;
    }

    const ownerDocument = target instanceof Document ? target : target.ownerDocument ?? document;
    const styleHost = target instanceof Document ? target.head ?? target.documentElement : target;

    if (!styleHost) {
        return;
    }

    const style = ownerDocument.createElement('style');
    style.setAttribute(marker, 'true');
    style.textContent = uiStyles;
    styleHost.appendChild(style);
}
