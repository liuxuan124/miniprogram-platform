function normalizeTagList(item) {
  const raw = item.tags || item.tagList || item.tag_list
  if (Array.isArray(raw)) return raw.map((t) => String(t || '').trim()).filter(Boolean)
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.map((t) => String(t || '').trim()).filter(Boolean)
    } catch (e) {
      return raw.split(/[,，]/).map((t) => t.trim()).filter(Boolean)
    }
  }
  return []
}

function filterByContentTags(rows, config) {
  const cfg = config || {}
  const platformCodes = Array.isArray(cfg.filter_platform_codes) ? cfg.filter_platform_codes : []
  const topicTags = Array.isArray(cfg.filter_topic_tags) ? cfg.filter_topic_tags : []
  if (!platformCodes.length && !topicTags.length) return rows || []
  return (rows || []).filter((item) => {
    const tags = normalizeTagList(item)
    if (topicTags.length && !topicTags.some((t) => tags.includes(String(t)))) return false
    if (platformCodes.length) {
      const code = item.platformCode || item.platform_code || item.sourceTag || item.source_tag || ''
      if (!platformCodes.some((c) => String(c) === String(code))) return false
    }
    return true
  })
}

function primaryTagQueryParam(config) {
  const tags = Array.isArray(config && config.filter_topic_tags) ? config.filter_topic_tags : []
  return tags.length ? String(tags[0]) : ''
}

module.exports = { filterByContentTags, primaryTagQueryParam, normalizeTagList }
