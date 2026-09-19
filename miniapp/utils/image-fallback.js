/** 过滤不可用远程图（占位小图 / 会 302 的 picsum），回退到小程序包内资源 */

const { resolveMediaUrl } = require('./media-url')

const BAD_URL_MARKERS = [
  'd18dcd5f5c654fea8b5a40f3580d10cd',
  'picsum.photos',
]

// 微信 <image> 不渲染 SVG，占位必须用位图
const DEFAULT_AVATAR = '/images/default-avatar.png'
const DEFAULT_PRODUCT = '/images/default-product.png'
const DEFAULT_BRAND_LOGO = '/images/default-brand-logo.png'

const LOCAL_COVERS = [
  '/images/section-bar-tech-bg.jpg',
  '/images/default-product.png',
  '/images/empty-product.png',
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

/** 微信本地临时图（选图后尚未上传，不可当远程持久 URL） */
function isTempLocalAvatar(url) {
  const value = String(url || '').trim()
  if (!value) return false
  return /^wxfile:/i.test(value)
    || /^http:\/\/tmp\//i.test(value)
    || /^file:\/\//i.test(value)
    || /^\/tmp\//i.test(value)
}

/**
 * 可持久化的媒体 URL（远程 https(s) 或 /uploads/ 相对路径）。
 * 显式排除 wxfile / http://tmp / file:// 等临时路径，避免裸 ^https? 误判。
 */
function isPersistedMediaUrl(url) {
  const value = String(url || '').trim()
  if (!value || isTempLocalAvatar(value)) return false
  if (value.indexOf('/uploads/') === 0) return true
  return /^https?:\/\//i.test(value)
}

/** @deprecated 请用 isPersistedMediaUrl；保留别名避免旧引用断裂 */
const isRemoteUrl = isPersistedMediaUrl

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
    if (isTempLocalAvatar(raw)) continue
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
  isTempLocalAvatar,
  isPersistedMediaUrl,
  isRemoteUrl,
  isDisplayableImageUrl,
  pickLocalCoverFallback,
  resolveDisplayImageUrl,
  resolveDisplayAvatarUrl,
  pickDisplayAvatarUrl,
  resolveDisplayProductUrl,
  resolveDisplayLogoUrl,
}
