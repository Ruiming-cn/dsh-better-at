import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))

test('package metadata matches the DSH plugin contract', () => {
  assert.equal(pkg.license, 'MIT')
  assert.equal(pkg.type, 'module')
  assert.ok(pkg.main, 'main entry must exist')
  assert.ok(pkg.dsh?.bundle?.patch, 'dsh.bundle.patch must be declared')
  assert.equal(pkg.dsh?.client?.platform, 'web')
  assert.match(pkg.repository?.url, /Ruiming-cn\/dsh-better-at/)
  assert.ok(pkg.homepage, 'homepage must point at the repository')
  assert.ok(pkg.bugs?.url, 'bugs.url must point at the repository issues')
})

test('published files include the built lib and the bundle manifest', () => {
  for (const entry of ['lib', 'cordis.patch.yml', 'README.md', 'README.zh.md', 'LICENSE']) {
    assert.ok(pkg.files?.includes(entry), `files must include ${entry}`)
  }
})

test('the bundle manifest exists at the path package.json declares', () => {
  const patch = readFileSync(path.join(root, pkg.dsh.bundle.patch), 'utf8')
  assert.match(patch, /insert:/)
  assert.match(patch, /id: dsh-better-at/)
})
