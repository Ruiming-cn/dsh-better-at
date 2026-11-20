/**
 * Settings page for the @ search scope.
 *
 * Rendered as one `settings.section` React contribution so the rules live
 * where every other preference lives. The page writes straight into the shared
 * browser-local store; the picker reads that store on each candidates call, so
 * a change applies to the next `@` without reloading the page.
 */
import { type ReactElement } from 'react';
import type { BetterAtKey } from './locales.ts';
import { type SettingsStore } from './settings.ts';
/** Translate function passed by the client wiring layer. */
type Translate = (key: BetterAtKey, params?: Record<string, string | number>) => string;
/** Props injected by the slot registration. */
export interface ScopeSectionProps {
    readonly store: SettingsStore;
    readonly t: Translate;
}
/** The @ search scope settings page. */
export declare function ScopeSection({ store, t }: ScopeSectionProps): ReactElement;
export {};
