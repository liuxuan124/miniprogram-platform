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
const { createSharePageConfig } = require('../../utils/share')

Page({
  ...createSharePageConfig(),
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
    wx.hideTabBar({ animation: false, fail() {} })
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0, hidden: false })
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
        1: '跨境选品案例精装手册（纸质版）',
        3: '品牌定制马克杯',
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
    wx.navigateTo({ url: '/pages/product-list/product-list' })
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
    if (action === 'shop') {
      this.goShop()
      return
    }
    if (action === 'service') {
      this.goService()
      return
    }
    if (action === 'orders') {
      wx.navigateTo({ url: '/pkg-trade/order-list/order-list' })
      return
    }
    if (action === 'member') {
      wx.navigateTo({ url: '/pkg-user/member-center/member-center' })
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
    wx.navigateTo({ url: '/pages/product-list/product-list' })
  },
})
