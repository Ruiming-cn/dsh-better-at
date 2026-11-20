import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_SETTINGS,
  MAX_STALE_DAYS,
  createSettingsStore,
  normalizeSettings,
  type SettingsStorage,
} from '../src/client/settings.ts'

function fakeStorage(initial: Record<string, string> = {}): SettingsStorage & { values: Map<string, string> } {
  const values = new Map(Object.entries(initial))
  return {
    values,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
    removeItem: key => { values.delete(key) },
  }
}

test('normalizeSettings: keeps valid fields and falls back per field', () => {
  assert.deepEqual(normalizeSettings(undefined), DEFAULT_SETTINGS)
  assert.deepEqual(normalizeSettings({ hideArchivedSessions: false }), { ...DEFAULT_SETTINGS, hideArchivedSessions: false })
  assert.deepEqual(
    normalizeSettings({ staleSessionDays: 30, fileDisplay: 'tree' }),
    { ...DEFAULT_SETTINGS, staleSessionDays: 30, fileDisplay: 'tree' },
  )
  assert.equal(normalizeSettings({ staleSessionDays: -3 }).staleSessionDays, DEFAULT_SETTINGS.staleSessionDays)
  assert.equal(normalizeSettings({ staleSessionDays: 1.5 }).staleSessionDays, DEFAULT_SETTINGS.staleSessionDays)
  assert.equal(normalizeSettings({ staleSessionDays: MAX_STALE_DAYS + 1 }).staleSessionDays, DEFAULT_SETTINGS.staleSessionDays)
  assert.equal(normalizeSettings({ fileDisplay: 'rainbow' }).fileDisplay, DEFAULT_SETTINGS.fileDisplay)
})

test('createSettingsStore: update persists, normalizes and notifies', () => {
  const storage = fakeStorage()
  const store = createSettingsStore(storage)
  let notifications = 0
  const unsubscribe = store.subscribe(() => { notifications += 1 })
  store.update({ staleSessionDays: 14 })
  assert.equal(store.get().staleSessionDays, 14)
  assert.equal(notifications, 1)
  assert.deepEqual(JSON.parse(storage.values.get('dsh-better-at:scope:v1') ?? '{}').staleSessionDays, 14)
  store.update({ staleSessionDays: -1 })
  assert.equal(store.get().staleSessionDays, DEFAULT_SETTINGS.staleSessionDays)
  unsubscribe()
})

test('createSettingsStore: reads a stored scope and tolerates corrupt JSON', () => {
  const stored = fakeStorage({ 'dsh-better-at:scope:v1': JSON.stringify({ hideForeignSubagents: false, fileDisplay: 'tree' }) })
  assert.equal(createSettingsStore(stored).get().fileDisplay, 'tree')
  assert.equal(createSettingsStore(stored).get().hideForeignSubagents, false)
  const corrupt = fakeStorage({ 'dsh-better-at:scope:v1': '{not json' })
  assert.deepEqual(createSettingsStore(corrupt).get(), DEFAULT_SETTINGS)
})

test('createSettingsStore: reset restores defaults and clears storage', () => {
  const storage = fakeStorage()
  const store = createSettingsStore(storage)
  store.update({ hideArchivedSessions: false, fileDisplay: 'tree' })
  store.reset()
  assert.deepEqual(store.get(), DEFAULT_SETTINGS)
  assert.equal(storage.values.has('dsh-better-at:scope:v1'), false)
})

test('createSettingsStore: a throwing storage still keeps the in-memory scope', () => {
  const store = createSettingsStore({
    getItem() { throw new Error('blocked') },
    setItem() { throw new Error('blocked') },
    removeItem() { throw new Error('blocked') },
  })
  store.update({ staleSessionDays: 3 })
  assert.equal(store.get().staleSessionDays, 3)
})
