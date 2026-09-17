// pages/order-create/order-create.js — 订单创建页
// 地址选择、商品确认、提交订单

const orderService = require('../../services/order')
const { AuthUtil } = require('../../utils/auth')
const { StorageUtil } = require('../../utils/storage')
const { requestPayment } = require('../../utils/payment')
const { requestOrderSubscribe } = require('../../utils/subscribe')
const { WARM_PAGE_STYLE } = require('../../data/warm-source')

function readWalletBalance() {
  const user = AuthUtil.getUserInfo() || {}
  const app = getApp()
  const gUser = (app && app.globalData && app.globalData.userInfo) || {}
  const raw = user.balance != null ? user.balance : gUser.balance
  const n = parseFloat(raw)
  return (Number.isFinite(n) ? n : 0).toFixed(2)
}

function itemName(item) {
  return String((item && (item.product_name || item.productName || item.name)) || '')
}

Page({
  data: {
    themePageStyle: WARM_PAGE_STYLE,
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
    userCouponId: '',
    couponName: '',
    couponLabel: '',
    couponType: '',
    couponValue: '',
    discountAmount: '0.00',
    agreedVirtual: true,
    // 暖阁虚拟商品展示
    virtualSubtitle: '',
    originalPrice: '',
    memberSaveText: '',
    memberSubText: '',
    couponAmount: '0.00',
    beansAmount: '0.00',
    beansLabel: '',
    beansOn: false,
    showWarmVirtual: false,
    isPay1: false,
    isWarmEbook: false,
  },

  _isVirtualItem(item) {
    if (!item) return false
    const type = String(item.productType || item.product_type || item.type || '').toLowerCase()
    const mode = String(item.deliveryMode || item.delivery_mode || '').toLowerCase()
    if (['digital', 'ebook', 'column', 'course', 'membership', 'member', 'virtual', 'resource_pack'].includes(type)) {
      return true
    }
    if (mode === 'auto' || mode === 'virtual' || mode === 'digital' || mode === 'auto_fulfill') return true
    return false
  },

  _isPay1(items) {
    const first = (items && items[0]) || {}
    if (first.demoKey === 'pay1' || first.demo === 'pay1') return true
    try {
      const { isPay1Name } = require('../../utils/pay1-product')
      if (isPay1Name(itemName(first))) return true
    } catch (e) { /* ignore */ }
    const name = itemName(first)
    const price = parseFloat(first.price)
    return price === 1 && /体验包|支付体验/.test(name)
  },

  _isWarmEbook(items) {
    const first = (items && items[0]) || {}
    const name = itemName(first)
    const type = String(first.productType || first.product_type || first.type || '').toLowerCase()
    return /内容生意手册/.test(name) || type === 'ebook'
  },

  /** 暖阁虚拟确认页：对齐 prototypes-warm/order.html；pay1 保 ¥1，电子书走 DEMO_ORDER */
  _applyWarmVirtualDefaults(items) {
    if (!items || !items.length) {
      this.setData({ showWarmVirtual: false, isPay1: false, isWarmEbook: false })
      return
    }
    const isPay1 = this._isPay1(items)
    const isWarmEbook = this._isWarmEbook(items)
    const { DEMO_ORDER, DEMO_PAY1 } = require('../../data/warm-demo')
    const first = items[0] || {}

    // 所有暖阁数字商品：会员条 + 暖豆行（视觉对齐原型）
    const patch = {
      showWarmVirtual: true,
      isPay1,
      isWarmEbook,
      memberSaveText: '开通会员再买省 ¥8',
      memberSubText: isPay1
        ? '会员价更低 · 另解锁资料库'
        : '会员价 ¥31 · 另解锁 128 份资料',
      beansLabel: '2,480 豆可抵 ¥2.4',
      beansAmount: isPay1 ? '0.00' : (DEMO_ORDER.beans || '2.40'),
      beansOn: true,
    }

    if (isWarmEbook && !isPay1) {
      const demoPriceNum = parseFloat(DEMO_ORDER.price) || 39
      const demoPriceLabel = Number.isInteger(demoPriceNum) ? String(demoPriceNum) : demoPriceNum.toFixed(2)
      const origin = first.originalPrice || first.original_price || DEMO_ORDER.original || '79'
      Object.assign(patch, {
        virtualSubtitle: DEMO_ORDER.subtitle || '虚拟商品 · EPUB / PDF · 12 万字',
        originalPrice: String(origin).replace(/\.0+$/, ''),
        couponName: this.data.couponName || '新人券',
        couponLabel: this.data.couponLabel || '-¥5 新人券',
        couponValue: this.data.couponValue || DEMO_ORDER.coupon || '5.00',
        couponType: this.data.couponType || 'fixed',
        couponAmount: DEMO_ORDER.coupon || '5.00',
      })
      if (items[0]) {
        items[0].price = demoPriceLabel
        if (!items[0].product_name && !items[0].productName && !items[0].name) {
          items[0].name = DEMO_ORDER.productName
        }
        if (!items[0].quantity) items[0].quantity = 1
      }
    } else if (isPay1) {
      // pay1：展示暖阁壳，金额锁定 ¥1（券/豆仅示意，不改实付）
      const origin = first.originalPrice || first.original_price || (DEMO_PAY1 && DEMO_PAY1.original) || '9.9'
      Object.assign(patch, {
        virtualSubtitle: (DEMO_PAY1 && DEMO_PAY1.metaLine) || '虚拟商品 · 支付后立即开通 · 实付 ¥1',
        originalPrice: String(origin).replace(/\.0+$/, ''),
        couponName: this.data.couponName || '',
        couponLabel: this.data.couponLabel || '-¥5 新人券',
        couponValue: this.data.couponValue || '5.00',
        couponType: this.data.couponType || 'fixed',
        couponAmount: '0.00',
      })
      if (items[0]) {
        items[0].price = '1'
        if (!items[0].quantity) items[0].quantity = 1
      }
    } else {
      // 其它虚拟：暖阁壳 + 暖豆行示意；不覆盖真实价、不伪造抵扣金额
      const type = String(first.productType || first.product_type || first.type || '').toLowerCase()
      Object.assign(patch, {
        virtualSubtitle: type === 'column' ? '虚拟商品 · 专栏' : '虚拟商品 · 数字内容',
        originalPrice: String(first.originalPrice || first.original_price || '').replace(/\.0+$/, ''),
        beansOn: false,
        beansAmount: '0.00',
        beansLabel: '2,480 豆可抵 ¥2.4',
        couponAmount: '0.00',
      })
    }

    this.setData({ ...patch, items })
  },

  onLoad(options) {
    this.setData({ themePageStyle: WARM_PAGE_STYLE })
    if (!AuthUtil.requireLoginForAction('创建订单', {
      onSuccess: () => this._initializePage(options),
    })) return
    this._initializePage(options)
  },

  _initializePage(options) {
    const from = options.from || 'cart'
    const userCouponId = options.userCouponId ? decodeURIComponent(options.userCouponId) : ''
    const couponName = options.couponName ? decodeURIComponent(options.couponName) : ''
    const couponLabel = options.couponLabel ? decodeURIComponent(options.couponLabel) : ''
    const couponType = options.couponType ? decodeURIComponent(options.couponType) : ''
    const couponValue = options.couponValue != null && options.couponValue !== ''
      ? decodeURIComponent(options.couponValue)
      : ''
    this.setData({
      from,
      userCouponId,
      couponName,
      couponLabel,
      couponType,
      couponValue,
      themePageStyle: WARM_PAGE_STYLE,
    })

    if (options.items) {
      try {
        const items = JSON.parse(decodeURIComponent(options.items))
        const isVirtual = Array.isArray(items) && items.length > 0
          ? items.every((it) => this._isVirtualItem(it))
          : false
        this.setData({ items, isVirtual, hasAddress: false, agreedVirtual: true })
        if (isVirtual) this._applyWarmVirtualDefaults(items)
        this._calcTotal()
      } catch (e) {
        wx.showToast({ title: '参数错误', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 1500)
        return
      }
    }

    if (!this.data.isVirtual) this._loadDefaultAddress()
  },

  onToggleAgree() {
    this.setData({ agreedVirtual: !this.data.agreedVirtual })
  },

  /** 计算总价 */
  _calcTotal() {
    let totalPrice = 0
    let totalQuantity = 0
    this.data.items.forEach((item) => {
      totalPrice += (parseFloat(item.price) || 0) * (item.quantity || 0)
      totalQuantity += item.quantity || 0
    })
    // pay1：实付锁定 ¥1（券/豆仅 UI 示意）
    if (this.data.isPay1) {
      this.setData({
        totalPrice: totalPrice.toFixed(2),
        totalQuantity,
        discountAmount: '0.00',
        couponAmount: '0.00',
        payAmount: '1.00',
      })
      return
    }
    const coupon = this._estimateDiscount(totalPrice)
    const beans = this.data.beansOn ? (parseFloat(this.data.beansAmount) || 0) : 0
    let pay = Math.max(0, totalPrice - coupon - beans)
    // 暖阁电子书演示：实付以 DEMO_ORDER.pay（¥31.60）为准
    if (this.data.isWarmEbook && this.data.beansOn && !this.data.userCouponId) {
      const { DEMO_ORDER } = require('../../data/warm-demo')
      const demoPay = parseFloat(DEMO_ORDER && DEMO_ORDER.pay)
      if (Number.isFinite(demoPay)) pay = demoPay
    }
    this.setData({
      totalPrice: totalPrice.toFixed(2),
      totalQuantity,
      discountAmount: coupon.toFixed(2),
      couponAmount: coupon.toFixed(2),
      payAmount: pay.toFixed(2),
    })
  },

  _estimateDiscount(total) {
    if (this.data.isPay1) return 0
    // 仅电子书演示壳：无真实券时按原型展示 -¥5
    if (this.data.isWarmEbook && !this.data.userCouponId) {
      const warm = parseFloat(this.data.couponValue || this.data.couponAmount || 5) || 5
      return Math.min(warm, total)
    }
    if (!this.data.userCouponId && !this.data.couponValue && !this.data.couponLabel) return 0
    const type = String(this.data.couponType || '').toLowerCase()
    const value = Number(this.data.couponValue)
    if (Number.isFinite(value) && value > 0) {
      if (type === 'percent' || type === 'discount') {
        const rate = value > 1 ? value / 10 : value
        return Math.max(0, Number((total - total * rate).toFixed(2)))
      }
      return Math.min(value, total)
    }
    if (!this.data.couponLabel) return 0
    const label = String(this.data.couponLabel)
    const m = label.match(/¥\s*([\d.]+)/)
    if (m) {
      const v = parseFloat(m[1]) || 0
      return Math.min(v, total)
    }
    return 0
  },

  onToggleBeans() {
    if (!this.data.showWarmVirtual) return
    this.setData({ beansOn: !this.data.beansOn }, () => this._calcTotal())
  },

  _calcPay(total, discount) {
    const pay = (parseFloat(total) || 0) - (parseFloat(discount) || 0)
    return (pay > 0 ? pay : 0).toFixed(2)
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

  onGoMember() {
    wx.navigateTo({
      url: '/pkg-user/member-center/member-center',
      fail: () => {
        wx.navigateTo({
          url: '/pages/member-center/member-center',
          fail: () => wx.showToast({ title: '暂时打不开会员中心', icon: 'none' }),
        })
      },
    })
  },

  onSelectCoupon() {
    // 演示路径仅展示优惠券文案；真实券走商品详情带入的 userCouponId
    if ((this.data.isWarmEbook || this.data.isPay1) && !this.data.userCouponId) {
      wx.showToast({ title: this.data.isPay1 ? '体验包暂不支持用券' : '已选用新人券', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: '/pkg-user/coupon-list/coupon-list?mode=select',
      fail: () => wx.showToast({ title: '暂无更多优惠券', icon: 'none' }),
    })
  },

  /** 提交订单 */
  onSubmitOrder() {
    if (this.data.submitting) return

    if (!this.data.isVirtual && !this.data.hasAddress) {
      wx.showToast({ title: '请选择收货地址', icon: 'none' })
      return
    }

    if (this.data.isVirtual && !this.data.agreedVirtual) {
      wx.showToast({ title: '请先勾选虚拟商品购买协议', icon: 'none' })
      return
    }

    if (this.data.items.length === 0) {
      wx.showToast({ title: '没有商品', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    this._ensureItemProductIds(this.data.items)
      .then((items) => this._doCreateOrder(items))
      .catch((err) => {
        this.setData({ submitting: false })
        const msg = (err && err.message) || '创建订单失败'
        wx.showToast({ title: msg, icon: 'none', duration: 2800 })
      })
  },

  /** demo=pay1 / 空 id 时解析真实 productId（后端 smoke 可补种） */
  _ensureItemProductIds(items) {
    const { isPay1Name, hasValidProductId, resolvePay1ProductId } = require('../../utils/pay1-product')
    const rows = (items || []).map((it) => Object.assign({}, it))
    const needResolve = rows.some((it) => {
      const pid = it.productId || it.product_id
      if (hasValidProductId(pid)) return false
      return isPay1Name(it.product_name || it.productName || it.name)
    })
    if (!needResolve) {
      const missing = rows.find((it) => !hasValidProductId(it.productId || it.product_id))
      if (missing) {
        return Promise.reject({ message: '商品ID无效，请从商城重新进入下单' })
      }
      return Promise.resolve(rows)
    }
    return resolvePay1ProductId()
      .then((id) => {
        if (!hasValidProductId(id)) {
          return Promise.reject({
            message: '体验包未入库，请稍后重试或联系运营补种商品',
          })
        }
        rows.forEach((it) => {
          if (!hasValidProductId(it.productId || it.product_id)
            && isPay1Name(it.product_name || it.productName || it.name)) {
            it.productId = id
            it.product_id = id
          }
        })
        this.setData({ items: rows })
        return rows
      })
      .catch((err) => {
        if (err && err.message && (err.code === 'PAY1_UNDEPLOYED' || err.code === 'PAY1_MISSING')) {
          return Promise.reject({ message: err.message })
        }
        return Promise.reject(err && err.message
          ? err
          : { message: '体验包未入库，请稍后重试或联系运营补种商品' })
      })
  },

  _doCreateOrder(items) {
    const orderItems = items.map((item) => ({
      productId: Number(item.productId || item.product_id),
      skuId: item.skuId || item.sku_id || undefined,
      quantity: item.quantity || 1,
      cart_id: this.data.from === 'cart' ? (item.id || '') : '',
    }))

    const addr = this.data.address || {}
    const data = {
      items: orderItems,
      remark: this.data.remark,
      userCouponId: this.data.userCouponId ? Number(this.data.userCouponId) : undefined,
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

    return orderService.createOrder(data)
      .then((res) => {
        const orderId = res.order_id || res.id
        const orderNo = res.orderNo || res.order_no || String(orderId)
        // payAmount 可能为 0（券后/免费），不能用 || 回退到原价
        const rawAmount = res.payAmount != null
          ? res.payAmount
          : (res.pay_amount != null ? res.pay_amount : this.data.payAmount)
        const amountNum = Number(rawAmount)
        const amountStr = (Number.isFinite(amountNum) ? amountNum : 0).toFixed(2)
        const pendingOrder = {
          id: orderId,
          orderNo,
          amount: amountStr,
          name: (items[0] && (items[0].product_name || items[0].name)) || '知识商品',
          productId: (items[0] && (items[0].productId || items[0].product_id)) || '',
          type: (items[0] && (items[0].productType || items[0].product_type)) || 'physical',
        }
        this.setData({
          submitting: false,
          payAmount: amountStr,
          walletBalance: readWalletBalance(),
          pendingOrder,
          showPaySheet: amountNum > 0,
        })
        // 实付 0 元：不弹微信支付，直接走免支付完成
        if (amountNum <= 0) {
          this._doWechatPay()
        }
      })
      .catch((err) => {
        this.setData({ submitting: false })
        const msg = (err && err.message) || '创建订单失败'
        wx.showToast({ title: msg, icon: 'none', duration: 2800 })
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
    requestOrderSubscribe()
      .then(() => orderService.payOrder(o.id))
      .then((params) => requestPayment(params))
      .then(() => {
        this.setData({ paying: false, showPaySheet: false })
        const paidAmount = o.amount != null && o.amount !== '' ? o.amount : this.data.payAmount
        wx.redirectTo({
          url: `/pkg-trade/order-paid/order-paid?orderId=${o.id}&orderNo=${encodeURIComponent(o.orderNo || '')}&amount=${paidAmount}&name=${encodeURIComponent(o.name || '')}&productId=${o.productId || ''}&type=${o.type || 'physical'}`,
        })
      })
      .catch((err) => {
        this.setData({ paying: false })
        const canceled = err && /cancel/i.test(err.errMsg || '')
        const oid = o.id || ''
        const ono = encodeURIComponent(o.orderNo || '')
        const code = canceled ? 'PAY_CANCELED' : 'PAY_FAILED'
        const reason = encodeURIComponent(canceled ? '用户取消支付' : ((err && err.errMsg) || '支付失败'))
        wx.redirectTo({
          url: `/pkg-trade/order-paid/order-paid?status=fail&orderId=${oid}&orderNo=${ono}&amount=${o.amount || this.data.payAmount || ''}&name=${encodeURIComponent(o.name || '')}&productId=${o.productId || ''}&type=${o.type || 'physical'}&code=${code}&reason=${reason}`,
        })
      })
  },
})
