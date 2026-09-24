const DEFAULTS = {
  wechat_mp: '公众号',
  xiaohongshu: '小红书',
  qa: '问答',
  original: '原创',
}

function resolveSourceTagKey(item) {
  if (!item) return ''
  const tag = String(item.sourceTag || item.source_tag || '').toLowerCase()
  if (tag === 'wechat_mp' || tag === 'wechat') return 'wechat_mp'
  if (tag === 'xiaohongshu' || tag === 'xhs') return 'xiaohongshu'
  if (tag === 'qa') return 'qa'
  if (tag === 'original') return 'original'
  const source = String(item.source || '')
  if (source.indexOf('微信') >= 0 || source.indexOf('公众号') >= 0) return 'wechat_mp'
  if (source.indexOf('小红书') >= 0) return 'xiaohongshu'
  if (source.indexOf('问答') >= 0) return 'qa'
  if (source === '原创' || source === '手动录入') return 'original'
  return ''
}

function resolveSourceLabel(item, labels) {
  const key = resolveSourceTagKey(item)
  if (!key) return ''
  const map = labels || {}
  return map[key] || DEFAULTS[key] || ''
}

function filterBySourceKeys(items, filterKeys) {
  if (!filterKeys || !filterKeys.length) return items
  const set = {}
  filterKeys.forEach((k) => { set[k] = true })
  return (items || []).filter((item) => {
    const key = resolveSourceTagKey(item)
    return key && set[key]
  })
}

module.exports = { resolveSourceLabel, filterBySourceKeys, resolveSourceTagKey }
