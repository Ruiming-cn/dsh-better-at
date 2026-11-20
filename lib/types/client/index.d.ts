import type { Context as ClientContext } from '@deepseek-ai/cordis';
/** Required services: trigger registry, Remote mount, connection, locale, sessions, slots. */
export declare const inject: string[];
/**
 * Compose the fast @ source wrapper.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
