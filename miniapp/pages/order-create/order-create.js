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
  },

  onLoad(options) {
    if (!AuthUtil.requireLoginForAction('创建订单')) return

    const from = options.from || 'cart'
    this.setData({ from })

    // 解析商品列表
    if (options.items) {
      try {
        const items = JSON.parse(decodeURIComponent(options.items))
        this.setData({ items })
        this._calcTotal()
      } catch (e) {
        wx.showToast({ title: '参数错误', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 1500)
        return
      }
    }

    // 加载默认地址
    this._loadDefaultAddress()
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
    })
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

    if (!this.data.hasAddress) {
      wx.showToast({ title: '请选择收货地址', icon: 'none' })
      return
    }

    if (this.data.items.length === 0) {
      wx.showToast({ title: '没有商品', icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    // 构建请求参数
    const orderItems = this.data.items.map((item) => ({
      productId: item.productId || item.product_id,
      skuId: item.skuId || item.sku_id || undefined,
      quantity: item.quantity,
      // 如果从购物车来，传 cart_id 以便后端清除购物车项
      cart_id: this.data.from === 'cart' ? (item.id || '') : '',
    }))

    const addr = this.data.address || {}
    const data = {
      items: orderItems,
      remark: this.data.remark,
      addressSnapshot: {
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
        this.setData({ submitting: false })

        // 如果从购物车来，清除本地购物车选中项
        if (this.data.from === 'cart') {
          // 购物车页会在 onShow 中重新加载
        }

        // 支付绑定完成前先形成订单闭环，不自动拉起微信支付
        wx.redirectTo({
          url: `/pages/order-detail/order-detail?id=${orderId}`,
        })
      })
      .catch(() => {
        this.setData({ submitting: false })
        wx.showToast({ title: '创建订单失败', icon: 'none' })
      })
  },
})
