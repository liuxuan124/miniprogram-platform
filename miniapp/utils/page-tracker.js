// utils/page-tracker.js — 页面访问上报（PV/停留时长）
// 与 share/theme 等钩子同款写法：包一层全局 Page，在 onShow 记时、onHide/onUnload 上报。
// 后端落库 mp_page_access_log，管理端统计/页面管理读取。
const { post } = require('./request')

let sessionId = ''
let scene = ''

function ensureSession() {
  if (sessionId) return
  sessionId = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  try {
    const opts = typeof wx.getLaunchOptionsSync === 'function' ? wx.getLaunchOptionsSync() : null
    scene = opts && opts.scene != null ? String(opts.scene) : ''
  } catch (e) {
    scene = ''
  }
}

function buildQuery(options) {
  if (!options || typeof options !== 'object') return ''
  const parts = []
  Object.keys(options).forEach((k) => {
    const v = options[k]
    if (v == null || v === '') return
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
  })
  return parts.length ? `?${parts.join('&')}` : ''
}

function report(page) {
  if (!page || page.__pvReported || !page.__pvEnterAt) return
  page.__pvReported = true
  const stay = Math.max(0, Math.round((Date.now() - page.__pvEnterAt) / 1000))
  const path = `/${page.route || ''}${buildQuery(page.__pvOptions)}`
  ensureSession()
  // 静默上报：不带 token 也能走（后端公开接口），失败不影响任何业务
  post(
    '/mp/statistics/page-access',
    {
      pagePath: path,
      sessionId,
      source: scene,
      stayDuration: stay,
    },
    { showError: false, auth: false },
  ).catch(() => {})
}

// ==================== 运行事件（错误 / 白屏 / Tab 切走） ====================

/** 同一错误只报一次：一次渲染可能抛几十条同源错误，不去重会把错误率放大成假象 */
const reportedErrors = new Set()
let blankTimer = null

function sendEvent(payload) {
  ensureSession()
  post(
    '/mp/statistics/runtime-event',
    { sessionId, ...payload },
    { showError: false, auth: false },
  ).catch(() => {})
}

/** 页面渲染后 2.5s 仍没有非空根节点，判为疑似白屏 */
function scheduleBlankWatch(route) {
  if (blankTimer) clearTimeout(blankTimer)
  blankTimer = setTimeout(() => {
    blankTimer = null
    try {
      // eslint-disable-next-line no-undef
      const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
      const current = pages[pages.length - 1]
      if (!current) return
      const root = current.selectComponent ? null : null
      // 用 selectAll 拿不到跨自定义组件的节点，退化为看页面栈高度：
      // 页面存在但 2.5s 内既没数据也没交互痕迹的情况无法可靠判定，
      // 因此只在显式标记了 __blankSuspect 的页面上报，避免全量误报。
      if (current.__blankSuspect) {
        sendEvent({ pagePath: `/${route || ''}`, eventType: 'blank' })
      }
      void root
    } catch (e) {
      /* 静默 */
    }
  }, 2500)
}

function reportError(route, message) {
  const key = `${route}::${String(message || '').slice(0, 120)}`
  if (reportedErrors.has(key)) return
  reportedErrors.add(key)
  if (reportedErrors.size > 50) {
    // 单次会话最多记 50 条，防止异常风暴把表撑爆
    reportedErrors.clear()
  }
  sendEvent({
    pagePath: `/${route || ''}`,
    eventType: 'error',
    errorMessage: String(message || 'unknown error').slice(0, 480),
  })
}

/** Tab 切走：记录 from → to，用于算核心 Tab 跳出率 */
function reportTabLeave(fromRoute, toRoute) {
  if (!fromRoute || !toRoute || fromRoute === toRoute) return
  sendEvent({
    pagePath: `/${fromRoute}`,
    eventType: 'tab_leave',
    fromRoute: `/${fromRoute}`,
    toRoute: `/${toRoute}`,
  })
}

function installErrorWatchHook() {
  if (typeof App !== 'function' || App.__errorWatchInstalled) return
  const originApp = App
  App = function (config) {
    config = config || {}
    const rawOnError = config.onError
    config.onError = function (err) {
      try {
        const msg = (err && (err.message || err.errMsg)) || 'app onError'
        const route = (err && err.route) || currentRoute()
        reportError(route, msg)
      } catch (e) {
        /* 静默 */
      }
      if (rawOnError) return rawOnError.call(this, err)
    }
    return originApp(config)
  }
  App.__errorWatchInstalled = true

  if (typeof wx !== 'undefined' && typeof wx.onError === 'function') {
    wx.onError((err) => {
      reportError(currentRoute(), (err && (err.message || err.errMsg)) || err)
    })
  }
  if (typeof wx !== 'undefined' && typeof wx.onUnhandledRejection === 'function') {
    wx.onUnhandledRejection((res) => {
      const reason = (res && (res.reason && (res.reason.message || res.reason))) || 'unhandled rejection'
      reportError(currentRoute(), reason)
    })
  }
}

function currentRoute() {
  try {
    // eslint-disable-next-line no-undef
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
    const cur = pages[pages.length - 1]
    return (cur && (cur.route || cur.__route__)) || ''
  } catch (e) {
    return ''
  }
}

function installPageTrackHook() {
  if (typeof Page !== 'function') return
  if (Page.__trackHookInstalled) return
  const originPage = Page
  // 记录上一个离开的页面，用于算 Tab 切走
  let lastRoute = ''
  Page = function (config) {
    config = config || {}
    const rawOnLoad = config.onLoad
    const rawOnShow = config.onShow
    const rawOnHide = config.onHide
    const rawOnUnload = config.onUnload

    config.onLoad = function (options) {
      this.__pvOptions = options || {}
      if (rawOnLoad) return rawOnLoad.call(this, options)
    }
    config.onShow = function (...args) {
      const route = this.route || ''
      if (lastRoute && lastRoute !== route) reportTabLeave(lastRoute, route)
      lastRoute = route
      this.__pvEnterAt = Date.now()
      this.__pvReported = false
      scheduleBlankWatch(route)
      if (rawOnShow) return rawOnShow.apply(this, args)
    }
    config.onHide = function (...args) {
      report(this)
      if (rawOnHide) return rawOnHide.apply(this, args)
    }
    config.onUnload = function (...args) {
      report(this)
      if (rawOnUnload) return rawOnUnload.apply(this, args)
    }
    return originPage(config)
  }
  Page.__trackHookInstalled = true
}

module.exports = {
  installPageTrackHook,
  installErrorWatchHook,
  reportError,
}
