/** 过滤不可用远程图（占位小图 / 会 302 的 picsum），回退到小程序包内资源 */

const { resolveMediaUrl } = require('./media-url')

const BAD_URL_MARKERS = [
  'd18dcd5f5c654fea8b5a40f3580d10cd',
  'picsum.photos',
]

// 微信 <image> 不渲染 SVG，占位必须用位图
const DEFAULT_AVATAR = '/images/default-avatar.png'
const DEFAULT_PRODUCT = '/images/default-product.svg'
const DEFAULT_BRAND_LOGO = '/images/default-brand-logo.png'

const LOCAL_COVERS = [
  '/images/section-bar-tech-bg.jpg',
  '/images/motaibai-hero.svg',
  '/images/default-article.svg',
]

const DEFAULT_HERO = '/images/section-bar-tech-bg.jpg'

function isUnusableImageUrl(url) {
  const value = String(url || '').trim()
  if (!value) return true
  const lower = value.toLowerCase()
  return BAD_URL_MARKERS.some((m) => lower.includes(m))
}

function isLocalhostUrl(url) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\b/i.test(String(url || ''))
}

function isSvgUrl(url) {
  const value = String(url || '').trim()
  return /\.svg(\?|#|$)/i.test(value) || /^data:image\/svg\+xml/i.test(value)
}

function isDisplayableImageUrl(url) {
  const value = String(url || '').trim()
  if (!value || isUnusableImageUrl(value) || isLocalhostUrl(value) || isSvgUrl(value)) {
    return false
  }
  return /^(https?:\/\/|\/images\/)/i.test(value)
}

function pickLocalCoverFallback(seed) {
  const n = Number(seed)
  const idx = Number.isFinite(n) ? Math.abs(Math.trunc(n)) % LOCAL_COVERS.length : 0
  return LOCAL_COVERS[idx]
}

/** 展示用 URL：远程不可用则回退本地图 */
function resolveDisplayImageUrl(url, seed) {
  const value = String(url || '').trim()
  if (!value || isUnusableImageUrl(value)) {
    return pickLocalCoverFallback(seed)
  }
  return value
}

/** 临时路径 / 未解析 localhost / SVG 不可展示；相对 uploads 走 resolveMediaUrl */
function pickDisplayAvatarUrl(...candidates) {
  for (let i = 0; i < candidates.length; i += 1) {
    const raw = String(candidates[i] || '').trim()
    if (!raw) continue
    if (/^wxfile:/i.test(raw) || /^http:\/\/tmp\//i.test(raw)) continue
    const resolved = resolveMediaUrl(raw)
    if (!isDisplayableImageUrl(resolved)) continue
    return resolved
  }
  return DEFAULT_AVATAR
}

function resolveDisplayAvatarUrl(url) {
  return pickDisplayAvatarUrl(url)
}

function resolveDisplayProductUrl(url) {
  const value = String(url || '').trim()
  if (!value || isUnusableImageUrl(value)) return DEFAULT_PRODUCT
  return value
}

/** 品牌 logo：可用远程/本地位图；坏链/空返回空串，由调用方用默认品牌图或文字兜底 */
function resolveDisplayLogoUrl(url) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  const resolved = resolveMediaUrl(raw)
  if (!isDisplayableImageUrl(resolved)) return ''
  return resolved
}

module.exports = {
  DEFAULT_HERO,
  DEFAULT_AVATAR,
  DEFAULT_PRODUCT,
  DEFAULT_BRAND_LOGO,
  LOCAL_COVERS,
  isUnusableImageUrl,
  isLocalhostUrl,
  isSvgUrl,
  isDisplayableImageUrl,
  pickLocalCoverFallback,
  resolveDisplayImageUrl,
  resolveDisplayAvatarUrl,
  pickDisplayAvatarUrl,
  resolveDisplayProductUrl,
  resolveDisplayLogoUrl,
}
