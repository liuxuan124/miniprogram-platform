const request = require('../../utils/request')
const { resolveMediaUrl } = require('../../utils/media-url')
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
    author: '',
    authorId: '',
    /** 作者档案（来自 mp_author，可空） */
    profile: null,
    loading: true,
    loadError: false,
    list: [],
  },

  onLoad(options) {
    const author = decodeURIComponent(String((options && options.author) || '').trim())
    const authorId = decodeURIComponent(String((options && options.id) || '').trim())
    const title = author ? `${author}的作品` : '作者作品'
    wx.setNavigationBarTitle({ title })
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
    const { author, authorId } = this.data
    if (!author && !authorId) {
      this.setData({ loading: false, loadError: false, list: [] })
      return Promise.resolve()
    }
    this.setData({ loading: true, loadError: false })

    // 1) 若有 authorId，先拉作者档案；失败则降级只用 author 名字
    const profileTask = authorId
      ? request.get(`/api/v1/mp/authors/${authorId}`, {}, { auth: false, showError: false })
          .then((p) => p || null)
          .catch(() => null)
      : Promise.resolve(null)

    // 2) 作品列表：优先按 authorId 过滤，回退到 author 名字
    const listTask = authorId
      ? request.get('/api/v1/mp/contents', {
          current: 1,
          size: 40,
          authorId,
        }, { auth: false, showError: false })
      : request.get('/api/v1/mp/contents', {
          current: 1,
          size: 40,
          author,
        }, { auth: false, showError: false })

    return Promise.all([profileTask, listTask])
      .then(([profile, res]) => {
        const records = (res && (res.records || res.list)) || []
        // 档案优先用接口返回；若没有则用 query 参数兜底
        const finalProfile = profile
          ? {
              authorId,
              name: profile.name || author || '作者',
              avatar: resolveMediaUrl(profile.avatarUrl || ''),
              role: profile.role || '',
              title: profile.title || '',
              intro: profile.intro || '',
            }
          : (author
            ? { authorId, name: author, avatar: '', role: '', title: '', intro: '' }
            : null)
        this.setData({
          profile: finalProfile,
          list: records.map(mapRow),
          loading: false,
          loadError: false,
        })
        if (finalProfile && finalProfile.name && finalProfile.name !== this.data.author) {
          wx.setNavigationBarTitle({ title: `${finalProfile.name}的作品` })
        }
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
