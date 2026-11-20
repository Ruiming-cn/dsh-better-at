/**
 * `better-at` namespace dictionaries for the fast @ source candidate rows.
 * Keys mirror the native `reference` namespace so the menu copy stays aligned.
 */

/** Dictionary namespace owned by this plugin. */
export const NS = 'better-at'

/** Simplified Chinese dictionary (key-set source of truth). */
export const zh = {
  'section.files': '文件与文件夹',
  'section.sessions': '对话',
  'candidate.noCwd': '（无工作目录）',
  'time.now': '刚刚',
  'time.minutes': '{n}分钟',
  'time.hours': '{n}小时',
  'time.days': '{n}天',
  'time.months': '{n}个月',
  'time.years': '{n}年',
} satisfies Record<string, string>

/** English dictionary. */
export const en = {
  'section.files': 'Files & folders',
  'section.sessions': 'Sessions',
  'candidate.noCwd': '(no cwd)',
  'time.now': 'now',
  'time.minutes': '{n}min',
  'time.hours': '{n}h',
  'time.days': '{n}d',
  'time.months': '{n}mo',
  'time.years': '{n}y',
} satisfies Record<string, string>

/** The better-at locale key union. */
export type BetterAtKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The fast @ reference copy. */
    [NS]: BetterAtKey
  }
}
