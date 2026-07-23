const { get } = require('../../utils/request')

const HOT = ['选品趋势清单', 'VAT 注册', '验厂清单', 'TikTok 起号', '海外仓测算', '独立站落地页']
const HISTORY_KEY = 'search_history_v1'

Page({
  data: {
    keyword: '',
    searched: false,
    loading: false,
    hotKeywords: HOT,
    history: [],
    suggestions: [
      { icon: '📘', title: '选品资料包', desc: '知识商城 · 资料包', type: 'shop', path: '/pages/product-list/product-list' },
      { icon: '🗓️', title: '1v1 咨询', desc: '预约咨询服务', type: 'shop', path: '/pages/product-list/product-list?type=service' },
      { icon: '📚', title: '内容中心', desc: '笔记 / 长文 / 数据', type: 'page', path: '/pages/content-list/content-list' },
      { icon: '🤖', title: 'AI 出海助手', desc: '快速问答与建议', type: 'page', path: '/pages/ai-chat/ai-chat' },
    ],
    results: [],
  },

  onLoad(query) {
    const history = wx.getStorageSync(HISTORY_KEY) || []
    this.setData({ history: Array.isArray(history) ? history.slice(0, 8) : [] })
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

  tapKeyword(e) {
    const kw = e.currentTarget.dataset.kw || ''
    this.setData({ keyword: kw })
    this.onSearch()
  },

  clearHistory() {
    wx.removeStorageSync(HISTORY_KEY)
    this.setData({ history: [] })
    wx.showToast({ title: '已清空', icon: 'none' })
  },

  tapSuggestion(e) {
    const { path } = e.currentTarget.dataset
    if (!path) return
    const base = path.split('?')[0]
    const isTab = [
      '/pages/index/index',
      '/pages/content-list/content-list',
      '/pages/product-list/product-list',
      '/pages/mine/mine',
    ].indexOf(base) >= 0
    if (isTab) {
      const qIdx = path.indexOf('?')
      if (qIdx >= 0) {
        const query = {}
        path.slice(qIdx + 1).split('&').forEach((pair) => {
          const [k, v = ''] = pair.split('=')
          if (k) query[decodeURIComponent(k)] = decodeURIComponent(v)
        })
        try { wx.setStorageSync('__tab_query__' + base, query) } catch (err) { /* ignore */ }
      }
      wx.switchTab({ url: base })
    } else {
      wx.navigateTo({ url: path })
    }
  },

  pushHistory(kw) {
    const next = [kw, ...this.data.history.filter((x) => x !== kw)].slice(0, 8)
    this.setData({ history: next })
    wx.setStorageSync(HISTORY_KEY, next)
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
      const [contentsRes, productsRes] = await Promise.all([
        get('/api/v1/mp/contents', { keyword, page: 1, pageSize: 20 }, { auth: false }).catch(() => null),
        get('/api/v1/mp/products', { keyword, page: 1, pageSize: 20 }, { auth: false }).catch(() => null),
      ])
      const contents = this._records(contentsRes).map((item) => ({
        id: item.id,
        type: 'content',
        typeLabel: '内容',
        title: item.title,
        summary: item.summary || '',
        cover: item.coverImage || item.cover_url || '',
      }))
      const products = this._records(productsRes).map((item) => ({
        id: item.id,
        type: 'product',
        typeLabel: item.productType === 'service' ? '咨询' : '资料包',
        title: item.name || item.title,
        summary: item.description || ('¥' + (item.price || 0)),
        cover: item.mainImage || item.coverUrl || '',
      }))
      this.setData({ results: [...contents, ...products], loading: false })
    } catch (e) {
      this.setData({ loading: false, results: [] })
    }
  },

  _records(res) {
    const data = (res && res.data) || res || {}
    if (Array.isArray(data)) return data
    return data.records || data.list || data.items || []
  },

  openResult(e) {
    const { type, id } = e.currentTarget.dataset
    if (type === 'content') {
      wx.navigateTo({ url: `/pages/content-detail/content-detail?id=${id}` })
    } else if (type === 'product') {
      wx.navigateTo({ url: `/pages/product-detail/product-detail?id=${id}` })
    }
  },
})
