/**
 * 商品模块总开关：隐藏交易页、装修商品组件、拦截跳转
 */
const SystemService = require('../services/system')

const TRADE_ROUTE_PATTERNS = [
  /^pages\/product-/,
  /^pages\/knowledge-mall\//,
  /^pages\/cart\//,
  /^pages\/order-/,
  /^pages\/write-review\//,
  /^pages\/reviews\//,
  /^pages\/address-list\//,
  /^pkg-trade\//,
]

const TRADE_COMPONENT_TYPES = new Set([
  'product_list',
  'flash_sale',
  'category_nav',
])

const TRADE_PATH_RE = /product-detail|product-list|knowledge-mall|\/cart|order-create|order-list|order-detail|order-paid|pkg-trade|write-review/

function normalizeRoute(route) {
  return String(route || '').replace(/^\//, '').split('?')[0]
}

function isTradeRoute(route) {
  const r = normalizeRoute(route)
  return TRADE_ROUTE_PATTERNS.some((re) => re.test(r))
}

function isTradePath(path) {
  const raw = String(path || '')
  if (!raw) return false
  if (isTradeRoute(raw)) return true
  return TRADE_PATH_RE.test(raw)
}

function getProductEnabledSync() {
  try {
    const app = getApp()
    if (app && app.globalData && app.globalData.productModuleEnabled !== undefined) {
      return app.globalData.productModuleEnabled !== false
    }
    const cached = SystemService.getCachedConfig()
    if (cached && cached.plugins !== undefined) {
      return SystemService.isProductModuleEnabled(cached.plugins)
    }
  } catch (e) {
    // ignore
  }
  return true
}

function setProductEnabledCache(enabled) {
  try {
    const app = getApp()
    if (app && app.globalData) {
      app.globalData.productModuleEnabled = enabled !== false
    }
  } catch (e) {
    // ignore
  }
}

async function refreshProductModuleState(forceRefresh) {
  const config = await SystemService.fetchSystemConfig(!!forceRefresh)
  const enabled = SystemService.isProductModuleEnabled(config.plugins)
  setProductEnabledCache(enabled)
  return enabled
}

function redirectFromTradePage() {
  wx.switchTab({ url: '/pages/content-list/content-list' })
}

function blockTradeNavigation(path) {
  if (!path || getProductEnabledSync()) return false
  if (!isTradePath(path)) return false
  wx.showToast({ title: '功能暂未开放', icon: 'none' })
  return true
}

function filterTradeComponents(components, plugins) {
  const list = Array.isArray(components) ? components : []
  const enabled = plugins !== undefined
    ? SystemService.isProductModuleEnabled(plugins)
    : getProductEnabledSync()
  if (enabled) return list
  return list
    .filter((comp) => comp && !TRADE_COMPONENT_TYPES.has(comp.type))
    .map((comp) => {
      const next = { ...comp }
      const childKeys = ['children', 'components']
      childKeys.forEach((key) => {
        if (Array.isArray(next[key]) && next[key].length) {
          next[key] = filterTradeComponents(next[key], plugins)
        }
      })
      return next
    })
}

function installPageProductGuardHook() {
  if (typeof Page !== 'function') return
  if (Page.__productGuardHookInstalled) return
  const originPage = Page
  // eslint-disable-next-line no-global-assign
  Page = function (config) {
    const cfg = config || {}
    const guard = function (originFn) {
      return function guarded(...args) {
        const pages = getCurrentPages()
        const route = (this && this.route)
          || (pages.length ? pages[pages.length - 1].route : '')
        if (isTradeRoute(route) && !getProductEnabledSync()) {
          redirectFromTradePage()
          return
        }
        if (typeof originFn === 'function') return originFn.apply(this, args)
      }
    }
    cfg.onLoad = guard(cfg.onLoad)
    cfg.onShow = guard(cfg.onShow)
    return originPage(cfg)
  }
  Page.__productGuardHookInstalled = true
}

module.exports = {
  TRADE_COMPONENT_TYPES,
  isTradeRoute,
  isTradePath,
  getProductEnabledSync,
  setProductEnabledCache,
  refreshProductModuleState,
  redirectFromTradePage,
  blockTradeNavigation,
  filterTradeComponents,
  installPageProductGuardHook,
}
