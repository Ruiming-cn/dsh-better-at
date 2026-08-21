import type { Dir } from 'node:fs';
import type { BetterAtFileEntry } from './contract.ts';
/** Default directory basenames that are never indexed or traversed. */
export declare const DEFAULT_IGNORE_DIRS: readonly [".git", "node_modules"];
/** Options for one bounded index pass. */
export interface IndexOptions {
    /** Hard cap on collected file/directory entries. */
    readonly maxEntries: number;
    /** Directory basenames the walk skips (children never enqueue). */
    readonly ignoreDirs: readonly string[];
}
/** One index pass result: the sorted entry list plus the truncation flag. */
export interface WorkspaceIndex {
    readonly entries: readonly BetterAtFileEntry[];
    /** True when the walk hit `maxEntries` before the tree was exhausted. */
    readonly truncated: boolean;
}
/** Directory opener seam used by the real filesystem and deterministic tests. */
export type OpenWorkspaceDirectory = (path: string) => Promise<Dir>;
/**
 * Collect every regular file and directory under `root` (bounded, name-sorted).
 * @param root - workspace root to walk.
 * @param options - cap and ignore list.
 * @param signal - caller lifetime; every filesystem await races it.
 * @param openDirectory - directory opener; defaults to node:fs.
 */
export declare function indexWorkspace(root: string, options: IndexOptions, signal?: AbortSignal, openDirectory?: OpenWorkspaceDirectory): Promise<WorkspaceIndex>;
