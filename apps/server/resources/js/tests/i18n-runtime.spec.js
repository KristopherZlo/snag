import { beforeEach, describe, expect, it } from 'vitest';
import { initializeDomLocalization, translateDocumentTitle } from '@/lib/i18n/runtime';

describe('i18n runtime', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        document.title = 'Welcome';
        document.documentElement.lang = 'en';
    });

    it('translates known page titles', () => {
        expect(translateDocumentTitle('Welcome', 'fi')).toBe('Tervetuloa');
        expect(translateDocumentTitle('Log in', 'ru')).toBe('Войти');
    });

    it('localizes text nodes and placeholders in the mounted tree', async () => {
        document.body.innerHTML = `
            <div id="app">
                <h1>Open the active workspace.</h1>
                <input placeholder="Email reset link" />
                <p data-i18n-skip="true">Log in</p>
            </div>
        `;

        const root = document.getElementById('app');
        initializeDomLocalization({ root, locale: 'de' });

        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(root.querySelector('h1').textContent).toBe('Aktiven Workspace öffnen.');
        expect(root.querySelector('input').getAttribute('placeholder')).toBe('Reset-Link senden');
        expect(root.querySelector('[data-i18n-skip="true"]').textContent).toBe('Log in');
    });
});
