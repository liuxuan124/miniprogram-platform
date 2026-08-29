/** 过滤不可用远程图（占位小图 / picsum），回退到小程序包内资源 */

const BAD_URL_MARKERS = [
  'd18dcd5f5c654fea8b5a40f3580d10cd',
  'picsum.photos',
]

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

module.exports = {
  DEFAULT_HERO,
  LOCAL_COVERS,
  isUnusableImageUrl,
  pickLocalCoverFallback,
  resolveDisplayImageUrl,
}
