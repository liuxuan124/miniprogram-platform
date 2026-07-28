const productService = require('../../services/product')
const orderService = require('../../services/order')

Page({
  data: {
    orderId: '',
    orderNo: '',
    payAmount: '0.00',
    productName: '',
    productId: '',
    isDigital: true,
    isService: false,
    rewardText: '',
    recs: [],
    paymentConfirmed: false,
    confirming: true,
  },

  onLoad(q) {
    const productType = q.type || 'digital'
    this.setData({
      orderId: q.orderId || '',
      orderNo: q.orderNo ? decodeURIComponent(q.orderNo) : '',
      payAmount: q.amount || '0.00',
      productName: q.name ? decodeURIComponent(q.name) : '知识商品',
      productId: q.productId || '',
      isDigital: ['digital', 'ebook'].includes(productType),
      isService: productType === 'service' || productType === 'consult',
    })
    this._loadRecs()
    this._confirmPayment()
  },

  async _confirmPayment(attempt = 0) {
    if (!this.data.orderId) {
      this.setData({ confirming: false })
      return
    }
    try {
      const order = await orderService.getOrderDetail(this.data.orderId)
      const confirmed = ['paid', 'shipped', 'completed'].includes(order.status)
      if (confirmed) {
        this.setData({ paymentConfirmed: true, confirming: false })
        return
      }
    } catch (_) {}
    if (attempt < 5) {
      setTimeout(() => this._confirmPayment(attempt + 1), 800)
    } else {
      this.setData({ confirming: false })
      wx.showModal({
        title: '支付结果确认中',
        content: '支付结果尚未同步，请稍后在订单列表查看，系统不会重复扣款。',
        showCancel: false,
      })
    }
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
    if (!this.data.paymentConfirmed) {
      wx.showToast({ title: '支付结果确认中，请稍候', icon: 'none' })
      return
    }
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
