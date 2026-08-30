/**
 * dsh-better-at host plugin entry.
 *
 * Mounts the `betterAt` Typert Remote service (workspace index + session index).
 * The plugin does not modify the
 * Harness, does not read mentioned file contents, and does not replace the
 * native @ source — the browser half wraps the existing `reference` source's
 * candidate path only.
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { BetterAtRuntime } from './runtime.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** The Host Remote service backing the local @ reference index. */
        betterAt: BetterAtRuntime;
    }
}
/** Cordis plugin name (Loader entry and client bundle id). */
export declare const name = "dsh-better-at";
export { BetterAtRuntime } from './runtime.ts';
export type * from './contract.ts';
/** Services required before load: the session index query service. */
export declare const inject: string[];
export { DEFAULT_IGNORE_DIRS } from './files.ts';
/** Host plugin configuration, validated at load by the Loader. */
export interface Config {
    /** Hard cap on indexed workspace entries; the walk stops and reports truncation. */
    maxEntries: number;
    /** Directory basenames the index walk skips entirely. */
    ignoreDirs: string[];
}
/** Configuration schema with deployment-tunable bounds. */
export declare const Config: z<Schemastery.ObjectS<{
    maxEntries: z<number, number>;
    ignoreDirs: z<string[], string[]>;
}>, Schemastery.ObjectT<{
    maxEntries: z<number, number>;
    ignoreDirs: z<string[], string[]>;
}>>;
/**
 * Mount the betterAt service.
 * @param ctx - host cordis context.
 * @param config - validated plugin configuration (schema defaults applied).
 */
export declare function apply(ctx: Context, config?: Config): void;
