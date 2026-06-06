// pages/my-appointments/my-appointments.js — 我的预约列表
// 按状态筛选、下拉刷新、上拉加载、取消预约

const appointmentService = require('../../services/appointment')
const { AuthUtil } = require('../../utils/auth')

// 状态 Tab
const STATUS_TABS = [
  { key: '', label: '全部' },
  { key: 'pending', label: '待确认' },
  { key: 'confirmed', label: '已确认' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
]

// 状态显示映射
const STATUS_MAP = {
  pending: { text: '待确认', color: '#faad14' },
  confirmed: { text: '已确认', color: '#1890ff' },
  completed: { text: '已完成', color: '#52c41a' },
  cancelled: { text: '已取消', color: '#999' },
}

Page({
  data: {
    tabs: STATUS_TABS,
    activeTab: '',
    STATUS_MAP,

    appointments: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    loading: false,
    isEmpty: false,

    // 高亮项（预约成功后跳转）
    highlightId: '',
  },

  onLoad(options) {
    if (!AuthUtil.requireLoginForAction('查看预约')) return

    if (options.highlight) {
      this.setData({ highlightId: options.highlight })
    }

    if (options.status) {
      this.setData({ activeTab: options.status })
    }

    this._loadAppointments(true)
  },

  onShow() {
    // 从其他页面返回时刷新
    if (this.data.appointments.length > 0) {
      this._loadAppointments(true)
    }
  },

  onPullDownRefresh() {
    this._loadAppointments(true).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this._loadAppointments(false)
    }
  },

  /** 加载预约列表 */
  _loadAppointments(reset = false) {
    if (this.data.loading) return Promise.resolve()

    const page = reset ? 1 : this.data.page + 1
    this.setData({ loading: true })

    const params = { page, page_size: this.data.pageSize }
    if (this.data.activeTab) {
      params.status = this.data.activeTab
    }

    return appointmentService.getMyAppointments(params)
      .then((res) => {
        const list = res.list || res.items || []
        const total = res.total || 0
        const hasMore = page * this.data.pageSize < total
        const appointments = reset ? list : this.data.appointments.concat(list)
        this.setData({
          appointments,
          page,
          hasMore,
          loading: false,
          isEmpty: appointments.length === 0,
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
    this.setData({ activeTab: key, appointments: [], page: 1 })
    this._loadAppointments(true)
  },

  /** 取消预约 */
  onCancelTap(e) {
    const id = e.currentTarget.dataset.id
    e.stopPropagation()

    wx.showModal({
      title: '提示',
      content: '确定要取消该预约吗？',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '取消中...' })
          appointmentService.cancelAppointment(id)
            .then(() => {
              wx.hideLoading()
              wx.showToast({ title: '已取消', icon: 'success' })
              this._loadAppointments(true)
            })
            .catch(() => {
              wx.hideLoading()
              wx.showToast({ title: '取消失败', icon: 'none' })
            })
        }
      },
    })
  },

  /** 再次预约 */
  onRebookTap(e) {
    const serviceId = e.currentTarget.dataset.serviceId
    e.stopPropagation()
    if (serviceId) {
      wx.navigateTo({ url: `/pages/appointment-book/appointment-book?id=${serviceId}` })
    }
  },

  /** 跳转预约服务列表 */
  onGoBookTap() {
    wx.navigateTo({ url: '/pages/appointment-list/appointment-list' })
  },
})
