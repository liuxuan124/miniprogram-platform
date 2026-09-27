const SystemService = require('../services/system')
const { PageService } = require('../services/page')
const { parseDSL, loadAllComponentData } = require('./render')
const { getNavLayout } = require('./nav-layout')
const { collectHeroImageUrls, preloadImages, annotateHeroImageSize } = require('./image-preload')
const { TAB_SLOT_ROUTES, showTabBarForRoute } = require('./tab-bar-route')
const { resolveActiveTabItems } = require('./tabbar-config')
const { getAppThemeConfig, resolvePageBackgroundColor, getNavigationFrontColor } = require('./theme')

function normalizePath(path) {
  return '/' + String(path || '').replace(/^\/+/, '')
}

function tabItemPageId(item) {
  if (!item) return null
  const raw = item.pageId != null ? item.pageId : item.page_id
  if (raw == null || raw === '') return null
  return String(raw)
}

async function resolveBoundPathForTabRoute(tabRoute) {
  const config = await SystemService.fetchSystemConfig(true)
  const route = normalizePath(tabRoute)
  const rows = resolveActiveTabItems(config.plugins, config.tabbarItems || [])
  const hit = rows.find((row) => row.slotRoute === route)
  if (!hit) return null

  const boundPath = normalizePath(hit.item.path || hit.item.pagePath || '')
  const pageId = tabItemPageId(hit.item)
  if (!boundPath && !pageId) return null
  // 绑到壳路径本身但有 pageId（如首页 pages/index/index + 出海笔记首页）→ 仍加载该路径 DSL
  if (boundPath === route) {
    return pageId ? boundPath.replace(/^\//, '') : null
  }
  if (!boundPath) return null
  return boundPath.replace(/^\//, '')
}

/** Tab 未绑定时，首页仍尝试已发布的 pages/index/index DSL */
async function resolveDslPathForTabRoute(tabRoute) {
  const bound = await resolveBoundPathForTabRoute(tabRoute)
  if (bound) return bound
  if (normalizePath(tabRoute) === '/pages/index/index') {
    return 'pages/index/index'
  }
  return null
}

function isRenderParityLocked(pageCtx) {
  const batch = pageCtx && pageCtx.data && pageCtx.data.parityBatch
  return batch != null && String(batch) !== ''
}

async function applyFullDslTabPage(pageCtx, tabRoute, path, forceRefresh) {
  if (isRenderParityLocked(pageCtx)) {
    return !!(pageCtx.data && pageCtx.data.dslMode)
  }
  const route = normalizePath(tabRoute)
  const useCustomNav = [
    '/pages/index/index',
    '/pages/discover/discover',
    '/pkg-content/content-list/content-list',
    '/pages/shop/shop',
    '/pkg-content/knowledge-mall/knowledge-mall',
    '/pages/planet/planet',
    '/pkg-content/tab-hub/tab-hub',
  ].indexOf(route) >= 0
  const { skeleton, enrich } = await loadDslPageState(path, forceRefresh, { useCustomNav })
  if (isRenderParityLocked(pageCtx)) {
    return !!(pageCtx.data && pageCtx.data.dslMode)
  }
  pageCtx.setData(Object.assign({}, skeleton, { dslPending: false }))
  if (skeleton.pageTitle && !useCustomNav) {
    wx.setNavigationBarTitle({ title: skeleton.pageTitle })
  }
  enrich().then((state) => {
    if (isRenderParityLocked(pageCtx)) return
    pageCtx.setData(state)
    showTabBarForRoute(pageCtx, tabRoute)
  }).catch(() => {})
  return true
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
  const pageBackgroundColor = resolvePageBackgroundColor(dsl && dsl.page, getAppThemeConfig())

  // 自定义导航页没有系统导航栏承接颜色，安全区必须与装修页背景保持一致。
  if (useCustomNav && !hasBrandHeader) {
    try {
      wx.setNavigationBarColor({
        frontColor: getNavigationFrontColor(pageBackgroundColor),
        backgroundColor: pageBackgroundColor,
        animation: { duration: 0, timingFunc: 'linear' },
        fail() {},
      })
    } catch (e) {
      // 开发工具旧基础库不支持时由页面容器背景兜底
    }
  }

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
      pageBackgroundColor,
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
        pageBackgroundColor,
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
  pageBackgroundColor: '',
  /** RENDER-PARITY：automator 灌批次时置位，阻止 Tab DSL 异步覆盖 */
  parityBatch: '',
}

async function loadTabBoundDslPage(pageCtx, tabRoute, forceRefresh) {
  if (isRenderParityLocked(pageCtx)) {
    return !!(pageCtx.data && pageCtx.data.dslMode)
  }
  pageCtx.setData({ loading: true, error: '' })
  try {
    const path = await resolveDslPathForTabRoute(tabRoute)
    if (!path) {
      pageCtx.setData({
        dslPending: false,
        dslMode: false,
        loading: false,
        error: '',
      })
      return false
    }
    // 后台 DSL 是唯一真源：只要 Tab 绑定了页面，一律按装修 DSL 渲染。
    // （历史行为：DSL 若只由单个 warm_* 组件构成，则改走小程序内写死的原生页，
    //  导致运营在后台怎么搭都不生效。该分支已移除。）
    return applyFullDslTabPage(pageCtx, tabRoute, path, forceRefresh)
  } catch (e) {
    const msg = (e && (e.message || e.errMsg)) ? String(e.message || e.errMsg) : '页面配置加载失败'
    pageCtx.setData({
      dslPending: false,
      dslMode: false,
      loading: false,
      error: msg.slice(0, 120),
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
