import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSessionIndex } from '../src/sessions.ts'

function fakeCtx(records: Array<{ header: Record<string, unknown> }>, archived: string[] = []) {
  return {
    get(name: string) {
      if (name === 'workspaceRegistry') return { archivedSessionIds: archived }
      if (name !== 'sessionQuery') throw new Error(`unexpected service ${name}`)
      return {
        async listSessions() {
          return records
        },
        async readTitleSnapshots(ids: readonly string[]) {
          return ids.map(id => ({ status: 'fulfilled', value: { title: { title: id === 's1' ? 'First' : undefined } } }))
        },
      }
    },
  }
}

test('buildSessionIndex: maps records, titles, cwd and mention', async () => {
  const ctx = fakeCtx([
    { header: { id: 's1', cwd: '/work', createdAt: 100 } },
    { header: { id: 's2', createdAt: 200 } },
  ])
  const result = await buildSessionIndex(ctx as never, new AbortController().signal)
  assert.equal(result.entries.length, 2)
  assert.equal(result.entries[0]!.label, 'First')
  assert.equal(result.entries[0]!.cwd, '/work')
  assert.equal(result.entries[1]!.label, 's2')
  assert.equal(result.entries[0]!.archived, false)
  assert.match(result.entries[0]!.mention, /^@\[First\]\(dsh-session:/)
})

test('buildSessionIndex: carries archived state and subagent lineage', async () => {
  const ctx = fakeCtx([
    { header: { id: 's1', createdAt: 100 } },
    { header: { id: 'child', createdAt: 200, origin: 'subagent', parentSession: 's1' } },
  ], ['s1'])
  const result = await buildSessionIndex(ctx as never, new AbortController().signal)
  assert.equal(result.entries[0]!.archived, true)
  assert.equal(result.entries[1]!.archived, false)
  assert.equal(result.entries[1]!.origin, 'subagent')
  assert.equal(result.entries[1]!.parentSession, 's1')
  assert.equal(result.entries[0]!.origin, undefined)
})

test('buildSessionIndex: a missing workspace registry keeps every session unarchived', async () => {
  const ctx = {
    get(name: string) {
      if (name !== 'sessionQuery') return undefined
      return {
        async listSessions() { return [{ header: { id: 's1', createdAt: 1 } }] },
        async readTitleSnapshots() { return [{ status: 'fulfilled', value: {} }] },
      }
    },
  }
  const result = await buildSessionIndex(ctx as never, new AbortController().signal)
  assert.equal(result.entries[0]!.archived, false)
})
