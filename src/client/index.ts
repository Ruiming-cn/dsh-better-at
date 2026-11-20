/**
 * dsh-better-at client plugin.
 *
 * Mounts the `betterAt` Remote namespace and wraps the native `@` source
 * (`trigger='@'`, `name='reference'`) so its candidate lookup uses the fast
 * cached Host indices. The native source's `onPick` and `codec` remain the
 * implementation of record: file and session references keep the original
 * occurrence, serialization and clipboard behavior.
 */
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { InputTriggerServiceContract, InputTriggerSource } from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import { BETTER_AT_REMOTE } from './remote.ts'
import { createBetterAtSource, type BetterAtRemoteFace } from './source.ts'
import { createSettingsStore } from './settings.ts'
import { ScopeSection } from './settings-view.tsx'
import { NS, en, zh } from './locales.ts'
import type { SessionSummaryLike } from './filters.ts'

/** Required services: trigger registry, Remote mount, connection, locale, sessions, slots. */
export const inject = ['inputTriggers', 'remote', 'connection', 'locale', 'sessions', 'slots']

/** Marker used to avoid wrapping the same source twice. */
type WrappedSource = InputTriggerSource & { __dshBetterAtWrapped?: boolean }

/** Minimal slot face: one list-slot registration plus the injection helper. */
interface SlotsLike {
  inject(name: string, callback: () => unknown): unknown
  register(entry: Record<string, unknown>, component: unknown): unknown
}

/** Turn whatever `ctx.slots.inject` answered into a disposer. */
function asDisposer(value: unknown): () => void {
  if (typeof value === 'function') return value as () => void
  const disposable = value as { dispose?: () => void } | undefined
  return () => { disposable?.dispose?.() }
}

/**
 * Compose the fast @ source wrapper.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-better-at: dictionaries')

  let betterAt: BetterAtRemoteFace | undefined
  ctx.effect(async () => {
    const dispose = await ctx.remote.$mount(BETTER_AT_REMOTE)
    betterAt = (ctx.reflect as unknown as { get(name: string): unknown }).get('remote.betterAt') as BetterAtRemoteFace | undefined
    if (betterAt === undefined) {
      throw new Error('dsh-better-at: the betterAt Remote namespace did not mount')
    }
    return () => {
      betterAt = undefined
      void dispose()
    }
  }, 'dsh-better-at: remote')

  const inputTriggers = ctx.get('inputTriggers') as InputTriggerServiceContract
  const t = ctx.locale.bind(NS)
  const settings = createSettingsStore()
  const sessions = ctx.get('sessions') as ISessions | undefined
  const getSessionSummaries = (): Readonly<Record<string, SessionSummaryLike | undefined>> | undefined => {
    try {
      return sessions?.list.getSnapshot().byId as Readonly<Record<string, SessionSummaryLike | undefined>> | undefined
    } catch (error) {
      console.error('[dsh-better-at] could not read the client session list:', error)
      return undefined
    }
  }
  const sourceImpl = createBetterAtSource({
    getRemote: () => betterAt,
    t,
    settings,
    getSessionSummaries,
    now: () => Date.now(),
  })

  // Settings page: the search scope is a first-class preference, not a hidden
  // option in a profile patch. The page writes the same store the picker reads.
  const slots = (ctx as unknown as { slots: SlotsLike }).slots
  if (slots !== undefined) {
    ctx.effect(() => asDisposer(
      slots.inject('settings.section', () =>
        slots.register(
          {
            name: 'settings.section',
            id: 'dsh-better-at-scope',
            order: 860,
            locale: NS,
            label: () => t('settings.title'),
            inject: () => ({ store: settings, t }),
          },
          ScopeSection,
        )),
    ), 'dsh-better-at: settings section')
  }

  const wrapped = new Set<WrappedSource>()
  const restore = new Map<WrappedSource, {
    candidates: WrappedSource['candidates']
    warm: WrappedSource['warm']
  }>()

  const wrapReference = (raw: WrappedSource): void => {
    if (raw === undefined || raw.__dshBetterAtWrapped || typeof raw.candidates !== 'function') return
    const originalCandidates = raw.candidates
    const originalWarm = raw.warm
    raw.candidates = async (session, req) => {
      if (betterAt === undefined) {
        return originalCandidates ? originalCandidates.call(raw, session, req) : []
      }
      try {
        return await sourceImpl.candidates(session, req)
      } catch (error) {
        console.error('[dsh-better-at] candidates failed, falling back to native:', error)
        return originalCandidates ? originalCandidates.call(raw, session, req) : []
      }
    }
    if (typeof originalWarm === 'function') {
      raw.warm = (session) => {
        try { originalWarm.call(raw, session) } catch (error) { console.error('[dsh-better-at] native warm failed:', error) }
        sourceImpl.prewarm(session)
      }
    } else {
      raw.warm = (session) => sourceImpl.prewarm(session)
    }
    raw.__dshBetterAtWrapped = true
    wrapped.add(raw)
    restore.set(raw, { candidates: originalCandidates, warm: originalWarm })
  }

  // The live source roster lives on the trigger service's private `live.sources`.
  // We use the same proven pattern as dsh-skill-fuzzy and additionally intercept
  // registerSource so a later re-registration is also wrapped.
  const service = inputTriggers as unknown as {
    live?: { sources?: WrappedSource[] }
    registerSource: InputTriggerServiceContract['registerSource']
  }
  if (Array.isArray(service.live?.sources)) {
    const reference = service.live.sources.find(source => source.trigger === '@' && source.name === 'reference')
    if (reference !== undefined) wrapReference(reference)
  }
  const registerSource = service.registerSource.bind(service)
  service.registerSource = (src: InputTriggerSource) => {
    if (src.trigger === '@' && src.name === 'reference') wrapReference(src as WrappedSource)
    return registerSource(src)
  }

  ctx.effect(() => () => {
    service.registerSource = registerSource
    for (const source of wrapped) {
      const original = restore.get(source)
      if (original === undefined) continue
      source.candidates = original.candidates
      source.warm = original.warm
      delete source.__dshBetterAtWrapped
    }
    wrapped.clear()
    restore.clear()
  }, 'dsh-better-at: source wrapper')

  ctx.on('connection/reset', () => {
    sourceImpl.invalidateAll()
  })
}
