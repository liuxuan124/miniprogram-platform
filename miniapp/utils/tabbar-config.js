const SystemService = require('../services/system')

const TAB_SLOT_ROUTES = [
  '/pages/index/index',
  '/pages/discover/discover',
  '/pages/planet/planet',
  '/pages/shop/shop',
  '/pages/mine/mine',
]

function normalizePath(path) {
  return '/' + String(path || '').replace(/^\/+/, '')
}

function resolveItemShellRoute(item, index) {
  const raw = (item && (item.tabRoute || item.slotRoute)) || ''
  let route = normalizePath(raw)
  // 历史壳 → 现行五壳
  if (route === '/pages/knowledge-mall/knowledge-mall' || route === '/pages/product-list/product-list') {
    route = '/pages/shop/shop'
  } else if (route === '/pages/content-list/content-list') {
    route = '/pages/discover/discover'
  } else if (route === '/pages/tab-hub/tab-hub') {
    route = '/pages/mine/mine'
  }
  if (TAB_SLOT_ROUTES.includes(route)) return route

  // tabRoute 缺失时按 pagePath / 文案推断，避免旧配置落到错误壳再二次跳转
  const path = normalizePath((item && (item.pagePath || item.path)) || '')
  const text = String((item && (item.text || item.name || item.pageName)) || '')
  if (
    path === '/pages/knowledge-mall/knowledge-mall'
    || path === '/pages/product-list/product-list'
    || path.includes('/pages/shop')
    || /商品|商城/.test(text)
  ) {
    return '/pages/shop/shop'
  }
  if (path.includes('/pages/planet') || /星球|planet/i.test(text)) return '/pages/planet/planet'
  if (
    path.includes('/pages/discover')
    || path === '/pages/content-list/content-list'
    || /发现|内容|资讯|干货/.test(text)
  ) {
    return '/pages/discover/discover'
  }
  if (path.includes('/pages/mine') || /我的|mine/i.test(text)) return '/pages/mine/mine'
  if (path.includes('/pages/index') || /首页|home/i.test(text)) return '/pages/index/index'

  return TAB_SLOT_ROUTES[index] || TAB_SLOT_ROUTES[0]
}

/** 按配置项解析可见 Tab（支持 2~5 个，每项可指定 tabRoute） */
function resolveActiveTabItems(plugins, tabbarItems) {
  const items = Array.isArray(tabbarItems) ? tabbarItems.slice(0, TAB_SLOT_ROUTES.length) : []
  const planetEnabled = SystemService.isPluginEnabled(plugins, 'planet', false)
  const active = []

  items.forEach((item, index) => {
    if (item && item.enabled === false) return
    let slotRoute = resolveItemShellRoute(item, index)
    if (slotRoute === '/pages/planet/planet' && !planetEnabled) {
      const configured = normalizePath((item && (item.pagePath || item.path)) || '')
      if (configured.includes('planet') || !configured || configured.includes('knowledge-mall')) return
    }
    const slotIndex = TAB_SLOT_ROUTES.indexOf(slotRoute)
    active.push({
      item: item || {},
      slotRoute,
      slotIndex: slotIndex >= 0 ? slotIndex : index,
    })
  })

  return active.filter((row) => row.slotRoute)
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
