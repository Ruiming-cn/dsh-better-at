import test from 'node:test'
import assert from 'node:assert/strict'
import { createBetterAtSource, type BetterAtRemoteFace } from '../src/client/source.ts'
import type { BetterAtFileIndex, BetterAtSessionIndex } from '../src/contract.ts'

function fakeRemote(fileCalls = { count: 0 }, sessionCalls = { count: 0 }): BetterAtRemoteFace {
  return {
    async listFiles() {
      fileCalls.count += 1
      return { ok: true, value: { root: '/work', entries: [
        { path: '/work/a.txt', relative: 'a.txt', kind: 'file' },
        { path: '/work/src', relative: 'src', kind: 'directory' },
      ], truncated: false } satisfies BetterAtFileIndex }
    },
    async listSessions() {
      sessionCalls.count += 1
      return { ok: true, value: { entries: [
        { sessionId: 's1', label: 'One', cwd: '/work', createdAt: 1, mention: '@[One](dsh-session:czE)' },
      ] } satisfies BetterAtSessionIndex }
    },
  }
}

test('createBetterAtSource: returns native-shaped candidate rows', async () => {
  const source = createBetterAtSource({ getRemote: () => fakeRemote(), t: key => key })
  const rows = await source.candidates(
    { sessionId: 'sess' },
    { query: '', quoted: false, position: 'leading', signal: new AbortController().signal },
  )
  assert.ok(rows.length >= 2)
  const file = rows.find(row => row.value?.includes('"kind":"file"'))
  assert.ok(file)
  const parsed = JSON.parse(file!.value!)
  assert.equal(parsed.kind, 'file')
  assert.equal(parsed.fileKind, 'directory')
  assert.equal(parsed.mention, '@src/')
  const session = rows.find(row => row.value?.includes('"kind":"session"'))
  assert.ok(session)
  assert.equal(JSON.parse(session!.value!).mention, '@[One](dsh-session:czE)')
})

test('createBetterAtSource: caches file index per session and session index globally', async () => {
  const fileCalls = { count: 0 }
  const sessionCalls = { count: 0 }
  const remote = fakeRemote(fileCalls, sessionCalls)
  const source = createBetterAtSource({ getRemote: () => remote, t: key => key })
  const signal = new AbortController().signal
  await source.candidates({ sessionId: 'sess' }, { query: '', quoted: false, position: 'leading', signal })
  await source.candidates({ sessionId: 'sess' }, { query: '', quoted: false, position: 'leading', signal })
  assert.equal(fileCalls.count, 1)
  assert.equal(sessionCalls.count, 1)
})

test('createBetterAtSource: excludes the current session from session candidates', async () => {
  const source = createBetterAtSource({ getRemote: () => fakeRemote(), t: key => key })
  const rows = await source.candidates(
    { sessionId: 's1' },
    { query: '', quoted: false, position: 'leading', signal: new AbortController().signal },
  )
  assert.ok(!rows.some(row => row.value?.includes('"kind":"session"')))
})

test('createBetterAtSource: prewarm loads both indexes without throwing', async () => {
  const fileCalls = { count: 0 }
  const sessionCalls = { count: 0 }
  const remote = fakeRemote(fileCalls, sessionCalls)
  const source = createBetterAtSource({ getRemote: () => remote, t: key => key })
  source.prewarm({ sessionId: 'sess' })
  await new Promise(resolve => setTimeout(resolve, 10))
  assert.equal(fileCalls.count, 1)
  assert.equal(sessionCalls.count, 1)
})
