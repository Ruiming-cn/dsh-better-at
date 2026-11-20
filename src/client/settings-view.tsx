/**
 * Settings page for the @ search scope.
 *
 * Rendered as one `settings.section` React contribution so the rules live
 * where every other preference lives. The page writes straight into the shared
 * browser-local store; the picker reads that store on each candidates call, so
 * a change applies to the next `@` without reloading the page.
 */
import { useSyncExternalStore, type ReactElement } from 'react'
import type { BetterAtKey } from './locales.ts'
import { MAX_STALE_DAYS, type BetterAtSettings, type FileDisplay, type SettingsStore } from './settings.ts'

/** Translate function passed by the client wiring layer. */
type Translate = (key: BetterAtKey, params?: Record<string, string | number>) => string

/** Props injected by the slot registration. */
export interface ScopeSectionProps {
  readonly store: SettingsStore
  readonly t: Translate
}

const styles = {
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    padding: '4px 0',
    color: 'var(--dsw-alias-label-primary, #1f1f1f)',
    font: 'inherit',
  },
  title: { margin: 0, fontSize: '16px', lineHeight: '24px', fontWeight: 600 },
  description: { margin: 0, fontSize: '13px', lineHeight: '20px', color: 'var(--dsw-alias-label-secondary, #555)' },
  row: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '10px 12px',
    border: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.2))',
    borderRadius: '10px',
  },
  control: { marginTop: '2px', flex: 'none' },
  body: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 },
  label: { fontSize: '13px', lineHeight: '20px', fontWeight: 500 },
  hint: { fontSize: '12px', lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary, #8a8a8e)' },
  number: {
    width: '72px',
    padding: '4px 6px',
    border: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.4))',
    borderRadius: '6px',
    background: 'transparent',
    color: 'inherit',
    font: 'inherit',
    fontSize: '13px',
  },
  group: { display: 'flex', gap: '14px', marginTop: '2px' },
  radioRow: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  reset: {
    alignSelf: 'flex-start',
    padding: '6px 12px',
    border: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.4))',
    borderRadius: '8px',
    background: 'transparent',
    color: 'inherit',
    font: 'inherit',
    fontSize: '13px',
    cursor: 'pointer',
  },
} satisfies Record<string, Record<string, string | number> | string>

/** One labeled rule row with its control on the left. */
function Row(props: {
  readonly label: string
  readonly hint: string
  readonly children: ReactElement
}): ReactElement {
  return (
    <div style={styles.row as never}>
      <div style={styles.control as never}>{props.children}</div>
      <div style={styles.body as never}>
        <span style={styles.label as never}>{props.label}</span>
        <span style={styles.hint as never}>{props.hint}</span>
      </div>
    </div>
  )
}

/** The @ search scope settings page. */
export function ScopeSection({ store, t }: ScopeSectionProps): ReactElement {
  const settings: BetterAtSettings = useSyncExternalStore(store.subscribe, store.get)
  const setDays = (value: string): void => {
    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_STALE_DAYS) return
    store.update({ staleSessionDays: parsed })
  }
  return (
    <section style={styles.section as never} aria-label={t('settings.title')}>
      <h3 style={styles.title as never}>{t('settings.title')}</h3>
      <p style={styles.description as never}>{t('settings.description')}</p>
      <Row label={t('settings.archived')} hint={t('settings.archivedHint')}>
        <input
          type="checkbox"
          checked={settings.hideArchivedSessions}
          aria-label={t('settings.archived')}
          onChange={event => store.update({ hideArchivedSessions: event.currentTarget.checked })}
        />
      </Row>
      <Row label={t('settings.staleDays')} hint={t('settings.staleDaysHint')}>
        <input
          type="number"
          min={0}
          max={MAX_STALE_DAYS}
          step={1}
          value={settings.staleSessionDays}
          aria-label={t('settings.staleDays')}
          style={styles.number as never}
          onChange={event => setDays(event.currentTarget.value)}
        />
      </Row>
      <Row label={t('settings.foreignSubagents')} hint={t('settings.foreignSubagentsHint')}>
        <input
          type="checkbox"
          checked={settings.hideForeignSubagents}
          aria-label={t('settings.foreignSubagents')}
          onChange={event => store.update({ hideForeignSubagents: event.currentTarget.checked })}
        />
      </Row>
      <Row label={t('settings.fileDisplay')} hint={t('settings.fileDisplayHint')}>
        <div style={styles.group as never} role="radiogroup" aria-label={t('settings.fileDisplay')}>
          {(['flat', 'tree'] as const).map((mode: FileDisplay) => (
            <label key={mode} style={styles.radioRow as never}>
              <input
                type="radio"
                name="dsh-better-at-file-display"
                checked={settings.fileDisplay === mode}
                onChange={() => store.update({ fileDisplay: mode })}
              />
              {t(mode === 'flat' ? 'settings.flat' : 'settings.tree')}
            </label>
          ))}
        </div>
      </Row>
      <button type="button" style={styles.reset as never} onClick={() => store.reset()}>
        {t('settings.reset')}
      </button>
    </section>
  )
}
