/**
 * dsh-better-at host plugin entry.
 *
 * Mounts the `betterAt` Typert Remote service (workspace index + session index)
 * and registers its strict Typert manifest. The plugin does not modify the
 * Harness, does not read mentioned file contents, and does not replace the
 * native @ source — the browser half wraps the existing `reference` source's
 * candidate path only.
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
// Type-only: brings the ctx.typert Context merge into this program.
import type {} from '@deepseek-ai/dsh-typert-registry'
// Type-only: brings ctx.agents and Agent types.
import type {} from '@deepseek-ai/dsh-agent'
// Type-only: brings ctx.sessionQuery.
import type {} from '@deepseek-ai/dsh-session-query'
import { BetterAtRuntime } from './runtime.ts'
import { TYPERT_MANIFEST } from './typert.ts'
import { DEFAULT_IGNORE_DIRS } from './files.ts'
import type { ResolvedConfig } from './types.ts'

/** Cordis plugin name (Loader entry and client bundle id). */
export const name = 'dsh-better-at'

/** Services required before load: Typert registry, agent registry, session query. */
export const inject = ['typert', 'agents', 'sessionQuery']

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
 * Mount the betterAt service and register its strict manifest.
 * @param ctx - host cordis context.
 * @param config - validated plugin configuration (schema defaults applied).
 */
export function apply(ctx: Context, config?: Config): void {
  const resolved: ResolvedConfig = Config(config ?? {})
  const runtime = new BetterAtRuntime(ctx, resolved, ctx)
  void runtime
  ctx.effect(() => {
    const dispose = ctx.typert.register(TYPERT_MANIFEST)
    return () => { void dispose() }
  }, 'dsh-better-at: typert manifest')
}
