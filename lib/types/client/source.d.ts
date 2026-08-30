/**
 * Browser half of the fast @ source: per-session file cache, global session
 * cache, stale-while-revalidate, and candidate row projection that matches the
 * native `reference` source's value shape exactly.
 *
 * This module never registers its own input-trigger source; the client entry
 * wraps the existing native `reference` source's `candidates`/`warm` and keeps
 * its `onPick`/`codec` untouched.
 */
import type { CandidateRequest, ClientSessionContext, InputTriggerCandidate } from '@deepseek-ai/dsh-client-ui-input-trigger/client';
import type { ClientRemote } from '@deepseek-ai/dsh-api-remotes/client';
/** The generated mounted betterAt namespace face. */
export type BetterAtRemoteFace = ClientRemote['betterAt'];
/** Everything the source factory needs from the browser wiring layer. */
export interface BetterAtSourceDeps {
    /** Live Remote accessor (the namespace mounts asynchronously). */
    getRemote(): BetterAtRemoteFace | undefined;
    /** Locale translation function for candidate rows. */
    t(key: string): string;
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
