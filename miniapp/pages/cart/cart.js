// pages/cart/cart.js — 购物车页面
// 商品列表、数量调整、选中/全选、结算

const cartService = require('../../services/cart')
const auth = require('../../utils/auth')

Page({
  data: {
    cartList: [],
    isAllSelected: false,
    selectedCount: 0,
    selectedPrice: '0.00',
    loading: true,
    isEmpty: false,
  },

  onLoad() {},

  onShow() {
    if (!auth.isLoggedIn()) return
    this._loadCart()
  },

  /** 加载购物车 */
  _loadCart() {
    this.setData({ loading: true })
    cartService.getCartList()
      .then((res) => {
        const list = res.list || res.items || res || []
        const cartList = list.map((item) => ({
          ...item,
          selected: item.selected !== undefined ? item.selected : true,
        }))
        this.setData({
          cartList,
          loading: false,
          isEmpty: cartList.length === 0,
        })
        this._calcStats()
      })
      .catch(() => {
        this.setData({ loading: false, isEmpty: true, cartList: [] })
      })
  },

  /** 计算选中统计 */
  _calcStats() {
    const { cartList } = this.data
    let selectedCount = 0
    let selectedPrice = 0
    cartList.forEach((item) => {
      if (item.selected) {
        selectedCount += item.quantity || 0
        selectedPrice += (parseFloat(item.price) || 0) * (item.quantity || 0)
      }
    })
    const isAllSelected = cartList.length > 0 && cartList.every((item) => item.selected)
    this.setData({
      selectedCount,
      selectedPrice: selectedPrice.toFixed(2),
      isAllSelected,
    })
  },

  /** 切换单项选中 */
  onItemSelect(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.cartList[index]
    const selected = !item.selected
    const key = `cartList[${index}].selected`
    this.setData({ [key]: selected })
    this._calcStats()

    // 同步服务端
    cartService.updateCartItem(item.id, { selected }).catch(() => {})
  },

  /** 全选/取消全选 */
  onSelectAll() {
    const isAllSelected = !this.data.isAllSelected
    const cartList = this.data.cartList.map((item) => ({
      ...item,
      selected: isAllSelected,
    }))
    this.setData({ cartList, isAllSelected })
    this._calcStats()

    // 批量同步
    cartList.forEach((item) => {
      cartService.updateCartItem(item.id, { selected: isAllSelected }).catch(() => {})
    })
  },

  /** 减少数量 */
  onQuantityMinus(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.cartList[index]
    if (item.quantity <= 1) return

    const newQty = item.quantity - 1
    const key = `cartList[${index}].quantity`
    this.setData({ [key]: newQty })
    this._calcStats()

    cartService.updateCartItem(item.id, { quantity: newQty }).catch(() => {})
  },

  /** 增加数量 */
  onQuantityPlus(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.cartList[index]
    const maxStock = item.stock || 99
    if (item.quantity >= maxStock) {
      wx.showToast({ title: '已达库存上限', icon: 'none' })
      return
    }

    const newQty = item.quantity + 1
    const key = `cartList[${index}].quantity`
    this.setData({ [key]: newQty })
    this._calcStats()

    cartService.updateCartItem(item.id, { quantity: newQty }).catch(() => {})
  },

  /** 删除购物车项 */
  onItemDelete(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.cartList[index]

    wx.showModal({
      title: '提示',
      content: '确定要删除该商品吗？',
      success: (res) => {
        if (res.confirm) {
          cartService.deleteCartItem(item.id)
            .then(() => {
              const cartList = this.data.cartList.filter((_, i) => i !== index)
              this.setData({ cartList, isEmpty: cartList.length === 0 })
              this._calcStats()
            })
            .catch(() => {
              wx.showToast({ title: '删除失败', icon: 'none' })
            })
        }
      },
    })
  },

  /** 点击商品图片跳转详情 */
  onProductTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/product-detail/product-detail?id=' + id })
  },

  /** 去结算 */
  onCheckout() {
    const selectedItems = this.data.cartList.filter((item) => item.selected)
    if (selectedItems.length === 0) {
      wx.showToast({ title: '请选择商品', icon: 'none' })
      return
    }
    const items = encodeURIComponent(JSON.stringify(selectedItems))
    wx.navigateTo({
      url: `/pages/order-create/order-create?items=${items}&from=cart`,
    })
  },

  /** 继续逛逛 */
  onGoShopping() {
    wx.switchTab({ url: '/pages/index/index' })
  },
})
