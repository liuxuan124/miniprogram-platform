// pages/index/index.js — 原型首页（布局+数据与完整版 HTML 对齐）
const { get } = require('../../utils/request')
const {
  ITEMS,
  artStyle,
  buildHomeFeed,
  buildHomeProducts,
  buildTopics,
} = require('../../data/prototype-home')
const { AuthService } = require('../../services/auth')

Page({
  data: {
    featureArtStyle: artStyle('select'),
    topics: buildTopics(),
    feedCards: [],
    masonry: [],
    products: [],
    contentIdMap: {},
    productIdMap: {},
  },

  onLoad() {
    this._hydrate()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
    const app = getApp()
    if (app && !app.globalData.isLoggedIn) {
      AuthService.silentLogin().catch(() => {})
    }
  },

  onPullDownRefresh() {
    this._hydrate().finally(() => wx.stopPullDownRefresh())
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
    wx.navigateTo({ url: '/pages/search/search' })
  },

  goContent() {
    wx.switchTab({ url: '/pages/content-list/content-list' })
  },

  goShop() {
    wx.switchTab({ url: '/pages/product-list/product-list' })
  },

  goAi() {
    wx.navigateTo({ url: '/pages/ai-chat/ai-chat' })
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
    if (action === 'member') {
      wx.navigateTo({ url: '/pages/member-center/member-center' })
      return
    }
    if (action === 'ebook' || action === 'consult') {
      try {
        wx.setStorageSync('__tab_query__/pages/product-list/product-list', {
          type: action === 'ebook' ? 'digital' : 'service',
        })
      } catch (_) {}
      wx.switchTab({ url: '/pages/product-list/product-list' })
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
    // 映射未就绪：进入内容中心，避免永久「加载中」
    try {
      wx.setStorageSync('__tab_query__/pages/content-list/content-list', { topic: '' })
    } catch (_) {}
    wx.switchTab({ url: '/pages/content-list/content-list' })
  },

  openProduct(e) {
    const protoId = Number(e.currentTarget.dataset.id)
    const realId = this.data.productIdMap[protoId]
    if (realId) {
      wx.navigateTo({ url: `/pages/product-detail/product-detail?id=${realId}` })
      return
    }
    wx.switchTab({ url: '/pages/product-list/product-list' })
  },
})
