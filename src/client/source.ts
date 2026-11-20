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
import type {
  CandidateRequest,
  ClientSessionContext,
  InputTriggerCandidate,
} from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import type { ClientRemote } from '@deepseek-ai/dsh-api-remotes/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type {
  BetterAtFileIndex,
  BetterAtSessionEntry,
  BetterAtSessionIndex,
} from '../contract.ts'
import type { BetterAtKey } from './locales.ts'
import { scopeSessions, type SessionSummaryLike } from './filters.ts'
import type { BetterAtSettings, SettingsStore } from './settings.ts'
import {
  MAX_FILE_CANDIDATES,
  MAX_SESSION_CANDIDATES,
  prepareFiles,
  rankFiles,
  rankSessions,
  type PreparedFile,
} from './search.ts'
import type {} from './remote.ts'

/** The generated mounted betterAt namespace face. */
export type BetterAtRemoteFace = ClientRemote['betterAt']

/** Everything the source factory needs from the browser wiring layer. */
export interface BetterAtSourceDeps {
  /** Live Remote accessor (the namespace mounts asynchronously). */
  getRemote(): BetterAtRemoteFace | undefined
  /** Locale translation function for candidate rows. */
  t(key: BetterAtKey, params?: Record<string, string | number>): string
  /** Browser-local search scope (archived, stale, subagent and display rules). */
  settings: SettingsStore
  /** Client session summaries by id; absent rows fall back to the index snapshot. */
  getSessionSummaries?(): Readonly<Record<string, SessionSummaryLike | undefined>> | undefined
  /** Monotonic clock for cache freshness (default Date.now). */
  now?(): number
}

/** The registered source factory plus cache teardown the wiring layer owns. */
export interface BetterAtSource {
  candidates(session: ClientSessionContext, req: CandidateRequest): Promise<readonly InputTriggerCandidate[]>
  prewarm(session: ClientSessionContext): void
  invalidateAll(): void
}

/** One file-index snapshot plus its keystroke-ready projection. */
interface FileSnapshot {
  readonly index: BetterAtFileIndex
  readonly files: readonly PreparedFile[]
}

/** File index cache TTL per session. */
const FILE_TTL_MS = 30_000
/** Session index cache TTL (global; session metadata churns slowly). */
const SESSION_TTL_MS = 300_000
/** Upper bound on per-session file cache entries kept in memory. */
const FILE_CACHE_MAX_SESSIONS = 100
/** Age bucket thresholds for session rows, mirroring the native row copy. */
const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const MONTH_MS = 30 * DAY_MS
const YEAR_MS = 365 * DAY_MS

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
  const fileCaches = new Map<SessionId, CacheEntry<FileSnapshot>>()
  let sessionCache: CacheEntry<BetterAtSessionIndex> | undefined

  const startFileFetch = (sessionId: SessionId): CacheEntry<FileSnapshot> => {
    const remote = deps.getRemote()
    if (remote === undefined) throw new Error('dsh-better-at: betterAt Remote not mounted')
    const abort = new AbortController()
    const entry: CacheEntry<FileSnapshot> = {
      promise: remote.listFiles(sessionId, abort.signal).then((result: RemoteResult<BetterAtFileIndex>) => {
        if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
        return { index: result.value, files: prepareFiles(result.value.entries) }
      }),
      abort,
      at: now(),
    }
    fileCaches.set(sessionId, entry)
    if (fileCaches.size > FILE_CACHE_MAX_SESSIONS) {
      const oldest = fileCaches.keys().next().value as SessionId | undefined
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

  const getFileIndex = (sessionId: SessionId): Promise<FileSnapshot> => {
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
      promise: remote.listSessions(abort.signal).then((result: RemoteResult<BetterAtSessionIndex>) => {
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
    const [snapshot, sessionIndex] = await Promise.all([
      getFileIndex(session.sessionId),
      getSessionIndex(),
    ])
    if (req.signal.aborted) return []
    const at = now()
    const scope = deps.settings.get()
    const fileRows = rankFiles(snapshot.files, req.query, MAX_FILE_CANDIDATES)
      .flatMap(entry => fileRow(entry, req.quoted === true, scope, deps.t))
    const sessionRows = req.quoted === true
      ? []
      : rankSessions(
        scopeSessions(sessionIndex.entries, {
          settings: scope,
          now: at,
          currentSessionId: session.sessionId,
          summaries: deps.getSessionSummaries?.(),
        }),
        req.query,
        snapshot.index.root,
        MAX_SESSION_CANDIDATES,
      ).map(entry => sessionRow(entry, snapshot.index.root, at, deps.t))
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

/** Project one prepared entry as a native-shaped file or folder row. */
function fileRow(
  file: PreparedFile,
  preserveQuote: boolean,
  settings: BetterAtSettings,
  t: (key: BetterAtKey, params?: Record<string, string | number>) => string,
): readonly InputTriggerCandidate[] {
  const mention = formatFileMention(file.entry.relative, file.entry.kind, preserveQuote)
  if (mention === undefined) return []
  const name = file.isDirectory ? `${file.name}/` : file.name
  const tree = settings.fileDisplay === 'tree'
  const depth = tree ? file.entry.relative.split('/').length - 1 : 0
  return [{
    name: tree ? `${'  '.repeat(depth)}${name}` : name,
    ...(file.parent === '' ? {} : { description: tree ? file.entry.relative : file.parent }),
    icon: file.isDirectory ? 'folder' : 'file',
    section: t('section.files'),
    ...(file.isDirectory ? { drill: true } : {}),
    value: JSON.stringify({ kind: 'file', fileKind: file.entry.kind, label: file.name, mention }),
  }]
}

/** Project one session as a native-shaped session row. */
function sessionRow(
  entry: BetterAtSessionEntry,
  root: string,
  now: number,
  t: (key: BetterAtKey, params?: Record<string, string | number>) => string,
): InputTriggerCandidate {
  const age = formatAge(entry.createdAt, now, t)
  const location = entry.cwd === undefined
    ? t('candidate.noCwd')
    : entry.cwd === root ? undefined : entry.cwd
  return {
    name: entry.label,
    description: location === undefined ? age : `${location} · ${age}`,
    icon: 'session',
    section: t('section.sessions'),
    value: JSON.stringify({ kind: 'session', label: entry.label, mention: entry.mention }),
  }
}

/**
 * Render one session age the way the native session rows do.
 * @param createdAt - session creation time in epoch milliseconds.
 * @param now - current time in epoch milliseconds.
 * @param t - the plugin dictionary.
 */
export function formatAge(
  createdAt: number,
  now: number,
  t: (key: BetterAtKey, params?: Record<string, string | number>) => string,
): string {
  const elapsed = Math.max(0, now - createdAt)
  if (elapsed < MINUTE_MS) return t('time.now')
  if (elapsed < HOUR_MS) return t('time.minutes', { n: Math.floor(elapsed / MINUTE_MS) })
  if (elapsed < DAY_MS) return t('time.hours', { n: Math.floor(elapsed / HOUR_MS) })
  if (elapsed < MONTH_MS) return t('time.days', { n: Math.floor(elapsed / DAY_MS) })
  if (elapsed < YEAR_MS) return t('time.months', { n: Math.floor(elapsed / MONTH_MS) })
  return t('time.years', { n: Math.floor(elapsed / YEAR_MS) })
}

/** Mirror of @deepseek-ai/dsh-file-reference grammar's `formatFileMention`. */
function formatFileMention(
  path: string,
  kind: 'file' | 'directory',
  preserveQuote: boolean,
): string | undefined {
  const text = kind === 'directory' ? `${path}/` : path
  if (/[\u0000-\u001f\u007f-\u009f"]/u.test(text)) return undefined
  const quoted = preserveQuote || /\s/u.test(text)
  if (!quoted) return `@${text}`
  if (kind === 'directory') return `@"${text}`
  return `@"${text}"`
}
