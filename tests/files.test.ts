import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { indexWorkspace, DEFAULT_IGNORE_DIRS } from '../src/files.ts'

test('indexWorkspace: indexes files and directories, skips ignored dirs', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-better-at-'))
  try {
    await mkdir(join(root, 'src', 'client'), { recursive: true })
    await mkdir(join(root, 'node_modules', 'pkg'), { recursive: true })
    await writeFile(join(root, 'src', 'index.ts'), '')
    await writeFile(join(root, 'README.md'), '')
    await writeFile(join(root, 'node_modules', 'pkg', 'x.js'), '')

    const result = await indexWorkspace(root, { maxEntries: 100, ignoreDirs: [...DEFAULT_IGNORE_DIRS] })
    const rels = result.entries.map(entry => entry.relative)
    assert.ok(rels.includes('src'))
    assert.ok(rels.includes('src/index.ts'))
    assert.ok(rels.includes('README.md'))
    assert.ok(!rels.some(rel => rel.startsWith('node_modules')))
    assert.equal(result.truncated, false)
    assert.equal(result.entries.find(entry => entry.relative === 'src/index.ts')?.kind, 'file')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('indexWorkspace: honors maxEntries and reports truncation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-better-at-'))
  try {
    await mkdir(join(root, 'src'), { recursive: true })
    await writeFile(join(root, 'a.txt'), '')
    await writeFile(join(root, 'b.txt'), '')
    const result = await indexWorkspace(root, { maxEntries: 2, ignoreDirs: [] })
    assert.equal(result.entries.length, 2)
    assert.equal(result.truncated, true)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
