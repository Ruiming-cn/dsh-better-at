/**
 * Host-side session index built from `ctx.sessionQuery`.
 *
 * `listSessions()` returns the complete logical corpus; `readTitleSnapshots()`
 * folds labels in one batch. Mention strings are generated on the Host because
 * the canonical URI codec uses Node Buffer — it must never cross into the
 * browser bundle.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { BetterAtSessionIndex } from './contract.ts';
/** Minimal structural face of `sessionQuery` used by this module (tests stub). */
export interface SessionQueryLike {
    listSessions(signal?: AbortSignal): Promise<Array<{
        header: {
            id: string;
            cwd?: string;
            createdAt: number;
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
/**
 * Build the full session candidate index for one Host process.
 * @param ctx - host cordis context (must expose `sessionQuery`).
 * @param signal - caller cancellation.
 */
export declare function buildSessionIndex(ctx: Context, signal: AbortSignal): Promise<BetterAtSessionIndex>;
/** Render the native Markdown mention used by DSH session references. */
export declare function formatSessionMention(sessionId: string, label: string): string;
