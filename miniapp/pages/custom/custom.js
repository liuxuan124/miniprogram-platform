const { PageService } = require('../../services/page')
const { parseDSL, loadAllComponentData } = require('../../utils/render')
const { getNavLayout } = require('../../utils/nav-layout')
const { collectHeroImageUrls, preloadImages, annotateHeroImageSize } = require('../../utils/image-preload')
const { resolveTabRouteForBoundCustomPath } = require('../../utils/tab-bar-route')
const { getAppThemeConfig, resolvePageBackground } = require('../../utils/theme')
const { checkPageAccess, promptAccessPassword, resolveOfflineAction } = require('../../utils/page-guard')
const { mountWatermark } = require('../../utils/page-watermark')

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
    /** v2 复合背景：渐变优先（'' 表示纯色页走 background-color） */
    pageBackgroundCss: '',
    /** 底部渐隐融合遮罩：null 表示不渲染 */
    bottomOverlay: null,
    /** 动态防录屏水印的 dataURL；'' = 不渲染（默认关闭，老页面零变化） */
    watermarkUrl: '',
  },

  onUnload() {
    // 🔴 必须在这里销毁：定时器不清会一直跑到页面栈回收，泄漏内存
    if (this._wm) {
      this._wm.destroy()
      this._wm = null
    }
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

  /**
   * 访问拦截的统一出口（2026-06 新增）。
   * @returns {Promise<boolean>} true=放行
   */
  async _ensureAccess(guard) {
    // 定时上下线：不弹任何框，按配置兜底（首页 / 公告 / 停留）
    if (guard.action === 'offline') {
      const act = resolveOfflineAction(guard.payload)
      if (act.type === 'stay') {
        this.setData({ loading: false, error: '该页面已下线', flowComponents: [], floatComponents: [] })
        return false
      }
      if (act.type === 'notice') {
        this.setData({
          loading: false,
          error: '该页面已下线',
          flowComponents: [],
          floatComponents: [],
        })
        return false
      }
      wx.redirectTo({ url: act.url, fail() {} })
      return false
    }

    if (guard.action === 'password') {
      const pass = await promptAccessPassword((guard.payload || {}).expect, 3)
      if (pass) return true
      this.setData({ loading: false, error: '访问验证未通过', flowComponents: [], floatComponents: [] })
      return false
    }

    if (guard.action === 'login') {
      // 🔴 带上回跳参数：登录后能回到本页，否则用户登录完发现「找不到刚才的页面」
      wx.navigateTo({
        url: '/pages/login/login?redirect=' + encodeURIComponent('/pages/custom/custom?path=' + encodeURIComponent(this._curPath || '')),
        fail() {
          wx.showToast({ title: guard.reason || '需要登录', icon: 'none' })
        },
      })
      return false
    }

    // vip 及其它：提示后停在空态
    wx.showToast({ title: guard.reason || '无访问权限', icon: 'none' })
    this.setData({ loading: false, error: guard.reason || '无访问权限', flowComponents: [], floatComponents: [] })
    return false
  },

  /** 挂载动态水印层（渲染完成后调，避免抢首屏） */
  _mountWatermark() {
    if (this._wm) this._wm.destroy()
    const self = this
    this._wm = mountWatermark(null, {
      onUpdate(url) {
        self.setData({ watermarkUrl: url || '' })
      },
    })
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
    // 存一份供登录回跳拼接（_ensureAccess 里要用）
    this._curPath = path
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

      // 访问守卫：先判权限，拦住就不渲染内容（避免「闪一下再消失」）
      const guard = checkPageAccess(parsed.page)
      if (guard.ok === false) {
        const passed = await this._ensureAccess(guard)
        if (!passed) return
      }

      this.setData({
        loading: false,
        error: '',
        flowComponents: annotated,
        floatComponents,
        hasBrandHeader: false,
        statusBarHeight: layout.statusBarHeight,
        pageBackgroundColor: pageBg.color,
        pageBackgroundCss: pageBg.gradientCss,
        bottomOverlay,
      })

      // 动态水印：渲染完成后再挂，避免抢首屏
      if (parsed.page && parsed.page.watermark === true) {
        this._mountWatermark()
      }
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
