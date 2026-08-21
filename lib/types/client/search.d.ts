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
import type { BetterAtFileEntry, BetterAtSessionEntry } from '../contract.ts';
/** File rows shown per @ query (native file-reference default cap). */
export declare const MAX_FILE_CANDIDATES = 20;
/** Session rows shown per @ query (native session-reference default cap). */
export declare const MAX_SESSION_CANDIDATES = 20;
/** Rank one workspace entry list for a @ query. */
export declare function rankFiles(files: readonly BetterAtFileEntry[], query: string, limit?: number): readonly BetterAtFileEntry[];
/**
 * Return the direct children of one directory path from the full index.
 * `''` is the workspace root; `'src/'` lists `src`'s direct children.
 */
export declare function listDirectoryEntries(files: readonly BetterAtFileEntry[], query: string, limit?: number): readonly BetterAtFileEntry[];
/** Rank DSH session candidates: filter then cwd affinity, stable keep original order. */
export declare function rankSessions(sessions: readonly BetterAtSessionEntry[], query: string, currentCwd: string | undefined, limit?: number): readonly BetterAtSessionEntry[];
