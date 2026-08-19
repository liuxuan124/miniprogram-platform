const { get } = require('../../utils/request')
const { createSharePageConfig } = require('../../utils/share')

const HOT = ['选品趋势清单', 'VAT 注册', '验厂清单', 'TikTok 起号', '海外仓测算', '独立站落地页']
const HISTORY_KEY = 'search_history_v1'

Page({
  ...createSharePageConfig(),
  data: {
    keyword: '',
    searched: false,
    loading: false,
    hotKeywords: HOT,
    history: [],
    suggestions: [
      { icon: '📚', title: '内容中心', desc: '笔记 / 长文 / 数据', type: 'page', path: '/pages/content-list/content-list' },
      { icon: '🎧', title: '客服中心', desc: '咨询与售后服务', type: 'page', path: '/pkg-user/service-chat/service-chat' },
      { icon: '👑', title: '会员中心', desc: '积分签到与权益', type: 'page', path: '/pkg-user/member-center/member-center' },
    ],
    results: [],
  },

  onLoad(query) {
    let history = []
    try {
      history = wx.getStorageSync(HISTORY_KEY) || []
    } catch (e) { /* ignore */ }
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
    const isTab = [
      '/pages/index/index',
      '/pages/content-list/content-list',
      '/pages/knowledge-mall/knowledge-mall',
      '/pages/mine/mine',
    ].indexOf(base) >= 0
    if (base === '/pages/product-list/product-list') {
      wx.switchTab({ url: '/pages/knowledge-mall/knowledge-mall' })
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
      const contentsRes = await get('/api/v1/mp/contents', { keyword, current: 1, size: 20 }, { auth: false, showError: false }).catch(() => null)
      const contents = this._records(contentsRes).map((item) => ({
        id: item.id,
        type: 'content',
        typeLabel: '内容',
        title: item.title,
        summary: this._plainText(item.summary || item.content || ''),
        cover: item.coverImage || item.coverUrl || item.cover_url || '',
      }))
      this.setData({ results: contents, loading: false })
    } catch (e) {
      console.error('[Search] failed:', e)
      this.setData({ loading: false, results: [] })
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
      wx.navigateTo({ url: `/pages/content-detail/content-detail?id=${id}` })
    } else if (type === 'product') {
      wx.navigateTo({ url: `/pages/product-detail/product-detail?id=${id}` })
    }
  },
})
