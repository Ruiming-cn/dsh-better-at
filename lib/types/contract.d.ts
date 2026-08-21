/**
 * dsh-better-at wire contract: types, zod codecs and strict Typert invocation
 * descriptors shared verbatim by the Host manifest and the browser Remote.
 *
 * The `betterAt` namespace exposes two read-only indices:
 * - `listFiles`: bounded workspace tree containing files and directories.
 * - `listSessions`: full DSH session metadata with canonical mentions.
 * No file contents or conversation bodies cross this boundary.
 */
import { z } from 'zod';
import type { InvocationDescriptor } from '@deepseek-ai/dsh-typert-protocol';
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
    readonly sessionId: string;
    readonly label: string;
    readonly cwd?: string;
    readonly createdAt: number;
    readonly mention: string;
}
/** One full session index snapshot returned to the browser picker. */
export interface BetterAtSessionIndex {
    readonly entries: readonly BetterAtSessionEntry[];
}
/** Wire codec: one agent/session identity. */
export declare const sessionIdSchema: z.ZodString;
/** Wire codec: one workspace entry. */
export declare const betterAtFileEntrySchema: z.ZodReadonly<z.ZodObject<{
    path: z.ZodString;
    relative: z.ZodString;
    kind: z.ZodEnum<{
        file: "file";
        directory: "directory";
    }>;
}, z.core.$strip>>;
/** Wire codec: one workspace index snapshot. */
export declare const betterAtFileIndexSchema: z.ZodReadonly<z.ZodObject<{
    root: z.ZodString;
    entries: z.ZodArray<z.ZodReadonly<z.ZodObject<{
        path: z.ZodString;
        relative: z.ZodString;
        kind: z.ZodEnum<{
            file: "file";
            directory: "directory";
        }>;
    }, z.core.$strip>>>;
    truncated: z.ZodBoolean;
}, z.core.$strip>>;
/** Wire codec: one session candidate. */
export declare const betterAtSessionEntrySchema: z.ZodReadonly<z.ZodObject<{
    sessionId: z.ZodString;
    label: z.ZodString;
    cwd: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodNumber;
    mention: z.ZodString;
}, z.core.$strip>>;
/** Wire codec: one session index snapshot. */
export declare const betterAtSessionIndexSchema: z.ZodReadonly<z.ZodObject<{
    entries: z.ZodArray<z.ZodReadonly<z.ZodObject<{
        sessionId: z.ZodString;
        label: z.ZodString;
        cwd: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodNumber;
        mention: z.ZodString;
    }, z.core.$strip>>>;
}, z.core.$strip>>;
/** Strict invocation descriptors for the `betterAt` Remote namespace. */
export declare const BETTER_AT_INVOCATIONS: readonly InvocationDescriptor[];
