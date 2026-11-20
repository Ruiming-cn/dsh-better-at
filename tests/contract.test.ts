import test from 'node:test'
import assert from 'node:assert/strict'
import { betterAtFileEntrySchema, betterAtSessionEntrySchema, BETTER_AT_INVOCATIONS } from '../src/contract.ts'

test('contract: file entry schema accepts native kinds', () => {
  const parsed = betterAtFileEntrySchema.parse({ path: '/w/a', relative: 'a', kind: 'file' })
  assert.equal(parsed.kind, 'file')
  assert.throws(() => betterAtFileEntrySchema.parse({ path: '', relative: 'a', kind: 'file' }))
})

test('contract: session entry schema accepts a scoped session', () => {
  const parsed = betterAtSessionEntrySchema.parse({
    sessionId: 's',
    label: 'L',
    createdAt: 1,
    mention: '@[L](dsh-session:czE)',
    archived: false,
    origin: 'subagent',
    parentSession: 'parent',
  })
  assert.equal(parsed.sessionId, 's')
  assert.equal(parsed.archived, false)
  assert.equal(parsed.origin, 'subagent')
  assert.equal(parsed.parentSession, 'parent')
  assert.throws(() => betterAtSessionEntrySchema.parse({ sessionId: 's', label: 'L', createdAt: 1, mention: '' }))
})

test('contract: session entry schema requires the archived flag and a known origin', () => {
  const base = { sessionId: 's', label: 'L', createdAt: 1, mention: '@[L](dsh-session:czE)' }
  assert.throws(() => betterAtSessionEntrySchema.parse(base))
  assert.throws(() => betterAtSessionEntrySchema.parse({ ...base, archived: false, origin: 'root' }))
})

test('contract: invocation descriptors cover both methods', () => {
  assert.equal(BETTER_AT_INVOCATIONS.length, 2)
  assert.ok(BETTER_AT_INVOCATIONS.some(inv => inv.id === 'dsh-better-at#betterAt/listFiles'))
  assert.ok(BETTER_AT_INVOCATIONS.some(inv => inv.id === 'dsh-better-at#betterAt/listSessions'))
})
