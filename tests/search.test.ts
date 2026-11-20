import test from 'node:test'
import assert from 'node:assert/strict'
import {
  listDirectoryEntries,
  prepareFiles,
  rankFiles,
  rankSessions,
} from '../src/client/search.ts'
import type { BetterAtFileEntry, BetterAtSessionEntry } from '../src/contract.ts'

const entries: BetterAtFileEntry[] = [
  { path: '/w/src/index.ts', relative: 'src/index.ts', kind: 'file' },
  { path: '/w/src/client/search.ts', relative: 'src/client/search.ts', kind: 'file' },
  { path: '/w/src', relative: 'src', kind: 'directory' },
  { path: '/w/src/client', relative: 'src/client', kind: 'directory' },
  { path: '/w/README.md', relative: 'README.md', kind: 'file' },
  { path: '/w/.gitignore', relative: '.gitignore', kind: 'file' },
]
const files = prepareFiles(entries)

test('prepareFiles: precomputes basename, parent and hidden flags', () => {
  const composed = files.find(file => file.name === 'search.ts')
  assert.ok(composed)
  assert.equal(composed!.parent, 'src/client')
  assert.equal(composed!.hidden, false)
  const gitignore = files.find(file => file.name === '.gitignore')
  assert.ok(gitignore)
  assert.equal(gitignore!.parent, '')
  assert.equal(gitignore!.hidden, true)
})

test('rankFiles: empty query returns top-level children only', () => {
  const rows = rankFiles(files, '', 20)
  assert.deepEqual(rows.map(row => row.entry.relative), ['src', 'README.md'])
})

test('rankFiles: bare fuzzy query matches basename across the full index', () => {
  const rows = rankFiles(files, 'search', 20)
  assert.deepEqual(rows.map(row => row.entry.relative), ['src/client/search.ts'])
})

test('rankFiles: slash query filters inside the directory prefix', () => {
  const rows = rankFiles(files, 'src/', 20)
  const rels = rows.map(row => row.entry.relative)
  assert.ok(rels.includes('src/index.ts'))
  assert.ok(rels.includes('src/client'))
  assert.ok(!rels.includes('README.md'))
})

test('rankFiles: hidden entries are omitted unless the fragment starts with a dot', () => {
  const rows = rankFiles(files, '', 20)
  assert.ok(!rows.some(row => row.entry.relative === '.gitignore'))
  const dotted = listDirectoryEntries(files, '.', 20)
  assert.ok(dotted.some(row => row.entry.relative === '.gitignore'))
})

test('rankFiles: global fuzzy search is case-insensitive and hides dotfiles', () => {
  const rows = rankFiles(files, 'readme', 20)
  assert.deepEqual(rows.map(row => row.entry.relative), ['README.md'])
  const hidden = rankFiles(files, 'gitignore', 20)
  assert.deepEqual(hidden.map(row => row.entry.relative), [])
})

test('rankFiles: descending into a dotted directory keeps its children visible', () => {
  const nested = prepareFiles([
    { path: '/w/.config/app.json', relative: '.config/app.json', kind: 'file' },
    { path: '/w/.config', relative: '.config', kind: 'directory' },
  ])
  const rows = listDirectoryEntries(nested, '.config/', 20)
  assert.deepEqual(rows.map(row => row.entry.relative), ['.config/app.json'])
})

const sessions: BetterAtSessionEntry[] = [
  { sessionId: 'a', label: 'Alpha', cwd: '/work/a', createdAt: 1, mention: '@[Alpha](dsh-session:YQ)' },
  { sessionId: 'b', label: 'Beta', cwd: undefined, createdAt: 2, mention: '@[Beta](dsh-session:Yg)' },
  { sessionId: 'c', label: 'Gamma', cwd: '/other', createdAt: 3, mention: '@[Gamma](dsh-session:Yw)' },
]

test('rankSessions: empty query orders by cwd affinity', () => {
  const rows = rankSessions(sessions, '', '/work/a', 20)
  assert.deepEqual(rows.map(row => row.sessionId), ['a', 'b', 'c'])
})

test('rankSessions: non-empty query filters and keeps affinity order', () => {
  const rows = rankSessions(sessions, 'gamma', '/work/a', 20)
  assert.deepEqual(rows.map(row => row.sessionId), ['c'])
  const all = rankSessions(sessions, 'alpha', '/work/a', 20)
  assert.deepEqual(all.map(row => row.sessionId), ['a'])
})

test('rankFiles: the result limit is applied without sorting every match', () => {
  const rows = rankFiles(files, '', 1)
  assert.deepEqual(rows.map(row => row.entry.relative), ['src'])
  const many = prepareFiles(
    Array.from({ length: 200 }, (_, index): BetterAtFileEntry => ({
      path: `/w/file-${String(index).padStart(3, '0')}.ts`,
      relative: `file-${String(index).padStart(3, '0')}.ts`,
      kind: 'file',
    })),
  )
  const limited = rankFiles(many, 'file', 5)
  assert.equal(limited.length, 5)
  assert.deepEqual(limited.map(row => row.entry.relative), [
    'file-000.ts', 'file-001.ts', 'file-002.ts', 'file-003.ts', 'file-004.ts',
  ])
})

test('rankFiles: a directory entry outranks a file with the same name score', () => {
  const withDir = prepareFiles([...entries, { path: '/w/client', relative: 'client', kind: 'directory' }])
  const rows = rankFiles(withDir, 'client', 20)
  assert.equal(rows[0].entry.relative, 'client')
})

test('listDirectoryEntries: a dot fragment reveals hidden entries', () => {
  const rows = listDirectoryEntries(files, '.git', 20)
  assert.ok(rows.some(row => row.entry.relative === '.gitignore'))
})

test('rankSessions: the result limit is applied and ties keep index order', () => {
  const rows = rankSessions(sessions, '', '/work/a', 2)
  assert.deepEqual(rows.map(row => row.sessionId), ['a', 'b'])
})
