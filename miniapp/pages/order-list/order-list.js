// pages/order-list/order-list.js — 我的订单列表
// 按状态筛选、下拉刷新、上拉加载

const orderService = require('../../services/order')
const { AuthUtil } = require('../../utils/auth')

// 订单状态定义
const STATUS_TABS = [
  { key: '', label: '全部' },
  { key: 'pending_payment', label: '待确认' },
  { key: 'paid', label: '待发货' },
  { key: 'shipped', label: '待收货' },
  { key: 'completed', label: '已完成' },
  { key: 'refund', label: '退款' },
]

// 状态显示映射
const STATUS_MAP = {
  pending_payment: { text: '待确认', color: '#ff8a00' },
  paid: { text: '待发货', color: '#1890ff' },
  shipped: { text: '待收货', color: '#faad14' },
  completed: { text: '已完成', color: '#52c41a' },
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
    if (!AuthUtil.requireLoginForAction('查看订单')) return
    if (options.status) {
      this.setData({ activeTab: options.status })
    }
    this._loadOrders(true)
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
        const orders = reset ? list : this.data.orders.concat(list)
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

  /** 待收货 — 确认收货 */
  onConfirmTap(e) {
    const id = e.currentTarget.dataset.id
    e.stopPropagation()
    wx.showModal({
      title: '提示',
      content: '确认已收到商品？',
      success: (res) => {
        if (res.confirm) {
          orderService.confirmOrder(id)
            .then(() => {
              wx.showToast({ title: '已确认收货', icon: 'success' })
              this._loadOrders(true)
            })
            .catch(() => {
              wx.showToast({ title: '操作失败', icon: 'none' })
            })
        }
      },
    })
  },

  /** 获取状态文本 */
  _getStatusInfo(status) {
    return STATUS_MAP[status] || { text: status, color: '#999' }
  },
})
