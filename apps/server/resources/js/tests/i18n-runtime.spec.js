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
        expect(translateDocumentTitle('Captures', 'de')).toBe('Erfassungen');
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

    it('localizes workspace counters and ticket labels', async () => {
        document.body.innerHTML = `
            <div id="app">
                <p>In ticket SNAG-42</p>
                <p>Page 2 of 7. Filters persist across navigation.</p>
                <p>Showing 4 to 9 of 18</p>
                <p>Steps: 5</p>
                <p>Console: 2</p>
                <p>Network: 8</p>
                <p>3 captures / 2 reporters</p>
            </div>
        `;

        const root = document.getElementById('app');
        initializeDomLocalization({ root, locale: 'es' });

        await new Promise((resolve) => setTimeout(resolve, 0));

        expect([...root.querySelectorAll('p')].map((node) => node.textContent)).toEqual([
            'En ticket SNAG-42',
            'Página 2 de 7. Los filtros se conservan al navegar.',
            'Mostrando 4–9 de 18',
            'Pasos: 5',
            'Consola: 2',
            'Red: 8',
            '3 capturas / 2 reporteros',
        ]);
    });

    it('localizes extension and share-specific strings', async () => {
        document.body.innerHTML = `
            <div id="app">
                <p>Expires in 10 minutes.</p>
                <p>Issued 3 Apr 2026, 12:00</p>
                <p>2 artifacts</p>
                <p>Reporter: Anonymous</p>
            </div>
        `;

        const root = document.getElementById('app');
        initializeDomLocalization({ root, locale: 'fi' });

        await new Promise((resolve) => setTimeout(resolve, 0));

        expect([...root.querySelectorAll('p')].map((node) => node.textContent)).toEqual([
            'Vanhenee 10 minuutissa.',
            'Myönnetty 3 Apr 2026, 12:00',
            '2 artefaktia',
            'Ilmoittaja: Anonyymi',
        ]);
    });

    it('localizes settings and profile strings', async () => {
        document.body.innerHTML = `
            <div id="app">
                <p>Current members</p>
                <p>3 active memberships</p>
                <p>Video recording available up to 300 seconds.</p>
                <button>Save profile</button>
            </div>
        `;

        const root = document.getElementById('app');
        initializeDomLocalization({ root, locale: 'de' });

        await new Promise((resolve) => setTimeout(resolve, 0));

        expect([...root.querySelectorAll('p, button')].map((node) => node.textContent)).toEqual([
            'Aktuelle Mitglieder',
            '3 aktive Mitgliedschaften',
            'Videoaufnahme verfügbar bis zu 300 Sekunden.',
            'Profil speichern',
        ]);
    });

    it('localizes landing and auth strings', async () => {
        document.body.innerHTML = `
            <div id="app">
                <h1>Capture the bug and the context around it.</h1>
                <p>Organization scope</p>
                <p>Recover account access.</p>
                <button>Resend verification email</button>
            </div>
        `;

        const root = document.getElementById('app');
        initializeDomLocalization({ root, locale: 'sv' });

        await new Promise((resolve) => setTimeout(resolve, 0));

        expect([...root.querySelectorAll('h1, p, button')].map((node) => node.textContent)).toEqual([
            'Fånga buggen och sammanhanget runt den.',
            'Organisationsomfång',
            'Återställ åtkomst till kontot.',
            'Skicka verifieringsmail igen',
        ]);
    });

    it('localizes capture and ticket detail strings', async () => {
        document.body.innerHTML = `
            <div id="app">
                <p>Technical details</p>
                <p>3 matching requests</p>
                <p>Copy public share link</p>
                <p>Last synced 3 Apr 2026, 12:00</p>
            </div>
        `;

        const root = document.getElementById('app');
        initializeDomLocalization({ root, locale: 'de' });

        await new Promise((resolve) => setTimeout(resolve, 0));

        expect([...root.querySelectorAll('p')].map((node) => node.textContent)).toEqual([
            'Technische Details',
            '3 passende Requests',
            'Öffentlichen Freigabelink kopieren',
            'Zuletzt synchronisiert 3 Apr 2026, 12:00',
        ]);
    });
});
