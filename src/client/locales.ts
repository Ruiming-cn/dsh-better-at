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
  'settings.title': '@ 搜索范围',
  'settings.description': '规则在浏览器内应用，改完立即生效，不会重新扫描工作区。',
  'settings.archived': '不搜索已归档的对话',
  'settings.archivedHint': '归档只隐藏对话，不删除数据。',
  'settings.staleDays': '不搜索 N 天内未维护的对话',
  'settings.staleDaysHint': '默认 7 天；填 0 关闭这条规则。正在运行的对话始终保留。',
  'settings.foreignSubagents': '不搜索不属于当前对话的子智能体',
  'settings.foreignSubagentsHint': '由当前对话派生出的子智能体会话仍然保留。',
  'settings.fileDisplay': '文件路径展示',
  'settings.fileDisplayHint': '平铺为「文件名 + 父目录」，树形按工作区深度缩进并显示完整相对路径。',
  'settings.flat': '平铺',
  'settings.tree': '树形',
  'settings.reset': '恢复默认',
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
  'settings.title': '@ search scope',
  'settings.description': 'Rules apply inside the browser: a change affects the next @ immediately and never rescans the workspace.',
  'settings.archived': 'Skip archived sessions',
  'settings.archivedHint': 'Archiving hides a session without deleting its data.',
  'settings.staleDays': 'Skip sessions idle for N days',
  'settings.staleDaysHint': 'Defaults to 7. Use 0 to keep every session; a running session is always kept.',
  'settings.foreignSubagents': 'Skip subagents outside this conversation',
  'settings.foreignSubagentsHint': 'Subagent sessions descended from the current conversation stay listed.',
  'settings.fileDisplay': 'File path display',
  'settings.fileDisplayHint': 'Flat shows the name plus its parent directory; tree indents by workspace depth and shows the full relative path.',
  'settings.flat': 'Flat',
  'settings.tree': 'Tree',
  'settings.reset': 'Reset to defaults',
} satisfies Record<string, string>

/** The better-at locale key union. */
export type BetterAtKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The fast @ reference copy. */
    [NS]: BetterAtKey
  }
}
