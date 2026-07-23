// pages/order-create/order-create.js — 订单创建页
// 地址选择、商品确认、提交订单

const orderService = require('../../services/order')
const { AuthUtil } = require('../../utils/auth')
const storage = require('../../utils/storage')

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
    showPaySheet: false,
    pendingOrder: null,
    isVirtual: true,
    showCouponSheet: false,
    coupons: [
      { id: 'c1', name: '新人满减券', label: '¥8', desc: '满 50 可用' },
      { id: 'c2', name: '资料包专享', label: '¥20', desc: '满 99 可用' },
    ],
    selectedCouponId: '',
    couponLabel: '选择优惠券',
    couponDiscount: '',
    payAmount: '0.00',
    // 原型对齐：积分 / 发票 / 会员折 / 支付方式
    usePoints: true,
    pointsBalance: 860,
    pointsCanDeduct: '8.60',
    pointsDiscount: '',
    memberDiscount: '',
    invoiceLabel: '个人电子发票',
    payMethod: 'wechat',
    balance: '128.00',
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
    const t = parseFloat(total) || 0
    const couponDisc = this.data.selectedCouponId === 'c1' ? 8 : (this.data.selectedCouponId === 'c2' ? 20 : 0)
    // 100 积分 = ¥1，演示最多抵 8.6
    const pointsDisc = this.data.usePoints ? Math.min(8.6, this.data.pointsBalance / 100) : 0
    const afterCoupon = Math.max(0, t - couponDisc)
    // 会员 9.5 折：对券后金额再折，演示固定按 5%
    const memberDisc = afterCoupon > 0 ? +(afterCoupon * 0.05).toFixed(2) : 0
    const pay = Math.max(0, afterCoupon - pointsDisc - memberDisc)
    this.setData({
      couponDiscount: couponDisc ? couponDisc.toFixed(2) : '',
      couponLabel: couponDisc ? `-¥${couponDisc}` : '选择优惠券',
      pointsCanDeduct: pointsDisc.toFixed(2),
      pointsDiscount: pointsDisc ? pointsDisc.toFixed(2) : '',
      memberDiscount: memberDisc ? memberDisc.toFixed(2) : '',
    })
    return pay.toFixed(2)
  },

  onOpenCoupon() { this.setData({ showCouponSheet: true }) },
  onCouponClose() { this.setData({ showCouponSheet: false }) },
  onCouponPick(e) {
    this.setData({ selectedCouponId: e.detail.id || '' })
  },
  onCouponConfirm() {
    this.setData({
      showCouponSheet: false,
      payAmount: this._calcPay(this.data.totalPrice),
    })
  },

  onTogglePoints() {
    this.setData({ usePoints: !this.data.usePoints })
    this.setData({ payAmount: this._calcPay(this.data.totalPrice) })
  },

  onPickInvoice() {
    wx.showActionSheet({
      itemList: ['个人电子发票', '企业增值税普通发票', '不开发票'],
      success: (res) => {
        const map = ['个人电子发票', '企业增值税普通发票', '不开发票']
        this.setData({ invoiceLabel: map[res.tapIndex] || '个人电子发票' })
      },
    })
  },

  onPickPay(e) {
    const pay = e.currentTarget.dataset.pay || 'wechat'
    this.setData({ payMethod: pay })
  },

  /** 加载默认收货地址 */
  _loadDefaultAddress() {
    // 从本地缓存读取默认地址（地址管理页写入）
    const addressList = storage.get('addressList') || []
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
      url: '/pages/address/address?mode=select',
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
        ? {
            name: '数字商品',
            phone: '13800000000',
            province: '',
            city: '',
            district: '',
            address: '虚拟商品无需邮寄',
            postalCode: '',
          }
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
        this.setData({
          submitting: false,
          showPaySheet: true,
          pendingOrder: {
            id: orderId,
            orderNo,
            amount: this.data.payAmount,
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
    const o = this.data.pendingOrder || {}
    const pay = () => {
      this.setData({ showPaySheet: false })
      wx.redirectTo({
        url: `/pages/order-paid/order-paid?orderId=${o.id || ''}&orderNo=${encodeURIComponent(o.orderNo || '')}&amount=${o.amount || this.data.payAmount}&name=${encodeURIComponent(o.name || '')}&productId=${o.productId || ''}&type=${o.type || 'digital'}`,
      })
    }
    if (o.id && orderService.payOrder) {
      orderService.payOrder(o.id).then(pay).catch(pay)
    } else {
      pay()
    }
  },
})
