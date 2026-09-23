// pkg-trade/order-detail — 对齐 prototypes-warm/order.html ④

const orderService = require('../../services/order')
const { AuthUtil } = require('../../utils/auth')
const { requestPayment } = require('../../utils/payment')

const STATUS_MAP = {
  pending_payment: { text: '待付款', desc: '订单已创建，请完成支付' },
  paid: { text: '待发货', desc: '商家正在准备发货' },
  shipped: { text: '待收货', desc: '订单已发货，请查看发货信息' },
  completed: { text: '已完成', desc: '交易已完成' },
  closed: { text: '已关闭', desc: '订单已关闭' },
  refunding: { text: '退款中', desc: '退款处理中' },
  refunded: { text: '已退款', desc: '退款已完成' },
}

const VIRTUAL_STATUS_MAP = {
  pending_payment: { text: '待付款', desc: '订单已创建，请完成支付' },
  paid: { text: '已开通', desc: '数字内容已交付，阅读权限已生效。换设备登录同一微信即可继续阅读。' },
  shipped: { text: '已交付', desc: '数字内容已交付，阅读权限永久有效。换设备登录同一微信即可继续阅读。' },
  completed: { text: '已完成', desc: '数字内容已交付，阅读权限永久有效。换设备登录同一微信即可继续阅读。' },
  closed: { text: '已关闭', desc: '订单已关闭' },
  refunding: { text: '退款中', desc: '退款处理中' },
  refunded: { text: '已退款', desc: '退款已完成' },
}

function formatPayMethod(raw) {
  if (!raw) return ''
  const s = String(raw).toLowerCase()
  if (s === 'wechat' || s === 'wx' || s === 'wechat_pay' || /微信/.test(raw)) {
    return '微信支付 · 零钱'
  }
  return raw
}

Page({
  data: {
    id: '',
    order: null,
    loading: true,
    STATUS_MAP,
    statusIcon: '',
    showBottomBar: false,
    paying: false,
    isVirtual: false,
    payMethodLabel: '',
    activatedAt: '',
    showRefundModal: false,
    refundReason: '',
  },

  onLoad(options) {
    if (!AuthUtil.requireLoginForAction('查看订单', {
      onSuccess: () => this._initializePage(options),
    })) return
    this._initializePage(options)
  },

  _initializePage(options) {
    const id = options.id
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    this.setData({ id })
    this._loadDetail(id)
    if (options.action === 'pay') {
      setTimeout(() => this._doPay(), 1000)
    }
  },

  _loadDetail(id) {
    this.setData({ loading: true })
    orderService.getOrderDetail(id)
      .then((res) => {
        const order = res.order || res
        order.order_no = order.order_no || order.orderNo
        order.total_amount = order.total_amount || order.totalAmount
        order.pay_amount = order.pay_amount || order.payAmount
        order.discount_amount = order.discount_amount || order.discountAmount
        order.freight_amount = order.freight_amount || order.freightAmount
        order.created_at = order.created_at || order.createdAt
        order.paid_at = order.paid_at || order.paidAt
        order.shipped_at = order.shipped_at || order.shippedAt
        order.fulfillment_type = order.fulfillment_type || order.fulfillmentType
        order.shipping_company = order.shipping_company || order.logisticsCompany
        order.shipping_no = order.shipping_no || order.logisticsNo
        order.virtual_delivery_content = order.virtual_delivery_content || order.virtualDeliveryContent
        order.payment_method = order.payment_method || order.paymentMethod
        order.transaction_id = order.transaction_id || order.transactionId
        order.address = order.address || order.addressSnapshot
        if (order.address) {
          order.address.detail = order.address.detail || order.address.address
        }
        const productType = String(order.productType || order.product_type || '').toLowerCase()
        const deliveryMode = String(order.deliveryMode || order.delivery_mode || '').toLowerCase()
        const isVirtual = order.fulfillment_type === 'virtual'
          || ['digital', 'ebook', 'column', 'course', 'membership', 'member', 'virtual'].includes(productType)
          || deliveryMode === 'auto' || deliveryMode === 'virtual' || deliveryMode === 'digital'
          || !!String(order.virtual_delivery_content || '').trim()
        if (Array.isArray(order.items)) {
          order.items = order.items.map((item) => ({
            ...item,
            product_id: item.product_id || item.productId,
            sku_id: item.sku_id || item.skuId,
            product_name: item.product_name || item.productName,
            sku_name: item.sku_name || item.skuName,
            product_image: item.product_image || item.productImage,
          }))
        }
        const statusMap = isVirtual ? { ...STATUS_MAP, ...VIRTUAL_STATUS_MAP } : STATUS_MAP
        const st = order.status
        const statusIcon = (st === 'completed' || (isVirtual && (st === 'paid' || st === 'shipped'))) ? '✓' : ''
        const payMethodLabel = formatPayMethod(order.payment_method)
          || (order.paid_at ? '微信支付 · 零钱' : '')
        const activatedAt = isVirtual && (st === 'paid' || st === 'shipped' || st === 'completed')
          ? (order.shipped_at || order.paid_at || '')
          : ''
        const showBottomBar = st === 'pending_payment'
          || (!isVirtual && (st === 'paid' || st === 'shipped'))

        this.setData({
          order,
          loading: false,
          isVirtual,
          STATUS_MAP: statusMap,
          statusIcon,
          payMethodLabel,
          activatedAt,
          showBottomBar,
        })
      })
      .catch(() => {
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  onPayTap() {
    this._doPay()
  },

  _doPay() {
    if (this.data.paying) return
    this.setData({ paying: true })
    orderService.payOrder(this.data.id)
      .then((res) => requestPayment(res).then(() => res))
      .then((res) => {
        this.setData({ paying: false })
        const free = res && (res.free === true || res.free === 'true')
        wx.showToast({ title: free ? '领取成功' : '支付成功', icon: 'success' })
        setTimeout(() => this._loadDetail(this.data.id), 600)
      })
      .catch((err) => {
        this.setData({ paying: false })
        const canceled = err && /cancel/i.test(err.errMsg || '')
        wx.showToast({ title: canceled ? '已取消支付' : ((err && err.message) || '支付失败，请重试'), icon: 'none' })
      })
  },

  onCancelTap() {
    wx.showModal({
      title: '提示',
      content: '确定要取消该订单吗？',
      success: (res) => {
        if (res.confirm) {
          orderService.cancelOrder(this.data.id)
            .then(() => {
              wx.showToast({ title: '已取消', icon: 'success' })
              this._loadDetail(this.data.id)
            })
            .catch(() => wx.showToast({ title: '取消失败', icon: 'none' }))
        }
      },
    })
  },

  onConfirmTap() {
    wx.showModal({
      title: '提示',
      content: '确认本订单已经完成？',
      success: (res) => {
        if (res.confirm) {
          orderService.confirmOrder(this.data.id)
            .then(() => {
              wx.showToast({ title: '已确认完成', icon: 'success' })
              this._loadDetail(this.data.id)
            })
            .catch(() => wx.showToast({ title: '操作失败', icon: 'none' }))
        }
      },
    })
  },

  onRefundTap() {
    this.setData({ showRefundModal: true, refundReason: '' })
  },

  onRefundReasonInput(e) {
    this.setData({ refundReason: e.detail.value })
  },

  onRefundConfirm() {
    if (!this.data.refundReason.trim()) {
      wx.showToast({ title: '请填写退款原因', icon: 'none' })
      return
    }
    orderService.refundOrder(this.data.id, { reason: this.data.refundReason })
      .then(() => {
        this.setData({ showRefundModal: false })
        wx.showToast({ title: '已提交退款申请', icon: 'success' })
        this._loadDetail(this.data.id)
      })
      .catch(() => wx.showToast({ title: '申请失败', icon: 'none' }))
  },

  onRefundCancel() {
    this.setData({ showRefundModal: false })
  },

  onCopyOrderNo() {
    wx.setClipboardData({
      data: String(this.data.order.order_no || this.data.order.id || ''),
      success: () => wx.showToast({ title: '已复制', icon: 'success' }),
    })
  },

  onCopyText(e) {
    const text = e.currentTarget.dataset.text
    if (!text) return
    wx.setClipboardData({
      data: String(text),
      success: () => wx.showToast({ title: '已复制', icon: 'success' }),
    })
  },

  onCopyShippingNotice() {
    const content = this.data.order.virtual_delivery_content || ''
    if (!content) return
    wx.setClipboardData({
      data: content,
      success: () => wx.showToast({ title: '发货说明已复制', icon: 'success' }),
    })
  },

  onContactTap() {
    wx.navigateTo({ url: '/pkg-user/service-chat/service-chat' })
  },

  onInvoiceTap() {
    const id = this.data.id || ''
    wx.navigateTo({
      url: '/pkg-user/service-chat/service-chat' + (id ? `?orderId=${id}` : ''),
    })
  },
})
