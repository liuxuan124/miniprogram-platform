// pages/points-log/points-log.js — 积分记录页面
const memberService = require('../../services/member')
const { AuthUtil } = require('../../utils/auth')

Page({
  data: {
    pointsLog: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false,
    isEmpty: false,
    totalPoints: 0,
  },

  onLoad() {
    if (!AuthUtil.requireLoginForAction('查看积分')) return
    this._loadPointsLog(true)
  },

  onPullDownRefresh() {
    this._loadPointsLog(true).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this._loadPointsLog(false)
    }
  },

  /** 加载积分记录 */
  _loadPointsLog(reset = false) {
    if (this.data.loading) return Promise.resolve()

    const page = reset ? 1 : this.data.page + 1
    this.setData({ loading: true })

    return memberService.getPointsLog({ page, page_size: this.data.pageSize })
      .then((res) => {
        const list = res.list || res.items || []
        const total = res.total || 0
        const hasMore = page * this.data.pageSize < total
        const pointsLog = reset ? list : this.data.pointsLog.concat(list)

        this.setData({
          pointsLog,
          page,
          hasMore,
          loading: false,
          isEmpty: pointsLog.length === 0,
          totalPoints: res.total_points || this.data.totalPoints,
        })
      })
      .catch(() => {
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },
})
