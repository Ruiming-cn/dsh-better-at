/**
 * `better-at` namespace dictionaries for the fast @ source candidate rows.
 * Keys mirror the native `reference` namespace so the menu copy stays aligned.
 */
/** Dictionary namespace owned by this plugin. */
export declare const NS = "better-at";
/** Simplified Chinese dictionary (key-set source of truth). */
export declare const zh: {
    'section.files': string;
    'section.sessions': string;
    'candidate.noCwd': string;
    'time.now': string;
    'time.minutes': string;
    'time.hours': string;
    'time.days': string;
    'time.months': string;
    'time.years': string;
    'settings.title': string;
    'settings.description': string;
    'settings.archived': string;
    'settings.archivedHint': string;
    'settings.staleDays': string;
    'settings.staleDaysHint': string;
    'settings.foreignSubagents': string;
    'settings.foreignSubagentsHint': string;
    'settings.fileDisplay': string;
    'settings.fileDisplayHint': string;
    'settings.flat': string;
    'settings.tree': string;
    'settings.reset': string;
};
/** English dictionary. */
export declare const en: {
    'section.files': string;
    'section.sessions': string;
    'candidate.noCwd': string;
    'time.now': string;
    'time.minutes': string;
    'time.hours': string;
    'time.days': string;
    'time.months': string;
    'time.years': string;
    'settings.title': string;
    'settings.description': string;
    'settings.archived': string;
    'settings.archivedHint': string;
    'settings.staleDays': string;
    'settings.staleDaysHint': string;
    'settings.foreignSubagents': string;
    'settings.foreignSubagentsHint': string;
    'settings.fileDisplay': string;
    'settings.fileDisplayHint': string;
    'settings.flat': string;
    'settings.tree': string;
    'settings.reset': string;
};
/** The better-at locale key union. */
export type BetterAtKey = keyof typeof zh;
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The fast @ reference copy. */
        [NS]: BetterAtKey;
    }
}
