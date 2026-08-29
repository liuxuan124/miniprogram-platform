const { resolveMediaUrl } = require('./media-url')
const { extractImagesFromHtml } = require('./note-content')
const { isUnusableImageUrl, pickLocalCoverFallback } = require('./image-fallback')

function pickFallbackCover(item) {
  const id = Number(item && item.id) || 0
  return pickLocalCoverFallback(id)
}

/** 解析文章封面：字段 → 正文首图 → 本地默认图（过滤占位小图/外链占位） */
function resolveArticleCover(item) {
  const raw = item.cover_url || item.coverImage || item.cover_image
    || item.coverUrl || item.cover || item.image || ''
  let url = resolveMediaUrl(raw)
  if (url && isUnusableImageUrl(url)) {
    url = ''
  }
  if (!url) {
    const html = item.content || item.summary || ''
    const imgs = extractImagesFromHtml(html)
    url = imgs.map((u) => resolveMediaUrl(u)).find((u) => u && !isUnusableImageUrl(u)) || ''
  }
  if (!url) url = pickFallbackCover(item)
  return url
}

module.exports = {
  resolveArticleCover,
}
