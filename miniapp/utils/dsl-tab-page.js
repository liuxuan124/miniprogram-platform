const SystemService = require('../services/system')
const { PageService } = require('../services/page')
const { parseDSL, loadAllComponentData } = require('./render')
const { expandHomeComponents, annotateHomeBlocks, isNativeHomeType } = require('./warm-home-template')
const { getNavLayout } = require('./nav-layout')
const { collectHeroImageUrls, preloadImages, annotateHeroImageSize } = require('./image-preload')
const { TAB_SLOT_ROUTES, showTabBarForRoute } = require('./tab-bar-route')
const { resolveActiveTabItems } = require('./tabbar-config')

const WARM_TAB_COMPONENT = {
  '/pages/index/index': 'warm_home',
  '/pages/discover/discover': 'warm_discover',
  '/pages/planet/planet': 'warm_planet',
  '/pages/shop/shop': 'warm_shop',
  '/pages/mine/mine': 'warm_mine',
  '/pages/content-list/content-list': 'warm_content_list',
}

function extractDslComponents(dsl) {
  if (!dsl || typeof dsl !== 'object') return []
  if (Array.isArray(dsl.components)) return dsl.components
  if (dsl.data && Array.isArray(dsl.data.components)) return dsl.data.components
  return []
}

function normalizePath(path) {
  return '/' + String(path || '').replace(/^\/+/, '')
}

function isCustomDecoratedPath(path) {
  const p = normalizePath(path)
  return /\/pages\/custom\//.test(p)
}

async function resolveBoundPathForTabRoute(tabRoute) {
  const config = await SystemService.fetchSystemConfig(true)
  const route = normalizePath(tabRoute)
  const rows = resolveActiveTabItems(config.plugins, config.tabbarItems || [])
  const hit = rows.find((row) => row.slotRoute === route)
  if (!hit) return null

  const boundPath = normalizePath(hit.item.path || hit.item.pagePath || '')
  if (!boundPath || boundPath === route) return null
  // 绑定了任意装修页就加载其已发布 DSL（不再限制仅 /pages/custom/）
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
    const earlyRoute = normalizePath(tabRoute)
    if (WARM_TAB_COMPONENT[earlyRoute] === 'warm_content_list') {
      pageCtx.setData({
        dslPending: false,
        dslMode: false,
        loading: false,
        error: '',
        adminWarmBound: true,
      })
      return false
    }
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
    const expectedWarm = WARM_TAB_COMPONENT[route]
    if (expectedWarm === 'warm_home') {
      try {
        const raw = await PageService.getPageDSL(path, forceRefresh)
        const parsed = parseDSL(raw)
        const { flow, floats } = expandHomeComponents(parsed.components || [])
        const loaded = []
        for (let i = 0; i < flow.length; i++) {
          const c = flow[i]
          if (c && isNativeHomeType(c.type)) loaded.push(c)
          else {
            const one = await loadAllComponentData([c])
            loaded.push(one[0])
          }
        }
        let loadedFloats = floats
        if (floats.length) loadedFloats = await loadAllComponentData(floats)
        pageCtx.setData({
          dslPending: false,
          dslMode: false,
          loading: false,
          error: '',
          adminWarmBound: true,
          homeBlocks: annotateHomeBlocks(loaded),
          floatComponents: loadedFloats,
        })
        return false
      } catch (warmErr) {
        // 暖阁首页读取失败时走原生默认模板
      }
    }
    if (expectedWarm) {
      try {
        const raw = await PageService.getPageDSL(path, forceRefresh)
        const comps = extractDslComponents(raw).filter((c) => c && c.type && c.type !== 'float_button')
        const types = comps.map((c) => c.type)
        if (types.length && types.every((t) => t === expectedWarm)) {
          const props = (comps[0] && comps[0].props) || {}
          const patch = {
            dslPending: false,
            dslMode: false,
            loading: false,
            error: '',
            adminWarmBound: true,
            warmAuthorsTitle: props.authors_title || props.authorsTitle || '',
            warmColumnsTitle: props.columns_title || props.columnsTitle || '',
            warmPlanetTitle: props.planet_title || props.planetTitle || '',
          }
          if (expectedWarm === 'warm_discover' && Array.isArray(props.tabs) && props.tabs.length) {
            patch.discoverTabs = props.tabs
            patch.tabsConfig = props.tabs
          }
          if (expectedWarm === 'warm_discover') {
            const al = props.article_layout || props.articleLayout
            if (al && typeof al === 'object') {
              patch.articleLayout = al
              patch.article_layout = al
            }
          }
          if (props.title && expectedWarm === 'warm_discover') {
            patch.pageTitle = props.title
          }
          pageCtx.setData(Object.assign(patch, props.pagePatch || {}))
          return false
        }
      } catch (warmErr) {
        // 暖阁页读取失败时继续走装修 DSL / 原生兜底
      }
    }
    // 首页 / 内容 / 商城 均用自定义顶栏（与 brand_header 对齐，避免系统栏+空隙）
    const useCustomNav = [
      '/pages/index/index',
      '/pages/discover/discover',
      '/pages/content-list/content-list',
      '/pages/shop/shop',
      '/pages/knowledge-mall/knowledge-mall',
      '/pages/planet/planet',
      '/pages/tab-hub/tab-hub',
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
