import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
/** Required services: trigger registry, Remote mount, session scope, connection reset, locale. */
export declare const inject: string[];
/**
 * Compose the fast @ source wrapper.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
