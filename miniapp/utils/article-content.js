const { mediaUrlDedupeKey, extractImagesFromHtml } = require('./note-content')

const EMPTY_CATEGORIES = new Set(['未分类', '未设置', '默认', '无分类', ''])

function plainTextFromHtml(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeTitleKey(text) {
  return String(text || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, '')
    .replace(/[：:·\-—,，。！？!?|｜]/g, '')
    .toLowerCase()
}

function titlesOverlap(a, b) {
  const left = normalizeTitleKey(a)
  const right = normalizeTitleKey(b)
  if (!left || !right || left.length < 8 || right.length < 8) return false
  const probe = left.length <= right.length ? left : right
  const haystack = left.length > right.length ? left : right
  return haystack.includes(probe.slice(0, Math.min(16, probe.length)))
}

function stripOriginalLinkFooter(html) {
  return String(html || '')
    .replace(/<p[^>]*>\s*原文链接\s*[：:][\s\S]*?<\/p>/gi, '')
    .replace(/<p[^>]*>\s*查看微信原文[\s\S]*?<\/p>/gi, '')
}

function basenameKey(url) {
  const key = mediaUrlDedupeKey(url || '')
  if (!key) return ''
  const parts = key.split('/')
  return parts[parts.length - 1] || key
}

function isDisplayableCategory(label) {
  const value = String(label || '').replace(/^└\s*/, '').trim()
  return Boolean(value) && !EMPTY_CATEGORIES.has(value)
}

function mediaUrlsEquivalent(a, b) {
  const left = mediaUrlDedupeKey(a || '')
  const right = mediaUrlDedupeKey(b || '')
  if (left && right && left === right) return true
  const lb = basenameKey(a)
  const rb = basenameKey(b)
  return Boolean(lb && rb && lb === rb && lb.length >= 8)
}

function estimateReadMinutes(html, charsPerMinute = 400) {
  const plain = plainTextFromHtml(html)
  const chars = plain.replace(/\s/g, '').length
  if (!chars) return 0
  return Math.max(1, Math.ceil(chars / charsPerMinute))
}

function formatReadTimeLabel(minutes) {
  if (minutes <= 0) return ''
  return `约 ${minutes} 分钟`
}

const LEADING_IMG_RE =
  /^\s*(?:<(?:p|div|section|figure)[^>]*>\s*)?<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>\s*(?:<\/(?:p|div|section|figure)>)?/i

const LEADING_EMPTY_BLOCK_RE =
  /^\s*(?:<(?:p|div|section|figure)[^>]*>\s*<\/(?:p|div|section|figure)>|<br\s*\/?>)\s*/i

function normalizeImgDataSrc(html) {
  return String(html || '').replace(/\sdata-src=(["'])([^"']*)\1/gi, ' src=$1$2$1')
}

function trimLeadingEmptyBlocks(html) {
  let result = html
  for (let i = 0; i < 4; i += 1) {
    const next = result.replace(LEADING_EMPTY_BLOCK_RE, '')
    if (next === result) break
    result = next
  }
  return result.trimStart()
}

function stripLeadingDuplicateCoverImages(html, coverUrl) {
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

function stripLeadingBannerImages(html, maxStrip = 0) {
  if (maxStrip <= 0) return html
  let result = trimLeadingEmptyBlocks(String(html || '').trim())
  if (!result) return html

  for (let i = 0; i < maxStrip; i += 1) {
    result = trimLeadingEmptyBlocks(result)
    const match = result.match(LEADING_IMG_RE)
    if (!match) break
    const rest = result.slice(match[0].length).trimStart()
    const restPlainLen = plainTextFromHtml(rest).replace(/\s/g, '').length
    if (i === 0 || restPlainLen >= 60) {
      result = rest
      continue
    }
    break
  }
  return result
}

function buildMastheadKeywordRe(keywords) {
  const parts = String(keywords || '')
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.length) {
    return new RegExp(parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i')
  }
  return /周报|WEEKLY|第\d+期/i
}

function stripMastheadBgSections(html, bgColor) {
  const color = String(bgColor || '#2A1F14').trim()
  if (!color) return html
  const hex = color.replace('#', '')
  const escaped = hex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(
    `<section[^>]*background-color\\s*:\\s*(?:#${escaped}|${color.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})[^>]*>[\\s\\S]*?<\\/section>\\s*`,
    'gi',
  )
  return html.replace(re, '')
}

function stripWechatEditorPreamble(html, title, options = {}) {
  let result = stripOriginalLinkFooter(String(html || '').trim())
  if (!result) return html

  const keywordRe = buildMastheadKeywordRe(options.mastheadKeywords)

  if (options.stripMasthead) {
    const h2Index = result.search(/<h2[\s>]/i)
    if (h2Index > 0 && h2Index < 12000) {
      const before = result.slice(0, h2Index)
      const beforePlain = plainTextFromHtml(before).replace(/\s/g, '')
      const titleKey = normalizeTitleKey(title)
      const looksLikeMasthead =
        beforePlain.length > 0 &&
        beforePlain.length <= 300 &&
        ((titleKey.length >= 8 &&
          beforePlain.includes(titleKey.slice(0, Math.min(16, titleKey.length)))) ||
          keywordRe.test(beforePlain))
      if (looksLikeMasthead) {
        return result.slice(h2Index).trim()
      }
    }

    if (title) {
      result = result.replace(/<section[^>]*>[\s\S]*?<h1[\s\S]*?<\/section>\s*/gi, (block) =>
        titlesOverlap(plainTextFromHtml(block), title) ? '' : block,
      )
    }

    result = stripMastheadBgSections(result, options.mastheadBgColor || '#2A1F14')
  }

  return result.trim()
}

function removeDuplicateBodyHeadings(html, title) {
  if (!title) return html
  return String(html || '').replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, (block) =>
    titlesOverlap(plainTextFromHtml(block), title) ? '' : block,
  )
}

function cleanupWechatEditorMarkup(html) {
  let result = normalizeImgDataSrc(html)
  result = result
    .replace(/\sdata-[a-z0-9-]+="[^"]*"/gi, '')
    .replace(/<span[^>]*>\s*<br\s*\/?>\s*<\/span>/gi, '')
    .replace(/<section[^>]*style="[^"]*height:\s*0px[^"]*"[^>]*>[\s\S]*?<\/section>/gi, '')
  return result
}

function prepareArticleContentHtml(html, coverUrl, title, options = {}) {
  let out = normalizeImgDataSrc(html)
  out = stripLeadingDuplicateCoverImages(out, coverUrl)
  out = stripLeadingBannerImages(out, options.stripBanner ?? 0)
  out = stripWechatEditorPreamble(out, title, options)
  out = removeDuplicateBodyHeadings(out, title)
  out = cleanupWechatEditorMarkup(out)
  out = stripLeadingDuplicateCoverImages(out, coverUrl)
  return out
}

function buildMpHtmlBodyStyles(theme = 'standard') {
  const base = {
    container: 'font-size:34rpx;line-height:1.75;color:#2b2f38;',
    tag: {
      p: 'margin:0 0 24rpx;',
      img: 'max-width:100%;border-radius:12rpx;margin:16rpx 0 24rpx;display:block;',
      h2: 'font-size:38rpx;font-weight:700;margin:40rpx 0 20rpx;',
      h3: 'font-size:36rpx;font-weight:600;margin:32rpx 0 16rpx;',
      blockquote: 'border-left:6rpx solid #d5dae3;padding-left:20rpx;color:#5e6673;margin:24rpx 0;',
      table: 'width:100%;border-collapse:collapse;',
      td: 'border:1rpx solid #e2e6eb;padding:12rpx;',
    },
  }
  const themes = {
    standard: base,
    magazine: {
      container: 'font-size:34rpx;line-height:1.8;color:#1a1d24;letter-spacing:0.02em;',
      tag: { ...base.tag, h2: 'font-size:40rpx;font-weight:700;margin:48rpx 0 24rpx;color:#111;' },
    },
    minimal: {
      container: 'font-size:32rpx;line-height:1.7;color:#3a4049;',
      tag: { ...base.tag, img: 'max-width:100%;border-radius:8rpx;margin:12rpx 0 20rpx;display:block;' },
    },
    large: {
      container: 'font-size:36rpx;line-height:1.85;color:#222831;',
      tag: {
        ...base.tag,
        p: 'margin:0 0 28rpx;',
        h2: 'font-size:42rpx;font-weight:700;margin:44rpx 0 22rpx;',
      },
    },
    dark: base,
  }
  return themes[theme] || base
}

function extractArticleSummary(html, maxLen = 96) {
  const plain = plainTextFromHtml(html).replace(/\s+/g, ' ').trim()
  if (!plain) return ''
  return plain.length <= maxLen ? plain : `${plain.slice(0, maxLen)}…`
}

module.exports = {
  isDisplayableCategory,
  mediaUrlsEquivalent,
  estimateReadMinutes,
  formatReadTimeLabel,
  normalizeImgDataSrc,
  stripLeadingDuplicateCoverImages,
  stripLeadingBannerImages,
  stripWechatEditorPreamble,
  prepareArticleContentHtml,
  buildMpHtmlBodyStyles,
  extractArticleSummary,
  plainTextFromHtml,
}
