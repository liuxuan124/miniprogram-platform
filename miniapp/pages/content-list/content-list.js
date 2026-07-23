// pages/content-list/content-list.js — 内容中心（对齐原型）

const request = require('../../utils/request')

function resolveFormat(item) {
  const source = String(item.source || '')
  const tags = Array.isArray(item.tags) ? item.tags.join(',') : String(item.tags || '')
  const blob = `${source} ${tags} ${item.title || ''}`
  if (/视频|video|reel/i.test(blob)) return { key: 'video', label: '视频' }
  if (/数据|清单|表格|报表|trend/i.test(blob)) return { key: 'data', label: '数据' }
  if (/小红书|笔记|xhs/i.test(blob)) return { key: 'note', label: '笔记' }
  if (/公众号|长文|wechat|专栏/i.test(blob)) return { key: 'article', label: '长文' }
  if ((item.summary || '').length > 80 || (item.content || '').length > 500) {
    return { key: 'article', label: '长文' }
  }
  return { key: 'note', label: '笔记' }
}

Page({
  data: {
    formatTabs: [
      { key: '', label: '全部' },
      { key: 'note', label: '笔记' },
      { key: 'article', label: '长文' },
      { key: 'video', label: '视频' },
      { key: 'data', label: '数据' },
    ],
    activeFormat: '',
    topicTabs: [
      { id: '', name: '推荐' },
      { id: '选品', name: '选品洞察' },
      { id: '供应链', name: '供应链' },
      { id: '平台', name: '平台运营' },
      { id: '独立站', name: '独立站' },
      { id: '物流', name: '物流履约' },
      { id: '合规', name: '合规税务' },
    ],
    activeTopic: '',
    categories: [{ id: '', name: '全部主题' }],
    activeCategoryId: '',
    articles: [],
    page: 1,
    pageSize: 10,
    total: 0,
    hasMore: true,
    loading: false,
    isEmpty: false,
  },

  onLoad() {
    this._loadCategories()
    this._loadArticles(true)
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
  },

  onPullDownRefresh() {
    this._loadArticles(true).then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this._loadArticles(false)
  },

  onSearchTap() {
    wx.navigateTo({ url: '/pages/search/search' })
  },

  onFormatTap(e) {
    this.setData({ activeFormat: e.currentTarget.dataset.key || '' })
    this._loadArticles(true)
  },

  onTopicTap(e) {
    this.setData({ activeTopic: e.currentTarget.dataset.id || '' })
    this._loadArticles(true)
  },

  _loadCategories() {
    // 从已发布内容里收集主题分类（无需额外公开接口）
    request.get('/api/v1/mp/contents', { current: 1, size: 50 }, { auth: false })
      .then((data) => {
        const records = data.records || []
        const map = new Map()
        records.forEach((item) => {
          if (item.categoryId && item.categoryName && !map.has(item.categoryId)) {
            map.set(item.categoryId, item.categoryName)
          }
        })
        const cats = [{ id: '', name: '全部主题' }]
        map.forEach((name, id) => cats.push({ id, name }))
        this.setData({ categories: cats })
      })
      .catch(() => {
        this.setData({
          categories: [
            { id: '', name: '全部主题' },
            { id: 'select', name: '选品' },
            { id: 'platform', name: '平台运营' },
            { id: 'logistics', name: '物流' },
            { id: 'supply', name: '供应链' },
          ],
        })
      })
  },

  _loadArticles(reset = false) {
    if (this.data.loading) return Promise.resolve()
    const page = reset ? 1 : this.data.page + 1
    this.setData({ loading: true })

    const params = { current: page, size: this.data.pageSize }
    const catId = this.data.activeCategoryId
    if (catId && String(catId).match(/^\d+$/)) params.categoryId = Number(catId)

    return request.get('/api/v1/mp/contents', params, { auth: false }).then((data) => {
      let list = (data.records || []).map((item) => {
        const fmt = resolveFormat(item)
        return {
          ...item,
          cover_url: item.coverUrl || item.coverImage || '',
          image: item.coverUrl || item.coverImage || '',
          publish_time: item.publishedAt || item.createTime,
          created_at: item.createTime,
          views: item.viewCount || 0,
          formatKey: fmt.key,
          formatLabel: fmt.label,
        }
      })
      if (this.data.activeFormat) {
        list = list.filter((item) => item.formatKey === this.data.activeFormat)
      }
      if (this.data.activeTopic) {
        const topic = this.data.activeTopic
        list = list.filter((item) => {
          const blob = `${item.categoryName || ''} ${(item.tags || []).join(',')} ${item.title || ''} ${item.summary || ''}`
          return blob.indexOf(topic) >= 0
        })
      }
      // 非数字主题（兜底标签）用关键词过滤
      if (catId && !String(catId).match(/^\d+$/)) {
        const kw = String(catId)
        list = list.filter((item) => {
          const blob = `${item.categoryName || ''} ${(item.tags || []).join(',')} ${item.title || ''}`
          return blob.indexOf(kw) >= 0 || /选品|平台|物流|供应链|合规|独立站/.test(blob)
        })
      }
      const total = data.total || list.length
      const hasMore = page * this.data.pageSize < total
      const articles = reset ? list : this.data.articles.concat(list)
      this.setData({
        articles,
        page,
        total,
        hasMore,
        loading: false,
        isEmpty: articles.length === 0,
      })
    }).catch(() => {
      this.setData({ loading: false, isEmpty: this.data.articles.length === 0 })
    })
  },

  onCategoryTap(e) {
    this.setData({ activeCategoryId: e.currentTarget.dataset.id })
    this._loadArticles(true)
  },

  onContentTap(e) {
    wx.navigateTo({ url: '/pages/content-detail/content-detail?id=' + e.currentTarget.dataset.id })
  },

  onImageError(e) {
    const index = e.currentTarget.dataset.index
    this.setData({ [`articles[${index}].cover_url`]: '/images/default-article.svg' })
  },
})
