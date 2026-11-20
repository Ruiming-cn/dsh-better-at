/**
 * dsh-better-at wire contract: types, boundary schemas and strict Typert
 * invocation descriptors shared verbatim by the Host manifest and the browser
 * Remote.
 *
 * The `betterAt` namespace exposes two read-only indices:
 * - `listFiles`: bounded workspace tree containing files and directories.
 * - `listSessions`: full DSH session metadata with canonical mentions.
 * No file contents or conversation bodies cross this boundary.
 *
 * The schemas are hand-written rather than generated: the Typert strict codec
 * only consumes `parse()`, and two small shapes do not justify shipping a
 * general validator into the browser bundle.
 */
import type { InvocationDescriptor, TypertSchema } from '@deepseek-ai/dsh-typert-protocol';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
/** One indexed workspace entry (a file or a directory), with display paths. */
export interface BetterAtFileEntry {
    readonly path: string;
    readonly relative: string;
    readonly kind: 'file' | 'directory';
}
/** One workspace index snapshot returned to the browser picker. */
export interface BetterAtFileIndex {
    readonly root: string;
    readonly entries: readonly BetterAtFileEntry[];
    readonly truncated: boolean;
}
/** One DSH session candidate with a canonical model-facing mention. */
export interface BetterAtSessionEntry {
    readonly sessionId: SessionId;
    readonly label: string;
    readonly cwd?: string;
    readonly createdAt: number;
    readonly mention: string;
    /** Durable coarse origin: present only for a session created as a subagent child. */
    readonly origin?: 'subagent';
    /** Direct creator of a subagent session; absent for top-level sessions and forks. */
    readonly parentSession?: SessionId;
    /** Whether the workspace registry currently archives this session. */
    readonly archived: boolean;
}
/** One full session index snapshot returned to the browser picker. */
export interface BetterAtSessionIndex {
    readonly entries: readonly BetterAtSessionEntry[];
}
/** Wire codec: one agent/session identity. */
export declare const sessionIdSchema: TypertSchema<string>;
/** Wire codec: one workspace entry. */
export declare const betterAtFileEntrySchema: TypertSchema<BetterAtFileEntry>;
/** Wire codec: one workspace index snapshot. */
export declare const betterAtFileIndexSchema: TypertSchema<BetterAtFileIndex>;
/** Wire codec: one session candidate. */
export declare const betterAtSessionEntrySchema: TypertSchema<BetterAtSessionEntry>;
/** Wire codec: one full session index snapshot. */
export declare const betterAtSessionIndexSchema: TypertSchema<BetterAtSessionIndex>;
/** Strict invocation descriptors for the `betterAt` Remote namespace. */
export declare const BETTER_AT_INVOCATIONS: readonly InvocationDescriptor[];
