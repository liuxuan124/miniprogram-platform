// components/dsl-hot-news/dsl-hot-news.js
const { executeAction, navigatePage } = require('../../utils/render')

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function dayKey(value) {
  if (value == null || value === '') return ''
  const raw = String(value).trim()
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : ''
}

function formatMeta(item) {
  const raw = item.publishedAt || item.publishTime || item.publish_time || item.createTime || item.createdAt || ''
  const key = dayKey(raw)
  return key || ''
}

function normalizeItem(item, index) {
  const id = item.id || item.contentId || item.content_id || `hot_${index + 1}`
  const link = item.link_url || item.linkUrl || ''
  return {
    id,
    title: item.title || item.name || '文章标题',
    cover: item.cover || item.coverUrl || item.coverImage || item.cover_url || item.image || '',
    meta: item.meta || formatMeta(item),
    link_url: link || (!String(id).startsWith('hot_') ? `/pages/content-detail/content-detail?id=${id}` : ''),
    viewCount: Number(item.viewCount || item.view_count || 0) || 0,
    publishedAt: item.publishedAt || item.publishTime || item.publish_time || item.createTime || '',
  }
}

function resolveDateParts(config) {
  const mode = (config && config.date_mode) || 'today'
  let d = new Date()
  if (mode === 'fixed' && config && config.header_date) {
    const parsed = new Date(String(config.header_date).replace(/-/g, '/'))
    if (!Number.isNaN(parsed.getTime())) d = parsed
  }
  return {
    dateMonth: String(d.getMonth() + 1),
    dateDay: String(d.getDate()),
    dateWeek: WEEKDAYS[d.getDay()] || '',
  }
}

function prepareList(runtimeData, config) {
  const cfg = config || {}
  const limitRaw = Number(cfg.limit)
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 20)) : 3
  const ds = cfg.data_source || {}
  const q = { ...(ds.query || {}), ...(ds.params || {}) }
  let rows = Array.isArray(runtimeData) ? runtimeData.map(normalizeItem) : []
  if (!rows.length && Array.isArray(cfg.items)) {
    rows = cfg.items.map(normalizeItem)
  }

  const publishDate = String(q.publish_date || '').trim()
  if (publishDate) {
    rows = rows.filter((item) => dayKey(item.publishedAt) === publishDate || (item.meta && item.meta.indexOf(publishDate) === 0))
  }

  const sortBy = String(q.sort_by || 'popular')
  if (sortBy === 'popular') {
    rows = rows.slice().sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
  } else if (sortBy === 'newest') {
    rows = rows.slice().sort((a, b) => {
      const ta = new Date(String(a.publishedAt || 0).replace(/-/g, '/')).getTime() || 0
      const tb = new Date(String(b.publishedAt || 0).replace(/-/g, '/')).getTime() || 0
      return tb - ta
    })
  }

  return rows.slice(0, limit)
}

Component({
  properties: {
    config: { type: Object, value: {} },
    runtimeData: { type: Array, value: [] },
    actions: { type: Array, value: [] },
    styleString: { type: String, value: '' },
  },

  data: {
    titleText: '今日跨境头条',
    showMore: true,
    moreText: '查看更多 >',
    moreLink: '/pages/content-list/content-list',
    titleBoxStyle: '',
    titleBgStyle: '',
    contentStyle: '',
    moreStyle: '',
    listStyle: '',
    layout: 'star',
    showCover: true,
    displayData: [],
    dateMonth: '',
    dateDay: '',
    dateWeek: '',
  },

  observers: {
    'config, runtimeData': function (config, runtimeData) {
      this._apply(config, runtimeData)
    },
  },

  lifetimes: {
    attached() {
      this._apply(this.data.config, this.data.runtimeData)
    },
  },

  methods: {
    _apply(config, runtimeData) {
      const cfg = config || {}
      const from = cfg.header_from || '#4F7CFF'
      const to = cfg.header_to || '#7BA3FF'
      const opacityRaw = Number(cfg.header_opacity)
      const opacityPct = Number.isFinite(opacityRaw) ? Math.max(40, Math.min(opacityRaw, 100)) : 96
      const titleRadius = Number.isFinite(Number(cfg.title_radius)) ? Math.max(0, Math.min(Number(cfg.title_radius), 40)) : 12
      const titleWidthRaw = Number(cfg.title_width)
      const titleWidth = Number.isFinite(titleWidthRaw) ? Math.max(40, Math.min(titleWidthRaw, 100)) : 72
      const contentRadius = Number.isFinite(Number(cfg.content_radius)) ? Math.max(0, Math.min(Number(cfg.content_radius), 40)) : 14
      const moreRadiusRaw = Number(cfg.more_radius)
      const moreRadius = Number.isFinite(moreRadiusRaw)
        ? (moreRadiusRaw > 40 ? 20 : Math.max(0, Math.min(moreRadiusRaw, 40)))
        : 20
      const moreBg = cfg.more_bg || '#EEF1FF'
      const moreColor = cfg.more_color || '#5B6CFF'
      const gapRaw = Number(cfg.item_gap)
      const gap = Number.isFinite(gapRaw) ? Math.max(0, Math.min(gapRaw, 32)) : 10
      const dateParts = resolveDateParts(cfg)
      this.setData({
        titleText: String(cfg.title || '今日跨境头条').trim() || '今日跨境头条',
        showMore: cfg.show_more !== false,
        moreText: String(cfg.more_text || '查看更多 >').trim() || '查看更多 >',
        moreLink: String(cfg.more_link || '/pages/content-list/content-list').trim() || '/pages/content-list/content-list',
        titleBoxStyle: `min-width:${titleWidth}%;max-width:100%;border-radius:${titleRadius * 2}rpx;`,
        titleBgStyle: `opacity:${opacityPct / 100};background:linear-gradient(180deg, ${from} 0%, ${to} 100%);border-radius:${titleRadius * 2}rpx;`,
        contentStyle: `border-radius:${contentRadius * 2}rpx;`,
        moreStyle: `border-radius:${moreRadius * 2}rpx;background:${moreBg};color:${moreColor};`,
        listStyle: `gap:${gap * 2}rpx;`,
        layout: cfg.layout === 'card' ? 'card' : 'star',
        showCover: cfg.show_cover !== false,
        displayData: prepareList(runtimeData, cfg),
        ...dateParts,
      })
    },

    onTapMore() {
      const link = this.data.moreLink
      if (!link) return
      if (/^https?:\/\//i.test(link)) {
        executeAction({ type: 'webview', url: link })
      } else {
        navigatePage(link)
      }
    },

    onTapItem(e) {
      const index = e.currentTarget.dataset.index
      const item = (this.data.displayData || [])[index]
      if (!item) return
      if (item.link_url) {
        if (/^https?:\/\//i.test(item.link_url)) {
          executeAction({ type: 'webview', url: item.link_url })
        } else {
          navigatePage(item.link_url)
        }
        return
      }
      if (item.id && !String(item.id).startsWith('hot_')) {
        navigatePage(`/pages/content-detail/content-detail?id=${item.id}`)
      }
    },
  },
})
