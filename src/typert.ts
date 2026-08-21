/**
 * Hand-written host Typert manifest for the betterAt Remote. Registered through
 * `ctx.typert.register` so the Host Gateway resolves the wire endpoints through
 * the strict registry, independent of decorator marker tables.
 */
import type { TypertContribution } from '@deepseek-ai/dsh-typert-registry/types'
import { BETTER_AT_INVOCATIONS } from './contract.ts'

/** The betterAt namespace's host manifest. */
export const TYPERT_MANIFEST: TypertContribution = {
  package: 'dsh-better-at',
  face: 'host',
  schemas: [],
  model: {
    services: [
      {
        key: 'betterAt',
        exportName: 'BetterAtRuntime',
        description: 'Full workspace file index and full DSH session index for the fast @ picker.',
        tags: [],
        members: [
          {
            kind: 'method',
            name: 'listFiles',
            signature: 'listFiles(agent: Agent, signal: AbortSignal): Promise<BetterAtFileIndex>',
          },
          {
            kind: 'method',
            name: 'listSessions',
            signature: 'listSessions(signal: AbortSignal): Promise<BetterAtSessionIndex>',
          },
        ],
        types: [],
      },
    ],
    events: [],
    objects: [],
  },
  invocations: BETTER_AT_INVOCATIONS,
}
