import { getPlainTextFromHtml } from '@/utils/content-preview'
import { extractImagesFromHtml, mediaUrlDedupeKey } from '@/utils/note-content'

const EMPTY_CATEGORIES = new Set(['未分类', '未设置', '默认', '无分类', ''])

export function isDisplayableCategory(label?: string): boolean {
  const value = String(label || '').replace(/^└\s*/, '').trim()
  return Boolean(value) && !EMPTY_CATEGORIES.has(value)
}

function basenameKey(url?: string): string {
  const key = mediaUrlDedupeKey(url || '')
  if (!key) return ''
  const parts = key.split('/')
  return parts[parts.length - 1] || key
}

export function mediaUrlsEquivalent(a?: string, b?: string): boolean {
  const left = mediaUrlDedupeKey(a || '')
  const right = mediaUrlDedupeKey(b || '')
  if (left && right && left === right) return true
  const lb = basenameKey(a)
  const rb = basenameKey(b)
  return Boolean(lb && rb && lb === rb && lb.length >= 8)
}

function normalizeTitleKey(text?: string): string {
  return String(text || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, '')
    .replace(/[：:·\-—,，。！？!?]/g, '')
    .toLowerCase()
}

function titlesOverlap(a?: string, b?: string): boolean {
  const left = normalizeTitleKey(a)
  const right = normalizeTitleKey(b)
  if (!left || !right || left.length < 8 || right.length < 8) return false
  const probe = left.length <= right.length ? left : right
  const haystack = left.length > right.length ? left : right
  return haystack.includes(probe.slice(0, Math.min(16, probe.length)))
}

/** 中文长文阅读速度约 400 字/分钟 */
export function estimateReadMinutes(html: string, charsPerMinute = 400): number {
  const plain = getPlainTextFromHtml(html)
  const chars = plain.replace(/\s/g, '').length
  if (!chars) return 0
  return Math.max(1, Math.ceil(chars / charsPerMinute))
}

export function formatReadTimeLabel(minutes: number): string {
  if (minutes <= 0) return ''
  return `约 ${minutes} 分钟`
}

const LEADING_IMG_RE =
  /^\s*(?:<(?:p|div|section|figure)[^>]*>\s*)?<img[^>]+src=["']([^"']+)["'][^>]*>\s*(?:<\/(?:p|div|section|figure)>)?/i

const LEADING_EMPTY_BLOCK_RE =
  /^\s*(?:<(?:p|div|section|figure)[^>]*>\s*<\/(?:p|div|section|figure)>|<br\s*\/?>)\s*/i

function trimLeadingEmptyBlocks(html: string): string {
  let result = html
  for (let i = 0; i < 4; i += 1) {
    const next = result.replace(LEADING_EMPTY_BLOCK_RE, '')
    if (next === result) break
    result = next
  }
  return result.trimStart()
}

/** 去掉正文开头与封面相同的首图 */
export function stripLeadingDuplicateCoverImages(html: string, coverUrl?: string): string {
  if (!html || !coverUrl) return html
  let result = trimLeadingEmptyBlocks(String(html).trim())
  if (!mediaUrlDedupeKey(coverUrl)) return html

  for (let i = 0; i < 4; i += 1) {
    result = trimLeadingEmptyBlocks(result)
    const match = result.match(LEADING_IMG_RE)
    if (!match) break
    if (mediaUrlsEquivalent(match[1], coverUrl)) {
      result = result.slice(match[0].length).trimStart()
      continue
    }
    break
  }
  return result
}

/** 去掉正文开头的标题海报（纯图块） */
export function stripLeadingBannerImages(html: string, maxStrip = 2): string {
  let result = trimLeadingEmptyBlocks(String(html || '').trim())
  if (!result) return html

  for (let i = 0; i < maxStrip; i += 1) {
    result = trimLeadingEmptyBlocks(result)
    const match = result.match(LEADING_IMG_RE)
    if (!match) break
    const rest = result.slice(match[0].length).trimStart()
    const restPlainLen = getPlainTextFromHtml(rest).replace(/\s/g, '').length
    if (i === 0 || restPlainLen >= 60) {
      result = rest
      continue
    }
    break
  }
  return result
}

/** 去掉导入时写入的「原文链接」脚注（历史数据） */
export function stripOriginalLinkFooter(html: string): string {
  return String(html || '')
    .replace(/<p[^>]*>\s*原文链接\s*[：:][\s\S]*?<\/p>/gi, '')
    .replace(/<p[^>]*>\s*查看微信原文[\s\S]*?<\/p>/gi, '')
}

/** 去掉 135 编辑器等生成的头图区/报头（含重复标题/导语） */
export function stripWechatEditorPreamble(html: string, title?: string): string {
  let result = stripOriginalLinkFooter(String(html || '').trim())
  if (!result) return html

  const h2Index = result.search(/<h2[\s>]/i)
  if (h2Index > 0 && h2Index < 12000) {
    const before = result.slice(0, h2Index)
    const beforePlain = getPlainTextFromHtml(before).replace(/\s/g, '')
    const titleKey = normalizeTitleKey(title)
    const looksLikeMasthead =
      beforePlain.length > 0 &&
      beforePlain.length <= 900 &&
      ((titleKey.length >= 8 && beforePlain.includes(titleKey.slice(0, Math.min(16, titleKey.length)))) ||
        /周报|WEEKLY|第\d+期/i.test(beforePlain))
    if (looksLikeMasthead) {
      return result.slice(h2Index).trim()
    }
    const sectionStart = before.lastIndexOf('<section')
    return result.slice(sectionStart >= 0 ? sectionStart : h2Index)
  }

  if (title) {
    result = result.replace(/<section[^>]*>[\s\S]*?<h1[\s\S]*?<\/section>\s*/gi, (block) =>
      titlesOverlap(getPlainTextFromHtml(block), title) ? '' : block,
    )
  }

  result = result.replace(
    /<section[^>]*background-color\s*:\s*(?:#2[Aa]1[Ff]14|rgb\(\s*42\s*,\s*31\s*,\s*20\s*\))[^>]*>[\s\S]*?<\/section>\s*/gi,
    '',
  )
  return result.trim()
}

/** 正文中移除与标题重复的 h1 */
export function removeDuplicateBodyHeadings(html: string, title?: string): string {
  if (!title) return html
  return String(html || '').replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, (block) =>
    titlesOverlap(getPlainTextFromHtml(block), title) ? '' : block,
  )
}

/** 清理微信编辑器冗余属性，便于统一样式 */
export function cleanupWechatEditorMarkup(html: string): string {
  return String(html || '')
    .replace(/\sdata-[a-z0-9-]+="[^"]*"/gi, '')
    .replace(/<span[^>]*>\s*<br\s*\/?>\s*<\/span>/gi, '')
    .replace(/<section[^>]*style="[^"]*height:\s*0px[^"]*"[^>]*>[\s\S]*?<\/section>/gi, '')
}

export function addLazyLoadingToImages(html: string): string {
  return String(html || '').replace(/<img(?![^>]*\bloading=)/gi, '<img loading="lazy"')
}

export function prepareArticleContentHtml(html: string, coverUrl?: string, title?: string): string {
  let out = stripLeadingDuplicateCoverImages(html, coverUrl)
  out = stripLeadingBannerImages(out, 2)
  out = stripWechatEditorPreamble(out, title)
  out = removeDuplicateBodyHeadings(out, title)
  out = cleanupWechatEditorMarkup(out)
  out = stripLeadingDuplicateCoverImages(out, coverUrl)
  return addLazyLoadingToImages(out)
}

export function firstBodyImageUrl(html: string): string {
  const images = extractImagesFromHtml(html)
  return images[0] || ''
}

export function extractArticleSummary(html: string, maxLen = 96): string {
  const plain = getPlainTextFromHtml(html).replace(/\s+/g, ' ').trim()
  if (!plain) return ''
  return plain.length <= maxLen ? plain : `${plain.slice(0, maxLen)}…`
}
