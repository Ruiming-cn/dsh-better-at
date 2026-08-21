/**
 * The dsh-better-at host Remote service (`ctx.betterAt`, wire namespace
 * `betterAt`). It exposes two read-only snapshots:
 * - `listFiles`: bounded workspace tree for the fast local file picker.
 * - `listSessions`: full DSH session metadata plus canonical mentions.
 *
 * File contents and conversation bodies never cross this boundary.
 */
import type { Context } from '@deepseek-ai/cordis'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { BetterAtFileIndex, BetterAtSessionIndex } from './contract.ts'
import { indexWorkspace } from './files.ts'
import { buildSessionIndex } from './sessions.ts'
import type { ResolvedConfig } from './types.ts'

/** Read-only betterAt service exposed to the Web client. */
export class BetterAtRuntime extends TypertRemoteService {
  constructor(
    ctx: Context,
    private readonly config: ResolvedConfig,
    private readonly context: Context,
  ) {
    super(ctx, 'betterAt')
  }

  /** Return the bounded workspace index for the addressed agent. */
  @Remote
  async listFiles(agent: Agent, signal: AbortSignal): Promise<BetterAtFileIndex> {
    const cwd = agent.session.header.cwd ?? process.cwd()
    const result = await indexWorkspace(cwd, {
      maxEntries: this.config.maxEntries,
      ignoreDirs: this.config.ignoreDirs,
    }, signal)
    return { root: cwd, entries: result.entries, truncated: result.truncated }
  }

  /** Return the full DSH session index with canonical mentions. */
  @Remote
  async listSessions(signal: AbortSignal): Promise<BetterAtSessionIndex> {
    return buildSessionIndex(this.context, signal)
  }
}
