// pages/content-list/content-list.js — 内容中心（对齐原型）

const request = require('../../utils/request')
const { createSharePageConfig } = require('../../utils/share')

const TOPIC_KEYWORDS = {
  select: '选品',
  supply: '供应链',
  platform: '平台',
  dtc: '独立站',
  logistics: '物流',
  compliance: '合规',
}

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

function formatPublishTime(value) {
  const raw = String(value || '')
  const match = raw.match(/^\d{4}-(\d{2})-(\d{2})/)
  return match ? `${match[1]}-${match[2]}` : raw
}

Page({
  ...createSharePageConfig(),
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
      { id: 'select', name: '选品洞察' },
      { id: 'supply', name: '供应链' },
      { id: 'platform', name: '平台运营' },
      { id: 'dtc', name: '独立站' },
      { id: 'logistics', name: '物流履约' },
      { id: 'compliance', name: '合规税务' },
    ],
    activeTopic: '',
    articles: [],
    page: 1,
    pageSize: 10,
    total: 0,
    hasMore: true,
    loading: false,
    isEmpty: false,
  },

  onLoad() {
    this._loadArticles(true)
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
    this._consumeTabQuery()
  },

  /** 首页主题跳转透传 */
  _consumeTabQuery() {
    try {
      const q = wx.getStorageSync('__tab_query__/pages/content-list/content-list')
      if (!q) return
      wx.removeStorageSync('__tab_query__/pages/content-list/content-list')
      const topic = q.topic || ''
      const matched = (this.data.topicTabs || []).some((t) => t.id === topic)
      this.setData({
        activeTopic: matched ? topic : '',
      })
      this._loadArticles(true)
    } catch (_) {}
  },

  setTopic(topic) {
    const matched = (this.data.topicTabs || []).some((t) => t.id === topic)
    this.setData({
      activeTopic: matched ? topic : '',
    })
    this._loadArticles(true)
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

  _loadArticles(reset = false) {
    if (this.data.loading) return Promise.resolve()
    const page = reset ? 1 : this.data.page + 1
    this.setData({ loading: true })

    const params = { current: page, size: this.data.pageSize }

    return request.get('/api/v1/mp/contents', params, { auth: false }).then((data) => {
      let list = (data.records || []).map((item) => {
        const fmt = resolveFormat(item)
        return {
          ...item,
          cover_url: item.coverUrl || item.coverImage || '',
          image: item.coverUrl || item.coverImage || '',
          publish_time: formatPublishTime(item.publishedAt || item.createTime),
          created_at: formatPublishTime(item.createTime),
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
        const kw = TOPIC_KEYWORDS[topic] || topic
        list = list.filter((item) => {
          const blob = `${item.categoryName || ''} ${(item.tags || []).join(',')} ${item.title || ''} ${item.summary || ''}`
          return blob.indexOf(kw) >= 0
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

  onContentTap(e) {
    wx.navigateTo({ url: '/pages/content-detail/content-detail?id=' + e.currentTarget.dataset.id })
  },

  onImageError(e) {
    const index = e.currentTarget.dataset.index
    this.setData({ [`articles[${index}].cover_url`]: '/images/default-article.svg' })
  },

  clearFilters() {
    this.setData({ activeFormat: '', activeTopic: '' })
    this._loadArticles(true)
  },
})
