// utils/image-ratio.js — 图片宽高比探测（瀑布流卡片按原图比例定高）
//
// 为什么需要它：
//   笔记卡片原本写死 `padding-top:125%`（4:5）+ `mode="aspectFill"`，
//   小红书竖长信息图（1086×1448 ≈ 3:4，更长的长图可达 1:4）会被强制裁切，
//   只剩中间一块，顶部标题与底部内容全看不到。
//   正确做法是按封面原始宽高比决定卡片高度（小红书原生瀑布流即如此）。
//
// ⚠️ 为什么不能用 wx.getImageInfo（2026-10-03 实测）：
//   本项目线上图片 100% 是 webp，SDK 3.17.3 下
//   `wx.getImageInfo` 对 webp 一律返回 **`getImageInfo:fail invalid`**（3/3 全失败）。
//   失败 → 比例恒为 0 → cover_ratio_known=false → 回落到 aspectFill → **仍然被裁切**。
//   这就是「换了按比例定高但还是被裁」的真因。
//
// 现在的方案（已实测通过）：
//   `wx.createOffscreenCanvas({type:'2d'})` + `canvas.createImage()` 解码取
//   width/height —— **与图片格式无关**，webp 正常返回 1080×1440。
//   保留 getImageInfo 作为兜底（万一某些环境 canvas 不可用）。
//   结果按 URL 缓存到本地，第二次进入零成本。

const CACHE_KEY = 'cover_ratio_cache'
const CACHE_MAX = 400
const CACHE_TTL = 30 * 86400000
const MAX_CONCURRENT = 4
const PROBE_TIMEOUT = 8000

let cache = null
let canvasCtx = null

function getCanvas() {
  if (canvasCtx !== null) return canvasCtx
  try {
    const cv = wx.createOffscreenCanvas({ type: '2d', width: 1, height: 1 })
    canvasCtx = cv
  } catch (e) {
    canvasCtx = false
  }
  return canvasCtx
}

function loadCache() {
  if (cache) return cache
  try {
    const raw = wx.getStorageSync(CACHE_KEY)
    cache = raw && typeof raw === 'object' ? raw : {}
  } catch (e) {
    cache = {}
  }
  return cache
}

function saveCache() {
  try {
    const keys = Object.keys(cache)
    if (keys.length > CACHE_MAX) {
      keys
        .map((k) => [k, cache[k] && cache[k].t])
        .sort((a, b) => (a[1] || 0) - (b[1] || 0))
        .slice(0, keys.length - CACHE_MAX)
        .forEach(([k]) => delete cache[k])
    }
    wx.setStorageSync(CACHE_KEY, cache)
  } catch (e) {
    // 存储失败不影响本次渲染
  }
}

/** 取出（并按需清理）某 URL 的比例，0 表示未知 */
function getCached(url) {
  if (!url) return 0
  const c = loadCache()
  const hit = c[url]
  if (!hit || typeof hit.r !== 'number') return 0
  if (Date.now() - (hit.t || 0) > CACHE_TTL) {
    delete c[url]
    return 0
  }
  return hit.r
}

function normalize(w, h) {
  if (!(w > 0) || !(h > 0)) return 0
  const pct = (h / w) * 100
  if (!isFinite(pct)) return 0
  return pct < 50 ? 50 : pct > 400 ? 400 : Math.round(pct * 100) / 100
}

/** 主路径：OffscreenCanvas 解码（对 webp/png/jpg 都有效） */
function probeViaCanvas(url) {
  return new Promise((resolve) => {
    const cv = getCanvas()
    if (!cv) return resolve(0)
    let done = false
    const fin = (v) => { if (!done) { done = true; resolve(v) } }
    setTimeout(() => fin(0), PROBE_TIMEOUT)
    try {
      const img = cv.createImage()
      img.onload = () => fin(normalize(img.width, img.height))
      img.onerror = () => { console.log('[IMG_RATIO] canvas onerror ' + String(url).slice(-30)); fin(0) }
      img.src = url
    } catch (e) {
      fin(0)
    }
  })
}

/** 兜底：wx.getImageInfo（对 jpg/png 有效，webp 会 fail） */
function probeViaApi(url) {
  return new Promise((resolve) => {
    let done = false
    const fin = (v) => { if (!done) { done = true; resolve(v) } }
    setTimeout(() => fin(0), PROBE_TIMEOUT)
    try {
      wx.getImageInfo({
        src: url,
        success: (info) => fin(normalize(Number(info.width), Number(info.height))),
        fail: () => fin(0),
      })
    } catch (e) {
      fin(0)
    }
  })
}

/** 探测单个 URL：先 canvas，再 API */
function probeOne(url) {
  return probeViaCanvas(url).then((r) => (r > 0 ? r : probeViaApi(url)))
}

/** 批量探测，结果写入 cache；全部结束后回调 onDone */
function probe(urls, onDone) {
  const list = Array.isArray(urls) ? urls.filter((u) => !!u) : []
  const pending = []
  list.forEach((u) => {
    if (getCached(u) > 0) return
    if (pending.indexOf(u) < 0) pending.push(u)
  })
  if (!pending.length) {
    if (typeof onDone === 'function') onDone()
    return
  }

  let idx = 0
  let running = 0
  let finished = 0
  const finishOne = () => {
    finished += 1
    if (finished >= pending.length && running === 0 && typeof onDone === 'function') onDone()
  }
  const next = () => {
    while (running < MAX_CONCURRENT && idx < pending.length) {
      const url = pending[idx]
      idx += 1
      running += 1
      probeOne(url).then((r) => {
        if (r > 0) {
          cache[url] = { r: r, t: Date.now() }
          saveCache()
        }
        running -= 1
        finishOne()
        next()
      })
    }
    if (idx >= pending.length && running === 0 && typeof onDone === 'function') onDone()
  }
  next()
}

/**
 * 从 URL 的 query 里读图片比例（后端 stamp_image_ratio.py 写入 `?w=&h=&r=`）。
 * 这是最可靠的口径：零请求、零延迟，且不受 webp 无法 getImageInfo 的影响。
 * 返回「高/宽 × 100」；解析不出返回 0。
 */
function ratioFromUrl(url) {
  if (!url) return 0
  const s = String(url)
  if (s.indexOf('?') < 0) return 0
  const q = s.split('?')[1] || ''
  if (!/[?&](?:w|h|r)=\d/.test(q)) return 0
  const mr = /(?:^|&)r=(\d+(?:\.\d+)?)/.exec(q)
  if (mr) {
    const rv = Number(mr[1])
    if (rv > 30 && rv < 400) return rv
  }
  const mw = /(?:^|&)w=(\d+)/.exec(q)
  const mh = /(?:^|&)h=(\d+)/.exec(q)
  if (mw && mh) {
    const w = Number(mw[1])
    const h = Number(mh[1])
    if (w > 0 && h > 0) return normalize(w, h)   // 签名是 (w,h)，别传反
  }
  return 0
}

module.exports = {
  getCached,
  probe,
  probeOne,
  ratioFromUrl,
  _clear: () => { cache = {}; try { wx.removeStorageSync(CACHE_KEY) } catch (e) {} },
}
