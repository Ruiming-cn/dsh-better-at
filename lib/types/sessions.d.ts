/**
 * Host-side session index built from `ctx.sessionQuery`.
 *
 * `listSessions()` returns the complete logical corpus; `readTitleSnapshots()`
 * folds labels in one batch. Mention strings are generated on the Host because
 * the canonical URI codec uses Node Buffer — it must never cross into the
 * browser bundle.
 *
 * The index carries what the browser needs to apply the user's search scope:
 * the durable origin/parent of a subagent session and the workspace registry's
 * archived set. Filtering itself stays in the browser so a scope change never
 * costs a Host round trip.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { BetterAtSessionIndex } from './contract.ts';
/** Minimal structural face of `sessionQuery` used by this module (tests stub). */
export interface SessionQueryLike {
    listSessions(signal?: AbortSignal): Promise<Array<{
        header: {
            id: SessionId;
            cwd?: string;
            createdAt: number;
            parentSession?: SessionId;
            origin?: 'subagent';
        };
    }>>;
    readTitleSnapshots(ids: readonly string[], signal?: AbortSignal): Promise<Array<{
        status: 'fulfilled' | 'rejected';
        value?: {
            title?: {
                title?: string;
            };
        };
    }>>;
}
/** Minimal structural face of `workspaceRegistry` used by this module (tests stub). */
export interface WorkspaceRegistryLike {
    readonly archivedSessionIds: readonly SessionId[];
}
/**
 * Build the full session candidate index for one Host process.
 * @param ctx - host cordis context (must expose `sessionQuery`).
 * @param signal - caller cancellation.
 */
export declare function buildSessionIndex(ctx: Context, signal: AbortSignal): Promise<BetterAtSessionIndex>;
/** Render the native Markdown mention used by DSH session references. */
export declare function formatSessionMention(sessionId: string, label: string): string;
