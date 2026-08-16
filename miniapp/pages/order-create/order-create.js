// pages/order-create/order-create.js — 订单创建页
// 地址选择、商品确认、提交订单

const orderService = require('../../services/order')
const { AuthUtil } = require('../../utils/auth')
const { StorageUtil } = require('../../utils/storage')
const { requestPayment } = require('../../utils/payment')

function readWalletBalance() {
  const user = AuthUtil.getUserInfo() || {}
  const app = getApp()
  const gUser = (app && app.globalData && app.globalData.userInfo) || {}
  const raw = user.balance != null ? user.balance : gUser.balance
  const n = parseFloat(raw)
  return (Number.isFinite(n) ? n : 0).toFixed(2)
}

Page({
  data: {
    // 来源
    from: '', // 'cart' | 'buy_now'

    // 商品列表
    items: [],
    totalPrice: '0.00',
    totalQuantity: 0,

    // 收货地址
    address: null,
    addressId: '',
    hasAddress: false,

    // 备注
    remark: '',

    // 提交状态
    submitting: false,
    paying: false,
    showPaySheet: false,
    pendingOrder: null,
    isVirtual: true,
    payAmount: '0.00',
    payMethod: 'wechat',
    walletBalance: '0.00',
  },

  onLoad(options) {
    if (!AuthUtil.requireLoginForAction('创建订单', {
      onSuccess: () => this._initializePage(options),
    })) return
    this._initializePage(options)
  },

  _initializePage(options) {
    const from = options.from || 'cart'
    this.setData({ from })

    if (options.items) {
      try {
        const items = JSON.parse(decodeURIComponent(options.items))
        // 商城仅售实物：始终需要收货地址
        this.setData({ items, isVirtual: false, hasAddress: false })
        this._calcTotal()
      } catch (e) {
        wx.showToast({ title: '参数错误', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 1500)
        return
      }
    }

    if (!this.data.isVirtual) this._loadDefaultAddress()
  },

  /** 计算总价 */
  _calcTotal() {
    let totalPrice = 0
    let totalQuantity = 0
    this.data.items.forEach((item) => {
      totalPrice += (parseFloat(item.price) || 0) * (item.quantity || 0)
      totalQuantity += item.quantity || 0
    })
    this.setData({
      totalPrice: totalPrice.toFixed(2),
      totalQuantity,
      payAmount: this._calcPay(totalPrice.toFixed(2)),
    })
  },

  _calcPay(total) {
    return (parseFloat(total) || 0).toFixed(2)
  },

  /** 加载默认收货地址 */
  _loadDefaultAddress() {
    // 从本地缓存读取默认地址（地址管理页写入）
    const addressList = StorageUtil.get('addressList') || []
    const defaultAddr = addressList.find((a) => a.is_default) || addressList[0]
    if (defaultAddr) {
      this.setData({
        address: defaultAddr,
        addressId: defaultAddr.id,
        hasAddress: true,
      })
    }
  },

  /** 选择地址 */
  onSelectAddress() {
    wx.navigateTo({
      url: '/pkg-user/address-list/address-list?mode=select',
      events: {
        selectAddress: (data) => {
          this.setData({
            address: data,
            addressId: data.id,
            hasAddress: true,
          })
        },
      },
    })
  },

  /** 备注 */
  onRemarkInput(e) {
    this.setData({ remark: e.detail.value })
  },

  /** 提交订单 */
  onSubmitOrder() {
    if (this.data.submitting) return

    if (!this.data.isVirtual && !this.data.hasAddress) {
      wx.showToast({ title: '请选择收货地址', icon: 'none' })
      return
    }

    if (this.data.items.length === 0) {
      wx.showToast({ title: '没有商品', icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    const orderItems = this.data.items.map((item) => ({
      productId: item.productId || item.product_id,
      skuId: item.skuId || item.sku_id || undefined,
      quantity: item.quantity,
      cart_id: this.data.from === 'cart' ? (item.id || '') : '',
    }))

    const addr = this.data.address || {}
    const data = {
      items: orderItems,
      remark: this.data.remark,
      addressSnapshot: this.data.isVirtual
        ? null
        : {
            name: addr.name || addr.userName || addr.receiver || '微信用户',
            phone: addr.phone || addr.mobile || addr.tel || '13800000000',
            province: addr.province || '',
            city: addr.city || '',
            district: addr.district || addr.county || '',
            address: addr.address || addr.detail || addr.detailAddress || '',
            postalCode: addr.postalCode || addr.postal_code || '',
          },
    }

    orderService.createOrder(data)
      .then((res) => {
        const orderId = res.order_id || res.id
        const orderNo = res.orderNo || res.order_no || String(orderId)
        const amount = res.payAmount || res.pay_amount || this.data.totalPrice
        this.setData({
          submitting: false,
          payAmount: Number(amount).toFixed(2),
          walletBalance: readWalletBalance(),
          showPaySheet: true,
          pendingOrder: {
            id: orderId,
            orderNo,
            amount: Number(amount).toFixed(2),
            name: (this.data.items[0] && (this.data.items[0].product_name || this.data.items[0].name)) || '知识商品',
            productId: (this.data.items[0] && (this.data.items[0].productId || this.data.items[0].product_id)) || '',
            type: (this.data.items[0] && (this.data.items[0].productType || this.data.items[0].product_type)) || 'physical',
          },
        })
      })
      .catch(() => {
        this.setData({ submitting: false })
        wx.showToast({ title: '创建订单失败', icon: 'none' })
      })
  },

  onPayClose() {
    this.setData({ showPaySheet: false })
    const o = this.data.pendingOrder
    if (o && o.id) {
      wx.redirectTo({ url: `/pkg-trade/order-detail/order-detail?id=${o.id}` })
    }
  },

  onPayConfirm(e) {
    if (this.data.paying) return
    const detail = (e && e.detail) || {}
    const method = detail.method || 'wechat'
    this.setData({ payMethod: method })

    if (method === 'balance') {
      this._handleBalancePay(detail)
      return
    }
    this._doWechatPay()
  },

  _handleBalancePay(detail) {
    const amount = parseFloat(detail.amount != null ? detail.amount : this.data.payAmount) || 0
    const balance = parseFloat(detail.balance != null ? detail.balance : this.data.walletBalance) || 0
    if (balance < amount) {
      wx.showModal({
        title: '余额不足',
        content: `当前可用余额 ¥${balance.toFixed(2)}，本单需支付 ¥${amount.toFixed(2)}。可改用微信支付，或前往充值后再试。`,
        confirmText: '微信支付',
        cancelText: '去充值',
        success: (res) => {
          if (res.confirm) {
            const sheet = this.selectComponent('#pay-sheet')
            if (sheet && sheet.switchToWechat) sheet.switchToWechat()
            this._doWechatPay()
          } else if (res.cancel) {
            this._goRecharge()
          }
        },
      })
      return
    }
    // 后端暂未开通余额扣款，充足时也引导微信，避免误以为已扣款
    wx.showModal({
      title: '提示',
      content: '余额支付暂未开通，请使用微信支付完成付款。',
      confirmText: '微信支付',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          const sheet = this.selectComponent('#pay-sheet')
          if (sheet && sheet.switchToWechat) sheet.switchToWechat()
          this._doWechatPay()
        }
      },
    })
  },

  _goRecharge() {
    this.setData({ showPaySheet: false })
    const o = this.data.pendingOrder
    wx.showToast({ title: '充值入口即将开放', icon: 'none' })
    setTimeout(() => {
      if (o && o.id) {
        wx.redirectTo({ url: `/pkg-trade/order-detail/order-detail?id=${o.id}` })
      }
    }, 500)
  },

  _doWechatPay() {
    if (this.data.paying) return
    const o = this.data.pendingOrder || {}
    if (!o.id) {
      wx.showToast({ title: '订单信息异常，请重新下单', icon: 'none' })
      return
    }
    this.setData({ paying: true, payMethod: 'wechat' })
    orderService.payOrder(o.id)
      .then((params) => requestPayment(params))
      .then(() => {
        this.setData({ paying: false, showPaySheet: false })
        wx.redirectTo({
          url: `/pkg-trade/order-paid/order-paid?orderId=${o.id}&orderNo=${encodeURIComponent(o.orderNo || '')}&amount=${o.amount || this.data.payAmount}&name=${encodeURIComponent(o.name || '')}&productId=${o.productId || ''}&type=${o.type || 'physical'}`,
        })
      })
      .catch((err) => {
        this.setData({ paying: false })
        const canceled = err && /cancel/i.test(err.errMsg || '')
        wx.showToast({
          title: canceled ? '已取消支付' : ((err && err.message) || '支付失败，请重试'),
          icon: 'none',
        })
      })
  },
})
