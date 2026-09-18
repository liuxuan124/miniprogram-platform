const request = require('../../utils/request')
const { resolveMediaUrl } = require('../../utils/media-url')
const { WARM_PAGE_STYLE } = require('../../data/warm-source')
const warmHome = require('../../data/warm-home')

function mapAuthor(row) {
  if (!row || row.apply) return null
  const name = String(row.name || '').trim()
  if (!name) return null
  return {
    id: row.id || name,
    name,
    role: row.role || '',
    avatar: resolveMediaUrl(row.avatar || ''),
  }
}

Page({
  data: {
    themePageStyle: WARM_PAGE_STYLE,
    loading: true,
    loadError: false,
    list: [],
  },

  onLoad() {
    this._load()
  },

  onPullDownRefresh() {
    this._load().finally(() => wx.stopPullDownRefresh())
  },

  onRetry() {
    this._load()
  },

  _load() {
    this.setData({ loading: true, loadError: false })
    return request.get('/api/v1/mp/home/warm', {}, { auth: false, showError: false })
      .then((data) => {
        const raw = (data && data.authors) || []
        let list = raw.map(mapAuthor).filter(Boolean)
        if (!list.length) {
          list = (warmHome.AUTHORS || []).map(mapAuthor).filter(Boolean)
        }
        this.setData({ list, loading: false, loadError: false })
      })
      .catch(() => {
        const list = (warmHome.AUTHORS || []).map(mapAuthor).filter(Boolean)
        this.setData({
          list,
          loading: false,
          loadError: !list.length,
        })
      })
  },

  onOpen(e) {
    const { id, name } = e.currentTarget.dataset || {}
    if (!name) return
    const q = [
      `author=${encodeURIComponent(name)}`,
      id ? `id=${encodeURIComponent(id)}` : '',
    ].filter(Boolean).join('&')
    wx.navigateTo({ url: `/pages/author-feed/author-feed?${q}` })
  },
})
