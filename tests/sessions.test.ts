import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSessionIndex } from '../src/sessions.ts'

test('buildSessionIndex: maps records, titles, cwd and mention', async () => {
  let listed = false
  let read = false
  const ctx = {
    get(name: string) {
      if (name !== 'sessionQuery') throw new Error(`unexpected service ${name}`)
      return {
        async listSessions() {
          listed = true
          return [
            { header: { id: 's1', cwd: '/work', createdAt: 100 } },
            { header: { id: 's2', createdAt: 200 } },
          ]
        },
        async readTitleSnapshots(ids: readonly string[]) {
          read = true
          assert.deepEqual(ids, ['s1', 's2'])
          return [
            { status: 'fulfilled', value: { title: { title: 'First' } } },
            { status: 'fulfilled', value: { title: undefined } },
          ]
        },
      }
    },
  }
  const result = await buildSessionIndex(ctx as never, new AbortController().signal)
  assert.equal(listed, true)
  assert.equal(read, true)
  assert.equal(result.entries.length, 2)
  assert.equal(result.entries[0]!.label, 'First')
  assert.equal(result.entries[0]!.cwd, '/work')
  assert.equal(result.entries[1]!.label, 's2')
  assert.match(result.entries[0]!.mention, /^@\[First\]\(dsh-session:/)
})
