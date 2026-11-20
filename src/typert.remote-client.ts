/**
 * Consumer-face Typert contribution (`./remote` export) for dsh-better-at.
 *
 * A browser bundle may mount this contribution with `ctx.remote.$mount()` to
 * obtain the typed `betterAt` namespace. The plugin's own client bundle mounts
 * the same descriptors; this export exists for consumers that address the
 * namespace from their own client plugin.
 */
import type { TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'
import { BETTER_AT_INVOCATIONS } from './contract.ts'

/** The browser-side contribution mounting the betterAt namespace. */
export const TYPERT_REMOTE: TypertRemoteContribution = {
  package: 'dsh-better-at',
  descriptors: BETTER_AT_INVOCATIONS,
}

export default TYPERT_REMOTE
