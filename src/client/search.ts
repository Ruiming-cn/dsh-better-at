/**
 * Pure client-side preparation and ranking for the fast @ picker.
 *
 * `prepareFiles` runs once per index snapshot and stores everything the
 * per-keystroke path needs: basename, lower-cased basename, hidden flag, and
 * parent directory. Typing therefore never re-splits or re-lowercases the same
 * path string again. Ranking keeps only the best `limit` rows instead of
 * sorting every match, which matters on workspaces near the index cap.
 *
 * Files are ranked over the prepared index:
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

/** One indexed entry plus the fields every keystroke reads. */
export interface PreparedFile {
  readonly entry: BetterAtFileEntry
  /** Basename of the workspace-relative path. */
  readonly name: string
  /** Lower-cased basename: the only string scoring compares against. */
  readonly lowerName: string
  readonly isDirectory: boolean
  /** True when any path segment starts with `.`, so the row is hidden by default. */
  readonly hidden: boolean
  /** Parent directory of a nested entry; '' at the workspace root. */
  readonly parent: string
}

interface Ranked {
  readonly file: PreparedFile
  readonly score: number
}

/** Prepare one index snapshot for keystroke-time filtering. */
export function prepareFiles(files: readonly BetterAtFileEntry[]): readonly PreparedFile[] {
  return files.map((entry) => {
    const segments = entry.relative.split('/')
    const name = segments.at(-1) ?? entry.relative
    return {
      entry,
      name,
      lowerName: name.toLocaleLowerCase(),
      isDirectory: entry.kind === 'directory',
      hidden: segments.some(segment => segment.startsWith('.')),
      parent: segments.slice(0, -1).join('/'),
    }
  })
}

/** Rank one prepared index for a @ query. */
export function rankFiles(
  files: readonly PreparedFile[],
  query: string,
  limit = MAX_FILE_CANDIDATES,
): readonly PreparedFile[] {
  const q = query.trim().replaceAll('\\', '/')
  if (q === '' || q.includes('/')) return listDirectoryEntries(files, q, limit)
  const includeHidden = q.startsWith('.')
  const needle = q.toLocaleLowerCase()
  const ranked: Ranked[] = []
  for (const file of files) {
    if (!includeHidden && file.hidden) continue
    const score = scoreName(file.name, file.lowerName, needle)
    if (score < 0) continue
    ranked.push({ file, score: score + (file.isDirectory ? 50 : 0) })
  }
  return selectTop(ranked, limit, compareRanked).map(row => row.file)
}

/**
 * Return the direct children of one directory path from the prepared index.
 * `''` is the workspace root; `'src/'` lists `src`'s direct children.
 */
export function listDirectoryEntries(
  files: readonly PreparedFile[],
  query: string,
  limit = MAX_FILE_CANDIDATES,
): readonly PreparedFile[] {
  const normalized = query.replaceAll('\\', '/')
  const prefix = normalized === '' || normalized.endsWith('/')
    ? normalized
    : normalized.slice(0, normalized.lastIndexOf('/') + 1)
  const fragment = normalized.endsWith('/') || normalized === ''
    ? ''
    : normalized.slice(normalized.lastIndexOf('/') + 1)
  const includeHidden = fragment.startsWith('.')
  const children: PreparedFile[] = []
  for (const file of files) {
    if (!file.entry.relative.startsWith(prefix)) continue
    const rest = file.entry.relative.slice(prefix.length)
    if (rest === '' || rest.includes('/')) continue
    // Only the listed segment decides visibility: descending into `.config/`
    // must not hide the entries below it.
    if (file.name.startsWith('.') && !includeHidden) continue
    children.push(file)
  }
  if (fragment === '') {
    return [...children]
      .sort((a, b) => kindRank(a) - kindRank(b) || (a.entry.relative < b.entry.relative ? -1 : 1))
      .slice(0, limit)
  }
  const needle = fragment.toLocaleLowerCase()
  const ranked: Ranked[] = []
  for (const file of children) {
    const score = scoreName(file.name, file.lowerName, needle)
    if (score < 0) continue
    ranked.push({ file, score: score + (file.isDirectory ? 25 : 0) })
  }
  return selectTop(ranked, limit, compareRanked).map(row => row.file)
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

/**
 * Keep the best `limit` items in comparator order without sorting the rest.
 * Falls back to a plain sort when every candidate fits.
 */
function selectTop<K>(items: K[], limit: number, compare: (a: K, b: K) => number): K[] {
  if (items.length <= limit) return items.sort(compare)
  const top: K[] = []
  for (const item of items) {
    if (top.length === limit && compare(item, top[limit - 1] as K) >= 0) continue
    let low = 0
    let high = top.length
    while (low < high) {
      const middle = (low + high) >> 1
      if (compare(item, top[middle] as K) < 0) high = middle
      else low = middle + 1
    }
    top.splice(low, 0, item)
    if (top.length > limit) top.pop()
  }
  return top
}

function compareRanked(a: Ranked, b: Ranked): number {
  return b.score - a.score
    || kindRank(a.file) - kindRank(b.file)
    || a.file.entry.relative.length - b.file.entry.relative.length
    || (a.file.entry.relative < b.file.entry.relative ? -1 : 1)
}

function scoreName(name: string, lowerName: string, lowerQuery: string): number {
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

function kindRank(file: PreparedFile): number {
  return file.isDirectory ? 0 : 1
}

function affinity(candidateCwd: string | undefined, targetCwd: string | undefined): number {
  if (candidateCwd !== undefined && targetCwd !== undefined && candidateCwd === targetCwd) return 0
  if (candidateCwd === undefined) return 1
  return 2
}
