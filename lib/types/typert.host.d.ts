/**
 * Host-face Typert manifest (`./typert` export) for dsh-better-at.
 *
 * The Typert Loader imports this artifact for a mounted plugin entry and
 * registers it with `ctx.typert`, which is what lets the Gateway resolve
 * `betterAt/listFiles` and `betterAt/listSessions` with their strict codecs.
 * The descriptors come from the same module the browser Remote mounts, so the
 * two faces cannot drift apart. The gateways validate every strict codec's
 * `create()` factory at registration and at call time.
 */
import type { TypertContribution } from '@deepseek-ai/dsh-typert-registry/types';
/** The Host contribution: no named schemas, no documented model, two invocations. */
export declare const TYPERT: TypertContribution;
