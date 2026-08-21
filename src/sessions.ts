/**
 * Host-side session index built from `ctx.sessionQuery`.
 *
 * `listSessions()` returns the complete logical corpus; `readTitleSnapshots()`
 * folds labels in one batch. Mention strings are generated on the Host because
 * the canonical URI codec uses Node Buffer — it must never cross into the
 * browser bundle.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { BetterAtSessionIndex, BetterAtSessionEntry } from './contract.ts'

/** Minimal structural face of `sessionQuery` used by this module (tests stub). */
export interface SessionQueryLike {
  listSessions(signal?: AbortSignal): Promise<Array<{ header: { id: string; cwd?: string; createdAt: number } }>>
  readTitleSnapshots(
    ids: readonly string[],
    signal?: AbortSignal,
  ): Promise<Array<{ status: 'fulfilled' | 'rejected'; value?: { title?: { title?: string } } }>>
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
