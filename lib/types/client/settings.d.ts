/**
 * Browser-local search scope for the fast @ picker.
 *
 * The scope belongs to the browser, not the Host: every rule is applied while
 * filtering the cached indexes, so toggling a rule never costs a Host round
 * trip. Values are validated on read, so a hand-edited or stale localStorage
 * entry can never disable the picker.
 */
/** How file candidates present their workspace path. */
export type FileDisplay = 'flat' | 'tree';
/** One complete search scope. */
export interface BetterAtSettings {
    /** Drop sessions the workspace registry archives. */
    readonly hideArchivedSessions: boolean;
    /** Drop sessions with no activity in this many days; `0` disables the rule. */
    readonly staleSessionDays: number;
    /** Drop subagent sessions that do not descend from the current conversation. */
    readonly hideForeignSubagents: boolean;
    /** Present file paths flat (basename + parent) or as an indented tree. */
    readonly fileDisplay: FileDisplay;
}
/** Defaults chosen so the picker is quiet out of the box. */
export declare const DEFAULT_SETTINGS: BetterAtSettings;
/** Upper bound accepted for the stale-session rule (ten years). */
export declare const MAX_STALE_DAYS = 3650;
/** The subset of `Storage` this module needs (tests pass a fake). */
export interface SettingsStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem?(key: string): void;
}
/** Reader/writer face consumed by the picker and the settings page. */
export interface SettingsStore {
    get(): BetterAtSettings;
    update(patch: Partial<BetterAtSettings>): void;
    reset(): void;
    subscribe(listener: () => void): () => void;
}
/**
 * Coerce one untrusted settings object into a complete, valid scope.
 * @param value - parsed JSON or any other untrusted value.
 * @returns the validated settings, falling back per field.
 */
export declare function normalizeSettings(value: unknown): BetterAtSettings;
/**
 * Create the settings store. A missing storage keeps the scope in memory for
 * this page lifetime, which is still useful and never throws.
 * @param storage - persistence seam; defaults to `window.localStorage`.
 */
export declare function createSettingsStore(storage?: SettingsStorage | undefined): SettingsStore;
