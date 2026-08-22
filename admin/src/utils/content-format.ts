import { extractImagesFromHtml, mediaUrlDedupeKey } from '@/utils/note-content'

export type ContentFormatType = 'article' | 'note' | 'moment' | 'rich' | 'video'

const NOTE_TITLE_HINT = /一张图|一图|图解|地图|海报|图看懂|图讲透|结构拆解|流程图|思维导图|合规SOP|财税地图/i

export function parseContentTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((t) => String(t)).filter(Boolean)
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.map((t) => String(t)).filter(Boolean)
    } catch {
      return raw.split(',').map((t) => t.trim()).filter(Boolean)
    }
  }
  return []
}

function plainTextFromHtml(html: string): string {
  return String(html || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isWechatContent(data: Record<string, unknown>, tags: string[]): boolean {
  const source = String(data.source || '')
  return source.includes('微信') || tags.includes('微信公众号') || tags.some((t) => t.startsWith('wx:'))
}

function countUniqueImages(data: Record<string, unknown>, html: string): number {
  const rawImages = Array.isArray(data.images) ? data.images.map(String) : []
  const htmlImages = extractImagesFromHtml(html)
  const cover = String(data.coverImage || data.cover_image || '')
  const seen = new Set<string>()
  for (const url of [...rawImages, ...htmlImages, cover]) {
    const key = mediaUrlDedupeKey(url)
    if (key) seen.add(key)
  }
  return seen.size
}

/** 识别微信公众号贴图（newspic），与同步服务 / 小程序详情对齐 */
export function inferWechatNewspic(data: Record<string, unknown>): boolean {
  const tags = parseContentTags(data.tags)
  if (tags.includes('wx-type:newspic')) return true
  if (tags.includes('wx-type:news')) return false
  if (!isWechatContent(data, tags)) return false

  const html = String(data.content || '')
  const plain = plainTextFromHtml(html)
  const htmlImages = extractImagesFromHtml(html)
  const rawImages = Array.isArray(data.images) ? data.images : []
  const imageCount = countUniqueImages(data, html)
  const hasThumb = Boolean(String(data.coverImage || data.cover_image || '').trim())
  const title = String(data.title || '')

  if (imageCount >= 2 && plain.length <= 600) return true
  if (imageCount >= 1 && plain.length <= 200) return true

  if (htmlImages.length >= 1 && htmlImages.length <= 4 && plain.length <= 1200 && hasThumb) {
    return true
  }
  if (rawImages.length >= 1 && plain.length <= 1200) return true

  if (htmlImages.length === 0 && hasThumb) {
    if (plain.length > 0 && plain.length <= 520) return true
    if (plain.length <= 680 && NOTE_TITLE_HINT.test(title)) return true
  }

  return false
}

export function inferContentFormat(data: Record<string, unknown>): ContentFormatType {
  const explicit = String(data.contentType || data.content_type || data.type || '').toLowerCase()
  if (explicit === 'note') return 'note'
  if (explicit === 'moment') return 'moment'
  if (explicit === 'video') return 'video'
  if (explicit === 'rich') return 'rich'

  const tags = parseContentTags(data.tags)
  if (tags.includes('wx-type:newspic')) return 'note'
  if (tags.includes('wx-type:news')) return 'article'

  if (inferWechatNewspic(data)) return 'note'
  if (explicit === 'article') return 'article'

  if (explicit.includes('video') || explicit.includes('视频') || tags.some((t) => t.includes('视频'))) {
    return 'video'
  }

  const html = String(data.content || '').toLowerCase()
  if (html.includes('<video')) return 'video'
  if (explicit.includes('rich') || explicit.includes('graphic') || explicit.includes('图文')) {
    return 'rich'
  }
  if (html.includes('<img')) return 'rich'

  return 'article'
}

export function inferPreviewType(data: Record<string, unknown>): 'article' | 'note' | 'moment' {
  const fmt = inferContentFormat(data)
  if (fmt === 'note') return 'note'
  if (fmt === 'moment') return 'moment'
  return 'article'
}
