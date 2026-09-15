/**
 * 表单模块总开关：隐藏表单页、过滤 form_entry 组件
 */
const SystemService = require('../services/system')

const FORM_ROUTE_PATTERNS = [
  /^pages\/form\//,
  /^pkg-extra\/form\//,
]

const FORM_COMPONENT_TYPES = new Set(['form_entry'])

function normalizeRoute(route) {
  return String(route || '').replace(/^\//, '').split('?')[0]
}

function isFormRoute(route) {
  const r = normalizeRoute(route)
  return FORM_ROUTE_PATTERNS.some((re) => re.test(r))
}

function isFormPath(path) {
  const raw = String(path || '')
  if (!raw) return false
  if (isFormRoute(raw)) return true
  return /\/form\/form|form-templates/.test(raw)
}

function getFormEnabledSync() {
  try {
    const app = getApp()
    if (app && app.globalData && app.globalData.formModuleEnabled !== undefined) {
      return app.globalData.formModuleEnabled !== false
    }
    const cached = SystemService.getCachedConfig()
    if (cached && cached.plugins !== undefined) {
      return SystemService.isFormModuleEnabled(cached.plugins)
    }
  } catch (e) {
    // ignore
  }
  return false
}

function setFormEnabledCache(enabled) {
  try {
    const app = getApp()
    if (app && app.globalData) {
      app.globalData.formModuleEnabled = enabled !== false
    }
  } catch (e) {
    // ignore
  }
}

async function refreshFormModuleState(forceRefresh) {
  const config = await SystemService.fetchSystemConfig(!!forceRefresh)
  const enabled = SystemService.isFormModuleEnabled(config.plugins)
  setFormEnabledCache(enabled)
  return enabled
}

function redirectFromFormPage() {
  wx.switchTab({ url: '/pages/index/index' })
}

function blockFormNavigation(path) {
  if (!path || getFormEnabledSync()) return false
  if (!isFormPath(path)) return false
  wx.showToast({ title: '功能暂未开放', icon: 'none' })
  return true
}

function filterFormComponents(components, plugins) {
  const list = Array.isArray(components) ? components : []
  const enabled = plugins !== undefined
    ? SystemService.isFormModuleEnabled(plugins)
    : getFormEnabledSync()
  if (enabled) return list
  return list
    .filter((comp) => comp && !FORM_COMPONENT_TYPES.has(comp.type))
    .map((comp) => {
      const next = { ...comp }
      const childKeys = ['children', 'components']
      childKeys.forEach((key) => {
        if (Array.isArray(next[key]) && next[key].length) {
          next[key] = filterFormComponents(next[key], plugins)
        }
      })
      return next
    })
}

function installPageFormGuardHook() {
  if (typeof Page !== 'function') return
  if (Page.__formGuardHookInstalled) return
  const originPage = Page
  // eslint-disable-next-line no-global-assign
  Page = function (config) {
    const cfg = config || {}
    const guard = function (originFn) {
      return function guarded(...args) {
        const pages = getCurrentPages()
        const route = (this && this.route)
          || (pages.length ? pages[pages.length - 1].route : '')
        if (isFormRoute(route) && !getFormEnabledSync()) {
          redirectFromFormPage()
          return
        }
        if (typeof originFn === 'function') return originFn.apply(this, args)
      }
    }
    cfg.onLoad = guard(cfg.onLoad)
    cfg.onShow = guard(cfg.onShow)
    return originPage(cfg)
  }
  Page.__formGuardHookInstalled = true
}

module.exports = {
  FORM_COMPONENT_TYPES,
  isFormRoute,
  isFormPath,
  getFormEnabledSync,
  setFormEnabledCache,
  refreshFormModuleState,
  redirectFromFormPage,
  blockFormNavigation,
  filterFormComponents,
  installPageFormGuardHook,
}
