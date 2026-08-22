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

function buildNoteGalleryUrls(cover, images) {
  const list = []
  const push = (url) => {
    const v = String(url || '').trim()
    if (v && !list.includes(v)) list.push(v)
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
  extractNoteParagraphs,
  hashTags,
}
