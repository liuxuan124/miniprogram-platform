// pages/order-create/order-create.js — 订单创建页
// 地址选择、商品确认、提交订单

const orderService = require('../../services/order')
const { AuthUtil } = require('../../utils/auth')
const { StorageUtil } = require('../../utils/storage')
const { requestPayment } = require('../../utils/payment')

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
  },

  onLoad(options) {
    if (!AuthUtil.requireLoginForAction('创建订单')) return

    const from = options.from || 'cart'
    this.setData({ from })

    if (options.items) {
      try {
        const items = JSON.parse(decodeURIComponent(options.items))
        const isVirtual = items.every((it) => {
          const t = it.productType || it.product_type || it.type || ''
          return t === 'digital' || t === 'service' || t === 'ebook' || t === 'consult' || !t
        })
        this.setData({ items, isVirtual, hasAddress: isVirtual })
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
      url: '/pages/address-list/address-list?mode=select',
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
          showPaySheet: true,
          pendingOrder: {
            id: orderId,
            orderNo,
            amount: Number(amount).toFixed(2),
            name: (this.data.items[0] && (this.data.items[0].product_name || this.data.items[0].name)) || '知识商品',
            productId: (this.data.items[0] && (this.data.items[0].productId || this.data.items[0].product_id)) || '',
            type: (this.data.items[0] && (this.data.items[0].productType || this.data.items[0].product_type)) || 'digital',
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
      wx.redirectTo({ url: `/pages/order-detail/order-detail?id=${o.id}` })
    }
  },

  onPayConfirm() {
    if (this.data.paying) return
    const o = this.data.pendingOrder || {}
    if (!o.id) {
      wx.showToast({ title: '订单信息异常，请重新下单', icon: 'none' })
      return
    }
    this.setData({ paying: true })
    orderService.payOrder(o.id)
      .then((params) => requestPayment(params))
      .then(() => {
        this.setData({ paying: false, showPaySheet: false })
        wx.redirectTo({
          url: `/pages/order-paid/order-paid?orderId=${o.id}&orderNo=${encodeURIComponent(o.orderNo || '')}&amount=${o.amount || this.data.payAmount}&name=${encodeURIComponent(o.name || '')}&productId=${o.productId || ''}&type=${o.type || 'digital'}`,
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
