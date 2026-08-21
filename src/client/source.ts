/**
 * Browser half of the fast @ source: per-session file cache, global session
 * cache, stale-while-revalidate, and candidate row projection that matches the
 * native `reference` source's value shape exactly.
 *
 * This module never registers its own input-trigger source; the client entry
 * wraps the existing native `reference` source's `candidates`/`warm` and keeps
 * its `onPick`/`codec` untouched.
 */
import type {
  CandidateRequest,
  ClientSessionContext,
  InputTriggerCandidate,
} from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import type {
  BetterAtFileEntry,
  BetterAtFileIndex,
  BetterAtSessionEntry,
  BetterAtSessionIndex,
} from '../contract.ts'
import { MAX_FILE_CANDIDATES, MAX_SESSION_CANDIDATES, rankFiles, rankSessions } from './search.ts'

/** Structural Remote result shape (no generated protocol import in the client bundle). */
export type BetterAtRemoteResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string } }

/** The mounted betterAt namespace face. */
export interface BetterAtRemoteFace {
  listFiles(agentId: string, signal?: AbortSignal): Promise<BetterAtRemoteResult<BetterAtFileIndex>>
  listSessions(signal?: AbortSignal): Promise<BetterAtRemoteResult<BetterAtSessionIndex>>
}

/** Everything the source factory needs from the browser wiring layer. */
export interface BetterAtSourceDeps {
  /** Live Remote accessor (the namespace mounts asynchronously). */
  getRemote(): BetterAtRemoteFace | undefined
  /** Locale translation function for candidate rows. */
  t(key: string): string
  /** Monotonic clock for cache freshness (default Date.now). */
  now?(): number
}

/** The registered source factory plus cache teardown the wiring layer owns. */
export interface BetterAtSource {
  candidates(session: ClientSessionContext, req: CandidateRequest): Promise<readonly InputTriggerCandidate[]>
  prewarm(session: ClientSessionContext): void
  invalidateAll(): void
}

/** File index cache TTL per session. */
const FILE_TTL_MS = 30_000
/** Session index cache TTL (global; session metadata churns slowly). */
const SESSION_TTL_MS = 300_000
/** Upper bound on per-session file cache entries kept in memory. */
const FILE_CACHE_MAX_SESSIONS = 100

interface CacheEntry<T> {
  promise: Promise<T>
  readonly abort: AbortController
  settled?: T
  readonly at: number
}

/**
 * Create the fast candidates implementation.
 * @param deps - remote accessor, locale, and clock.
 */
export function createBetterAtSource(deps: BetterAtSourceDeps): BetterAtSource {
  const now = deps.now ?? (() => Date.now())
  const fileCaches = new Map<string, CacheEntry<BetterAtFileIndex>>()
  let sessionCache: CacheEntry<BetterAtSessionIndex> | undefined

  const startFileFetch = (sessionId: string): CacheEntry<BetterAtFileIndex> => {
    const remote = deps.getRemote()
    if (remote === undefined) throw new Error('dsh-better-at: betterAt Remote not mounted')
    const abort = new AbortController()
    const entry: CacheEntry<BetterAtFileIndex> = {
      promise: remote.listFiles(sessionId, abort.signal).then(result => {
        if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
        return result.value
      }),
      abort,
      at: now(),
    }
    fileCaches.set(sessionId, entry)
    if (fileCaches.size > FILE_CACHE_MAX_SESSIONS) {
      const oldest = fileCaches.keys().next().value as string | undefined
      if (oldest !== undefined) {
        const old = fileCaches.get(oldest)
        old?.abort.abort()
        fileCaches.delete(oldest)
      }
    }
    entry.promise.then(
      value => { entry.settled = value },
      () => { if (fileCaches.get(sessionId) === entry) fileCaches.delete(sessionId) },
    )
    return entry
  }

  const getFileIndex = (sessionId: string): Promise<BetterAtFileIndex> => {
    const existing = fileCaches.get(sessionId)
    if (existing !== undefined) {
      if (existing.settled !== undefined) {
        if (now() - existing.at < FILE_TTL_MS) return Promise.resolve(existing.settled)
        // Stale: refresh in the background and keep serving the old snapshot.
        void startFileFetch(sessionId).promise.catch(() => {})
        return Promise.resolve(existing.settled)
      }
      return existing.promise
    }
    return startFileFetch(sessionId).promise
  }

  const startSessionFetch = (): CacheEntry<BetterAtSessionIndex> => {
    const remote = deps.getRemote()
    if (remote === undefined) throw new Error('dsh-better-at: betterAt Remote not mounted')
    const abort = new AbortController()
    const entry: CacheEntry<BetterAtSessionIndex> = {
      promise: remote.listSessions(abort.signal).then(result => {
        if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
        return result.value
      }),
      abort,
      at: now(),
    }
    sessionCache = entry
    entry.promise.then(
      value => { entry.settled = value },
      () => { if (sessionCache === entry) sessionCache = undefined },
    )
    return entry
  }

  const getSessionIndex = (): Promise<BetterAtSessionIndex> => {
    const existing = sessionCache
    if (existing !== undefined) {
      if (existing.settled !== undefined) {
        if (now() - existing.at < SESSION_TTL_MS) return Promise.resolve(existing.settled)
        void startSessionFetch().promise.catch(() => {})
        return Promise.resolve(existing.settled)
      }
      return existing.promise
    }
    return startSessionFetch().promise
  }

  const candidates = async (
    session: ClientSessionContext,
    req: CandidateRequest,
  ): Promise<readonly InputTriggerCandidate[]> => {
    const [fileIndex, sessionIndex] = await Promise.all([
      getFileIndex(session.sessionId),
      getSessionIndex(),
    ])
    if (req.signal.aborted) return []
    const fileRows = rankFiles(fileIndex.entries, req.query, MAX_FILE_CANDIDATES)
      .flatMap(entry => fileRow(entry, req.quoted === true, deps.t))
    const sessionRows = req.quoted === true
      ? []
      : rankSessions(
        sessionIndex.entries.filter(entry => entry.sessionId !== session.sessionId),
        req.query,
        fileIndex.root,
        MAX_SESSION_CANDIDATES,
      ).map(entry => sessionRow(entry, deps.t))
    return [...fileRows, ...sessionRows]
  }

  const prewarm = (session: ClientSessionContext): void => {
    void getFileIndex(session.sessionId).catch(() => {})
    void getSessionIndex().catch(() => {})
  }

  const invalidateAll = (): void => {
    for (const [key, entry] of fileCaches) {
      fileCaches.delete(key)
      entry.abort.abort()
    }
    if (sessionCache !== undefined) {
      sessionCache.abort.abort()
      sessionCache = undefined
    }
  }

  return { candidates, prewarm, invalidateAll }
}

function fileRow(
  entry: BetterAtFileEntry,
  preserveQuote: boolean,
  t: (key: string) => string,
): readonly InputTriggerCandidate[] {
  const mention = formatFileMention(entry.relative, entry.kind, preserveQuote)
  if (mention === undefined) return []
  const name = basenameOf(entry.relative)
  const isDir = entry.kind === 'directory'
  const value = {
    kind: 'file',
    fileKind: entry.kind,
    label: name,
    mention,
  }
  return [{
    name: `${t(isDir ? 'candidate.folder' : 'candidate.file')} · ${name}${isDir ? '/' : ''}`,
    description: entry.relative,
    section: t('section.files'),
    value: JSON.stringify(value),
  }]
}

function sessionRow(entry: BetterAtSessionEntry, t: (key: string) => string): InputTriggerCandidate {
  const location = entry.cwd ?? t('candidate.noCwd')
  const description = `${entry.label === entry.sessionId ? '' : `${entry.sessionId} · `}${location} · ${new Date(entry.createdAt).toISOString()}`
  return {
    name: `${t('candidate.session')} · ${entry.label}`,
    description,
    section: t('section.sessions'),
    value: JSON.stringify({
      kind: 'session',
      label: entry.label,
      mention: entry.mention,
    }),
  }
}

function basenameOf(relative: string): string {
  return relative.replaceAll('\\', '/').split('/').at(-1) ?? relative
}

/** Mirror of @deepseek-ai/dsh-file-reference grammar's `formatFileMention`. */
function formatFileMention(
  path: string,
  kind: BetterAtFileEntry['kind'],
  preserveQuote: boolean,
): string | undefined {
  const text = kind === 'directory' ? `${path}/` : path
  if (/[\u0000-\u001f\u007f-\u009f"]/u.test(text)) return undefined
  const quoted = preserveQuote || /\s/u.test(text)
  if (!quoted) return `@${text}`
  if (kind === 'directory') return `@"${text}`
  return `@"${text}"`
}
