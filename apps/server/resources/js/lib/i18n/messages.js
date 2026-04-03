import { commonExactEntries } from '@/lib/i18n/common';
import { siteExactEntries, sitePatternEntries } from '@/lib/i18n/site';
import { extensionExactEntries, extensionPatternEntries } from '@/lib/i18n/extension';
import { guestExactEntries, guestPatternEntries } from '@/lib/i18n/guest';
import { settingsExactEntries, settingsPatternEntries } from '@/lib/i18n/settings';
import { shareExactEntries, sharePatternEntries } from '@/lib/i18n/shares';
import { ticketExactEntries, ticketPatternEntries } from '@/lib/i18n/tickets';
import { workspaceExactEntries, workspacePatternEntries } from '@/lib/i18n/workspace';

const localeCodes = ['fi', 'ru', 'uk', 'sv', 'de', 'es', 'it'];

const exactEntries = [
    ...commonExactEntries,
    ...siteExactEntries,
    ...extensionExactEntries,
    ...guestExactEntries,
    ...settingsExactEntries,
    ...shareExactEntries,
    ...ticketExactEntries,
    ...workspaceExactEntries,
];

const buildExactMessages = () =>
    localeCodes.reduce((accumulator, locale) => {
        accumulator[locale] = Object.fromEntries(
            exactEntries.map(([source, translations]) => [source, translations[locale] ?? source]),
        );

        return accumulator;
    }, {});

export const exactMessages = buildExactMessages();
export const messagePatterns = [
    ...extensionPatternEntries,
    ...guestPatternEntries,
    ...sitePatternEntries,
    ...settingsPatternEntries,
    ...sharePatternEntries,
    ...ticketPatternEntries,
    ...workspacePatternEntries,
];
