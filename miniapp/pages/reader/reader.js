const { get } = require('../../utils/request')

Page({
  data: {
    id: null,
    title: '已购资料',
    author: '出海笔记 · 阿哲',
    updatedAt: '',
    cover: '',
    contentHtml: '',
    toc: [],
    showToc: false,
    progress: 8,
  },

  onLoad(query) {
    const id = query && query.id ? Number(query.id) : null
    const title = query && query.title ? decodeURIComponent(query.title) : ''
    this.setData({ id, title: title || this.data.title })
    this.loadContent()
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/mine/mine' }) })
  },

  toggleToc() {
    this.setData({ showToc: !this.data.showToc })
  },

  onTocJump() {
    this.setData({ showToc: false })
    wx.showToast({ title: '已定位到章节', icon: 'none' })
  },

  onBookmark() {
    wx.showToast({ title: '已添加书签', icon: 'success' })
  },

  onPdf() {
    wx.showToast({ title: 'PDF 下载已加入队列', icon: 'none' })
  },

  onScroll(e) {
    const top = (e.detail && e.detail.scrollTop) || 0
    const pct = Math.min(99, Math.max(8, Math.round(top / 12)))
    this.setData({ progress: pct })
  },

  async loadContent() {
    // 优先拉取商品详情作为资料包正文；无则展示默认大纲
    try {
      if (this.data.id) {
        const res = await get(`/api/v1/mp/products/${this.data.id}`, {}, { auth: false })
        const p = (res && res.data) || {}
        const toc = this._buildToc(p)
        this.setData({
          title: p.name || this.data.title,
          cover: p.mainImage || p.coverUrl || '',
          updatedAt: (p.updateTime || p.updatedAt || '').slice(0, 10) || '持续更新',
          contentHtml: p.detail || p.description || this._defaultHtml(p.name || this.data.title),
          toc,
        })
        return
      }
    } catch (e) {
      // fallback below
    }
    this.setData({
      contentHtml: this._defaultHtml(this.data.title),
      toc: [
        { no: '01', title: '开篇：你将获得什么', preview: true },
        { no: '02', title: '核心方法与清单', preview: true },
        { no: '03', title: '实操模板', preview: false },
        { no: '04', title: '附录与更新记录', preview: false },
      ],
      updatedAt: '持续更新',
    })
  },

  _buildToc(p) {
    const detail = String(p.detail || '')
    const matches = detail.match(/<h[23][^>]*>(.*?)<\/h[23]>/gi) || []
    if (matches.length) {
      return matches.slice(0, 12).map((m, i) => ({
        no: String(i + 1).padStart(2, '0'),
        title: m.replace(/<[^>]+>/g, ''),
        preview: i < 2,
      }))
    }
    return [
      { no: '01', title: '内容概览', preview: true },
      { no: '02', title: '核心章节', preview: true },
      { no: '03', title: '实操清单', preview: false },
      { no: '04', title: '更新记录', preview: false },
    ]
  },

  _defaultHtml(title) {
    return `
      <p>欢迎打开「${title}」。这是数字资料包阅读页，支付成功后可永久查看。</p>
      <h3>你将获得</h3>
      <p>可复用的跨境方法论、清单模板与案例拆解，帮助你把内容沉淀成可售卖的知识资产。</p>
      <h3>使用建议</h3>
      <p>建议先通读开篇，再按业务环节查阅对应章节；模板可下载后直接套用到自己的选品与运营流程。</p>
      <h3>更新说明</h3>
      <p>资料包支持免费更新。若有新版本，将自动同步到本阅读器。</p>
    `
  },
})
