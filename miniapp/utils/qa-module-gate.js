/**
 * 问答模块总开关：隐藏问答页、拦截跳转
 */
const SystemService = require('../services/system')

const QA_ROUTE_PATTERNS = [
  /^pages\/question-ask\//,
  /^pages\/question-detail\//,
]

const QA_PATH_RE = /question-ask|question-detail|\/api\/v1\/mp\/questions/

function normalizeRoute(route) {
  return String(route || '').replace(/^\//, '').split('?')[0]
}

function isQaRoute(route) {
  const r = normalizeRoute(route)
  return QA_ROUTE_PATTERNS.some((re) => re.test(r))
}

function isQaPath(path) {
  const raw = String(path || '')
  if (!raw) return false
  if (isQaRoute(raw)) return true
  return QA_PATH_RE.test(raw)
}

function getQaEnabledSync() {
  try {
    const app = getApp()
    if (app && app.globalData && app.globalData.qaModuleEnabled !== undefined) {
      return app.globalData.qaModuleEnabled !== false
    }
    const cached = SystemService.getCachedConfig()
    if (cached && cached.plugins !== undefined) {
      return SystemService.isQaModuleEnabled(cached.plugins)
    }
  } catch (e) {
    // ignore
  }
  return false
}

function setQaEnabledCache(enabled) {
  try {
    const app = getApp()
    if (app && app.globalData) {
      app.globalData.qaModuleEnabled = enabled !== false
    }
  } catch (e) {
    // ignore
  }
}

async function refreshQaModuleState(forceRefresh) {
  const config = await SystemService.fetchSystemConfig(!!forceRefresh)
  const enabled = SystemService.isQaModuleEnabled(config.plugins)
  setQaEnabledCache(enabled)
  return enabled
}

function redirectFromQaPage() {
  wx.switchTab({ url: '/pages/index/index' })
}

function blockQaNavigation(path) {
  if (!path || getQaEnabledSync()) return false
  if (!isQaPath(path)) return false
  wx.showToast({ title: '功能暂未开放', icon: 'none' })
  return true
}

function installPageQaGuardHook() {
  if (typeof Page !== 'function') return
  if (Page.__qaGuardHookInstalled) return
  const originPage = Page
  // eslint-disable-next-line no-global-assign
  Page = function (config) {
    const cfg = config || {}
    const guard = function (originFn) {
      return function guarded(...args) {
        const pages = getCurrentPages()
        const route = (this && this.route)
          || (pages.length ? pages[pages.length - 1].route : '')
        if (isQaRoute(route) && !getQaEnabledSync()) {
          redirectFromQaPage()
          return
        }
        if (typeof originFn === 'function') return originFn.apply(this, args)
      }
    }
    cfg.onLoad = guard(cfg.onLoad)
    cfg.onShow = guard(cfg.onShow)
    return originPage(cfg)
  }
  Page.__qaGuardHookInstalled = true
}

module.exports = {
  isQaRoute,
  isQaPath,
  getQaEnabledSync,
  setQaEnabledCache,
  refreshQaModuleState,
  redirectFromQaPage,
  blockQaNavigation,
  installPageQaGuardHook,
}
