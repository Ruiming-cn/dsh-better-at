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
};
/** The better-at locale key union. */
export type BetterAtKey = keyof typeof zh;
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The fast @ reference copy. */
        [NS]: BetterAtKey;
    }
}
