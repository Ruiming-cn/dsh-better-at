/**
 * Pure session-scope filtering for the fast @ picker.
 *
 * The Host index is scope-neutral: it carries archived state and subagent
 * lineage, and this module applies the user's rules against the client session
 * list (which owns `updatedAt` and live running state). Everything here is
 * side-effect free so the settings page and the picker share one definition of
 * "in scope".
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { BetterAtSessionEntry } from '../contract.ts';
import type { BetterAtSettings } from './settings.ts';
/** The subset of the client session summary this filter reads. */
export interface SessionSummaryLike {
    readonly updatedAt?: number;
    readonly running?: boolean;
}
/** Inputs for one scope pass. */
export interface SessionScopeOptions {
    readonly settings: BetterAtSettings;
    /** Current epoch milliseconds. */
    readonly now: number;
    /** Session owning the composer; never offered as a candidate. */
    readonly currentSessionId: SessionId;
    /** Client session list by id; absent rows fall back to the index snapshot. */
    readonly summaries?: Readonly<Record<string, SessionSummaryLike | undefined>>;
}
/**
 * Apply the configured scope to one Host session index.
 * @param entries - complete Host session index.
 * @param options - settings, clock, current session and client summaries.
 * @returns entries that pass every enabled rule, in their original order.
 */
export declare function scopeSessions(entries: readonly BetterAtSessionEntry[], options: SessionScopeOptions): readonly BetterAtSessionEntry[];
/**
 * Collect the current conversation: the session itself plus every subagent
 * descendant reachable through `parentSession` (subagents can nest).
 * @param entries - complete Host session index.
 * @param currentSessionId - the session owning the composer.
 */
export declare function conversationSessions(entries: readonly BetterAtSessionEntry[], currentSessionId: SessionId): ReadonlySet<string>;
