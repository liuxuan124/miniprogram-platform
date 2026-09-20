const { get, post } = require('../../utils/request')
const SystemService = require('../../services/system')
const { AuthUtil } = require('../../utils/auth')

Page({
  data: {
    id: '',
    loading: true,
    item: null,
    error: '',
  },

  onLoad(query) {
    this.setData({ id: String(query.id || '') })
    this.loadDetail()
  },

  async loadDetail() {
    const { id } = this.data
    if (!id) {
      this.setData({ loading: false, error: '缺少模版 id' })
      return
    }
    this.setData({ loading: true, error: '' })
    try {
      const item = await get(`/api/v1/mp/store-templates/${id}`)
      this.setData({ item, loading: false })
    } catch (e) {
      this.setData({ loading: false, error: (e && e.message) || '加载失败' })
    }
  },

  async onActivate() {
    const { id, item } = this.data
    if (!id) return
    if (!AuthUtil.isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    const name = (item && item.name) || '该模版'
    const ok = await new Promise((resolve) => {
      wx.showModal({
        title: '切换整店模版',
        content: `确定套用「${name}」？会覆盖当前导航与页面。`,
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
})
