/**
 * The dsh-better-at host Remote service (`ctx.betterAt`, wire namespace
 * `betterAt`). It exposes two read-only snapshots:
 * - `listFiles`: bounded workspace tree for the fast local file picker.
 * - `listSessions`: full DSH session metadata plus canonical mentions.
 *
 * File contents and conversation bodies never cross this boundary.
 */
import type { Context } from '@deepseek-ai/cordis';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { BetterAtFileIndex, BetterAtSessionIndex } from './contract.ts';
import type { ResolvedConfig } from './types.ts';
/** Read-only betterAt service exposed to the Web client. */
export declare class BetterAtRuntime extends TypertRemoteService {
    private readonly config;
    constructor(ctx: Context, config: ResolvedConfig);
    /** Return the bounded workspace index for the addressed agent. */
    listFiles(agent: Agent, signal: AbortSignal): Promise<BetterAtFileIndex>;
    /** Return the full DSH session index with canonical mentions. */
    listSessions(signal: AbortSignal): Promise<BetterAtSessionIndex>;
}
