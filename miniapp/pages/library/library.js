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
    const { id, title } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/reader/reader?id=${id}&title=${encodeURIComponent(title || '')}`,
    })
  },

  async _loadPurchased() {
    this.setData({ loading: true })
    try {
      // 优先从已完成订单里找数字商品
      const res = await orderService.getOrderList({ current: 1, size: 50, status: 'completed' })
      const orders = (res && (res.records || res.list || res.items)) || []
      const map = new Map()
      orders.forEach((order) => {
        const items = order.items || order.orderItems || order.products || []
        items.forEach((it) => {
          const type = it.productType || it.product_type || ''
          const id = it.productId || it.product_id || it.id
          const name = it.productName || it.name || it.title
          if (!id || !name) return
          if (type && type !== 'digital') return
          if (!map.has(id)) {
            map.set(id, {
              id,
              name,
              cover: it.productImage || it.image || it.mainImage || '',
              badge: '已购 · 永久可看',
              meta: `订单 ${order.orderNo || order.order_no || ''}`.trim(),
            })
          }
        })
      })
      let items = Array.from(map.values())
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
    }))
  },
})
