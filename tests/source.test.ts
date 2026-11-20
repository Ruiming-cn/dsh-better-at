import test from 'node:test'
import assert from 'node:assert/strict'
import { createBetterAtSource, formatAge, type BetterAtRemoteFace } from '../src/client/source.ts'
import { createSettingsStore, type BetterAtSettings } from '../src/client/settings.ts'
import type { BetterAtKey } from '../src/client/locales.ts'
import type { BetterAtFileIndex, BetterAtSessionIndex } from '../src/contract.ts'

const t = (key: BetterAtKey, params?: Record<string, string | number>): string =>
  params === undefined ? key : `${key}:${JSON.stringify(params)}`

function settings(patch: Partial<BetterAtSettings> = {}) {
  const store = createSettingsStore(undefined)
  store.update(patch)
  return store
}

function fakeRemote(fileCalls = { count: 0 }, sessionCalls = { count: 0 }): BetterAtRemoteFace {
  return {
    async listFiles() {
      fileCalls.count += 1
      return { ok: true, value: { root: '/work', entries: [
        { path: '/work/a.txt', relative: 'a.txt', kind: 'file' },
        { path: '/work/src', relative: 'src', kind: 'directory' },
        { path: '/work/src/index.ts', relative: 'src/index.ts', kind: 'file' },
      ], truncated: false } satisfies BetterAtFileIndex }
    },
    async listSessions() {
      sessionCalls.count += 1
      return { ok: true, value: { entries: [
        { sessionId: 's1', label: 'One', cwd: '/work', createdAt: Date.now(), mention: '@[One](dsh-session:czE)', archived: false },
        { sessionId: 's2', label: 'Gone', cwd: '/work', createdAt: Date.now(), mention: '@[Gone](dsh-session:czI)', archived: true },
        { sessionId: 's3', label: 'Other child', cwd: '/elsewhere', createdAt: Date.now(), mention: '@[Other](dsh-session:czM)', archived: false, origin: 'subagent', parentSession: 'other' },
      ] } satisfies BetterAtSessionIndex }
    },
  }
}

test('createBetterAtSource: returns native-shaped candidate rows', async () => {
  const source = createBetterAtSource({ getRemote: () => fakeRemote(), t, settings: settings() })
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
  assert.equal(session!.icon, 'session')
  assert.equal(session!.name, 'One')
  assert.equal(JSON.parse(session!.value!).mention, '@[One](dsh-session:czE)')
})

test('createBetterAtSource: folder rows advertise a drill and a bare name', async () => {
  const source = createBetterAtSource({ getRemote: () => fakeRemote(), t, settings: settings() })
  const rows = await source.candidates(
    { sessionId: 'sess' },
    { query: '', quoted: false, position: 'leading', signal: new AbortController().signal },
  )
  const folder = rows.find(row => row.name === 'src/')
  assert.ok(folder)
  assert.equal(folder!.icon, 'folder')
  assert.equal(folder!.drill, true)
  assert.equal(folder!.description, undefined)
  const rootFile = rows.find(row => row.name === 'a.txt')
  assert.ok(rootFile)
  assert.equal(rootFile!.icon, 'file')
  assert.equal(rootFile!.drill, undefined)
})

test('createBetterAtSource: nested rows name their parent directory', async () => {
  const source = createBetterAtSource({ getRemote: () => fakeRemote(), t, settings: settings() })
  const rows = await source.candidates(
    { sessionId: 'sess' },
    { query: 'src/', quoted: false, position: 'leading', signal: new AbortController().signal },
  )
  const nested = rows.find(row => row.name === 'index.ts')
  assert.ok(nested)
  assert.equal(nested!.description, 'src')
})

test('createBetterAtSource: tree display indents by workspace depth', async () => {
  const source = createBetterAtSource({
    getRemote: () => fakeRemote(),
    t,
    settings: settings({ fileDisplay: 'tree' }),
  })
  const rows = await source.candidates(
    { sessionId: 'sess' },
    { query: 'src/', quoted: false, position: 'leading', signal: new AbortController().signal },
  )
  const nested = rows.find(row => row.name.trim() === 'index.ts')
  assert.ok(nested)
  assert.equal(nested!.name, '  index.ts')
  assert.equal(nested!.description, 'src/index.ts')
})

test('createBetterAtSource: applies the archived and foreign-subagent scope', async () => {
  const source = createBetterAtSource({ getRemote: () => fakeRemote(), t, settings: settings() })
  const rows = await source.candidates(
    { sessionId: 'sess' },
    { query: '', quoted: false, position: 'leading', signal: new AbortController().signal },
  )
  const sessions = rows.filter(row => row.value?.includes('"kind":"session"'))
  const names = sessions.map(row => row.name).sort()
  assert.deepEqual(names, ['One'])
})

test('createBetterAtSource: keeps archived and foreign rows when the rules are off', async () => {
  const source = createBetterAtSource({
    getRemote: () => fakeRemote(),
    t,
    settings: settings({ hideArchivedSessions: false, hideForeignSubagents: false }),
  })
  const rows = await source.candidates(
    { sessionId: 'sess' },
    { query: '', quoted: false, position: 'leading', signal: new AbortController().signal },
  )
  const names = rows.filter(row => row.value?.includes('"kind":"session"')).map(row => row.name).sort()
  assert.deepEqual(names, ['Gone', 'One', 'Other child'])
})

test('createBetterAtSource: the client session summary feeds the idle rule', async () => {
  const source = createBetterAtSource({
    getRemote: () => fakeRemote(),
    t,
    settings: settings({ staleSessionDays: 7 }),
    getSessionSummaries: () => ({ s1: { updatedAt: Date.now() - 30 * 86_400_000 } }),
  })
  const rows = await source.candidates(
    { sessionId: 'sess' },
    { query: '', quoted: false, position: 'leading', signal: new AbortController().signal },
  )
  assert.ok(!rows.some(row => row.value?.includes('"kind":"session"')))
})

test('createBetterAtSource: caches file index per session and session index globally', async () => {
  const fileCalls = { count: 0 }
  const sessionCalls = { count: 0 }
  const remote = fakeRemote(fileCalls, sessionCalls)
  const source = createBetterAtSource({ getRemote: () => remote, t, settings: settings() })
  const signal = new AbortController().signal
  await source.candidates({ sessionId: 'sess' }, { query: '', quoted: false, position: 'leading', signal })
  await source.candidates({ sessionId: 'sess' }, { query: '', quoted: false, position: 'leading', signal })
  assert.equal(fileCalls.count, 1)
  assert.equal(sessionCalls.count, 1)
})

test('createBetterAtSource: excludes the current session from session candidates', async () => {
  const source = createBetterAtSource({ getRemote: () => fakeRemote(), t, settings: settings() })
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
  const source = createBetterAtSource({ getRemote: () => remote, t, settings: settings() })
  source.prewarm({ sessionId: 'sess' })
  await new Promise(resolve => setTimeout(resolve, 10))
  assert.equal(fileCalls.count, 1)
  assert.equal(sessionCalls.count, 1)
})

test('formatAge: buckets elapsed time like the native session rows', () => {
  const now = 1_000_000_000_000
  assert.equal(formatAge(now - 10, now, t), 'time.now')
  assert.equal(formatAge(now - 5 * 60_000, now, t), 'time.minutes:{"n":5}')
  assert.equal(formatAge(now - 3 * 3_600_000, now, t), 'time.hours:{"n":3}')
  assert.equal(formatAge(now - 2 * 86_400_000, now, t), 'time.days:{"n":2}')
  assert.equal(formatAge(now - 45 * 86_400_000, now, t), 'time.months:{"n":1}')
  assert.equal(formatAge(now - 400 * 86_400_000, now, t), 'time.years:{"n":1}')
})
