const SystemService = require('../services/system')
const {
  TAB_SLOT_ROUTES,
  resolveActiveTabItems,
  resolveVisibleTabRoutes,
  resolveItemShellRoute,
} = require('./tabbar-config')

function normalizePath(path) {
  return '/' + String(path || '').replace(/^\/+/, '')
}

function isCustomDecoratedPath(path) {
  return /\/pages\/custom\//.test(normalizePath(path))
}

/** 装修页若已绑定某 Tab，返回对应 Tab 壳路由 */
function resolveTabRouteForBoundCustomPath(customPath) {
  const config = SystemService.getCachedConfig() || {}
  const tabbarItems = config.tabbarItems || []
  const plugins = config.plugins
  const target = normalizePath(customPath)
  if (!isCustomDecoratedPath(target)) return null

  const rows = resolveActiveTabItems(plugins, tabbarItems)
  for (let i = 0; i < rows.length; i += 1) {
    const { item, slotRoute } = rows[i]
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
  resolveItemShellRoute,
  resolveActiveTabItems,
  resolveVisibleTabRoutes,
  resolveTabRouteForBoundCustomPath,
  showTabBarForRoute,
  getTabSelectedIndex,
}
