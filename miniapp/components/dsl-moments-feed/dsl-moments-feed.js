// components/dsl-moments-feed/dsl-moments-feed.js — 知识星球式动态时间线
const { get } = require('../../utils/request')
const { resolveMediaUrl } = require('../../utils/media-url')

function stripHtml(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function formatTime(raw) {
  if (!raw) return ''
  const text = String(raw).replace('T', ' ')
  return text.slice(0, 16)
}

function normalizeMomentItem(item, index) {
  const author = String(item.author || '博主').trim() || '博主'
  const images = (Array.isArray(item.images) ? item.images : [])
    .map((url) => resolveMediaUrl(url))
    .filter(Boolean)
  const cover = resolveMediaUrl(item.coverImage || item.cover_image || item.coverUrl || '')
  if (cover && images.indexOf(cover) < 0) images.unshift(cover)
  const body = stripHtml(item.summary || item.content || '')
  const attachmentCount = Number(item.attachmentCount ?? item.attachment_count
    ?? (Array.isArray(item.attachments) ? item.attachments.length : 0))
  return {
    id: item.id || `local_${index + 1}`,
    title: item.title || body.slice(0, 40) || '动态',
    body: body || item.title || '',
    author_name: author,
    author_avatar: resolveMediaUrl(item.authorAvatar || item.author_avatar || ''),
    author_initial: author.slice(0, 1),
    images,
    image_count: images.length,
    attachment_count: attachmentCount,
    time_text: formatTime(item.publishedAt || item.published_at || item.updateTime || item.update_time),
  }
}

function calcPageSize(config) {
  const raw = Number(config && config.page_size)
  if (Number.isFinite(raw) && raw >= 4) return Math.min(raw, 30)
  return 10
}

function extractRecords(data) {
  if (!data) return []
  if (Array.isArray(data.records)) return data.records
  if (Array.isArray(data.list)) return data.list
  if (Array.isArray(data)) return data
  return []
}

Component({
  properties: {
    config: { type: Object, value: {} },
    runtimeData: { type: Array, value: [] },
    actions: { type: Array, value: [] },
    styleString: { type: String, value: '' },
  },

  data: {
    displayData: [],
    listStyle: '',
    cardStyle: '',
    loading: false,
    loadingMore: false,
    hasMore: true,
    page: 0,
    footerText: '',
    showAuthor: true,
    showPublishTime: true,
  },

  observers: {
    config(config) {
      if (!config || typeof config !== 'object') return
      this._applyConfig(config)
    },
    runtimeData(runtimeData) {
      if (Array.isArray(runtimeData) && runtimeData.length && !this.data.displayData.length && !this.data.loading) {
        this._bootstrapFromRuntime(runtimeData)
      }
    },
  },

  methods: {
    loadMore() {
      if (!this.data.hasMore || this.data.loadingMore || this.data.loading) return
      this._fetchPage(false)
    },

    _applyConfig(cfg) {
      const gapRaw = Number(cfg.item_gap)
      const itemGap = Number.isFinite(gapRaw) ? Math.max(0, Math.min(gapRaw, 48)) : 12
      this._pageSize = calcPageSize(cfg)
      this.setData({
        listStyle: `gap:${itemGap * 2}rpx;`,
        showAuthor: cfg.show_author !== false,
        showPublishTime: cfg.show_publish_time !== false,
      })
      if (!this.data.displayData.length) this._resetAndLoad(true)
    },

    _bootstrapFromRuntime(runtimeData) {
      const pageSize = this._pageSize || calcPageSize(this.data.config)
      const mapped = (runtimeData || []).slice(0, pageSize).map((item, index) => normalizeMomentItem(item, index))
      this.setData({
        displayData: mapped,
        page: mapped.length ? 1 : 0,
        hasMore: (runtimeData || []).length >= pageSize,
        footerText: mapped.length ? '' : '暂无动态',
      })
    },

    _resetAndLoad(useRuntime) {
      const runtime = Array.isArray(this.data.runtimeData) ? this.data.runtimeData : []
      if (useRuntime && runtime.length) {
        this._bootstrapFromRuntime(runtime)
        return
      }
      this.setData({ displayData: [], page: 0, hasMore: true, footerText: '', loading: true })
      this._fetchPage(true)
    },

    _fetchPage(reset) {
      const cfg = this.data.config || {}
      const pageSize = this._pageSize || calcPageSize(cfg)
      const nextPage = reset ? 1 : (this.data.page || 0) + 1
      if (reset) this.setData({ loading: true, footerText: '' })
      else this.setData({ loadingMore: true, footerText: '加载中...' })

      get('/api/v1/mp/contents', {
        current: nextPage,
        size: pageSize,
        contentType: 'moment',
      }, { auth: false, showError: false })
        .then((res) => {
          const records = extractRecords(res)
          const mapped = records.map((item, index) => normalizeMomentItem(item, index))
          const displayData = reset ? mapped : this.data.displayData.concat(mapped)
          const total = Number(res && res.total)
          const hasMore = Number.isFinite(total) ? nextPage * pageSize < total : mapped.length >= pageSize
          this.setData({
            displayData,
            page: nextPage,
            hasMore,
            footerText: hasMore ? '' : (displayData.length ? '没有更多了' : '暂无动态'),
          })
        })
        .catch(() => {
          if (reset) this.setData({ displayData: [], footerText: '加载失败' })
        })
        .finally(() => {
          this.setData({ loading: false, loadingMore: false })
        })
    },

    onTapMoment(e) {
      const id = e.currentTarget.dataset.id
      if (!id) return
      wx.navigateTo({ url: `/pages/moment-detail/moment-detail?id=${id}` })
    },
  },
})
