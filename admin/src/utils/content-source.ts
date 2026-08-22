/** 内容平台来源（列表「来源」列应展示的值） */
export const PLATFORM_SOURCES = new Set([
  '微信公众号',
  '小红书',
  '笔记',
  '动态',
  '原创',
  '手动录入',
  '本地联调',
])

function hasWechatSyncTags(tags: string[]): boolean {
  return tags.some(
    (tag) =>
      tag === '微信公众号'
      || tag.startsWith('wx-type:')
      || tag.startsWith('wx:')
      || tag.startsWith('wx-batch:'),
  )
}

/** 将 DB 中的 source / 同步标记解析为平台来源 */
export function resolvePlatformSource(input: {
  source?: string
  tags?: string[]
  externalSource?: string
}): string {
  const source = String(input.source || '').trim()
  const tags = Array.isArray(input.tags) ? input.tags.map(String) : []
  const external = String(input.externalSource || '').trim()

  if (PLATFORM_SOURCES.has(source)) return source

  if (external.startsWith('wechat') || hasWechatSyncTags(tags)) {
    return '微信公众号'
  }
  if (source === '小红书' || tags.includes('小红书')) {
    return '小红书'
  }
  if (source) {
    // 历史数据曾把栏目名写入 source，统一归为原创/手动录入
    return '原创'
  }
  return '未标注'
}

export function platformSourceTagType(source: string): 'success' | 'danger' | 'warning' | 'info' | '' {
  if (source === '微信公众号') return 'success'
  if (source === '小红书') return 'danger'
  if (source === '原创' || source === '手动录入') return 'warning'
  if (source === '未标注') return 'info'
  return 'info'
}
