// pages/appointment-list/appointment-list.js — 预约服务列表
// 展示可预约的服务，支持搜索、下拉刷新、上拉加载

const appointmentService = require('../../services/appointment')

Page({
  data: {
    services: [],
    keyword: '',
    page: 1,
    pageSize: 10,
    hasMore: true,
    loading: false,
    isEmpty: false,
  },

  onLoad() {
    this._loadServices(true)
  },

  onShow() {
    // 从预约详情返回时刷新
    if (this.data.services.length > 0) {
      this._loadServices(true)
    }
  },

  onPullDownRefresh() {
    this._loadServices(true).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this._loadServices(false)
    }
  },

  /** 加载预约服务列表 */
  _loadServices(reset = false) {
    if (this.data.loading) return Promise.resolve()

    const page = reset ? 1 : this.data.page + 1
    this.setData({ loading: true })

    const params = { page, page_size: this.data.pageSize }
    if (this.data.keyword) {
      params.keyword = this.data.keyword
    }

    return appointmentService.getAppointmentServices(params)
      .then((res) => {
        const list = res.list || res.items || []
        const total = res.total || 0
        const hasMore = page * this.data.pageSize < total
        const services = reset ? list : this.data.services.concat(list)
        this.setData({
          services,
          page,
          hasMore,
          loading: false,
          isEmpty: services.length === 0,
        })
      })
      .catch(() => {
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  /** 搜索输入 */
  onSearchInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  /** 搜索确认 */
  onSearchConfirm() {
    this.setData({ services: [], page: 1 })
    this._loadServices(true)
  },

  /** 清除搜索 */
  onSearchClear() {
    this.setData({ keyword: '', services: [], page: 1 })
    this._loadServices(true)
  },

  /** 跳转预约下单 */
  onServiceTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/appointment-book/appointment-book?id=${id}` })
  },

  /** 跳转我的预约 */
  onMyAppointmentsTap() {
    wx.navigateTo({ url: '/pages/my-appointments/my-appointments' })
  },
})
