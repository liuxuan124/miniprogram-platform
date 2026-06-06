// pages/order-detail/order-detail.js — 订单详情页
// 状态追踪、操作按钮、微信支付

const orderService = require('../../services/order')
const auth = require('../../utils/auth')

// 状态显示映射
const STATUS_MAP = {
  pending_payment: { text: '待确认', color: '#ff8a00', desc: '订单已提交，顾问将联系确认交付与付款方式' },
  paid: { text: '待发货', color: '#1890ff', desc: '商家正在准备发货' },
  shipped: { text: '待收货', color: '#faad14', desc: '商品正在配送中' },
  completed: { text: '已完成', color: '#52c41a', desc: '交易已完成' },
  closed: { text: '已关闭', color: '#999', desc: '订单已关闭' },
  refunding: { text: '退款中', color: '#faad14', desc: '退款处理中' },
  refunded: { text: '已退款', color: '#999', desc: '退款已完成' },
}

// 状态步骤条
const STATUS_STEPS = ['pending_payment', 'paid', 'shipped', 'completed']

Page({
  data: {
    id: '',
    order: null,
    loading: true,
    STATUS_MAP,

    // 步骤条
    currentStep: 0,
    steps: [
      { text: '待确认' },
      { text: '待发货' },
      { text: '待收货' },
      { text: '已完成' },
    ],

    // 退款原因
    showRefundModal: false,
    refundReason: '',

    // 支付状态
    paying: false,
  },

  onLoad(options) {
    if (!auth.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    const id = options.id
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    this.setData({ id })
    this._loadDetail(id)

    // 当前备案与支付绑定完成前，不自动触发支付
    if (options.action === 'pay') {
      setTimeout(() => this._doPay(), 1000)
    }
  },

  /** 加载订单详情 */
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
        order.address = order.address || order.addressSnapshot
        if (order.address) {
          order.address.detail = order.address.detail || order.address.address
        }
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
        // 计算步骤条进度
        let currentStep = 0
        const statusIdx = STATUS_STEPS.indexOf(order.status)
        if (statusIdx >= 0) currentStep = statusIdx
        // 退款/关闭状态特殊处理
        if (order.status === 'refunding' || order.status === 'refunded') {
          currentStep = 1 // 退款发生在已付款后
        }
        if (order.status === 'closed') {
          currentStep = 0
        }
        this.setData({
          order,
          loading: false,
          currentStep,
        })
      })
      .catch(() => {
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  /** 待确认提示 */
  onPayTap() {
    wx.showModal({
      title: '订单已提交',
      content: '小程序正在完成备案与支付绑定，暂不拉起微信支付。顾问会根据订单信息联系你确认交付与付款方式。',
      confirmText: '知道了',
      showCancel: false,
    })
  },

  /** 执行微信支付 */
  _doPay() {
    if (this.data.paying) return
    this.setData({ paying: true })

    orderService.payOrder(this.data.id)
      .then((res) => {
        // 后端返回微信支付参数
        const payParams = res.payment || res.pay_params || res
        if (!payParams.package && payParams.prepayId) {
          payParams.package = 'prepay_id=' + payParams.prepayId
        }
        if (payParams.timeStamp && payParams.nonceStr && payParams.package && payParams.signType && payParams.paySign) {
          // 调用微信支付
          wx.requestPayment({
            timeStamp: payParams.timeStamp,
            nonceStr: payParams.nonceStr,
            package: payParams.package,
            signType: payParams.signType,
            paySign: payParams.paySign,
            success: () => {
              this.setData({ paying: false })
              wx.showToast({ title: '支付成功', icon: 'success' })
              this._loadDetail(this.data.id)
            },
            fail: (err) => {
              this.setData({ paying: false })
              if (err.errMsg.indexOf('cancel') !== -1) {
                wx.showToast({ title: '已取消支付', icon: 'none' })
              } else {
                wx.showToast({ title: '支付失败', icon: 'none' })
              }
            },
          })
        } else {
          // 如果后端直接返回成功（模拟支付或零元订单）
          this.setData({ paying: false })
          wx.showToast({ title: '支付成功', icon: 'success' })
          this._loadDetail(this.data.id)
        }
      })
      .catch(() => {
        this.setData({ paying: false })
        wx.showToast({ title: '支付请求失败', icon: 'none' })
      })
  },

  /** 取消订单 */
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
            .catch(() => {
              wx.showToast({ title: '取消失败', icon: 'none' })
            })
        }
      },
    })
  },

  /** 确认收货 */
  onConfirmTap() {
    wx.showModal({
      title: '提示',
      content: '确认已收到商品？',
      success: (res) => {
        if (res.confirm) {
          orderService.confirmOrder(this.data.id)
            .then(() => {
              wx.showToast({ title: '已确认收货', icon: 'success' })
              this._loadDetail(this.data.id)
            })
            .catch(() => {
              wx.showToast({ title: '操作失败', icon: 'none' })
            })
        }
      },
    })
  },

  /** 打开退款弹窗 */
  onRefundTap() {
    this.setData({ showRefundModal: true, refundReason: '' })
  },

  /** 退款原因输入 */
  onRefundReasonInput(e) {
    this.setData({ refundReason: e.detail.value })
  },

  /** 确认退款 */
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
      .catch(() => {
        wx.showToast({ title: '申请失败', icon: 'none' })
      })
  },

  /** 关闭退款弹窗 */
  onRefundCancel() {
    this.setData({ showRefundModal: false })
  },

  /** 复制订单号 */
  onCopyOrderNo() {
    wx.setClipboardData({
      data: this.data.order.order_no || this.data.order.id,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' })
      },
    })
  },

  /** 拨打电话 */
  onCallTap() {
    wx.makePhoneCall({ phoneNumber: this.data.order.store_phone || '400-000-0000' })
  },
})
