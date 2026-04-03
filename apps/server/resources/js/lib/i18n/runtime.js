import { exactMessages, messagePatterns } from '@/lib/i18n/messages';

const originalTextMap = new WeakMap();
const originalAttributeMap = new WeakMap();
const translatableAttributes = ['placeholder', 'title', 'aria-label'];
const skippedTags = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'PRE', 'CODE', 'NOSCRIPT']);

let activeObserver = null;
let queuedFrame = null;
let activeRoot = null;
let activeLocale = 'en';

const resolveLocalizationRoot = (root) => {
    const documentRoot = root?.ownerDocument?.body ?? (typeof document !== 'undefined' ? document.body : null);

    if (documentRoot) {
        return documentRoot;
    }

    return root;
};

const normalizeLocale = (locale) => String(locale || 'en').toLowerCase().split('-')[0];

const translateCoreText = (text, locale) => {
    if (locale === 'en' || text === '') {
        return text;
    }

    const exact = exactMessages[locale]?.[text];

    if (exact) {
        return exact;
    }

    for (const rule of messagePatterns) {
        const matches = text.match(rule.pattern);

        if (!matches) {
            continue;
        }

        const translator = rule.translations?.[locale];

        if (typeof translator === 'function') {
            return translator(matches);
        }
    }

    return text;
};

const translateText = (text, locale) => {
    const value = String(text ?? '');

    if (value.trim() === '') {
        return value;
    }

    const leadingWhitespace = value.match(/^\s*/u)?.[0] ?? '';
    const trailingWhitespace = value.match(/\s*$/u)?.[0] ?? '';
    const core = value.trim();

    return `${leadingWhitespace}${translateCoreText(core, locale)}${trailingWhitespace}`;
};

const shouldSkipNode = (node) => {
    const parentElement = node.parentElement;

    if (!parentElement) {
        return true;
    }

    if (parentElement.closest('[data-i18n-skip="true"]')) {
        return true;
    }

    return skippedTags.has(parentElement.tagName);
};

const localizeTextNodes = (root, locale) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();

    while (node) {
        if (!shouldSkipNode(node)) {
            if (!originalTextMap.has(node)) {
                originalTextMap.set(node, node.nodeValue ?? '');
            }

            const original = originalTextMap.get(node) ?? '';
            const translated = translateText(original, locale);

            if ((node.nodeValue ?? '') !== translated) {
                node.nodeValue = translated;
            }
        }

        node = walker.nextNode();
    }
};

const localizeAttributes = (root, locale) => {
    const elements = root instanceof Element ? [root, ...root.querySelectorAll('*')] : [...root.querySelectorAll('*')];

    for (const element of elements) {
        if (element.closest('[data-i18n-skip="true"]')) {
            continue;
        }

        for (const attribute of translatableAttributes) {
            if (!element.hasAttribute(attribute)) {
                continue;
            }

            if (!originalAttributeMap.has(element)) {
                originalAttributeMap.set(element, new Map());
            }

            const attributeMap = originalAttributeMap.get(element);

            if (!attributeMap.has(attribute)) {
                attributeMap.set(attribute, element.getAttribute(attribute) ?? '');
            }

            const original = attributeMap.get(attribute) ?? '';
            const translated = translateText(original, locale);

            if (element.getAttribute(attribute) !== translated) {
                element.setAttribute(attribute, translated);
            }
        }
    }
};

const localizeTree = (root, locale) => {
    if (typeof document === 'undefined' || !root) {
        return;
    }

    localizeTextNodes(root, locale);
    localizeAttributes(root, locale);
    document.title = translateCoreText(document.title, locale);
    document.documentElement.lang = locale;
};

const scheduleLocalization = () => {
    if (!activeRoot || queuedFrame !== null) {
        return;
    }

    queuedFrame = window.requestAnimationFrame(() => {
        queuedFrame = null;
        localizeTree(activeRoot, activeLocale);
    });
};

export const translateDocumentTitle = (title, locale) => translateCoreText(String(title ?? ''), normalizeLocale(locale));

export const initializeDomLocalization = ({ root, locale }) => {
    if (typeof window === 'undefined' || !root) {
        return;
    }

    activeRoot = resolveLocalizationRoot(root);
    activeLocale = normalizeLocale(locale);

    if (activeObserver) {
        activeObserver.disconnect();
    }

    localizeTree(activeRoot, activeLocale);

    activeObserver = new MutationObserver(() => {
        scheduleLocalization();
    });

    activeObserver.observe(activeRoot, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: translatableAttributes,
    });
};
