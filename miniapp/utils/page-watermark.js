/**
 * 动态防录屏水印（2026-10-06）。
 *
 * 在页面层叠加「访客 ID + 手机尾号 + 时间」的半透明斜向平铺水印，
 * 用于溯源盗图与录屏传播 —— 截图里会带上水印，泄露方无法去除。
 *
 * 🔴 设计要点：
 * ① `pointer-events: none` —— 水印层绝不能吃掉用户的点击与滚动；
 * ② 用 canvas 生成平铺图而不是几十个 DOM 节点 —— 节点多会拖慢低端机滚动；
 * ③ 时间**每分钟**刷新而不是每秒 —— 每秒重绘会持续掉帧，且没有实际意义
 *    （截图溯源只需要知道「大概什么时候截的」）。
 */

/** 取访客标识：优先用户 id，其次 openid 尾号，都没有就退化为设备标识 */
function visitorId() {
  try {
    const app = getApp()
    const g = (app && app.globalData) || {}
    const u = g.userInfo || g.user || {}
    const id = u.id || u.userId || u.openid || ''
    if (id) return String(id)
    // 无登录态：取微信设备标识的后 6 位（足够溯源，不含敏感信息）
    const sys = (wx.getSystemInfoSync && wx.getSystemInfoSync()) || {}
    const dev = (sys.deviceId || sys.deviceModel || 'guest') + ''
    return dev.slice(-6)
  } catch (e) {
    return 'guest'
  }
}

/** 手机尾号：只保留后 4 位，隐私最小化 */
function phoneTail() {
  try {
    const app = getApp()
    const g = (app && app.globalData) || {}
    const u = g.userInfo || g.user || {}
    const phone = String(u.phone || u.mobile || '')
    return phone ? phone.slice(-4) : ''
  } catch (e) {
    return ''
  }
}

function timeText(ts) {
  const d = ts ? new Date(ts) : new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/**
 * 生成水印 dataURL。
 * @param {number} width  画布宽（CSS px）
 * @param {number} height 画布高
 */
function buildWatermarkDataUrl(width, height, text) {
  const w = Math.max(200, Math.min(width || 375, 750))
  const h = Math.max(200, Math.min(height || 600, 1334))
  // canvas 像素比放大 2 倍，导出后在高分屏上不糊
  const scale = 2
  const cv = document.createElement('canvas')
  cv.width = w * scale
  cv.height = h * scale
  const ctx = cv.getContext('2d')
  if (!ctx) return ''
  ctx.scale(scale, scale)
  ctx.clearRect(0, 0, w, h)

  const content = text || [visitorId(), phoneTail(), timeText()].filter(Boolean).join(' · ')
  ctx.font = '11px sans-serif'
  ctx.fillStyle = 'rgba(120, 120, 120, 0.16)'
  ctx.textBaseline = 'middle'

  // 斜向平铺：先旋转再画，让水印呈 -30°
  ctx.translate(w / 2, h / 2)
  ctx.rotate((-30 * Math.PI) / 180)
  ctx.translate(-w / 2, -h / 2)
  const stepX = 180
  const stepY = 120
  // 覆盖范围放大 1.6 倍，旋转后四角也不会露白
  for (let y = -h * 0.3; y < h * 1.3; y += stepY) {
    for (let x = -w * 0.3; x < w * 1.3; x += stepX) {
      ctx.fillText(content, x, y)
    }
  }
  return cv.toDataURL('image/png')
}

/**
 * 挂载水印层。
 * @returns {{update: Function, destroy: Function}} update 换页/换用户时调，destroy 卸载时调
 */
function mountWatermark(container, opts) {
  if (!container) return { update() {}, destroy() {} }
  const o = opts || {}
  const nodeId = o.nodeId || 'pageWatermark'
  let timer = null

  const render = () => {
    const sys = (wx.getSystemInfoSync && wx.getSystemInfoSync()) || {}
    const url = buildWatermarkDataUrl(sys.windowWidth, sys.windowHeight, o.text)
    if (!url) return
    wx.getElementById
      ? null
      : null
    // 小程序里没有 DOM，用 cover-view 承载；这里通过 setData 交给页面渲染
    if (typeof o.onUpdate === 'function') o.onUpdate(url)
  }

  render()
  // 🔴 每 60s 刷新（分钟级时间戳）：够溯源且不拖帧
  timer = setInterval(render, 60000)

  return {
    update: render,
    destroy() {
      if (timer) clearInterval(timer)
      timer = null
    },
  }
}

module.exports = {
  visitorId,
  phoneTail,
  timeText,
  buildWatermarkDataUrl,
  mountWatermark,
}
