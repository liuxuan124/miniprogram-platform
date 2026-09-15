const { get } = require('../../utils/request')
const { createSharePageConfig } = require('../../utils/share')
const { USE_LOCAL_SOURCE, SEARCH_HOT } = require('../../data/warm-source')
const { DEMO_LIST, DEMO_ARTICLE, DEMO_NOTE } = require('../../data/warm-demo')

const HOT = SEARCH_HOT
const HISTORY_KEY = 'search_history_v1'

const LOCAL_SEARCH_POOL = [
  ...DEMO_LIST.ranks.map((r) => ({
    id: r.id,
    type: 'content',
    typeLabel: '内容',
    title: r.title,
    summary: '暖阁本地源 · 热榜',
    cover: '',
  })),
  {
    id: 'big1',
    type: 'content',
    typeLabel: '长文',
    title: DEMO_LIST.big.title,
    summary: DEMO_LIST.big.summary,
    cover: DEMO_LIST.big.cover,
  },
  {
    id: 'art1',
    type: 'content',
    typeLabel: '长文',
    title: DEMO_ARTICLE.title,
    summary: DEMO_ARTICLE.lead,
    cover: DEMO_ARTICLE.cover,
  },
  {
    id: 'note1',
    type: 'content',
    typeLabel: '笔记',
    title: DEMO_NOTE.title,
    summary: (DEMO_NOTE.topics || []).join(' '),
    cover: (DEMO_NOTE.gallery && DEMO_NOTE.gallery[0]) || '',
  },
].concat(
  DEMO_LIST.rows.map((r) => ({
    id: r.id,
    type: 'content',
    typeLabel: r.tag || '内容',
    title: r.title,
    summary: r.summary || r.meta || '',
    cover: r.cover || (r.images && r.images[0]) || '',
  }))
)

Page({
  ...createSharePageConfig(),
  data: {
    keyword: '',
    searched: false,
    loading: false,
    hotKeywords: HOT,
    history: [],
    suggestions: [
      { icon: '📚', title: '长文', desc: '笔记 / 长文 / 数据', type: 'page', path: '/pages/content-list/content-list' },
      { icon: '🎧', title: '客服中心', desc: '咨询与售后服务', type: 'page', path: '/pkg-user/service-chat/service-chat' },
    ],
    results: [],
  },

  onLoad(query) {
    let history = []
    try {
      history = wx.getStorageSync(HISTORY_KEY) || []
    } catch (e) { /* ignore */ }
    this.setData({ history: Array.isArray(history) ? history.slice(0, 8) : [] })
    if (!USE_LOCAL_SOURCE) {
      const SystemService = require('../../services/system')
      SystemService.fetchSystemConfig(true).then((config) => {
        const hot = config && (config.search_hot || config.searchHot)
        if (Array.isArray(hot) && hot.length) {
          this.setData({ hotKeywords: hot })
        }
        const agentOn = config && (
          config.agent_public_enabled === '1'
          || config.agent_public_enabled === 1
          || config.agentPublicEnabled === '1'
          || config.agentPublicEnabled === true
        )
        const triggers = (config && (config.agentTriggerConfig || config.agent_trigger_config)) || {}
        const searchEntry = triggers.searchEntry !== false && triggers.searchEntry !== '0'
        if (agentOn && searchEntry) {
          const base = this.data.suggestions || []
          const has = base.some((s) => s && s.path && String(s.path).indexOf('agent') >= 0)
          if (!has) {
            this.setData({
              suggestions: base.concat([
                { icon: '✨', title: '问问暖阁', desc: 'AI 检索与问答', type: 'page', path: '/pages/search/search?mode=agent' },
              ]),
            })
          }
        }
      }).catch(() => {})
    }
    if (query && query.q) {
      this.setData({ keyword: decodeURIComponent(query.q) })
      this.onSearch()
    }
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) })
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value || '' })
  },

  onClearKeyword() {
    this.setData({ keyword: '', searched: false, results: [] })
  },

  tapKeyword(e) {
    const kw = e.currentTarget.dataset.kw || ''
    this.setData({ keyword: kw })
    this.onSearch()
  },

  clearHistory() {
    try { wx.removeStorageSync(HISTORY_KEY) } catch (e) { /* ignore */ }
    this.setData({ history: [] })
    wx.showToast({ title: '已清空', icon: 'none' })
  },

  tapSuggestion(e) {
    const { path } = e.currentTarget.dataset
    if (!path) return
    const base = path.split('?')[0]
    const { getProductEnabledSync } = require('../../utils/product-module-gate')
const { openContentDetail } = require('../../utils/content-id')
    const productOn = getProductEnabledSync()
    if (!productOn && (base === '/pages/knowledge-mall/knowledge-mall' || base === '/pages/product-list/product-list' || base === '/pages/shop/shop')) {
      wx.switchTab({ url: '/pages/discover/discover' })
      return
    }
    const isTab = [
      '/pages/index/index',
      '/pages/discover/discover',
      '/pages/planet/planet',
      '/pages/shop/shop',
      '/pages/mine/mine',
    ].indexOf(base) >= 0
    if (base === '/pages/product-list/product-list' || base === '/pages/knowledge-mall/knowledge-mall') {
      wx.switchTab({ url: '/pages/shop/shop' })
      return
    }
    if (base === '/pages/content-list/content-list') {
      wx.switchTab({ url: '/pages/discover/discover' })
      return
    }
    if (isTab) {
      wx.switchTab({ url: base })
    } else {
      wx.navigateTo({ url: path })
    }
  },

  pushHistory(kw) {
    const next = [kw, ...this.data.history.filter((x) => x !== kw)].slice(0, 8)
    this.setData({ history: next })
    try { wx.setStorageSync(HISTORY_KEY, next) } catch (e) { /* ignore */ }
  },

  async onSearch() {
    const keyword = (this.data.keyword || '').trim()
    if (!keyword) {
      wx.showToast({ title: '请输入关键词', icon: 'none' })
      return
    }
    this.pushHistory(keyword)
    this.setData({ searched: true, loading: true, results: [] })
    try {
      if (USE_LOCAL_SOURCE) {
        const kw = keyword.toLowerCase()
        const contents = LOCAL_SEARCH_POOL.filter((item) => {
          const hay = `${item.title} ${item.summary}`.toLowerCase()
          return hay.indexOf(kw) >= 0
        })
        this.setData({ results: contents, loading: false })
        try {
          const { trackSearch } = require('../../utils/track')
          trackSearch(keyword, contents.length)
        } catch (e) {}
        return
      }
      const contentsRes = await get('/api/v1/mp/contents', { keyword, current: 1, size: 20 }, { auth: false, showError: false }).catch(() => null)
      const contents = this._records(contentsRes).map((item) => ({
        id: item.id,
        type: 'content',
        typeLabel: '内容',
        title: item.title,
        summary: this._plainText(item.summary || item.content || ''),
        cover: require('../../utils/article-cover').resolveArticleCover(item),
      }))
      this.setData({ results: contents, loading: false })
      try {
        const { trackSearch } = require('../../utils/track')
        trackSearch(keyword, contents.length)
      } catch (e) {}
    } catch (e) {
      console.error('[Search] failed:', e)
      this.setData({ loading: false, results: [] })
      try {
        const { trackSearch } = require('../../utils/track')
        trackSearch(keyword, 0)
      } catch (err) {}
      wx.showToast({ title: '搜索失败，请重试', icon: 'none' })
    }
  },

  _plainText(html) {
    return String(html || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#165;|&yen;/g, '¥')
      .replace(/\s+/g, ' ')
      .trim()
  },

  _records(res) {
    if (!res) return []
    if (Array.isArray(res)) return res
    // request 已解包 data；兼容再包一层
    const data = res.records ? res : (res.data || res)
    if (Array.isArray(data)) return data
    return data.records || data.list || data.items || []
  },

  openResult(e) {
    const { type, id } = e.currentTarget.dataset
    if (!id) return
    if (type === 'content') {
      if (USE_LOCAL_SOURCE) {
        wx.navigateTo({ url: '/pages/content-detail/content-detail?demo=1' })
        return
      }
      openContentDetail(id)
      return
    }
    if (type === 'product') {
      const { blockTradeNavigation } = require('../../utils/product-module-gate')
      if (USE_LOCAL_SOURCE) {
        const url = '/pages/product-detail/product-detail?demo=goods'
        if (blockTradeNavigation(url)) return
        wx.navigateTo({ url })
        return
      }
      const url = `/pages/product-detail/product-detail?id=${id}`
      if (blockTradeNavigation(url)) return
      wx.navigateTo({ url })
    }
  },
})
