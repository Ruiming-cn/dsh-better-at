/**
 * Client-side Typert Remote contribution for the betterAt Host service.
 * Mounts the shared strict descriptors into `ctx.remote.betterAt`.
 */
import type {
  RemoteResult,
  TypertRemoteContribution,
  TypertRemoteNamespace,
} from '@deepseek-ai/dsh-typert-protocol'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { BETTER_AT_INVOCATIONS } from '../contract.ts'
import type { BetterAtFileIndex, BetterAtSessionIndex } from '../contract.ts'

export type { BetterAtFileEntry, BetterAtFileIndex, BetterAtSessionEntry, BetterAtSessionIndex } from '../contract.ts'

/** The betterAt Remote namespace's client contribution. */
export const BETTER_AT_REMOTE: TypertRemoteContribution = {
  package: 'dsh-better-at',
  descriptors: BETTER_AT_INVOCATIONS,
}

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface TypertRemoteMap {
    'betterAt/listFiles': (agentId: SessionId, signal?: AbortSignal) => Promise<RemoteResult<BetterAtFileIndex>>
    'betterAt/listSessions': (signal?: AbortSignal) => Promise<RemoteResult<BetterAtSessionIndex>>
  }
  interface TypertRemoteNamespaceMap {
    betterAt: TypertRemoteNamespace<'betterAt'>
  }
}
