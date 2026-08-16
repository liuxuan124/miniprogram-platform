const { StorageUtil } = require('../../utils/storage')
const { get } = require('../../utils/request')

const FAVORITES_KEY = 'content_favorites'

function readFavoriteIds() {
  const raw = StorageUtil.get(FAVORITES_KEY)
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
  if (typeof raw === 'object') return Object.keys(raw).filter((k) => !!raw[k])
  return []
}

function writeFavoriteIds(ids) {
  const map = {}
  ;(ids || []).forEach((id) => {
    const k = String(id)
    if (k && k !== 'NaN') map[k] = true
  })
  StorageUtil.set(FAVORITES_KEY, map)
}

Page({
  data: { list: [] },

  onShow() {
    this._load()
  },

  async _load() {
    const ids = readFavoriteIds()
    if (!ids.length) {
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
    const id = String(e.currentTarget.dataset.id)
    const ids = readFavoriteIds().filter((x) => x !== id)
    writeFavoriteIds(ids)
    this.setData({ list: this.data.list.filter((x) => String(x.id) !== id) })
  },

  goContent() {
    wx.switchTab({ url: '/pages/content-list/content-list' })
  },
})
