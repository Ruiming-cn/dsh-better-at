/**
 * Pure session-scope filtering for the fast @ picker.
 *
 * The Host index is scope-neutral: it carries archived state and subagent
 * lineage, and this module applies the user's rules against the client session
 * list (which owns `updatedAt` and live running state). Everything here is
 * side-effect free so the settings page and the picker share one definition of
 * "in scope".
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { BetterAtSessionEntry } from '../contract.ts'
import type { BetterAtSettings } from './settings.ts'

/** The subset of the client session summary this filter reads. */
export interface SessionSummaryLike {
  readonly updatedAt?: number
  readonly running?: boolean
}

/** Inputs for one scope pass. */
export interface SessionScopeOptions {
  readonly settings: BetterAtSettings
  /** Current epoch milliseconds. */
  readonly now: number
  /** Session owning the composer; never offered as a candidate. */
  readonly currentSessionId: SessionId
  /** Client session list by id; absent rows fall back to the index snapshot. */
  readonly summaries?: Readonly<Record<string, SessionSummaryLike | undefined>>
}

const DAY_MS = 86_400_000

/**
 * Apply the configured scope to one Host session index.
 * @param entries - complete Host session index.
 * @param options - settings, clock, current session and client summaries.
 * @returns entries that pass every enabled rule, in their original order.
 */
export function scopeSessions(
  entries: readonly BetterAtSessionEntry[],
  options: SessionScopeOptions,
): readonly BetterAtSessionEntry[] {
  const { settings, now, currentSessionId, summaries } = options
  const conversation = conversationSessions(entries, currentSessionId)
  const staleBefore = settings.staleSessionDays > 0
    ? now - settings.staleSessionDays * DAY_MS
    : undefined
  return entries.filter((entry) => {
    if (entry.sessionId === currentSessionId) return false
    if (settings.hideArchivedSessions && entry.archived) return false
    if (settings.hideForeignSubagents && entry.origin === 'subagent' && !conversation.has(entry.sessionId)) return false
    if (staleBefore !== undefined) {
      const summary = summaries?.[entry.sessionId]
      if (summary?.running !== true) {
        const updatedAt = summary?.updatedAt ?? entry.createdAt
        if (updatedAt < staleBefore) return false
      }
    }
    return true
  })
}

/**
 * Collect the current conversation: the session itself plus every subagent
 * descendant reachable through `parentSession` (subagents can nest).
 * @param entries - complete Host session index.
 * @param currentSessionId - the session owning the composer.
 */
export function conversationSessions(
  entries: readonly BetterAtSessionEntry[],
  currentSessionId: SessionId,
): ReadonlySet<string> {
  const members = new Set<string>([currentSessionId])
  let changed = true
  while (changed) {
    changed = false
    for (const entry of entries) {
      if (entry.origin !== 'subagent' || entry.parentSession === undefined) continue
      if (members.has(entry.sessionId) || !members.has(entry.parentSession)) continue
      members.add(entry.sessionId)
      changed = true
    }
  }
  return members
}
