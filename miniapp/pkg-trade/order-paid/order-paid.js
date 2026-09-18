const productService = require('../../services/product')
const orderService = require('../../services/order')
const { get } = require('../../utils/request')

const VIRTUAL_TYPES = ['digital', 'ebook', 'column', 'course', 'membership', 'member', 'virtual']

function isVirtualProduct(type, deliveryMode) {
  const mode = String(deliveryMode || '').toLowerCase()
  if (mode === 'auto' || mode === 'virtual' || mode === 'digital') return true
  return VIRTUAL_TYPES.includes(String(type || '').toLowerCase())
}

Page({
  data: {
    orderId: '',
    orderNo: '',
    payAmount: '0.00',
    productName: '',
    productId: '',
    isDigital: true,
    isService: false,
    isVirtualDelivery: false,
    rewardText: '',
    recs: [],
    paymentConfirmed: false,
    confirming: true,
    inviteCount: 0,
    inviteDays: 0,
    payFailed: false,
    failCode: 'PAY_CANCELED',
    failReason: '用户取消支付',
    themePageStyle: 'background:#FDF6EC',
  },

  onLoad(q) {
    const productType = q.type || 'physical'
    const deliveryMode = q.deliveryMode || q.delivery_mode || ''
    const isDigital = ['digital', 'ebook', 'column', 'course'].includes(productType)
    const isVirtualDelivery = isVirtualProduct(productType, deliveryMode)
    const status = String(q.status || q.result || '').toLowerCase()
    const payFailed = status === 'fail' || status === 'failed' || status === 'cancel' || status === 'canceled'
    this.setData({
      orderId: q.orderId || '',
      orderNo: q.orderNo ? decodeURIComponent(q.orderNo) : '',
      payAmount: q.amount || '0.00',
      productName: q.name ? decodeURIComponent(q.name) : '知识商品',
      productId: q.productId || '',
      isDigital: isDigital || isVirtualDelivery,
      isService: productType === 'service' || productType === 'consult',
      isVirtualDelivery,
      payFailed,
      failCode: q.code ? decodeURIComponent(q.code) : (payFailed ? 'PAY_CANCELED' : ''),
      failReason: q.reason ? decodeURIComponent(q.reason) : (payFailed ? '用户取消支付' : ''),
    })
    if (payFailed) {
      wx.setNavigationBarTitle({ title: '支付结果' })
      return
    }
    this._loadRecs()
    this._confirmPayment()
    this._requestSubscribe()
    this._loadInviteStats()
  },

  async _requestSubscribe() {
    try {
      const list = await get('/api/v1/mp/subscribe/templates', {}, { auth: false, showError: false })
      const rows = Array.isArray(list) ? list : []
      const tmplIds = rows
        .map((r) => r && r.templateId)
        .filter(Boolean)
        .slice(0, 3)
      if (!tmplIds.length || typeof wx.requestSubscribeMessage !== 'function') return
      wx.requestSubscribeMessage({
        tmplIds,
        fail() {},
      })
    } catch (_) { /* ignore */ }
  },

  async _confirmPayment(attempt = 0) {
    if (!this.data.orderId) {
      this.setData({ confirming: false })
      return
    }
    try {
      if (attempt === 1 || attempt === 4) {
        await orderService.syncPay(this.data.orderId)
      }
      const order = await orderService.getOrderDetail(this.data.orderId)
      const confirmed = ['paid', 'shipped', 'completed'].includes(order.status)
      if (confirmed) {
        const deliveryMode = order.deliveryMode || order.delivery_mode || ''
        const productType = order.productType || order.product_type || ''
        const isVirtualDelivery = this.data.isVirtualDelivery
          || isVirtualProduct(productType, deliveryMode)
          || !!String(order.virtualDeliveryContent || order.virtual_delivery_content || '').trim()
        this.setData({
          paymentConfirmed: true,
          confirming: false,
          isVirtualDelivery,
          isDigital: this.data.isDigital || isVirtualDelivery,
        })
        const delivered = String(order.virtualDeliveryContent || order.virtual_delivery_content || '').trim()
        if (delivered && !isVirtualDelivery) {
          wx.showModal({
            title: '已自动发货',
            content: '发货内容已发送到消息通知，也可在客服对话中查看。',
            confirmText: '去查看',
            success: (res) => {
              if (res.confirm) {
                wx.navigateTo({ url: '/pkg-user/service-chat/service-chat?orderId=' + this.data.orderId })
              }
            },
          })
        }
        return
      }
    } catch (_) {}
    if (attempt < 8) {
      setTimeout(() => this._confirmPayment(attempt + 1), 1000)
    } else {
      this.setData({ confirming: false })
      wx.showModal({
        title: '支付结果确认中',
        content: '支付结果尚未同步，请稍后在订单列表或消息通知中查看，系统不会重复扣款。',
        showCancel: false,
      })
    }
  },

  async _loadInviteStats() {
    try {
      const { AuthUtil } = require('../../utils/auth')
      if (!AuthUtil.isLoggedIn()) return
      const data = await get('/api/v1/mp/mine/overview', {}, { auth: true, showError: false })
      this.setData({
        inviteCount: Number(data && data.inviteCount) || 0,
        inviteDays: 0,
      })
    } catch (_) { /* ignore */ }
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
    wx.redirectTo({ url: '/pkg-trade/order-list/order-list' })
  },

  goOrderDetail() {
    if (!this.data.paymentConfirmed) {
      wx.showToast({ title: '支付结果确认中，请稍候', icon: 'none' })
      return
    }
    wx.redirectTo({ url: `/pkg-trade/order-detail/order-detail?id=${this.data.orderId}` })
  },

  goAppointments() {
    wx.redirectTo({ url: '/pkg-user/my-appointments/my-appointments' })
  },

  goCoupons() {
    wx.navigateTo({ url: '/pkg-user/coupon-list/coupon-list' })
  },

  goResources() {
    wx.navigateTo({ url: '/pages/resources/resources' })
  },

  goShare() {
    wx.navigateTo({ url: '/pages/share/share' })
  },

  goJoin() {
    wx.navigateTo({ url: '/pages/join/join' })
  },

  goService() {
    wx.navigateTo({ url: '/pkg-user/service-chat/service-chat' })
  },

  goLater() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/mine/mine' }) })
  },

  goPayAgain() {
    if (this.data.orderId) {
      wx.redirectTo({ url: `/pkg-trade/order-detail/order-detail?id=${this.data.orderId}` })
      return
    }
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/shop/shop' }) })
  },

  goProduct(e) {
    wx.navigateTo({ url: `/pages/product-detail/product-detail?id=${e.currentTarget.dataset.id}` })
  },
})
