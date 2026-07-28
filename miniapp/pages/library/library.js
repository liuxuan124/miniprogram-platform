// pages/library/library.js — 已购资料（数字商品阅读入口）
const productService = require('../../services/product')
const orderService = require('../../services/order')
const { AuthUtil } = require('../../utils/auth')

Page({
  data: {
    items: [],
    loading: false,
    isEmpty: false,
  },

  onShow() {
    if (!AuthUtil.isLoggedIn()) {
      // 未登录仍展示可试读资料包列表，引导购买
      this._loadCatalogFallback()
      return
    }
    this._loadPurchased()
  },

  onGoShop() {
    wx.switchTab({
      url: '/pages/product-list/product-list',
      fail: () => wx.navigateTo({ url: '/pages/product-list/product-list?type=digital' }),
    })
  },

  onOpen(e) {
    const { id, title, purchased } = e.currentTarget.dataset
    if (!purchased) {
      wx.navigateTo({ url: `/pages/product-detail/product-detail?id=${id}` })
      return
    }
    wx.navigateTo({
      url: `/pages/reader/reader?id=${id}&title=${encodeURIComponent(title || '')}`,
    })
  },

  async _loadPurchased() {
    this.setData({ loading: true })
    try {
      const res = await orderService.getPurchasedContents()
      let items = (Array.isArray(res) ? res : []).map((item) => ({
        id: item.productId || item.product_id,
        name: item.name,
        cover: item.mainImage || item.main_image || '',
        badge: '已购 · 永久可看',
        meta: `订单 ${item.orderNo || item.order_no || ''}`.trim(),
        purchased: true,
      }))
      if (!items.length) {
        // 无订单时展示商城数字商品，便于演示阅读器
        items = await this._fetchDigitalProducts('可购买')
      }
      this.setData({ items, loading: false, isEmpty: items.length === 0 })
    } catch (e) {
      this._loadCatalogFallback()
    }
  },

  async _loadCatalogFallback() {
    this.setData({ loading: true })
    try {
      const items = await this._fetchDigitalProducts('资料包')
      this.setData({ items, loading: false, isEmpty: items.length === 0 })
    } catch (e) {
      this.setData({ loading: false, isEmpty: true, items: [] })
    }
  },

  async _fetchDigitalProducts(badge) {
    const res = await productService.getProductList({ current: 1, size: 20, productType: 'digital' })
    const list = (res && (res.records || res.list || res.items)) || []
    return list.map((p) => ({
      id: p.id,
      name: p.name,
      cover: p.mainImage || p.main_image || p.image || '',
      badge,
      meta: `¥${p.price || 0} · 永久可看`,
      purchased: false,
    }))
  },
})
