/** 内容来源标签（DSL wechat_mp / xiaohongshu / qa / original） */

export type SourceTagKey = 'wechat_mp' | 'xiaohongshu' | 'qa' | 'original'

export const SOURCE_TAG_DEFAULTS: Record<SourceTagKey, string> = {
  wechat_mp: '公众号',
  xiaohongshu: '小红书',
  qa: '问答',
  original: '原创',
}

export function resolveSourceTagKey(raw: Record<string, unknown>): SourceTagKey | '' {
  const tag = String(raw.sourceTag || raw.source_tag || '').trim().toLowerCase()
  if (tag === 'wechat_mp' || tag === 'wechat') return 'wechat_mp'
  if (tag === 'xiaohongshu' || tag === 'xhs') return 'xiaohongshu'
  if (tag === 'qa') return 'qa'
  if (tag === 'original') return 'original'
  const source = String(raw.source || '').trim()
  if (source.includes('微信') || source.includes('公众号')) return 'wechat_mp'
  if (source.includes('小红书')) return 'xiaohongshu'
  if (source.includes('问答')) return 'qa'
  if (source === '原创' || source === '手动录入') return 'original'
  return ''
}

export function resolveSourceLabel(
  item: Record<string, unknown>,
  labels: Partial<Record<SourceTagKey, string>> = {},
): string {
  const key = resolveSourceTagKey(item)
  if (!key) return ''
  return String(labels[key] || SOURCE_TAG_DEFAULTS[key])
}

export function filterBySourceKeys<T extends Record<string, unknown>>(
  items: T[],
  filterKeys: SourceTagKey[] | undefined,
): T[] {
  if (!filterKeys || !filterKeys.length) return items
  const set = new Set(filterKeys)
  return items.filter((item) => {
    const key = resolveSourceTagKey(item)
    return key && set.has(key)
  })
}
