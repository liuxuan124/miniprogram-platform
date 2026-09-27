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
  const target = normalizePath(tabRoute)
  const config = SystemService.getCachedConfig() || {}
  const rows = resolveActiveTabItems(config.plugins, config.tabbarItems || [])
  const visible = rows.length
    ? rows.map((row) => normalizePath(row.slotRoute))
    : TAB_SLOT_ROUTES.map((p) => normalizePath(p))
  const idx = visible.indexOf(target)
  return idx >= 0 ? idx : 0
}

function hideNativeTabBar() {
  if (typeof wx.hideTabBar !== 'function') return
  wx.hideTabBar({ animation: false, fail() {} })
}

function showTabBarForRoute(pageCtx, tabRoute) {
  const selected = getTabSelectedIndex(tabRoute)
  const apply = () => {
    hideNativeTabBar()
    const tabBar = pageCtx && typeof pageCtx.getTabBar === 'function' && pageCtx.getTabBar()
    if (!tabBar) return false
    tabBar.setData({ selected, hidden: false })
    return true
  }
  hideNativeTabBar()
  if (!apply()) {
    setTimeout(apply, 80)
    setTimeout(apply, 320)
    setTimeout(hideNativeTabBar, 640)
  }
}

module.exports = {
  TAB_SLOT_ROUTES,
  resolveItemShellRoute,
  resolveActiveTabItems,
  resolveVisibleTabRoutes,
  resolveTabRouteForBoundCustomPath,
  hideNativeTabBar,
  showTabBarForRoute,
  getTabSelectedIndex,
}
