import test from 'node:test'
import assert from 'node:assert/strict'
import { rankFiles, rankSessions, listDirectoryEntries } from '../src/client/search.ts'
import type { BetterAtFileEntry, BetterAtSessionEntry } from '../src/contract.ts'

const files: BetterAtFileEntry[] = [
  { path: '/w/src/index.ts', relative: 'src/index.ts', kind: 'file' },
  { path: '/w/src/client/search.ts', relative: 'src/client/search.ts', kind: 'file' },
  { path: '/w/src', relative: 'src', kind: 'directory' },
  { path: '/w/src/client', relative: 'src/client', kind: 'directory' },
  { path: '/w/README.md', relative: 'README.md', kind: 'file' },
  { path: '/w/.gitignore', relative: '.gitignore', kind: 'file' },
]

test('rankFiles: empty query returns top-level children only', () => {
  const rows = rankFiles(files, '', 20)
  assert.deepEqual(rows.map(row => row.relative), ['src', 'README.md'])
})

test('rankFiles: bare fuzzy query matches basename across the full index', () => {
  const rows = rankFiles(files, 'search', 20)
  assert.deepEqual(rows.map(row => row.relative), ['src/client/search.ts'])
})

test('rankFiles: slash query filters inside the directory prefix', () => {
  const rows = rankFiles(files, 'src/', 20)
  const rels = rows.map(row => row.relative)
  assert.ok(rels.includes('src/index.ts'))
  assert.ok(rels.includes('src/client'))
  assert.ok(!rels.includes('README.md'))
})

test('rankFiles: hidden entries are omitted unless the fragment starts with a dot', () => {
  const rows = rankFiles(files, '', 20)
  assert.ok(!rows.some(row => row.relative === '.gitignore'))
  const dotted = listDirectoryEntries(files, '.', 20)
  assert.ok(dotted.some(row => row.relative === '.gitignore'))
})

test('rankFiles: global fuzzy search is case-insensitive and hides dotfiles', () => {
  const rows = rankFiles(files, 'readme', 20)
  assert.deepEqual(rows.map(row => row.relative), ['README.md'])
  const hidden = rankFiles(files, 'gitignore', 20)
  assert.deepEqual(hidden.map(row => row.relative), [])
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

test('rankFiles: the result limit is applied', () => {
  const rows = rankFiles(files, '', 1)
  assert.deepEqual(rows.map(row => row.relative), ['src'])
})

test('rankFiles: a directory entry outranks a file with the same name score', () => {
  const withDir = [...files, { path: '/w/client', relative: 'client', kind: 'directory' }]
  const rows = rankFiles(withDir, 'client', 20)
  assert.equal(rows[0].relative, 'client')
})

test('listDirectoryEntries: a dot fragment reveals hidden entries', () => {
  const rows = listDirectoryEntries(files, '.git', 20)
  assert.ok(rows.some(row => row.relative === '.gitignore'))
})

test('rankSessions: the result limit is applied and ties keep index order', () => {
  const rows = rankSessions(sessions, '', '/work/a', 2)
  assert.deepEqual(rows.map(row => row.sessionId), ['a', 'b'])
})
