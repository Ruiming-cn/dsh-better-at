/**
 * dsh-better-at wire contract: types, boundary schemas and strict Typert
 * invocation descriptors shared verbatim by the Host manifest and the browser
 * Remote.
 *
 * The `betterAt` namespace exposes two read-only indices:
 * - `listFiles`: bounded workspace tree containing files and directories.
 * - `listSessions`: full DSH session metadata with canonical mentions.
 * No file contents or conversation bodies cross this boundary.
 *
 * The schemas are hand-written rather than generated: the Typert strict codec
 * only consumes `parse()`, and two small shapes do not justify shipping a
 * general validator into the browser bundle.
 */
import type { InvocationDescriptor, TypertSchema } from '@deepseek-ai/dsh-typert-protocol'
import type { SessionId } from '@deepseek-ai/dsh-session/types'

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
  readonly sessionId: SessionId
  readonly label: string
  readonly cwd?: string
  readonly createdAt: number
  readonly mention: string
}

/** One full session index snapshot returned to the browser picker. */
export interface BetterAtSessionIndex {
  readonly entries: readonly BetterAtSessionEntry[]
}

/**
 * Validate one untrusted wire value against a problem description.
 * @param value - decoded JSON value.
 * @param problem - what the value should have been.
 * @returns the value, typed by the caller.
 */
function reject(value: unknown, problem: string): never {
  throw new TypeError(`dsh-better-at: wire value ${problem} (received ${JSON.stringify(value)})`)
}

/** Narrow one wire value to a JSON object. */
function asRecord(value: unknown, subject: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) reject(value, `must be an object for ${subject}`)
  return value as Record<string, unknown>
}

/** Read one required non-empty string field. */
function readString(source: Record<string, unknown>, key: string, subject: string): string {
  const value = source[key]
  if (typeof value !== 'string' || value.length === 0) reject(value, `needs a non-empty "${key}" for ${subject}`)
  return value
}

/** Wire codec: one agent/session identity. */
export const sessionIdSchema: TypertSchema<string> = {
  parse(value) {
    if (typeof value !== 'string' || value.length === 0) reject(value, 'must be a non-empty session id')
    return value
  },
}

/** Wire codec: one workspace entry. */
export const betterAtFileEntrySchema: TypertSchema<BetterAtFileEntry> = {
  parse(value) {
    const record = asRecord(value, 'a workspace entry')
    const kind = record.kind
    if (kind !== 'file' && kind !== 'directory') reject(kind, 'has an unknown entry kind')
    return {
      path: readString(record, 'path', 'a workspace entry'),
      relative: readString(record, 'relative', 'a workspace entry'),
      kind,
    }
  },
}

/** Wire codec: one workspace index snapshot. */
export const betterAtFileIndexSchema: TypertSchema<BetterAtFileIndex> = {
  parse(value) {
    const record = asRecord(value, 'the workspace index')
    if (!Array.isArray(record.entries)) reject(record.entries, 'needs an entries array')
    if (typeof record.truncated !== 'boolean') reject(record.truncated, 'needs a boolean truncated flag')
    return {
      root: readString(record, 'root', 'the workspace index'),
      entries: record.entries.map(entry => betterAtFileEntrySchema.parse(entry)),
      truncated: record.truncated,
    }
  },
}

/** Wire codec: one session candidate. */
export const betterAtSessionEntrySchema: TypertSchema<BetterAtSessionEntry> = {
  parse(value) {
    const record = asRecord(value, 'a session entry')
    const createdAt = record.createdAt
    if (typeof createdAt !== 'number' || !Number.isFinite(createdAt)) reject(createdAt, 'needs a numeric createdAt')
    const cwd = record.cwd
    if (cwd !== undefined && typeof cwd !== 'string') reject(cwd, 'has a non-string cwd')
    return {
      sessionId: readString(record, 'sessionId', 'a session entry') as SessionId,
      label: typeof record.label === 'string' ? record.label : reject(record.label, 'has a non-string label'),
      ...cwd === undefined ? {} : { cwd },
      createdAt,
      mention: readString(record, 'mention', 'a session entry'),
    }
  },
}

/** Wire codec: one full session index snapshot. */
export const betterAtSessionIndexSchema: TypertSchema<BetterAtSessionIndex> = {
  parse(value) {
    const record = asRecord(value, 'the session index')
    if (!Array.isArray(record.entries)) reject(record.entries, 'needs an entries array')
    return { entries: record.entries.map(entry => betterAtSessionEntrySchema.parse(entry)) }
  },
}

/** Strict invocation descriptors for the `betterAt` Remote namespace. */
export const BETTER_AT_INVOCATIONS: readonly InvocationDescriptor[] = [
  {
    id: 'dsh-better-at#betterAt/listFiles',
    service: 'betterAt',
    namespace: 'betterAt',
    method: 'listFiles',
    invocation: { kind: 'direct' },
    scope: {
      context: 'agent',
      wire: 'agentId',
    },
    parameters: [
      {
        name: 'agent',
        wire: 'agentId',
        source: 'lookup',
        lookup: 'agent',
        codec: {
          mode: 'strict',
          typeSymbol: '@deepseek-ai/dsh-session/types#SessionId',
          create: () => sessionIdSchema,
        },
      },
    ],
    cancellation: { parameter: 'signal' },
    result: {
      mode: 'strict',
      typeSymbol: 'dsh-better-at#BetterAtFileIndex',
      create: () => betterAtFileIndexSchema,
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
      create: () => betterAtSessionIndexSchema,
    },
  },
]
