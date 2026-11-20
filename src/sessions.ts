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
import type { Context } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { BetterAtSessionIndex, BetterAtSessionEntry } from './contract.ts'

/** Minimal structural face of `sessionQuery` used by this module (tests stub). */
export interface SessionQueryLike {
  listSessions(signal?: AbortSignal): Promise<Array<{
    header: {
      id: SessionId
      cwd?: string
      createdAt: number
      parentSession?: SessionId
      origin?: 'subagent'
    }
  }>>
  readTitleSnapshots(
    ids: readonly string[],
    signal?: AbortSignal,
  ): Promise<Array<{ status: 'fulfilled' | 'rejected'; value?: { title?: { title?: string } } }>>
}

/** Minimal structural face of `workspaceRegistry` used by this module (tests stub). */
export interface WorkspaceRegistryLike {
  readonly archivedSessionIds: readonly SessionId[]
}

/**
 * Build the full session candidate index for one Host process.
 * @param ctx - host cordis context (must expose `sessionQuery`).
 * @param signal - caller cancellation.
 */
export async function buildSessionIndex(ctx: Context, signal: AbortSignal): Promise<BetterAtSessionIndex> {
  const sessionQuery = ctx.get('sessionQuery') as SessionQueryLike | undefined
  if (sessionQuery === undefined) {
    throw new Error('dsh-better-at: sessionQuery service is unavailable')
  }
  const records = await sessionQuery.listSessions(signal)
  const observations = await sessionQuery.readTitleSnapshots(records.map(record => record.header.id), signal)
  const registry = ctx.get('workspaceRegistry') as WorkspaceRegistryLike | undefined
  const archived = new Set<string>(registry?.archivedSessionIds ?? [])
  const entries: readonly BetterAtSessionEntry[] = records.map((record, index) => {
    const observation = observations[index] as { status?: string; value?: { title?: { title?: string } } } | undefined
    const label = observation?.status === 'fulfilled'
      ? observation.value?.title?.title ?? record.header.id
      : record.header.id
    return {
      sessionId: record.header.id,
      label,
      ...record.header.cwd === undefined ? {} : { cwd: record.header.cwd },
      createdAt: record.header.createdAt,
      mention: formatSessionMention(record.header.id, label),
      ...record.header.origin === undefined ? {} : { origin: record.header.origin },
      ...record.header.parentSession === undefined ? {} : { parentSession: record.header.parentSession },
      archived: archived.has(record.header.id),
    }
  })
  return { entries }
}

/** Canonical `dsh-session:` URI: base64url(JSON.stringify(sessionId)). */
function encodeSessionReferenceUri(sessionId: string): string {
  const payload = Buffer.from(JSON.stringify(sessionId), 'utf8').toString('base64url')
  return `dsh-session:${payload}`
}

/** Render the native Markdown mention used by DSH session references. */
export function formatSessionMention(sessionId: string, label: string): string {
  const escaped = label.replace(/[\\\]]/gu, match => `\\${match}`)
  return `@[${escaped}](${encodeSessionReferenceUri(sessionId)})`
}
