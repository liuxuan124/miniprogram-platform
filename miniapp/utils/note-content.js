/**
 * 笔记（小红书风格）正文与图集解析
 */

const FORMAT_TAGS = new Set(['笔记', '长文', '视频', '数据', '文章', '图文', '动态'])
const SOURCE_TAGS = new Set(['微信公众号', '小红书', '原创'])

function isInternalTag(tag) {
  const t = String(tag || '').trim()
  if (!t) return true
  if (/^wx-type:/i.test(t)) return true
  if (FORMAT_TAGS.has(t)) return true
  if (SOURCE_TAGS.has(t)) return true
  return false
}

function filterNoteDisplayTags(tags) {
  if (!Array.isArray(tags)) return []
  return tags
    .map((t) => String(t || '').trim())
    .filter((t) => t && !isInternalTag(t))
}

const NOTE_TITLE_HINT = /一张图|一图|图解|地图|海报|图看懂|图讲透|结构拆解|流程图|思维导图|合规SOP|财税地图/i

function mediaUrlDedupeKey(url) {
  const value = String(url || '').trim()
  if (!value) return ''
  try {
    if (value.startsWith('/')) return value.split('?')[0]
    return new URL(value).pathname.split('?')[0]
  } catch (e) {
    return value.split('?')[0]
  }
}

function extractImagesFromHtml(html) {
  const urls = []
  const source = String(html || '')
  const re = /<img[^>]+src=["']([^"']+)["']/gi
  let match
  while ((match = re.exec(source)) !== null) {
    const url = String(match[1] || '').trim()
    if (url && !urls.includes(url)) urls.push(url)
  }
  return urls
}

function plainTextFromHtml(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function inferWechatNewspic(item) {
  const tags = Array.isArray(item.tags) ? item.tags.map(String) : []
  if (tags.includes('wx-type:newspic')) return true
  if (tags.includes('wx-type:news')) return false

  const source = String(item.source || '')
  const isWechat = source.includes('微信') || tags.includes('微信公众号') || tags.some((t) => t.startsWith('wx:'))
  if (!isWechat) return false

  const html = String(item.content || '')
  const plain = plainTextFromHtml(html)
  const htmlImages = extractImagesFromHtml(html)
  const rawImages = Array.isArray(item.images) ? item.images : []
  const cover = String(item.coverUrl || item.coverImage || item.cover_url || '')
  const seen = new Set()
  ;[...rawImages, ...htmlImages, cover].forEach((url) => {
    const key = mediaUrlDedupeKey(url)
    if (key) seen.add(key)
  })
  const imageCount = seen.size
  const hasThumb = Boolean(cover.trim())
  const title = String(item.title || '')

  if (imageCount >= 2 && plain.length <= 600) return true
  if (imageCount >= 1 && plain.length <= 200) return true
  if (htmlImages.length >= 1 && htmlImages.length <= 4 && plain.length <= 1200 && hasThumb) return true
  if (rawImages.length >= 1 && plain.length <= 1200) return true
  if (htmlImages.length === 0 && hasThumb) {
    if (plain.length > 0 && plain.length <= 520) return true
    if (plain.length <= 680 && NOTE_TITLE_HINT.test(title)) return true
  }
  return false
}

function buildNoteGalleryUrls(cover, images) {
  const list = []
  const seen = new Set()
  const push = (url) => {
    const v = String(url || '').trim()
    if (!v) return
    const key = mediaUrlDedupeKey(v)
    if (!key || seen.has(key)) return
    seen.add(key)
    list.push(v)
  }
  push(cover)
  if (Array.isArray(images)) images.forEach(push)
  return list
}

function splitLongParagraph(text) {
  const raw = String(text || '').trim()
  if (!raw) return []
  if (raw.length <= 180) return [raw]

  const byNewline = raw.split(/\n+/).map((s) => s.trim()).filter(Boolean)
  if (byNewline.length > 1) return byNewline

  const sentences = raw.split(/(?<=[。！？!?；;])\s*/).map((s) => s.trim()).filter(Boolean)
  if (sentences.length > 1) {
    const chunks = []
    let buf = ''
    sentences.forEach((s) => {
      if ((buf + s).length > 160 && buf) {
        chunks.push(buf)
        buf = s
      } else {
        buf = buf ? `${buf}${s}` : s
      }
    })
    if (buf) chunks.push(buf)
    return chunks.length ? chunks : [raw]
  }

  return [raw]
}

function extractNoteParagraphs(html) {
  if (!html) return []
  const source = String(html)
    .replace(/<img[^>]*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')

  const blocks = source
    .split(/<\/p>|<\/div>/i)
    .map((chunk) => chunk.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim())
    .filter(Boolean)

  if (!blocks.length) {
    const plain = source.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
    return plain ? splitLongParagraph(plain) : []
  }

  return blocks.flatMap((block) => splitLongParagraph(block))
}

function hashTags(tags) {
  return filterNoteDisplayTags(tags).map((t) => (t.startsWith('#') ? t : `#${t}`))
}

module.exports = {
  FORMAT_TAGS,
  filterNoteDisplayTags,
  buildNoteGalleryUrls,
  extractImagesFromHtml,
  extractNoteParagraphs,
  hashTags,
  inferWechatNewspic,
}
