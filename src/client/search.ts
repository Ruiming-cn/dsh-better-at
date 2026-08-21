/**
 * Pure client-side ranking for the fast @ picker.
 *
 * Files are ranked over a cached full workspace index:
 * - empty query / path queries stay hierarchical (direct children),
 * - bare fuzzy queries search basenames across the whole index.
 * Sessions are filtered by substring and then ranked by working-directory
 * affinity, matching the native DSH session-reference order.
 * All functions are side-effect free and unit tested.
 */
import type { BetterAtFileEntry, BetterAtSessionEntry } from '../contract.ts'

/** File rows shown per @ query (native file-reference default cap). */
export const MAX_FILE_CANDIDATES = 20
/** Session rows shown per @ query (native session-reference default cap). */
export const MAX_SESSION_CANDIDATES = 20

/** Rank one workspace entry list for a @ query. */
export function rankFiles(
  files: readonly BetterAtFileEntry[],
  query: string,
  limit = MAX_FILE_CANDIDATES,
): readonly BetterAtFileEntry[] {
  const q = query.trim().replaceAll('\\', '/')
  if (q === '' || q.includes('/')) return listDirectoryEntries(files, q, limit)
  const ranked: Array<{ entry: BetterAtFileEntry; score: number }> = []
  for (const entry of files) {
    if (!q.startsWith('.') && entry.relative.split('/').some(segment => segment.startsWith('.'))) continue
    const name = basenameOf(entry.relative)
    const score = scoreName(name, q)
    if (score < 0) continue
    ranked.push({ entry, score: score + (entry.kind === 'directory' ? 50 : 0) })
  }
  ranked.sort((a, b) =>
    b.score - a.score
    || kindRank(a.entry) - kindRank(b.entry)
    || a.entry.relative.length - b.entry.relative.length
    || (a.entry.relative < b.entry.relative ? -1 : 1))
  return ranked.slice(0, limit).map(row => row.entry)
}

/**
 * Return the direct children of one directory path from the full index.
 * `''` is the workspace root; `'src/'` lists `src`'s direct children.
 */
export function listDirectoryEntries(
  files: readonly BetterAtFileEntry[],
  query: string,
  limit = MAX_FILE_CANDIDATES,
): readonly BetterAtFileEntry[] {
  const normalized = query.replaceAll('\\', '/')
  const prefix = normalized === '' || normalized.endsWith('/')
    ? normalized
    : normalized.slice(0, normalized.lastIndexOf('/') + 1)
  const fragment = normalized.endsWith('/') || normalized === ''
    ? ''
    : normalized.slice(normalized.lastIndexOf('/') + 1)
  const children = files.filter(entry => {
    if (!entry.relative.startsWith(prefix)) return false
    const rest = entry.relative.slice(prefix.length)
    if (rest.includes('/')) return false
    if (rest === '') return false
    if (rest.startsWith('.') && !fragment.startsWith('.')) return false
    return true
  })
  if (fragment === '') {
    return [...children]
      .sort((a, b) => kindRank(a) - kindRank(b) || (a.relative < b.relative ? -1 : 1))
      .slice(0, limit)
  }
  const ranked: Array<{ entry: BetterAtFileEntry; score: number }> = []
  for (const entry of children) {
    const score = scoreName(basenameOf(entry.relative), fragment)
    if (score < 0) continue
    ranked.push({ entry, score: score + (entry.kind === 'directory' ? 25 : 0) })
  }
  ranked.sort((a, b) =>
    b.score - a.score
    || kindRank(a.entry) - kindRank(b.entry)
    || a.entry.relative.length - b.entry.relative.length
    || (a.entry.relative < b.entry.relative ? -1 : 1))
  return ranked.slice(0, limit).map(row => row.entry)
}

/** Rank DSH session candidates: filter then cwd affinity, stable keep original order. */
export function rankSessions(
  sessions: readonly BetterAtSessionEntry[],
  query: string,
  currentCwd: string | undefined,
  limit = MAX_SESSION_CANDIDATES,
): readonly BetterAtSessionEntry[] {
  const needle = query.trim().toLocaleLowerCase()
  const matched = needle === ''
    ? sessions
    : sessions.filter(session =>
      session.sessionId.toLocaleLowerCase().includes(needle)
      || (session.cwd?.toLocaleLowerCase().includes(needle) ?? false)
      || session.label.toLocaleLowerCase().includes(needle))
  return matched
    .map((session, index) => ({ session, index, affinity: affinity(session.cwd, currentCwd) }))
    .sort((a, b) => a.affinity - b.affinity || a.index - b.index)
    .slice(0, limit)
    .map(row => row.session)
}

function scoreName(name: string, query: string): number {
  const lowerName = name.toLocaleLowerCase()
  const lowerQuery = query.toLocaleLowerCase()
  if (lowerName === lowerQuery) return 5000
  if (lowerName.startsWith(lowerQuery)) return 4500 - name.length
  const contained = lowerName.indexOf(lowerQuery)
  if (contained >= 0) return 4000 - contained * 10 - name.length
  let first = -1
  let previous = -1
  let gaps = 0
  let at = 0
  for (const ch of lowerQuery) {
    const found = lowerName.indexOf(ch, at)
    if (found < 0) return -1
    if (first < 0) first = found
    if (previous >= 0) gaps += found - previous - 1
    previous = found
    at = found + 1
  }
  return 3000 - first * 10 - gaps * 5 - name.length
}

function basenameOf(relative: string): string {
  return relative.replaceAll('\\', '/').split('/').at(-1) ?? relative
}

function kindRank(entry: BetterAtFileEntry): number {
  return entry.kind === 'directory' ? 0 : 1
}

function affinity(candidateCwd: string | undefined, targetCwd: string | undefined): number {
  if (candidateCwd !== undefined && targetCwd !== undefined && candidateCwd === targetCwd) return 0
  if (candidateCwd === undefined) return 1
  return 2
}
