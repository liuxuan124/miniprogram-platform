const SystemService = require('../services/system')
const { PageService } = require('../services/page')
const { parseDSL, loadAllComponentData } = require('./render')
const { getNavLayout } = require('./nav-layout')

/** 与 custom-tab-bar REGISTERED_TAB_PATHS 顺序一致 */
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
  const p = normalizePath(path)
  return /\/pages\/custom\//.test(p)
}

async function resolveBoundPathForTabRoute(tabRoute) {
  const config = await SystemService.fetchSystemConfig()
  const items = (config.tabbarItems || []).filter((item) => item.enabled !== false)
  const route = normalizePath(tabRoute)
  const slotIndex = TAB_SLOT_ROUTES.indexOf(route)
  if (slotIndex < 0 || slotIndex >= items.length) return null

  const tab = items[slotIndex] || {}
  const boundPath = normalizePath(tab.path || tab.pagePath || '')
  if (!boundPath || boundPath === route) return null
  if (!isCustomDecoratedPath(boundPath)) return null
  return boundPath.replace(/^\//, '')
}

async function loadDslPageState(path, forceRefresh) {
  const dsl = await PageService.getPageDSL(path, forceRefresh)
  const parsed = parseDSL(dsl)
  const components = await loadAllComponentData(parsed.components || [])
  const flowComponents = []
  const floatComponents = []
  components.forEach((item) => {
    if (item && item.type === 'float_button') floatComponents.push(item)
    else flowComponents.push(item)
  })
  const hasBrandHeader = flowComponents.some((item) => item && item.type === 'brand_header')
  const layout = getNavLayout()
  return {
    dslMode: true,
    loading: false,
    error: '',
    flowComponents,
    floatComponents,
    hasBrandHeader,
    statusBarHeight: layout.statusBarHeight,
    pageTitle: (parsed.page && parsed.page.name) || '',
  }
}

/**
 * Tab 宿主页加载导航绑定的装修页 DSL（与后台实时预览同源）
 * @returns {Promise<boolean>} 是否已进入 DSL 模式
 */
async function loadTabBoundDslPage(pageCtx, tabRoute, forceRefresh) {
  pageCtx.setData({ loading: true, error: '' })
  try {
    const path = await resolveBoundPathForTabRoute(tabRoute)
    if (!path) {
      pageCtx.setData({ dslMode: false, loading: false })
      return false
    }
    const state = await loadDslPageState(path, forceRefresh)
    pageCtx.setData(state)
    if (!state.hasBrandHeader && state.pageTitle) {
      wx.setNavigationBarTitle({ title: state.pageTitle })
    }
    return true
  } catch (e) {
    pageCtx.setData({
      dslMode: false,
      loading: false,
      error: '',
      flowComponents: [],
      floatComponents: [],
    })
    return false
  }
}

function handleDslReachBottom(pageCtx) {
  const renderers = pageCtx.selectAllComponents('dsl-renderer') || []
  renderers.forEach((renderer) => {
    ;['dsl-article-list', 'dsl-article-feed', 'dsl-product-list'].forEach((selector) => {
      const lists = (renderer.selectAllComponents && renderer.selectAllComponents(selector)) || []
      lists.forEach((list) => {
        if (list && typeof list.loadMore === 'function') list.loadMore()
      })
    })
  })
}

module.exports = {
  TAB_SLOT_ROUTES,
  loadTabBoundDslPage,
  handleDslReachBottom,
}
