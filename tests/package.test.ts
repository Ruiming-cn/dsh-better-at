import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))

test('package metadata matches the DSH plugin contract', () => {
  assert.equal(pkg.version, '0.2.1')
  assert.equal(pkg.license, 'MIT')
  assert.equal(pkg.type, 'module')
  assert.ok(pkg.main, 'main entry must exist')
  assert.ok(pkg.dsh?.bundle?.patch, 'dsh.bundle.patch must be declared')
  assert.equal(pkg.dsh?.client?.platform, 'web')
  assert.ok(!pkg.dsh?.client?.inject?.includes('@deepseek-ai/dsh-client-runtime'))
  assert.ok(pkg.exports?.['./typert']?.default)
  assert.ok(pkg.exports?.['./remote']?.default)
  assert.ok(pkg.exports?.['./locale/*.json'])
  assert.ok(pkg.exports?.['./icon'])
  assert.match(pkg.repository?.url, /Ruiming-cn\/dsh-better-at/)
  assert.ok(pkg.homepage, 'homepage must point at the repository')
  assert.ok(pkg.bugs?.url, 'bugs.url must point at the repository issues')
})

test('published files include the built lib, the bundle manifest and plugin metadata', () => {
  for (const entry of ['lib', 'cordis.patch.yml', 'locale/*.json', 'icon.svg', 'README.md', 'README.zh.md', 'LICENSE']) {
    assert.ok(pkg.files?.includes(entry), `files must include ${entry}`)
  }
})

test('the bundle manifest exists at the path package.json declares', () => {
  const patch = readFileSync(path.join(root, pkg.dsh.bundle.patch), 'utf8')
  assert.match(patch, /insert:/)
  assert.match(patch, /id: dsh-better-at/)
})

test('Plugin Manager metadata declares a localized title and description', () => {
  for (const locale of ['en', 'zh']) {
    const file = path.join(root, 'locale', `${locale}.json`)
    assert.ok(existsSync(file), `locale/${locale}.json must exist`)
    const meta = JSON.parse(readFileSync(file, 'utf8')).meta
    assert.ok(meta?.title?.length > 0, `${locale} meta.title must not be empty`)
    assert.ok(meta?.description?.length > 0, `${locale} meta.description must not be empty`)
    assert.equal(meta.detail, undefined, 'no detail document is declared')
  }
})

test('the icon is a self-contained SVG', () => {
  const icon = readFileSync(path.join(root, 'icon.svg'), 'utf8')
  assert.match(icon, /^<svg[\s>]/)
  assert.ok(!/<script|<style|<image|@import|xlink:href=|href=/u.test(icon), 'icon must not load remote or scripted resources')
})
