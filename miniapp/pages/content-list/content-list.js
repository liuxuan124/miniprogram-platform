// pages/content-list/content-list.js — Tab 内容页：优先加载导航绑定的装修页 DSL

const request = require('../../utils/request')
const { createSharePageConfig } = require('../../utils/share')
const { loadTabBoundDslPage, handleDslReachBottom } = require('../../utils/dsl-tab-page')
const { getNavLayout } = require('../../utils/nav-layout')
const { resolveMediaUrl } = require('../../utils/media-url')

const TOPIC_TABS = [
  { id: '', name: '推荐' },
  { id: 'select', name: '选品洞察' },
  { id: 'supply', name: '供应链' },
  { id: 'platform', name: '平台运营' },
  { id: 'dtc', name: '独立站' },
  { id: 'logistics', name: '物流履约' },
  { id: 'compliance', name: '合规税务' },
]

const FORMAT_TABS = [
  { key: '', label: '全部形态' },
  { key: 'note', label: '📷 笔记' },
  { key: 'longform', label: '📄 长文' },
  { key: 'video', label: '▶️ 视频' },
  { key: 'data', label: '📊 数据' },
]

const DATA_NUM_POOL = [
  [
    { k: '宠物智能', v: '+38%', up: true },
    { k: '户外露营', v: '+21%', up: true },
    { k: '家居收纳', v: '-6%', up: false },
  ],
  [
    { k: '美妆个护', v: '+15%', up: true },
    { k: '3C配件', v: '+9%', up: true },
    { k: '服饰鞋靴', v: '-3%', up: false },
  ],
]

const TOPIC_NAME = {
  select: '选品洞察',
  supply: '供应链',
  platform: '平台运营',
  dtc: '独立站',
  logistics: '物流履约',
  compliance: '合规税务',
}

const TOPIC_EMOJI = {
  select: '📈',
  supply: '🏭',
  platform: '🛒',
  dtc: '🌐',
  logistics: '🚢',
  compliance: '⚖️',
}

const ART = {
  select: ['#4f6dff', '#8ea3ff'],
  supply: ['#2f9e6e', '#7fd3ab'],
  platform: ['#f2762a', '#ffb37a'],
  dtc: ['#6b4fe0', '#a99bff'],
  logistics: ['#2b8cc4', '#7cc6e8'],
  compliance: ['#d94f78', '#f2a0b5'],
}

function artStyle(topic) {
  const c = ART[topic] || ART.select
  return `background:linear-gradient(135deg,${c[0]} 0%,${c[1]} 100%);`
}

function blobOf(item) {
  const tags = Array.isArray(item.tags) ? item.tags.join(',') : String(item.tags || '')
  return `${item.categoryName || ''} ${tags} ${item.title || ''} ${item.summary || ''} ${item.source || ''}`
}

function resolveTopic(item) {
  const blob = blobOf(item)
  if (/验厂|工厂|打样|供应链/.test(blob)) return 'supply'
  if (/VAT|税务合规|合规税务/.test(blob)) return 'compliance'
  if (/独立站|DTC|落地页/.test(blob)) return 'dtc'
  if (/海外仓|直发|物流履约/.test(blob)) return 'logistics'
  if (/选品|类目动销|类目速报/.test(blob)) return 'select'
  if (/TikTok|亚马逊|Listing|投流|会员|知识库|平台运营/.test(blob)) return 'platform'
  if (/合规|政策解读/.test(blob)) return 'compliance'
  return 'select'
}

function resolveFormat(item) {
  const type = String(item.contentType || item.content_type || '').toLowerCase()
  if (type === 'note') return { key: 'note', label: '笔记' }
  if (type === 'video') return { key: 'video', label: '视频' }
  if (type === 'data') return { key: 'data', label: '数据' }
  if (type === 'article' || type === 'longform') return { key: 'longform', label: '长文' }

  const tags = Array.isArray(item.tags) ? item.tags : []
  if (tags.some((t) => t === 'wx-type:newspic')) return { key: 'note', label: '笔记' }
  if (tags.some((t) => t === 'wx-type:news')) return { key: 'longform', label: '长文' }

  const blob = blobOf(item)
  if (/视频|video|reel/i.test(blob) || (/TikTok/.test(blob) && /起号|复盘/.test(blob))) {
    return { key: 'video', label: '视频' }
  }
  if (/速报|动销|数据更新/.test(blob)) return { key: 'data', label: '数据' }
  if (/笔记|小红书|对照自查|验厂清单|海外仓还是直发|这 5 个坑|5 个坑/.test(blob)) {
    return { key: 'note', label: '笔记' }
  }
  if (/长文|公众号|专栏/.test(blob)) return { key: 'longform', label: '长文' }
  if ((item.summary || '').length > 80 || String(item.content || '').length > 800) {
    return { key: 'longform', label: '长文' }
  }
  return { key: 'longform', label: '长文' }
}

function pickGlyph(item, topic) {
  const title = item.title || ''
  if (/验厂|工厂/.test(title)) return '🏭'
  if (/打样/.test(title)) return '🔧'
  if (/VAT|合规/.test(title)) return '⚖️'
  if (/独立站|落地页/.test(title)) return '🌐'
  if (/TikTok/.test(title)) return '🎬'
  if (/亚马逊|Listing/.test(title)) return '🛒'
  if (/海外仓|直发/.test(title)) return '🚢'
  if (/选品|类目/.test(title)) return '📈'
  if (/会员/.test(title)) return '🪪'
  if (/知识库/.test(title)) return '📚'
  return TOPIC_EMOJI[topic] || '📄'
}

function formatPublishTime(value) {
  const raw = String(value || '')
  const match = raw.match(/^\d{4}-(\d{2})-(\d{2})/)
  if (match) return `${match[1]}-${match[2]}`
  const d = new Date(raw)
  if (!Number.isNaN(d.getTime())) {
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${m}-${day}`
  }
  return raw
}

function formatViews(n) {
  const v = Number(n) || 0
  if (v >= 10000) {
    const w = (v / 10000).toFixed(1).replace(/\.0$/, '')
    return `${w}w 阅读`
  }
  if (v >= 1000) {
    const k = (v / 1000).toFixed(1).replace(/\.0$/, '')
    return `${k}k 阅读`
  }
  if (v > 0) return `${v} 阅读`
  return ''
}

function estimateRead(item) {
  const len = String(item.content || item.summary || '').replace(/<[^>]+>/g, '').length
  const minutes = Math.max(3, Math.round(len / 400) || 7)
  return `${minutes}分钟`
}

function mapRecord(item) {
  const topic = resolveTopic(item)
  const fmt = resolveFormat(item)
  const date = formatPublishTime(item.publishedAt || item.createTime)
  const views = formatViews(item.viewCount)
  const read = estimateRead(item)
  const imageList = Array.isArray(item.images) ? item.images : (Array.isArray(item.gallery) ? item.gallery : [])
  const coverFromImages = imageList.map((url) => resolveMediaUrl(url)).find(Boolean) || ''
  const coverFallback = resolveMediaUrl(item.coverUrl || item.coverImage || item.cover_url || item.cover || item.image || '')
  const cover_url = fmt.key === 'note' ? (coverFromImages || coverFallback) : coverFallback
  const metaParts = [date]
  if (fmt.key === 'longform') metaParts.push(read)
  if (fmt.key === 'video') metaParts.push(item.duration || '08:24')
  if (fmt.key === 'data') metaParts.push(item.summary ? String(item.summary).slice(0, 24) : '采样 3 个平台')
  if (views && fmt.key !== 'data') metaParts.push(views)
  const likeCount = Number(item.likeCount || item.like_count || 0)
  const likeText = likeCount >= 1000
    ? `${(likeCount / 1000).toFixed(1).replace(/\.0$/, '')}k`
    : String(likeCount || 0)
  const author = String(item.author || '作者').trim() || '作者'
  const authorAvatar = resolveMediaUrl(item.authorAvatar || item.author_avatar || '')
  const nums = fmt.key === 'data'
    ? DATA_NUM_POOL[Number(item.id || 0) % DATA_NUM_POOL.length]
    : []
  return {
    id: item.id,
    title: item.title,
    summary: item.summary || '',
    topicKey: topic,
    topicName: TOPIC_NAME[topic] || '跨境实战',
    formatKey: fmt.key,
    formatLabel: fmt.label,
    glyph: pickGlyph(item, topic),
    artStyle: artStyle(topic),
    meta: metaParts.filter(Boolean).join(' · '),
    dur: fmt.key === 'video' ? (item.duration || '08:24') : '',
    nums,
    likeText,
    author,
    author_initial: author.slice(0, 1),
    author_avatar: authorAvatar,
    cover_url,
  }
}

Page({
  ...createSharePageConfig(),
  data: {
    dslMode: false,
    error: '',
    flowComponents: [],
    floatComponents: [],
    hasBrandHeader: false,
    statusBarHeight: getNavLayout().statusBarHeight,
    formatTabs: FORMAT_TABS,
    topicTabs: TOPIC_TABS,
    activeFormat: '',
    activeTopic: '',
    allArticles: [],
    feed: [],
    notes: [],
    loading: false,
    isEmpty: false,
  },

  onLoad() {
    loadTabBoundDslPage(this, '/pages/content-list/content-list').then((ok) => {
      if (ok) return
      try {
        const sys = wx.getSystemInfoSync()
        this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
      } catch (_) {}
      this._loadArticles()
    })
  },

  onShow() {
    wx.hideTabBar({ animation: false, fail() {} })
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1, hidden: false })
    }
    this._consumeTabQuery()
  },

  _consumeTabQuery() {
    try {
      const q = wx.getStorageSync('__tab_query__/pages/content-list/content-list')
      if (!q) return
      wx.removeStorageSync('__tab_query__/pages/content-list/content-list')
      const topic = q.topic || ''
      const matched = (this.data.topicTabs || []).some((t) => t.id === topic)
      this.setData({ activeTopic: matched ? topic : '' })
      this._applyFilter()
    } catch (_) {}
  },

  onPullDownRefresh() {
    if (this.data.dslMode) {
      loadTabBoundDslPage(this, '/pages/content-list/content-list', true).finally(() => wx.stopPullDownRefresh())
      return
    }
    this._loadArticles().then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.dslMode) handleDslReachBottom(this)
  },

  onSearchTap() {
    wx.navigateTo({
      url: '/pages/search/search',
      fail: () => wx.showToast({ title: '无法打开搜索页', icon: 'none' }),
    })
  },

  onFormatTap(e) {
    this.setData({ activeFormat: e.currentTarget.dataset.key || '' })
    this._applyFilter()
  },

  onTopicTap(e) {
    this.setData({ activeTopic: e.currentTarget.dataset.id || '' })
    this._applyFilter()
  },

  _loadArticles() {
    if (this.data.loading) return Promise.resolve()
    this.setData({ loading: true })
    return request
      .get('/api/v1/mp/contents', { current: 1, size: 50 }, { auth: false })
      .then((data) => {
        const allArticles = (data.records || []).map(mapRecord)
        this.setData({ allArticles, loading: false })
        this._applyFilter()
      })
      .catch(() => {
        this.setData({ loading: false, isEmpty: this.data.allArticles.length === 0 })
      })
  },

  _applyFilter() {
    const { allArticles, activeFormat, activeTopic } = this.data
    let list = allArticles
    if (activeTopic) list = list.filter((item) => item.topicKey === activeTopic)
    if (activeFormat) list = list.filter((item) => item.formatKey === activeFormat)
    const notes = list.filter((item) => item.formatKey === 'note')
    const feed = list.filter((item) => item.formatKey !== 'note')
    this.setData({
      feed,
      notes,
      isEmpty: list.length === 0,
    })
  },

  onContentTap(e) {
    wx.navigateTo({ url: '/pages/content-detail/content-detail?id=' + e.currentTarget.dataset.id })
  },

  clearFilters() {
    this.setData({ activeFormat: '', activeTopic: '' })
    this._applyFilter()
  },
})
