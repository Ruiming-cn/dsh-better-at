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
import type { BetterAtFileEntry, BetterAtSessionEntry } from '../contract.ts';
/** File rows shown per @ query (native file-reference default cap). */
export declare const MAX_FILE_CANDIDATES = 20;
/** Session rows shown per @ query (native session-reference default cap). */
export declare const MAX_SESSION_CANDIDATES = 20;
/** One indexed entry plus the fields every keystroke reads. */
export interface PreparedFile {
    readonly entry: BetterAtFileEntry;
    /** Basename of the workspace-relative path. */
    readonly name: string;
    /** Lower-cased basename: the only string scoring compares against. */
    readonly lowerName: string;
    readonly isDirectory: boolean;
    /** True when any path segment starts with `.`, so the row is hidden by default. */
    readonly hidden: boolean;
    /** Parent directory of a nested entry; '' at the workspace root. */
    readonly parent: string;
}
/** Prepare one index snapshot for keystroke-time filtering. */
export declare function prepareFiles(files: readonly BetterAtFileEntry[]): readonly PreparedFile[];
/** Rank one prepared index for a @ query. */
export declare function rankFiles(files: readonly PreparedFile[], query: string, limit?: number): readonly PreparedFile[];
/**
 * Return the direct children of one directory path from the prepared index.
 * `''` is the workspace root; `'src/'` lists `src`'s direct children.
 */
export declare function listDirectoryEntries(files: readonly PreparedFile[], query: string, limit?: number): readonly PreparedFile[];
/** Rank DSH session candidates: filter then cwd affinity, stable keep original order. */
export declare function rankSessions(sessions: readonly BetterAtSessionEntry[], query: string, currentCwd: string | undefined, limit?: number): readonly BetterAtSessionEntry[];
