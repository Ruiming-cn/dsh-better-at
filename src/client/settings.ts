/**
 * Browser-local search scope for the fast @ picker.
 *
 * The scope belongs to the browser, not the Host: every rule is applied while
 * filtering the cached indexes, so toggling a rule never costs a Host round
 * trip. Values are validated on read, so a hand-edited or stale localStorage
 * entry can never disable the picker.
 */

/** How file candidates present their workspace path. */
export type FileDisplay = 'flat' | 'tree'

/** One complete search scope. */
export interface BetterAtSettings {
  /** Drop sessions the workspace registry archives. */
  readonly hideArchivedSessions: boolean
  /** Drop sessions with no activity in this many days; `0` disables the rule. */
  readonly staleSessionDays: number
  /** Drop subagent sessions that do not descend from the current conversation. */
  readonly hideForeignSubagents: boolean
  /** Present file paths flat (basename + parent) or as an indented tree. */
  readonly fileDisplay: FileDisplay
}

/** Defaults chosen so the picker is quiet out of the box. */
export const DEFAULT_SETTINGS: BetterAtSettings = {
  hideArchivedSessions: true,
  staleSessionDays: 7,
  hideForeignSubagents: true,
  fileDisplay: 'flat',
}

/** Upper bound accepted for the stale-session rule (ten years). */
export const MAX_STALE_DAYS = 3650

const STORAGE_KEY = 'dsh-better-at:scope:v1'

/** The subset of `Storage` this module needs (tests pass a fake). */
export interface SettingsStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem?(key: string): void
}

/** Reader/writer face consumed by the picker and the settings page. */
export interface SettingsStore {
  get(): BetterAtSettings
  update(patch: Partial<BetterAtSettings>): void
  reset(): void
  subscribe(listener: () => void): () => void
}

/**
 * Coerce one untrusted settings object into a complete, valid scope.
 * @param value - parsed JSON or any other untrusted value.
 * @returns the validated settings, falling back per field.
 */
export function normalizeSettings(value: unknown): BetterAtSettings {
  if (typeof value !== 'object' || value === null) return DEFAULT_SETTINGS
  const record = value as Record<string, unknown>
  const days = record.staleSessionDays
  return {
    hideArchivedSessions: typeof record.hideArchivedSessions === 'boolean'
      ? record.hideArchivedSessions
      : DEFAULT_SETTINGS.hideArchivedSessions,
    staleSessionDays: typeof days === 'number' && Number.isInteger(days) && days >= 0 && days <= MAX_STALE_DAYS
      ? days
      : DEFAULT_SETTINGS.staleSessionDays,
    hideForeignSubagents: typeof record.hideForeignSubagents === 'boolean'
      ? record.hideForeignSubagents
      : DEFAULT_SETTINGS.hideForeignSubagents,
    fileDisplay: record.fileDisplay === 'tree' || record.fileDisplay === 'flat'
      ? record.fileDisplay
      : DEFAULT_SETTINGS.fileDisplay,
  }
}

/**
 * Create the settings store. A missing storage keeps the scope in memory for
 * this page lifetime, which is still useful and never throws.
 * @param storage - persistence seam; defaults to `window.localStorage`.
 */
export function createSettingsStore(storage: SettingsStorage | undefined = browserStorage()): SettingsStore {
  let current = readStored(storage)
  const listeners = new Set<() => void>()
  const emit = (): void => {
    for (const listener of [...listeners]) {
      try {
        listener()
      } catch (error) {
        console.error('[dsh-better-at] settings listener failed:', error)
      }
    }
  }
  return {
    get: () => current,
    update(patch) {
      current = normalizeSettings({ ...current, ...patch })
      try {
        storage?.setItem(STORAGE_KEY, JSON.stringify(current))
      } catch (error) {
        console.warn('[dsh-better-at] could not persist the @ search scope:', error)
      }
      emit()
    },
    reset() {
      current = DEFAULT_SETTINGS
      try {
        storage?.removeItem?.(STORAGE_KEY)
      } catch { /* a failed clear only costs the stored copy */ }
      emit()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
}

/** Read and validate the stored scope once at construction. */
function readStored(storage: SettingsStorage | undefined): BetterAtSettings {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    return raw === null || raw === undefined ? DEFAULT_SETTINGS : normalizeSettings(JSON.parse(raw))
  } catch {
    return DEFAULT_SETTINGS
  }
}

/** Resolve `localStorage` without assuming a browser (tests, SSR). */
function browserStorage(): SettingsStorage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}
