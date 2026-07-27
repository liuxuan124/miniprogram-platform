const { StorageUtil } = require('../../utils/storage')
const { get } = require('../../utils/request')

const FAVORITES_KEY = 'content_favorites'

Page({
  data: { list: [] },

  onShow() {
    this._load()
  },

  async _load() {
    const ids = StorageUtil.get(FAVORITES_KEY) || []
    if (!Array.isArray(ids) || !ids.length) {
      this.setData({ list: [] })
      return
    }
    const list = []
    for (const id of ids.slice(0, 50)) {
      try {
        const detail = await get(`/api/v1/mp/contents/${id}`, {}, { auth: false, showError: false })
        if (detail && detail.id) list.push(detail)
      } catch (_) {}
    }
    this.setData({ list })
  },

  openItem(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/content-detail/content-detail?id=${id}` })
  },

  removeItem(e) {
    const id = Number(e.currentTarget.dataset.id)
    const ids = (StorageUtil.get(FAVORITES_KEY) || []).filter((x) => Number(x) !== id)
    StorageUtil.set(FAVORITES_KEY, ids)
    this.setData({ list: this.data.list.filter((x) => Number(x.id) !== id) })
  },

  goContent() {
    wx.switchTab({ url: '/pages/content-list/content-list' })
  },
})
