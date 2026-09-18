const { get } = require('../../utils/request')
const { readFavoriteIds, writeFavoriteIds } = require('../../utils/favorite-ids')

Page({
  data: { list: [] },

  onShow() {
    this._load()
  },

  async _load() {
    const ids = readFavoriteIds()
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
    const id = e.currentTarget.dataset.id
    const ids = readFavoriteIds().filter((x) => String(x) !== String(id))
    writeFavoriteIds(ids)
    this.setData({ list: this.data.list.filter((x) => String(x.id) !== String(id)) })
  },

  goContent() {
    wx.navigateTo({
      url: '/pages/content-list/content-list',
      fail: () => wx.switchTab({ url: '/pages/discover/discover' }),
    })
  },

  goDiscover() {
    wx.switchTab({ url: '/pages/discover/discover' })
  },
})
