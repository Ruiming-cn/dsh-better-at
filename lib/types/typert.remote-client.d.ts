/**
 * Consumer-face Typert contribution (`./remote` export) for dsh-better-at.
 *
 * A browser bundle may mount this contribution with `ctx.remote.$mount()` to
 * obtain the typed `betterAt` namespace. The plugin's own client bundle mounts
 * the same descriptors; this export exists for consumers that address the
 * namespace from their own client plugin.
 */
import type { TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol';
/** The browser-side contribution mounting the betterAt namespace. */
export declare const TYPERT_REMOTE: TypertRemoteContribution;
export default TYPERT_REMOTE;
