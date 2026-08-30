/**
 * dsh-better-at host types: the resolved plugin configuration face.
 * Wire contract types live in `contract.ts`.
 */

/** Resolved plugin configuration (schema defaults applied). */
export interface ResolvedConfig {
  /** Hard cap on indexed entries per workspace; the walk stops and reports truncation. */
  readonly maxEntries: number
  /** Directory basenames the index walk skips entirely. */
  readonly ignoreDirs: readonly string[]
}

export type {
  BetterAtFileEntry,
  BetterAtFileIndex,
  BetterAtSessionEntry,
  BetterAtSessionIndex,
} from './contract.ts'
