const request = require('../../utils/request')
const { resolveMediaUrl } = require('../../utils/media-url')
const { WARM_PAGE_STYLE } = require('../../data/warm-source')
const { openContentDetail } = require('../../utils/content-id')

function formatViews(n) {
  const v = Number(n) || 0
  if (v >= 10000) return `${(v / 10000).toFixed(1).replace(/\.0$/, '')}万`
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return v > 0 ? String(v) : ''
}

function mapRow(item) {
  const type = String(item.contentType || item.content_type || 'article').toLowerCase()
  const cover = resolveMediaUrl(item.coverImage || item.coverUrl || item.cover_url || '')
  const views = formatViews(item.viewCount || item.view_count)
  const likes = formatViews(item.likeCount || item.like_count)
  return {
    id: item.id,
    title: item.title || '',
    summary: item.summary || '',
    cover,
    tag: type === 'note' ? '笔记' : (type === 'moment' ? '动态' : '长文'),
    meta: type === 'note'
      ? (likes ? `❤ ${likes}` : '')
      : (views ? `${views} 阅读` : ''),
    kind: type,
  }
}

Page({
  data: {
    themePageStyle: WARM_PAGE_STYLE,
    author: '',
    authorId: '',
    loading: true,
    loadError: false,
    list: [],
  },

  onLoad(options) {
    const author = decodeURIComponent(String((options && options.author) || '').trim())
    const authorId = decodeURIComponent(String((options && options.id) || '').trim())
    wx.setNavigationBarTitle({ title: author ? `${author}的作品` : '作者作品' })
    this.setData({ author, authorId })
    this._load()
  },

  onPullDownRefresh() {
    this._load().finally(() => wx.stopPullDownRefresh())
  },

  onRetry() {
    this._load()
  },

  _load() {
    const author = this.data.author
    if (!author) {
      this.setData({ loading: false, loadError: false, list: [] })
      return Promise.resolve()
    }
    this.setData({ loading: true, loadError: false })
    return request.get('/api/v1/mp/contents', {
      current: 1,
      size: 40,
      author,
    }, { auth: false, showError: false })
      .then((res) => {
        const records = (res && (res.records || res.list)) || []
        this.setData({
          list: records.map(mapRow),
          loading: false,
          loadError: false,
        })
      })
      .catch(() => {
        this.setData({ loading: false, loadError: true, list: [] })
      })
  },

  onOpen(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    openContentDetail(id)
  },
})
