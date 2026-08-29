const SystemService = require('../services/system')

const TAB_SLOT_ROUTES = [
  '/pages/index/index',
  '/pages/content-list/content-list',
  '/pages/knowledge-mall/knowledge-mall',
  '/pages/mine/mine',
]

function normalizePath(path) {
  return '/' + String(path || '').replace(/^\/+/, '')
}

function isCustomDecoratedPath(path) {
  return /\/pages\/custom\//.test(normalizePath(path))
}

function resolveVisibleTabRoutes(plugins, tabbarItems) {
  return TAB_SLOT_ROUTES.filter((route, slotIndex) => {
    if (
      route === '/pages/knowledge-mall/knowledge-mall'
      && !SystemService.isProductModuleEnabled(plugins)
    ) {
      return false
    }
    const item = (tabbarItems || [])[slotIndex]
    if (item && item.enabled === false) return false
    return true
  })
}

/** 装修页若已绑定某 Tab，返回对应 Tab 路由 */
function resolveTabRouteForBoundCustomPath(customPath) {
  const config = SystemService.getCachedConfig() || {}
  const tabbarItems = config.tabbarItems || []
  const plugins = config.plugins
  const target = normalizePath(customPath)
  if (!isCustomDecoratedPath(target)) return null

  for (let slotIndex = 0; slotIndex < TAB_SLOT_ROUTES.length; slotIndex += 1) {
    const slotRoute = TAB_SLOT_ROUTES[slotIndex]
    if (
      slotRoute === '/pages/knowledge-mall/knowledge-mall'
      && !SystemService.isProductModuleEnabled(plugins)
    ) {
      continue
    }
    const item = tabbarItems[slotIndex] || {}
    if (item.enabled === false) continue
    const bound = normalizePath(item.path || item.pagePath || '')
    if (bound && bound === target) return slotRoute
  }
  return null
}

function getTabSelectedIndex(tabRoute) {
  const config = SystemService.getCachedConfig() || {}
  const routes = resolveVisibleTabRoutes(config.plugins, config.tabbarItems)
  const idx = routes.indexOf(normalizePath(tabRoute))
  return idx >= 0 ? idx : 0
}

function showTabBarForRoute(pageCtx, tabRoute) {
  const selected = getTabSelectedIndex(tabRoute)
  const apply = () => {
    wx.hideTabBar({ animation: false, fail() {} })
    const tabBar = pageCtx && typeof pageCtx.getTabBar === 'function' && pageCtx.getTabBar()
    if (!tabBar) return false
    tabBar.setData({ selected, hidden: false })
    return true
  }
  if (!apply()) {
    setTimeout(apply, 80)
    setTimeout(apply, 320)
  }
}

module.exports = {
  TAB_SLOT_ROUTES,
  resolveTabRouteForBoundCustomPath,
  showTabBarForRoute,
  getTabSelectedIndex,
}
