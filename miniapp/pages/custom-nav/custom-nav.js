const { PageService } = require('../../services/page')
const { parseDSL, loadAllComponentData } = require('../../utils/render')
const { getNavLayout } = require('../../utils/nav-layout')
const { collectHeroImageUrls, preloadImages, annotateHeroImageSize } = require('../../utils/image-preload')
const { resolveTabRouteForBoundCustomPath } = require('../../utils/tab-bar-route')
const { getAppThemeConfig, resolvePageBackground } = require('../../utils/theme')

Page({
  data: {
    loading: true,
    error: '',
    flowComponents: [],
    floatComponents: [],
    hasBrandHeader: false,
    statusBarHeight: 20,
    pageBackgroundColor: '',
    /** v2 复合背景：渐变优先（'' 表示纯色页走 background-color） */
    pageBackgroundCss: '',
    /** 底部渐隐融合遮罩：null 表示不渲染 */
    bottomOverlay: null,
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
      const layout = getNavLayout()
      // 无 brand_header 时改走系统导航页，避免自定义顶栏空占位
      if (!hasBrandHeader) {
        wx.redirectTo({
          url: '/pages/custom/custom?path=' + encodeURIComponent(path),
          fail() {},
        })
        return
      }
      // v2 复合背景：渐变/纯色归一化 + 底部渐隐遮罩（auto 取背景底色，渐变取终点色标）
      const pageBg = resolvePageBackground(parsed.page, getAppThemeConfig())
      let bottomOverlay = null
      const rawOverlay = parsed.page && typeof parsed.page === 'object' ? parsed.page.bottomOverlay : null
      if (!rawOverlay || rawOverlay.enabled !== false) {
        const heightPx = Math.min(160, Math.max(60, Number(rawOverlay && rawOverlay.height) || 96))
        const custom = rawOverlay && rawOverlay.color && rawOverlay.color !== 'auto'
          ? String(rawOverlay.color).trim()
          : ''
        bottomOverlay = {
          height: heightPx * 2,
          color: custom || pageBg.bottomColor,
        }
      }
      // iOS 下拉橡皮筋：backgroundColorTop/Bottom 对齐渐变端点色，杜绝回弹露白
      try {
        if (wx.setBackgroundColor) {
          wx.setBackgroundColor({
            backgroundColorTop: pageBg.topColor,
            backgroundColorBottom: pageBg.bottomColor,
            fail() {},
          })
        }
      } catch (e) {
        // 旧基础库无此 API，忽略
      }

      this.setData({
        loading: false,
        error: '',
        flowComponents: annotated,
        floatComponents,
        hasBrandHeader,
        statusBarHeight: layout.statusBarHeight,
        pageBackgroundColor: pageBg.color,
        pageBackgroundCss: pageBg.gradientCss,
        bottomOverlay,
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
