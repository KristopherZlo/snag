import { commonExactEntries } from '@/lib/i18n/common';
import { guestExactEntries, guestPatternEntries } from '@/lib/i18n/guest';
import { ticketExactEntries, ticketPatternEntries } from '@/lib/i18n/tickets';
import { workspaceExactEntries, workspacePatternEntries } from '@/lib/i18n/workspace';

const localeCodes = ['fi', 'ru', 'uk', 'sv', 'de', 'es', 'it'];

const exactEntries = [
    ...commonExactEntries,
    ...guestExactEntries,
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
export const messagePatterns = [...guestPatternEntries, ...ticketPatternEntries, ...workspacePatternEntries];
