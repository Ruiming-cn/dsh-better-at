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
import type { BetterAtFileIndex, BetterAtSessionIndex } from '../contract.ts';
/** Structural Remote result shape (no generated protocol import in the client bundle). */
export type BetterAtRemoteResult<T> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: {
        code: string;
        message: string;
    };
};
/** The mounted betterAt namespace face. */
export interface BetterAtRemoteFace {
    listFiles(agentId: string, signal?: AbortSignal): Promise<BetterAtRemoteResult<BetterAtFileIndex>>;
    listSessions(signal?: AbortSignal): Promise<BetterAtRemoteResult<BetterAtSessionIndex>>;
}
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
