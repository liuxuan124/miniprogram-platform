const SystemService = require('../services/system')
const { PageService } = require('../services/page')
const { parseDSL, loadAllComponentData } = require('./render')
const { getNavLayout } = require('./nav-layout')
const { collectHeroImageUrls, preloadImages, annotateHeroImageSize } = require('./image-preload')
const { TAB_SLOT_ROUTES, showTabBarForRoute } = require('./tab-bar-route')

function normalizePath(path) {
  return '/' + String(path || '').replace(/^\/+/, '')
}

function isCustomDecoratedPath(path) {
  const p = normalizePath(path)
  return /\/pages\/custom\//.test(p)
}

async function resolveBoundPathForTabRoute(tabRoute) {
  const config = await SystemService.fetchSystemConfig()
  if (
    normalizePath(tabRoute) === '/pages/knowledge-mall/knowledge-mall'
    && !SystemService.isProductModuleEnabled(config.plugins)
  ) {
    return null
  }
  const route = normalizePath(tabRoute)
  const slotIndex = TAB_SLOT_ROUTES.indexOf(route)
  if (slotIndex < 0) return null

  const tab = (config.tabbarItems || [])[slotIndex] || {}
  if (tab.enabled === false) return null
  const boundPath = normalizePath(tab.path || tab.pagePath || '')
  if (!boundPath || boundPath === route) return null
  if (!isCustomDecoratedPath(boundPath)) return null
  return boundPath.replace(/^\//, '')
}

async function loadDslPageState(path, forceRefresh, options) {
  const dsl = await PageService.getPageDSL(path, forceRefresh)
  const parsed = parseDSL(dsl)
  const rawComponents = parsed.components || []
  const layout = getNavLayout()
  const useCustomNav = !!(options && options.useCustomNav)

  // 先按 DSL 骨架分好流式/悬浮组件（尚未灌接口数据）
  const skeletonFlow = []
  const skeletonFloat = []
  rawComponents.forEach((item) => {
    if (item && item.type === 'float_button') skeletonFloat.push(item)
    else skeletonFlow.push(item)
  })
  const hasBrandHeader = skeletonFlow.some((item) => item && item.type === 'brand_header')
  const statusPadPx = useCustomNav && !hasBrandHeader ? layout.statusBarHeight : 0
  const pageTitle = (parsed.page && parsed.page.name) || ''

  return {
    skeleton: {
      dslMode: true,
      loading: false,
      error: '',
      flowComponents: skeletonFlow,
      floatComponents: skeletonFloat,
      hasBrandHeader,
      statusBarHeight: layout.statusBarHeight,
      statusPadPx,
      pageTitle,
    },
    enrich: async () => {
      const components = await loadAllComponentData(rawComponents)
      const flowComponents = []
      const floatComponents = []
      components.forEach((item) => {
        if (item && item.type === 'float_button') floatComponents.push(item)
        else flowComponents.push(item)
      })
      const heroUrls = collectHeroImageUrls(flowComponents)
      // 顶图预载最多等 300ms，超时也放行，避免真机白屏
      const loaded = await preloadImages(heroUrls, 300)
      const annotated = annotateHeroImageSize(flowComponents, loaded)
      return {
        dslMode: true,
        loading: false,
        error: '',
        flowComponents: annotated,
        floatComponents,
        hasBrandHeader: annotated.some((item) => item && item.type === 'brand_header'),
        statusBarHeight: layout.statusBarHeight,
        statusPadPx,
        pageTitle,
      }
    },
  }
}

/**
 * Tab 宿主页加载导航绑定的装修页 DSL（与后台实时预览同源）
 * @returns {Promise<boolean>} 是否已进入 DSL 模式
 */
/** Tab 壳页初始态：dslPending 期间不渲染原型兜底，避免闪屏 */
const TAB_DSL_INITIAL = {
  dslPending: true,
  dslMode: false,
  loading: true,
  error: '',
  flowComponents: [],
  floatComponents: [],
  hasBrandHeader: false,
  statusPadPx: 0,
}

async function loadTabBoundDslPage(pageCtx, tabRoute, forceRefresh) {
  pageCtx.setData({ loading: true, error: '' })
  try {
    const path = await resolveBoundPathForTabRoute(tabRoute)
    if (!path) {
      pageCtx.setData({
        dslPending: false,
        dslMode: false,
        loading: false,
        error: '',
      })
      return false
    }
    const route = normalizePath(tabRoute)
    // 首页 / 内容 / 商城 均用自定义顶栏（与 brand_header 对齐，避免系统栏+空隙）
    const useCustomNav = [
      '/pages/index/index',
      '/pages/content-list/content-list',
      '/pages/knowledge-mall/knowledge-mall',
    ].indexOf(route) >= 0
    const { skeleton, enrich } = await loadDslPageState(path, forceRefresh, { useCustomNav })
    // 先出骨架，再异步灌列表与顶图
    pageCtx.setData(Object.assign({}, skeleton, { dslPending: false }))
    if (skeleton.pageTitle && !useCustomNav) {
      wx.setNavigationBarTitle({ title: skeleton.pageTitle })
    }
    enrich().then((state) => {
      pageCtx.setData(state)
      showTabBarForRoute(pageCtx, tabRoute)
    }).catch(() => {})
    return true
  } catch (e) {
    pageCtx.setData({
      dslPending: false,
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
    ;['dsl-article-list', 'dsl-article-feed', 'dsl-note-feed', 'dsl-moments-feed', 'dsl-product-list'].forEach((selector) => {
      const lists = (renderer.selectAllComponents && renderer.selectAllComponents(selector)) || []
      lists.forEach((list) => {
        if (list && typeof list.loadMore === 'function') list.loadMore()
      })
    })
  })
}

module.exports = {
  TAB_DSL_INITIAL,
  TAB_SLOT_ROUTES,
  loadTabBoundDslPage,
  handleDslReachBottom,
}
