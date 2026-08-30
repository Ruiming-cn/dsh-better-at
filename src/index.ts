/**
 * dsh-better-at host plugin entry.
 *
 * Mounts the `betterAt` Typert Remote service (workspace index + session index).
 * The plugin does not modify the
 * Harness, does not read mentioned file contents, and does not replace the
 * native @ source — the browser half wraps the existing `reference` source's
 * candidate path only.
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
// Type-only: brings the ctx.typert Context merge into this program.
// Type-only: brings ctx.sessionQuery.
import type {} from '@deepseek-ai/dsh-session-query'
import { BetterAtRuntime } from './runtime.ts'
import { DEFAULT_IGNORE_DIRS } from './files.ts'
import type { ResolvedConfig } from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** The Host Remote service backing the local @ reference index. */
    betterAt: BetterAtRuntime
  }
}

/** Cordis plugin name (Loader entry and client bundle id). */
export const name = 'dsh-better-at'

export { BetterAtRuntime } from './runtime.ts'
export type * from './contract.ts'

/** Services required before load: the session index query service. */
export const inject = ['sessionQuery']

export { DEFAULT_IGNORE_DIRS } from './files.ts'

/** Host plugin configuration, validated at load by the Loader. */
export interface Config {
  /** Hard cap on indexed workspace entries; the walk stops and reports truncation. */
  maxEntries: number
  /** Directory basenames the index walk skips entirely. */
  ignoreDirs: string[]
}

/** Configuration schema with deployment-tunable bounds. */
export const Config = z.object({
  maxEntries: z.natural().min(1).default(10_000),
  ignoreDirs: z.array(z.string()).default([...DEFAULT_IGNORE_DIRS]),
})

/**
 * Mount the betterAt service.
 * @param ctx - host cordis context.
 * @param config - validated plugin configuration (schema defaults applied).
 */
export function apply(ctx: Context, config?: Config): void {
  const resolved: ResolvedConfig = Config(config ?? {})
  ctx.plugin(BetterAtRuntime, resolved)
}
