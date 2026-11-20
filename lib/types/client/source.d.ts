/**
 * Browser half of the fast @ source: per-session file cache, global session
 * cache, stale-while-revalidate, and candidate row projection that matches the
 * native `reference` source's value shape exactly.
 *
 * The file index is prepared once per snapshot (`prepareFiles`), so keystrokes
 * only score prepared rows. Rows mirror the native source: a bare name, a
 * parent directory when nested, an icon, and `drill` for folders so Tab descends
 * instead of settling the folder.
 *
 * This module never registers its own input-trigger source; the client entry
 * wraps the existing native `reference` source's `candidates`/`warm` and keeps
 * its `onPick`/`codec` untouched.
 */
import type { CandidateRequest, ClientSessionContext, InputTriggerCandidate } from '@deepseek-ai/dsh-client-ui-input-trigger/client';
import type { ClientRemote } from '@deepseek-ai/dsh-api-remotes/client';
import type { BetterAtKey } from './locales.ts';
import { type SessionSummaryLike } from './filters.ts';
import type { SettingsStore } from './settings.ts';
/** The generated mounted betterAt namespace face. */
export type BetterAtRemoteFace = ClientRemote['betterAt'];
/** Everything the source factory needs from the browser wiring layer. */
export interface BetterAtSourceDeps {
    /** Live Remote accessor (the namespace mounts asynchronously). */
    getRemote(): BetterAtRemoteFace | undefined;
    /** Locale translation function for candidate rows. */
    t(key: BetterAtKey, params?: Record<string, string | number>): string;
    /** Browser-local search scope (archived, stale, subagent and display rules). */
    settings: SettingsStore;
    /** Client session summaries by id; absent rows fall back to the index snapshot. */
    getSessionSummaries?(): Readonly<Record<string, SessionSummaryLike | undefined>> | undefined;
    /** Monotonic clock for cache freshness (default Date.now). */
    now?(): number;
}
/** The registered source factory plus cache teardown the wiring layer owns. */
export interface BetterAtSource {
    candidates(session: ClientSessionContext, req: CandidateRequest): Promise<readonly InputTriggerCandidate[]>;
    prewarm(session: ClientSessionContext): void;
    invalidateAll(): void;
}
/**
 * Create the fast candidates implementation.
 * @param deps - remote accessor, locale, and clock.
 */
export declare function createBetterAtSource(deps: BetterAtSourceDeps): BetterAtSource;
/**
 * Render one session age the way the native session rows do.
 * @param createdAt - session creation time in epoch milliseconds.
 * @param now - current time in epoch milliseconds.
 * @param t - the plugin dictionary.
 */
export declare function formatAge(createdAt: number, now: number, t: (key: BetterAtKey, params?: Record<string, string | number>) => string): string;
