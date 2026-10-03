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

function installPageTrackHook() {
  if (typeof Page !== 'function') return
  if (Page.__trackHookInstalled) return
  const originPage = Page
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
      this.__pvEnterAt = Date.now()
      this.__pvReported = false
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

module.exports = { installPageTrackHook }
