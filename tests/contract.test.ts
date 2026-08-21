import test from 'node:test'
import assert from 'node:assert/strict'
import { betterAtFileEntrySchema, betterAtSessionEntrySchema, BETTER_AT_INVOCATIONS } from '../src/contract.ts'

test('contract: file entry schema accepts native kinds', () => {
  const parsed = betterAtFileEntrySchema.parse({ path: '/w/a', relative: 'a', kind: 'file' })
  assert.equal(parsed.kind, 'file')
  assert.throws(() => betterAtFileEntrySchema.parse({ path: '', relative: 'a', kind: 'file' }))
})

test('contract: session entry schema accepts mention', () => {
  const parsed = betterAtSessionEntrySchema.parse({ sessionId: 's', label: 'L', createdAt: 1, mention: '@[L](dsh-session:czE)' })
  assert.equal(parsed.sessionId, 's')
  assert.throws(() => betterAtSessionEntrySchema.parse({ sessionId: 's', label: 'L', createdAt: 1, mention: '' }))
})

test('contract: invocation descriptors cover both methods', () => {
  assert.equal(BETTER_AT_INVOCATIONS.length, 2)
  assert.ok(BETTER_AT_INVOCATIONS.some(inv => inv.id === 'dsh-better-at#betterAt/listFiles'))
  assert.ok(BETTER_AT_INVOCATIONS.some(inv => inv.id === 'dsh-better-at#betterAt/listSessions'))
})
