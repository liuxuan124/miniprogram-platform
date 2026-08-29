/** 图片 URL 规范化 + 预加载（减少首屏顶图空白 / 闪跳） */

const { isUnusableImageUrl, resolveDisplayImageUrl, DEFAULT_HERO } = require('./image-fallback')

/** 商城/工具顶图常见比例 1500×1000 */
const DEFAULT_HERO_RATIO = '3:2'

function normalizeImageUrl(url) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  if (/^data:/i.test(raw)) return raw
  let resolved = raw
  if (/^\/\//.test(resolved)) resolved = 'https:' + resolved
  const m = resolved.match(/^https?:\/\/(?:124\.220\.11\.79(?::\d+)?)(\/uploads\/.+)$/i)
  if (m) resolved = 'https://api.zfculture.site' + m[1]
  else if (resolved.startsWith('/uploads/')) resolved = 'https://api.zfculture.site' + resolved
  else if (resolved.startsWith('uploads/')) resolved = 'https://api.zfculture.site/' + resolved
  if (isUnusableImageUrl(resolved)) return DEFAULT_HERO
  return resolved
}

function collectHeroImageUrls(components) {
  const urls = []
  const list = Array.isArray(components) ? components : []
  for (let i = 0; i < list.length && urls.length < 3; i += 1) {
    const c = list[i]
    if (!c || c.visible === false) continue
    if (c.type === 'image' || c.type === 'banner') {
      const props = c.props || {}
      let raw = props.image || props.src || ''
      if (!raw && Array.isArray(props.images) && props.images[0]) {
        const first = props.images[0]
        raw = typeof first === 'string' ? first : (first.image || first.src || '')
      }
      const src = normalizeImageUrl(raw)
      if (src) urls.push(src)
      // 首屏大图优先，取到一张顶图即可
      if (c.type === 'image') break
    }
  }
  return urls
}

function preloadImage(url) {
  const src = normalizeImageUrl(url)
  if (!src) return Promise.resolve(null)
  return new Promise((resolve) => {
    wx.getImageInfo({
      src,
      success: (res) => resolve({ url: src, width: res.width, height: res.height }),
      fail: () => resolve(null),
    })
  })
}

/** 并行预加载，最多等 timeoutMs，超时也放行，避免白屏更久 */
function preloadImages(urls, timeoutMs) {
  const list = (urls || []).map(normalizeImageUrl).filter(Boolean)
  if (!list.length) return Promise.resolve([])
  const tasks = list.map((u) => preloadImage(u))
  const timeout = new Promise((resolve) => {
    setTimeout(() => resolve([]), Math.max(200, Number(timeoutMs) || 600))
  })
  return Promise.race([
    Promise.all(tasks).then((arr) => arr.filter(Boolean)),
    timeout,
  ])
}

/**
 * 首屏顶图：规范化 URL，写入固定 aspect_ratio / 预载尺寸，避免首绘骨架错误比例后再跳变。
 */
function annotateHeroImageSize(flowComponents, loaded) {
  if (!Array.isArray(flowComponents)) return flowComponents
  const info = Array.isArray(loaded) && loaded.length ? loaded[0] : null
  const next = flowComponents.slice()
  for (let i = 0; i < next.length; i += 1) {
    const c = next[i]
    if (!c || c.visible === false) continue
    if (c.type !== 'image' && c.type !== 'banner') continue
    const props = Object.assign({}, c.props || {})
    const src = normalizeImageUrl(props.image || props.src || '')
    if (src) {
      const safe = resolveDisplayImageUrl(src, i)
      props.image = safe
      props.src = safe
    }
    const ar = String(props.aspect_ratio || '').trim()
    const isAuto = !ar || ar === 'auto' || ar === 'widthFix'
    if (info && info.width > 0 && info.height > 0) {
      props._preloadWidth = info.width
      props._preloadHeight = info.height
      if (isAuto) {
        props.aspect_ratio = String(info.width) + ':' + String(info.height)
      }
    } else if (isAuto) {
      // 预载失败/超时：仍用常见顶图 3:2，避免 750:420 骨架再跳
      props.aspect_ratio = DEFAULT_HERO_RATIO
    }
    next[i] = Object.assign({}, c, { props })
    break
  }
  return next
}

module.exports = {
  DEFAULT_HERO_RATIO,
  normalizeImageUrl,
  collectHeroImageUrls,
  preloadImage,
  preloadImages,
  annotateHeroImageSize,
}
