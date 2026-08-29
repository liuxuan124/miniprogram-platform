// pages/index/index.js — Tab 首页：优先加载导航绑定的装修页 DSL
const { get } = require('../../utils/request')
const {
  ITEMS,
  artStyle,
  buildHomeFeed,
  buildHomeProducts,
  buildTopics,
} = require('../../data/prototype-home')
const { AuthService } = require('../../services/auth')
const { createSharePageConfig } = require('../../utils/share')
const { loadTabBoundDslPage, handleDslReachBottom, TAB_DSL_INITIAL } = require('../../utils/dsl-tab-page')
const { showTabBarForRoute } = require('../../utils/tab-bar-route')
const { getNavLayout } = require('../../utils/nav-layout')
const { blockTradeNavigation } = require('../../utils/product-module-gate')

Page({
  ...createSharePageConfig(),
  data: {
    ...TAB_DSL_INITIAL,
    statusBarHeight: getNavLayout().statusBarHeight,
    featureArtStyle: artStyle('select'),
    topics: buildTopics(),
    feedCards: [],
    masonry: [],
    products: [],
    contentIdMap: {},
    productIdMap: {},
  },

  onLoad() {
    loadTabBoundDslPage(this, '/pages/index/index').then((ok) => {
      if (!ok) this._hydrate()
      else this._mergePersonalized()
    })
  },

  onShow() {
    showTabBarForRoute(this, '/pages/index/index')
    const app = getApp()
    if (app && !app.globalData.isLoggedIn) {
      AuthService.silentLogin().catch(() => {})
    }
  },

  onPullDownRefresh() {
    if (this.data.dslMode) {
      loadTabBoundDslPage(this, '/pages/index/index', true)
        .then((ok) => { if (ok) return this._mergePersonalized() })
        .finally(() => wx.stopPullDownRefresh())
      return
    }
    this._hydrate().finally(() => wx.stopPullDownRefresh())
  },

  /**
   * U5：登录后拉取个性化首页，合并 product_list / article_list 的 items
   */
  async _mergePersonalized() {
    try {
      const app = getApp()
      const loggedIn = !!(app && app.globalData && app.globalData.isLoggedIn)
      if (!loggedIn) return
      const dsl = await get('/api/v1/mp/pages/personalized-home', {}, {
        auth: true,
        showError: false,
      })
      if (!dsl || !Array.isArray(dsl.components)) return
      let productItems = null
      let articleItems = null
      dsl.components.forEach((c) => {
        if (!c || !c.props) return
        if (c.type === 'product_list' && Array.isArray(c.props.items) && c.props.items.length) {
          productItems = c.props.items
        }
        if ((c.type === 'article_list' || c.type === 'article_feed')
            && Array.isArray(c.props.items) && c.props.items.length) {
          articleItems = c.props.items
        }
      })
      if (!productItems && !articleItems) return
      const flow = (this.data.flowComponents || []).map((comp) => {
        if (!comp) return comp
        if (comp.type === 'product_list' && productItems) {
          return Object.assign({}, comp, {
            props: Object.assign({}, comp.props || {}, { items: productItems }),
            runtimeData: productItems,
            runtimeDataLoaded: true,
          })
        }
        if ((comp.type === 'article_list' || comp.type === 'article_feed') && articleItems) {
          return Object.assign({}, comp, {
            props: Object.assign({}, comp.props || {}, { items: articleItems }),
            runtimeData: articleItems,
            runtimeDataLoaded: true,
          })
        }
        return comp
      })
      this.setData({ flowComponents: flow })
    } catch (_) {
      // 个性化失败不影响首页
    }
  },

  onReachBottom() {
    if (this.data.dslMode) handleDslReachBottom(this)
  },

  async _hydrate() {
    const feed = buildHomeFeed()
    const products = buildHomeProducts()
    this.setData({
      feedCards: feed.feedCards,
      masonry: feed.masonry,
      products,
    })

    try {
      const [contentsRes, productsRes] = await Promise.all([
        get('/api/v1/mp/contents', { current: 1, size: 50 }, { auth: false, showError: false }),
        get('/api/v1/mp/products', { current: 1, size: 20 }, { auth: false, showError: false }),
      ])
      const contents = (contentsRes && contentsRes.records) || (contentsRes && contentsRes.list) || []
      const prods = (productsRes && productsRes.records) || (productsRes && productsRes.list) || []

      const contentIdMap = {}
      ITEMS.forEach((item) => {
        const hit = contents.find((c) => c.title === item.title)
        if (hit) contentIdMap[item.id] = hit.id
      })

      const productIdMap = {}
      const nameByProto = {
        1: '《100 个跨境爆款选品案例库》',
        3: '选品诊断 1v1 咨询（45 分钟）',
      }
      Object.keys(nameByProto).forEach((pid) => {
        const hit = prods.find((p) => p.name === nameByProto[pid])
        if (hit) productIdMap[pid] = hit.id
      })

      this.setData({ contentIdMap, productIdMap })
    } catch (e) {
      // 离线时仍展示原型静态数据
    }
  },

  goSearch() {
    wx.navigateTo({
      url: '/pages/search/search',
      fail: (err) => {
        console.error('[Index] open search failed:', err)
        wx.showToast({ title: '无法打开搜索页', icon: 'none' })
      },
    })
  },

  goContent() {
    wx.switchTab({ url: '/pages/content-list/content-list' })
  },

  goShop() {
    wx.switchTab({ url: '/pages/knowledge-mall/knowledge-mall' })
  },

  goAi() {
    wx.navigateTo({
      url: '/pkg-user/service-chat/service-chat',
      fail: () => {
        wx.showToast({ title: 'AI 助手即将开放', icon: 'none' })
      },
    })
  },

  goService() {
    wx.navigateTo({ url: '/pkg-user/service-chat/service-chat' })
  },

  goTopic(e) {
    const topic = e.currentTarget.dataset.topic || ''
    try {
      wx.setStorageSync('__tab_query__/pages/content-list/content-list', { topic })
    } catch (_) {}
    wx.switchTab({ url: '/pages/content-list/content-list' })
  },

  onQuickNav(e) {
    const action = e.currentTarget.dataset.action
    if (action === 'content') {
      this.goContent()
      return
    }
    if (action === 'ebook') {
      try {
        wx.setStorageSync('__tab_query__/pages/knowledge-mall/knowledge-mall', { type: 'ebook' })
      } catch (_) {}
      this.goShop()
      return
    }
    if (action === 'consult') {
      try {
        wx.setStorageSync('__tab_query__/pages/knowledge-mall/knowledge-mall', { type: 'consult' })
      } catch (_) {}
      this.goShop()
      return
    }
    if (action === 'member') {
      wx.navigateTo({ url: '/pkg-user/member-center/member-center' })
      return
    }
    if (action === 'orders') {
      if (blockTradeNavigation('/pkg-trade/order-list/order-list')) return
      wx.navigateTo({ url: '/pkg-trade/order-list/order-list' })
      return
    }
    if (action === 'service') {
      this.goService()
    }
  },

  openFeature() {
    this.openItem({ currentTarget: { dataset: { id: 1 } } })
  },

  openItem(e) {
    const protoId = Number(e.currentTarget.dataset.id)
    const realId = this.data.contentIdMap[protoId]
    if (realId) {
      wx.navigateTo({ url: `/pages/content-detail/content-detail?id=${realId}` })
      return
    }
    try {
      wx.setStorageSync('__tab_query__/pages/content-list/content-list', { topic: '' })
    } catch (_) {}
    wx.switchTab({ url: '/pages/content-list/content-list' })
  },

  openProduct() {
    if (blockTradeNavigation('/pages/knowledge-mall/knowledge-mall')) return
    wx.switchTab({ url: '/pages/knowledge-mall/knowledge-mall' })
  },

  onProductTap(e) {
    const protoId = Number(e.currentTarget.dataset.id)
    const realId = this.data.productIdMap[protoId]
    if (realId) {
      const url = `/pages/product-detail/product-detail?id=${realId}`
      if (blockTradeNavigation(url)) return
      wx.navigateTo({ url })
      return
    }
    this.goShop()
  },
})
