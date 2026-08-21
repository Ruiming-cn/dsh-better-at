/**
 * Workspace file/directory indexing over node:fs.
 *
 * The walk streams directories one entry at a time, follows file and directory
 * symlinks without re-entering an ancestor target, skips configured ignore
 * directories by basename, and hard-stops at the configured entry cap with an
 * honest `truncated` flag. It never reads file contents.
 */
import { opendir, realpath } from 'node:fs/promises'
import type { Dir, Dirent } from 'node:fs'
import { join, relative, sep } from 'node:path'
import type { BetterAtFileEntry } from './contract.ts'

/** Default directory basenames that are never indexed or traversed. */
export const DEFAULT_IGNORE_DIRS = ['.git', 'node_modules'] as const

/** Options for one bounded index pass. */
export interface IndexOptions {
  /** Hard cap on collected file/directory entries. */
  readonly maxEntries: number
  /** Directory basenames the walk skips (children never enqueue). */
  readonly ignoreDirs: readonly string[]
}

/** One index pass result: the sorted entry list plus the truncation flag. */
export interface WorkspaceIndex {
  readonly entries: readonly BetterAtFileEntry[]
  /** True when the walk hit `maxEntries` before the tree was exhausted. */
  readonly truncated: boolean
}

/** Directory opener seam used by the real filesystem and deterministic tests. */
export type OpenWorkspaceDirectory = (path: string) => Promise<Dir>

interface DirectoryTask {
  readonly path: string
  readonly canonical: string
  readonly ancestors: ReadonlySet<string>
}

function raceAbort<T>(operation: Promise<T>, signal: AbortSignal | undefined): Promise<T> {
  if (signal === undefined) return operation
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => {
      operation.catch(() => {})
      reject(asError(signal.reason))
    }
    if (signal.aborted) {
      onAbort()
      return
    }
    signal.addEventListener('abort', onAbort, { once: true })
    operation.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (reason: unknown) => {
        signal.removeEventListener('abort', onAbort)
        reject(asError(reason))
      },
    )
  })
}

function asError(reason: unknown): Error {
  return reason instanceof Error ? reason : new Error(String(reason))
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function displayRelative(root: string, child: string): string {
  return relative(root, child).split(sep).join('/')
}

function closeOrSwallow(handle: Dir, signal: AbortSignal | undefined): Promise<void> {
  const closing = handle.close()
  if (signal?.aborted) {
    closing.catch(() => {})
    return Promise.resolve()
  }
  return closing
}

/**
 * Collect every regular file and directory under `root` (bounded, name-sorted).
 * @param root - workspace root to walk.
 * @param options - cap and ignore list.
 * @param signal - caller lifetime; every filesystem await races it.
 * @param openDirectory - directory opener; defaults to node:fs.
 */
export async function indexWorkspace(
  root: string,
  options: IndexOptions,
  signal?: AbortSignal,
  openDirectory: OpenWorkspaceDirectory = opendir,
): Promise<WorkspaceIndex> {
  const ignoreDirs = new Set(options.ignoreDirs)
  const entries: BetterAtFileEntry[] = []
  let rootCanonical: string
  try {
    rootCanonical = await raceAbort(realpath(root), signal)
  } catch (error: unknown) {
    signal?.throwIfAborted()
    throw new Error(`dsh-better-at: cannot list "${root}": ${messageOf(error)}`)
  }
  const queue: DirectoryTask[] = [{ path: root, canonical: rootCanonical, ancestors: new Set() }]
  let truncated = false
  while (queue.length > 0) {
    signal?.throwIfAborted()
    const task = queue.shift() as DirectoryTask
    const dir = task.path
    if (task.ancestors.has(task.canonical)) continue
    const childAncestors = new Set(task.ancestors)
    childAncestors.add(task.canonical)
    let handle: Dir
    try {
      handle = await raceAbort(openDirectory(dir), signal)
    } catch (error: unknown) {
      signal?.throwIfAborted()
      if (dir === root) throw new Error(`dsh-better-at: cannot list "${dir}": ${messageOf(error)}`)
      console.warn(`[dsh-better-at] skipping unreadable directory "${dir}": ${messageOf(error)}`)
      continue
    }
    try {
      for (;;) {
        let dirent: Dirent | null
        try {
          dirent = await raceAbort(handle.read(), signal)
        } catch (error: unknown) {
          signal?.throwIfAborted()
          console.warn(`[dsh-better-at] stopped reading directory "${dir}": ${messageOf(error)}`)
          break
        }
        if (dirent === null) break
        if (entries.length >= options.maxEntries) {
          truncated = true
          break
        }
        const child = join(dir, dirent.name)
        if (dirent.isSymbolicLink()) {
          // Match native WorkspaceFileSearch: symbolic links are not offered
          // as candidates and are never traversed.
          signal?.throwIfAborted()
          continue
        }
        if (dirent.isDirectory()) {
          if (ignoreDirs.has(dirent.name)) continue
          entries.push({ path: child, relative: displayRelative(root, child), kind: 'directory' })
          queue.push({
            path: child,
            canonical: join(task.canonical, dirent.name),
            ancestors: childAncestors,
          })
          continue
        }
        if (dirent.isFile()) {
          entries.push({ path: child, relative: displayRelative(root, child), kind: 'file' })
        }
      }
    } finally {
      await closeOrSwallow(handle, signal)
    }
    if (truncated) break
  }
  entries.sort((a, b) => (a.relative < b.relative ? -1 : a.relative > b.relative ? 1 : 0))
  return { entries, truncated }
}
