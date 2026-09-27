const { PageService } = require('../../services/page')
const { parseDSL, loadAllComponentData } = require('../../utils/render')
const { getNavLayout } = require('../../utils/nav-layout')
const { collectHeroImageUrls, preloadImages, annotateHeroImageSize } = require('../../utils/image-preload')
const { resolveTabRouteForBoundCustomPath } = require('../../utils/tab-bar-route')
const { getAppThemeConfig, resolvePageBackgroundColor } = require('../../utils/theme')

const GOLDEN_PARITY_PATH = 'pages/custom/golden-render-parity'

function isGoldenParityPath(path) {
  const norm = String(path || '').replace(/^\/+/, '')
  return norm === GOLDEN_PARITY_PATH || /^pages\/custom\/golden-parity-\d+$/.test(norm)
}
let GOLDEN_PARITY_DSL = null
let GOLDEN_BATCHES_ALL = null
try {
  GOLDEN_PARITY_DSL = require('../../data/golden-parity-dsl.json')
} catch (e) {
  GOLDEN_PARITY_DSL = null
}
try {
  GOLDEN_BATCHES_ALL = require('../../data/golden-batches-all.json')
} catch (e) {
  GOLDEN_BATCHES_ALL = null
}

Page({
  data: {
    loading: true,
    error: '',
    flowComponents: [],
    floatComponents: [],
    hasBrandHeader: false,
    statusBarHeight: 20,
    pageBackgroundColor: '',
  },

  onLoad(options) {
    const path = decodeURIComponent(options.path || options.p || '')
    // 深链兼容：装修 path 若已绑 Tab，一次落到 Tab 壳（正常点击已在 render/tab-route 改写，不进本页）
    const tabRoute = resolveTabRouteForBoundCustomPath(path)
    if (tabRoute) {
      wx.switchTab({ url: tabRoute })
      return
    }
    this._load(path)
  },

  onShow() {
    wx.hideTabBar({ animation: false, fail() {} })
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ hidden: true })
    }
  },

  onReachBottom() {
    const renderers = this.selectAllComponents('dsl-renderer') || []
    renderers.forEach((renderer) => {
      ;['dsl-article-list', 'dsl-article-feed', 'dsl-product-list'].forEach((selector) => {
        const lists = (renderer.selectAllComponents && renderer.selectAllComponents(selector)) || []
        lists.forEach((list) => {
          if (list && typeof list.loadMore === 'function') list.loadMore()
        })
      })
    })
  },

  async _load(path) {
    if (!path) {
      this.setData({ loading: false, error: '缺少页面路径' })
      return
    }
    try {
      const norm = String(path || '').replace(/^\/+/, '')
      let dsl = null
      if (isGoldenParityPath(norm)) {
        const batchMatch = norm.match(/golden-parity-(\d+)$/)
        if (batchMatch && GOLDEN_BATCHES_ALL) {
          dsl = GOLDEN_BATCHES_ALL[batchMatch[1]] || null
        }
        if (!dsl && norm === GOLDEN_PARITY_PATH && GOLDEN_PARITY_DSL) {
          dsl = GOLDEN_PARITY_DSL
        }
      }
      if (!dsl) {
        dsl = await PageService.getPageDSL(path, true)
      }
      const parsed = parseDSL(dsl)
      const pageBackgroundColor = resolvePageBackgroundColor(dsl && dsl.page, getAppThemeConfig())
      const goldenParity = isGoldenParityPath(norm)
      const components = goldenParity
        ? (parsed.components || [])
        : await loadAllComponentData(parsed.components || [])
      const flowComponents = []
      const floatComponents = []
      components.forEach((item) => {
        if (item && item.type === 'float_button') floatComponents.push(item)
        else flowComponents.push(item)
      })
      let annotated = flowComponents
      if (!goldenParity) {
        const heroUrls = collectHeroImageUrls(flowComponents)
        const loaded = await preloadImages(heroUrls, 550)
        annotated = annotateHeroImageSize(flowComponents, loaded)
      }
      const hasBrandHeader = annotated.some((item) => item && item.type === 'brand_header')
      const tabRoute = resolveTabRouteForBoundCustomPath(path)
      if (tabRoute) {
        wx.switchTab({ url: tabRoute })
        return
      }
      if (hasBrandHeader && !goldenParity) {
        wx.redirectTo({
          url: '/pages/custom-nav/custom-nav?path=' + encodeURIComponent(path),
          fail() {},
        })
        return
      }
      const layout = getNavLayout()
      wx.setNavigationBarTitle({ title: (parsed.page && parsed.page.name) || '页面' })
      this.setData({
        loading: false,
        error: '',
        flowComponents: annotated,
        floatComponents,
        hasBrandHeader: false,
        statusBarHeight: layout.statusBarHeight,
        pageBackgroundColor,
      })
    } catch (e) {
      this.setData({
        loading: false,
        error: '页面不存在或未发布',
        flowComponents: [],
        floatComponents: [],
      })
    }
  },
})
