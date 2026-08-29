const SystemService = require('../services/system')

const TAB_SLOT_ROUTES = [
  '/pages/index/index',
  '/pages/content-list/content-list',
  '/pages/knowledge-mall/knowledge-mall',
  '/pages/mine/mine',
  '/pages/tab-hub/tab-hub',
]

function normalizePath(path) {
  return '/' + String(path || '').replace(/^\/+/, '')
}

function resolveItemShellRoute(item, index) {
  const raw = (item && (item.tabRoute || item.slotRoute)) || ''
  const route = normalizePath(raw)
  if (TAB_SLOT_ROUTES.includes(route)) return route
  return TAB_SLOT_ROUTES[index] || TAB_SLOT_ROUTES[0]
}

/** 按配置项解析可见 Tab（支持 2~5 个，每项可指定 tabRoute） */
function resolveActiveTabItems(plugins, tabbarItems) {
  const items = Array.isArray(tabbarItems) ? tabbarItems.slice(0, TAB_SLOT_ROUTES.length) : []
  const productEnabled = SystemService.isProductModuleEnabled(plugins)
  const active = []

  items.forEach((item, index) => {
    if (item && item.enabled === false) return
    const slotRoute = resolveItemShellRoute(item, index)
    if (slotRoute === '/pages/knowledge-mall/knowledge-mall' && !productEnabled) return
    active.push({ item: item || {}, slotRoute, slotIndex: TAB_SLOT_ROUTES.indexOf(slotRoute) })
  })

  return active.filter((row) => row.slotIndex >= 0)
}

function resolveVisibleTabRoutes(plugins, tabbarItems) {
  return resolveActiveTabItems(plugins, tabbarItems).map((row) => row.slotRoute)
}

module.exports = {
  TAB_SLOT_ROUTES,
  resolveItemShellRoute,
  resolveActiveTabItems,
  resolveVisibleTabRoutes,
}
