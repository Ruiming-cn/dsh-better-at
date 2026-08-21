/**
 * `better-at` namespace dictionaries for the fast @ source candidate rows.
 * Keys mirror the native `reference` namespace so the menu copy stays aligned.
 */

/** Dictionary namespace owned by this plugin. */
export const NS = 'better-at'

/** Simplified Chinese dictionary (key-set source of truth). */
export const zh = {
  'section.files': '文件与文件夹',
  'section.sessions': 'Session 对话',
  'candidate.file': '文件',
  'candidate.folder': '文件夹',
  'candidate.session': 'Session',
  'candidate.noCwd': '（无工作目录）',
} satisfies Record<string, string>

/** English dictionary. */
export const en = {
  'section.files': 'Files & folders',
  'section.sessions': 'Session conversations',
  'candidate.file': 'File',
  'candidate.folder': 'Folder',
  'candidate.session': 'Session',
  'candidate.noCwd': '(no cwd)',
} satisfies Record<string, string>

/** The better-at locale key union. */
export type BetterAtKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The fast @ reference copy. */
    [NS]: BetterAtKey
  }
}
