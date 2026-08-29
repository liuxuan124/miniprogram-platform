const { PageService } = require('../../services/page')
const { parseDSL, loadAllComponentData } = require('../../utils/render')
const { getNavLayout } = require('../../utils/nav-layout')
const { collectHeroImageUrls, preloadImages, annotateHeroImageSize } = require('../../utils/image-preload')
const { resolveTabRouteForBoundCustomPath } = require('../../utils/tab-bar-route')

Page({
  data: {
    loading: true,
    error: '',
    flowComponents: [],
    floatComponents: [],
    hasBrandHeader: false,
    statusBarHeight: 20,
  },

  onLoad(options) {
    const path = decodeURIComponent(options.path || options.p || '')
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
      const dsl = await PageService.getPageDSL(path, true)
      const parsed = parseDSL(dsl)
      const components = await loadAllComponentData(parsed.components || [])
      const flowComponents = []
      const floatComponents = []
      components.forEach((item) => {
        if (item && item.type === 'float_button') floatComponents.push(item)
        else flowComponents.push(item)
      })
      const heroUrls = collectHeroImageUrls(flowComponents)
      const loaded = await preloadImages(heroUrls, 550)
      const annotated = annotateHeroImageSize(flowComponents, loaded)
      const hasBrandHeader = annotated.some((item) => item && item.type === 'brand_header')
      const tabRoute = resolveTabRouteForBoundCustomPath(path)
      if (tabRoute) {
        wx.switchTab({ url: tabRoute })
        return
      }
      if (hasBrandHeader) {
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
