const { get, post } = require('../../utils/request')
const SystemService = require('../../services/system')
const { AuthUtil } = require('../../utils/auth')

Page({
  data: {
    loading: true,
    list: [],
    error: '',
  },

  onShow() {
    this.loadList()
  },

  async loadList() {
    this.setData({ loading: true, error: '' })
    try {
      const data = await get('/api/v1/mp/store-templates')
      const list = Array.isArray(data) ? data : (data && data.list) || []
      this.setData({ list, loading: false })
    } catch (e) {
      this.setData({
        loading: false,
        error: (e && e.message) || '加载失败，请登录后重试',
        list: [],
      })
    }
  },

  onTapItem(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: `/pkg-templates/detail/detail?id=${id}` })
  },

  async onQuickSwitch(e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name || '该模版'
    if (!id) return
    if (!AuthUtil.isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    const ok = await new Promise((resolve) => {
      wx.showModal({
        title: '切换整店模版',
        content: `确定套用「${name}」？会覆盖当前导航与页面（内容上线，不是微信发版）。`,
        confirmText: '套用',
        success: (res) => resolve(!!res.confirm),
      })
    })
    if (!ok) return
    wx.showLoading({ title: '切换中…', mask: true })
    try {
      await post(`/api/v1/mp/store-templates/${id}/activate`)
      SystemService.clearSystemConfigCache()
      wx.hideLoading()
      wx.showToast({ title: '已切换', icon: 'success' })
      setTimeout(() => {
        wx.reLaunch({ url: '/pages/index/index' })
      }, 400)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: (err && err.message) || '切换失败', icon: 'none' })
    }
  },

  onPullDownRefresh() {
    this.loadList().finally(() => wx.stopPullDownRefresh())
  },
})
