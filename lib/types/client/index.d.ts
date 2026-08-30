import type { Context as ClientContext } from '@deepseek-ai/cordis';
/** Required services: trigger registry, Remote mount, session scope, connection reset, locale. */
export declare const inject: string[];
/**
 * Compose the fast @ source wrapper.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
