/**
 * Client-side Typert Remote contribution for the betterAt Host service.
 * Mounts the shared strict descriptors into `ctx.remote.betterAt`.
 */
import type { RemoteResult, TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol';
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client';
import type { BetterAtFileIndex, BetterAtSessionIndex } from '../contract.ts';
export type { BetterAtFileEntry, BetterAtFileIndex, BetterAtSessionEntry, BetterAtSessionIndex } from '../contract.ts';
/** The betterAt Remote namespace's client contribution. */
export declare const BETTER_AT_REMOTE: TypertRemoteContribution;
declare module '@deepseek-ai/dsh-typert-protocol' {
    interface TypertRemoteNamespace$betterAt {
        listFiles: (agentId: SessionId, signal?: AbortSignal) => Promise<RemoteResult<BetterAtFileIndex>>;
        listSessions: (signal?: AbortSignal) => Promise<RemoteResult<BetterAtSessionIndex>>;
    }
    interface TypertRemoteMap {
        'betterAt/listFiles': (agentId: SessionId, signal?: AbortSignal) => Promise<RemoteResult<BetterAtFileIndex>>;
        'betterAt/listSessions': (signal?: AbortSignal) => Promise<RemoteResult<BetterAtSessionIndex>>;
    }
    interface TypertRemoteNamespaceMap {
        betterAt: TypertRemoteNamespace$betterAt;
    }
}
