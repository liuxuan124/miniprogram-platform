// pages/order-list/order-list.js — 我的订单列表
// 按状态筛选、下拉刷新、上拉加载

const orderService = require('../../services/order')
const { AuthUtil } = require('../../utils/auth')

// 订单状态定义
const STATUS_TABS = [
  { key: '', label: '全部' },
  { key: 'pending_payment', label: '待付款' },
  { key: 'paid', label: '待发货' },
  { key: 'shipped', label: '待收货' },
  { key: 'completed', label: '已完成' },
  { key: 'refund', label: '退款' },
]

// 状态显示映射
const STATUS_MAP = {
  pending_payment: { text: '待付款', color: '#ff6b3d' },
  paid: { text: '待发货', color: '#2f5bff' },
  shipped: { text: '待收货', color: '#faad14' },
  completed: { text: '已完成', color: '#0fb47f' },
  closed: { text: '已关闭', color: '#999' },
  refunding: { text: '退款中', color: '#faad14' },
  refunded: { text: '已退款', color: '#999' },
}

Page({
  data: {
    tabs: STATUS_TABS,
    activeTab: '',
    STATUS_MAP,

    orders: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    loading: false,
    isEmpty: false,
  },

  onLoad(options) {
    if (!AuthUtil.requireLoginForAction('查看订单', {
      onSuccess: () => this._initializePage(options),
    })) return
    this._initializePage(options)
  },

  _initializePage(options) {
    if (options.status) {
      this.setData({ activeTab: options.status })
    }
    this._loadOrders(true)
  },

  /** D2：空态"去逛逛"行动按钮 */
  onGoShopping() {
    wx.navigateTo({ url: '/pages/product-list/product-list' })
  },

  onShow() {
    // 从订单详情返回时刷新
    if (this.data.orders.length > 0) {
      this._loadOrders(true)
    }
  },

  onPullDownRefresh() {
    this._loadOrders(true).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this._loadOrders(false)
    }
  },

  /** 加载订单列表 */
  _loadOrders(reset = false) {
    if (this.data.loading) return Promise.resolve()

    const page = reset ? 1 : this.data.page + 1
    this.setData({ loading: true })

    const params = { page, page_size: this.data.pageSize }
    if (this.data.activeTab) {
      if (this.data.activeTab === 'refund') {
        params.status = 'refunding,refunded'
      } else {
        params.status = this.data.activeTab
      }
    }

    return orderService.getOrderList(params)
      .then((res) => {
        const list = res.list || res.items || []
        const total = res.total || 0
        const hasMore = page * this.data.pageSize < total
        const normalized = list.map((order) => ({
          ...order,
          order_no: order.order_no || order.orderNo,
          total_amount: order.total_amount || order.totalAmount || order.payAmount,
          fulfillment_type: order.fulfillment_type || order.fulfillmentType,
          virtual_delivery_content: order.virtual_delivery_content || order.virtualDeliveryContent,
          items: (order.items || []).map((goods) => ({
            ...goods,
            product_id: goods.product_id || goods.productId,
            product_name: goods.product_name || goods.productName,
            product_image: goods.product_image || goods.productImage,
          })),
        }))
        const orders = reset ? normalized : this.data.orders.concat(normalized)
        this.setData({
          orders,
          page,
          hasMore,
          loading: false,
          isEmpty: orders.length === 0,
        })
      })
      .catch(() => {
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  /** 切换 Tab */
  onTabTap(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ activeTab: key, orders: [], page: 1 })
    this._loadOrders(true)
  },

  /** 跳转订单详情 */
  onOrderTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + id })
  },

  /** 待确认 — 查看详情 */
  onPayTap(e) {
    const id = e.currentTarget.dataset.id
    e.stopPropagation()
    wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + id })
  },

  /** 待确认 — 取消订单 */
  onCancelTap(e) {
    const id = e.currentTarget.dataset.id
    e.stopPropagation()
    wx.showModal({
      title: '提示',
      content: '确定要取消该订单吗？',
      success: (res) => {
        if (res.confirm) {
          orderService.cancelOrder(id)
            .then(() => {
              wx.showToast({ title: '已取消', icon: 'success' })
              this._loadOrders(true)
            })
            .catch(() => {
              wx.showToast({ title: '取消失败', icon: 'none' })
            })
        }
      },
    })
  },

  /** 待收货 — 确认订单完成 */
  onConfirmTap(e) {
    const id = e.currentTarget.dataset.id
    e.stopPropagation()
    wx.showModal({
      title: '提示',
      content: '确认本订单已经完成？',
      success: (res) => {
        if (res.confirm) {
          orderService.confirmOrder(id)
            .then(() => {
              wx.showToast({ title: '已确认完成', icon: 'success' })
              this._loadOrders(true)
            })
            .catch(() => {
              wx.showToast({ title: '操作失败', icon: 'none' })
            })
        }
      },
    })
  },

  onServiceTap() {
    wx.navigateTo({ url: '/pages/service-chat/service-chat' })
  },

  onDeliveryTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + id })
  },

  onReviewTap(e) {
    const item = e.currentTarget.dataset.item || {}
    const goods = (item.items && item.items[0]) || {}
    const pid = goods.productId || goods.product_id || ''
    const name = encodeURIComponent(goods.productName || goods.product_name || goods.name || '')
    const image = encodeURIComponent(goods.productImage || goods.product_image || goods.image || '')
    wx.navigateTo({
      url: `/pages/write-review/write-review?productId=${pid}&orderId=${item.id || ''}&name=${name}&image=${image}`,
    })
  },

  /** 获取状态文本 */
  _getStatusInfo(status) {
    return STATUS_MAP[status] || { text: status, color: '#999' }
  },
})
