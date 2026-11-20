import test from 'node:test'
import assert from 'node:assert/strict'
import { BETTER_AT_INVOCATIONS } from '../src/contract.ts'
import { TYPERT } from '../lib/typert.host.js'
import { TYPERT_REMOTE } from '../lib/typert.remote-client.js'

test('host Typert artifact is owned by this package and carries the host face', () => {
  assert.equal(TYPERT.package, 'dsh-better-at')
  assert.equal(TYPERT.face, 'host')
  assert.ok(Array.isArray(TYPERT.schemas))
})

test('host Typert descriptors match the shared contract', () => {
  assert.deepEqual(
    TYPERT.invocations.map(invocation => invocation.id),
    BETTER_AT_INVOCATIONS.map(invocation => invocation.id),
  )
  for (const invocation of TYPERT.invocations) {
    assert.equal(invocation.service, 'betterAt')
    assert.equal(invocation.namespace, 'betterAt')
    // The Gateway validates every strict codec's create() factory at dispatch.
    assert.equal(typeof invocation.result.create, 'function')
    for (const parameter of invocation.parameters) {
      assert.equal(typeof parameter.codec.create, 'function')
    }
  }
})

test('browser Remote artifact mounts the same descriptor set', () => {
  assert.equal(TYPERT_REMOTE.package, 'dsh-better-at')
  assert.deepEqual(
    TYPERT_REMOTE.descriptors.map(descriptor => descriptor.id),
    BETTER_AT_INVOCATIONS.map(descriptor => descriptor.id),
  )
})

test('strict codecs decode through their create() factory', () => {
  for (const invocation of BETTER_AT_INVOCATIONS) {
    const schema = invocation.result.create()
    assert.equal(typeof schema.parse, 'function')
  }
})
