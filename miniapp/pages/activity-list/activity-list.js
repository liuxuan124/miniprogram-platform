// pages/activity-list/activity-list.js — 活动列表页
// 活动卡片列表展示、报名进度、下拉刷新

const request = require('../../utils/request')

Page({
  data: {
    activities: [],
    page: 1,
    pageSize: 10,
    total: 0,
    hasMore: true,
    loading: false,
    isEmpty: false,
  },

  onLoad() {
    this._loadActivities(true)
  },

  onPullDownRefresh() {
    this._loadActivities(true).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this._loadActivities(false)
    }
  },

  /** 加载活动列表 */
  _loadActivities(reset = false) {
    if (this.data.loading) return Promise.resolve()

    const page = reset ? 1 : this.data.page + 1
    this.setData({ loading: true })

    return request.get('/api/v1/mp/activities', { current: page, size: this.data.pageSize }, { auth: false })
      .then((data) => {
        const list = (data.records || []).map((item) => {
          const progress = item.quota ? Math.min(100, Math.round((item.signed || 0) * 100 / item.quota)) : 0
          return {
            ...item,
            type_label: item.type === 'booking' ? '预约服务' : '活动报名',
            progress,
            full: item.quota ? (item.signed || 0) >= item.quota : false,
            cover_color: item.cover ? '' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
            cover_icon: '🎪',
          }
        })
        const total = data.total || list.length
        const hasMore = page * this.data.pageSize < total
        const activities = reset ? list : this.data.activities.concat(list)
        this.setData({
          activities,
          page,
          total,
          hasMore,
          loading: false,
          isEmpty: activities.length === 0,
        })
      })
      .catch(() => {
        this.setData({ loading: false, isEmpty: this.data.activities.length === 0 })
      })
  },

  /** 点击活动跳转详情 */
  onActivityTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/activity-detail/activity-detail?id=' + id })
  },
})
