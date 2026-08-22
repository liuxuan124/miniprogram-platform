// utils/rich-html.js — 富文本 HTML 图片提取与预览

/** 从 HTML 字符串提取 img src 列表（去重、保序） */
function extractImageUrls(html) {
  if (!html) return []
  const text = typeof html === 'string' ? html : String(html)
  const urls = []
  const seen = {}
  const re = /<img\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/gi
  let match = re.exec(text)
  while (match) {
    const url = String(match[2] || '').trim()
    if (url && !seen[url]) {
      seen[url] = true
      urls.push(url)
    }
    match = re.exec(text)
  }
  return urls
}

/** 预览富文本内图片 */
function previewRichHtmlImages(html, currentUrl) {
  const urls = extractImageUrls(html)
  if (!urls.length) return false
  wx.previewImage({
    urls,
    current: currentUrl && urls.indexOf(currentUrl) >= 0 ? currentUrl : urls[0],
  })
  return true
}

module.exports = {
  extractImageUrls,
  previewRichHtmlImages,
}
