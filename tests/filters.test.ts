import test from 'node:test'
import assert from 'node:assert/strict'
import { conversationSessions, scopeSessions } from '../src/client/filters.ts'
import { DEFAULT_SETTINGS, type BetterAtSettings } from '../src/client/settings.ts'
import type { BetterAtSessionEntry } from '../src/contract.ts'

const NOW = 1_000 * 86_400_000

function session(overrides: Partial<BetterAtSessionEntry> & { sessionId: string }): BetterAtSessionEntry {
  return {
    label: overrides.sessionId,
    createdAt: 0,
    mention: `@[${overrides.sessionId}](dsh-session:${overrides.sessionId})`,
    archived: false,
    ...overrides,
  }
}

const entries: BetterAtSessionEntry[] = [
  session({ sessionId: 'current', createdAt: NOW }),
  session({ sessionId: 'fresh', createdAt: NOW - 1 * 86_400_000 }),
  session({ sessionId: 'stale', createdAt: NOW - 30 * 86_400_000 }),
  session({ sessionId: 'archived', createdAt: NOW, archived: true }),
  session({ sessionId: 'child', createdAt: NOW, origin: 'subagent', parentSession: 'current' }),
  session({ sessionId: 'grandchild', createdAt: NOW, origin: 'subagent', parentSession: 'child' }),
  session({ sessionId: 'foreign', createdAt: NOW, origin: 'subagent', parentSession: 'other' }),
]

function scope(settings: Partial<BetterAtSettings> = {}) {
  return scopeSessions(entries, {
    settings: { ...DEFAULT_SETTINGS, ...settings },
    now: NOW,
    currentSessionId: 'current',
  })
}

test('conversationSessions: follows nested subagent lineage from the current session', () => {
  const members = conversationSessions(entries, 'current')
  assert.ok(members.has('current'))
  assert.ok(members.has('child'))
  assert.ok(members.has('grandchild'))
  assert.ok(!members.has('foreign'))
})

test('scopeSessions: never offers the current session', () => {
  assert.ok(!scope().some(entry => entry.sessionId === 'current'))
})

test('scopeSessions: hides archived sessions only while the rule is on', () => {
  assert.ok(!scope().some(entry => entry.sessionId === 'archived'))
  assert.ok(scope({ hideArchivedSessions: false }).some(entry => entry.sessionId === 'archived'))
})

test('scopeSessions: hides sessions idle beyond the day limit', () => {
  const ids = scope({ staleSessionDays: 7 }).map(entry => entry.sessionId)
  assert.ok(ids.includes('fresh'))
  assert.ok(!ids.includes('stale'))
})

test('scopeSessions: zero days disables the idle rule', () => {
  assert.ok(scope({ staleSessionDays: 0 }).some(entry => entry.sessionId === 'stale'))
})

test('scopeSessions: a running session is kept even when its stamp is old', () => {
  const kept = scopeSessions(entries, {
    settings: { ...DEFAULT_SETTINGS, staleSessionDays: 7 },
    now: NOW,
    currentSessionId: 'current',
    summaries: { stale: { updatedAt: NOW - 40 * 86_400_000, running: true } },
  })
  assert.ok(kept.some(entry => entry.sessionId === 'stale'))
})

test('scopeSessions: the client summary overrides the index creation time', () => {
  const kept = scopeSessions(entries, {
    settings: { ...DEFAULT_SETTINGS, staleSessionDays: 7 },
    now: NOW,
    currentSessionId: 'current',
    summaries: { fresh: { updatedAt: NOW - 40 * 86_400_000 } },
  })
  assert.ok(!kept.some(entry => entry.sessionId === 'fresh'))
})

test('scopeSessions: keeps this conversation descendants and hides foreign subagents', () => {
  const ids = scope().map(entry => entry.sessionId)
  assert.ok(ids.includes('child'))
  assert.ok(ids.includes('grandchild'))
  assert.ok(!ids.includes('foreign'))
  const all = scope({ hideForeignSubagents: false }).map(entry => entry.sessionId)
  assert.ok(all.includes('foreign'))
})
