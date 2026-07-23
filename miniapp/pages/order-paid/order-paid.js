const productService = require('../../services/product')

Page({
  data: {
    orderId: '',
    orderNo: '',
    payAmount: '0.00',
    productName: '',
    productId: '',
    isDigital: true,
    rewardText: '已赠送一张「满 50 减 8」优惠券',
    recs: [],
  },

  onLoad(q) {
    this.setData({
      orderId: q.orderId || '',
      orderNo: q.orderNo ? decodeURIComponent(q.orderNo) : '',
      payAmount: q.amount || '0.00',
      productName: q.name ? decodeURIComponent(q.name) : '知识商品',
      productId: q.productId || '',
      isDigital: q.type !== 'service',
    })
    this._loadRecs()
  },

  async _loadRecs() {
    try {
      const res = await productService.getProductList({ current: 1, size: 6 })
      const list = (res.records || res.list || []).filter((p) => String(p.id) !== String(this.data.productId)).slice(0, 4)
      this.setData({
        recs: list.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          cover: p.mainImage || p.main_image || '/images/default-product.svg',
        })),
      })
    } catch (e) { /* ignore */ }
  },

  goOrders() {
    wx.redirectTo({ url: '/pages/order-list/order-list' })
  },

  goReader() {
    const id = this.data.productId
    const title = encodeURIComponent(this.data.productName)
    wx.redirectTo({ url: `/pages/reader/reader?id=${id}&title=${title}` })
  },

  goAppointments() {
    wx.redirectTo({ url: '/pages/my-appointments/my-appointments' })
  },

  goCoupons() {
    wx.navigateTo({ url: '/pages/coupon-list/coupon-list' })
  },

  goProduct(e) {
    wx.navigateTo({ url: `/pages/product-detail/product-detail?id=${e.currentTarget.dataset.id}` })
  },
})
