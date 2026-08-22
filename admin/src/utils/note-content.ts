const FORMAT_TAGS = new Set(['笔记', '长文', '视频', '数据', '文章', '图文', '动态'])
const SOURCE_TAGS = new Set(['微信公众号', '小红书', '原创'])

export function isInternalNoteTag(tag: string): boolean {
  const t = String(tag || '').trim()
  if (!t) return true
  if (/^wx-type:/i.test(t)) return true
  if (FORMAT_TAGS.has(t)) return true
  if (SOURCE_TAGS.has(t)) return true
  return false
}

export function filterNoteDisplayTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return []
  return tags
    .map((t) => String(t || '').trim())
    .filter((t) => t && !isInternalNoteTag(t))
}

export function buildNoteGalleryUrls(cover?: string, images?: string[]): string[] {
  const list: string[] = []
  const push = (url?: string) => {
    const v = String(url || '').trim()
    if (v && !list.includes(v)) list.push(v)
  }
  push(cover)
  if (Array.isArray(images)) images.forEach((url) => push(url))
  return list
}

/** 从正文 HTML 提取图片 URL（公众号长文/笔记正文内嵌图） */
export function extractImagesFromHtml(html: string): string[] {
  const urls: string[] = []
  const source = String(html || '')
  const re = /<img[^>]+src=["']([^"']+)["']/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(source)) !== null) {
    const url = String(match[1] || '').trim()
    if (url && !urls.includes(url)) urls.push(url)
  }
  return urls
}

function splitLongParagraph(text: string): string[] {
  const raw = String(text || '').trim()
  if (!raw) return []
  if (raw.length <= 180) return [raw]

  const byNewline = raw.split(/\n+/).map((s) => s.trim()).filter(Boolean)
  if (byNewline.length > 1) return byNewline

  const sentences = raw.split(/(?<=[。！？!?；;])\s*/).map((s) => s.trim()).filter(Boolean)
  if (sentences.length > 1) {
    const chunks: string[] = []
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

export function extractNoteParagraphs(html: string): string[] {
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

export function noteHashTags(tags: unknown): string[] {
  return filterNoteDisplayTags(tags).map((t) => (t.startsWith('#') ? t : `#${t}`))
}
