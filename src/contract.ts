/**
 * dsh-better-at wire contract: types, zod codecs and strict Typert invocation
 * descriptors shared verbatim by the Host manifest and the browser Remote.
 *
 * The `betterAt` namespace exposes two read-only indices:
 * - `listFiles`: bounded workspace tree containing files and directories.
 * - `listSessions`: full DSH session metadata with canonical mentions.
 * No file contents or conversation bodies cross this boundary.
 */
import { z } from 'zod'
import type { InvocationDescriptor } from '@deepseek-ai/dsh-typert-protocol'

/** One indexed workspace entry (a file or a directory), with display paths. */
export interface BetterAtFileEntry {
  readonly path: string
  readonly relative: string
  readonly kind: 'file' | 'directory'
}

/** One workspace index snapshot returned to the browser picker. */
export interface BetterAtFileIndex {
  readonly root: string
  readonly entries: readonly BetterAtFileEntry[]
  readonly truncated: boolean
}

/** One DSH session candidate with a canonical model-facing mention. */
export interface BetterAtSessionEntry {
  readonly sessionId: string
  readonly label: string
  readonly cwd?: string
  readonly createdAt: number
  readonly mention: string
}

/** One full session index snapshot returned to the browser picker. */
export interface BetterAtSessionIndex {
  readonly entries: readonly BetterAtSessionEntry[]
}

/** Wire codec: one agent/session identity. */
export const sessionIdSchema = z.string().min(1)

/** Wire codec: one workspace entry. */
export const betterAtFileEntrySchema = z.object({
  path: z.string().min(1),
  relative: z.string().min(1),
  kind: z.enum(['file', 'directory']),
}).readonly()

/** Wire codec: one workspace index snapshot. */
export const betterAtFileIndexSchema = z.object({
  root: z.string(),
  entries: z.array(betterAtFileEntrySchema),
  truncated: z.boolean(),
}).readonly()

/** Wire codec: one session candidate. */
export const betterAtSessionEntrySchema = z.object({
  sessionId: z.string().min(1),
  label: z.string(),
  cwd: z.string().optional(),
  createdAt: z.number(),
  mention: z.string().min(1),
}).readonly()

/** Wire codec: one session index snapshot. */
export const betterAtSessionIndexSchema = z.object({
  entries: z.array(betterAtSessionEntrySchema),
}).readonly()

/** Strict invocation descriptors for the `betterAt` Remote namespace. */
export const BETTER_AT_INVOCATIONS: readonly InvocationDescriptor[] = [
  {
    id: 'dsh-better-at#betterAt/listFiles',
    service: 'betterAt',
    namespace: 'betterAt',
    method: 'listFiles',
    invocation: { kind: 'direct' },
    parameters: [
      {
        name: 'agent',
        wire: 'agentId',
        source: 'lookup',
        lookup: 'agent',
        codec: {
          mode: 'strict',
          typeSymbol: '@deepseek-ai/dsh-session/types#SessionId',
          schema: sessionIdSchema,
        },
      },
    ],
    cancellation: { parameter: 'signal' },
    result: {
      mode: 'strict',
      typeSymbol: 'dsh-better-at#BetterAtFileIndex',
      schema: betterAtFileIndexSchema,
    },
  },
  {
    id: 'dsh-better-at#betterAt/listSessions',
    service: 'betterAt',
    namespace: 'betterAt',
    method: 'listSessions',
    invocation: { kind: 'direct' },
    parameters: [],
    cancellation: { parameter: 'signal' },
    result: {
      mode: 'strict',
      typeSymbol: 'dsh-better-at#BetterAtSessionIndex',
      schema: betterAtSessionIndexSchema,
    },
  },
]
