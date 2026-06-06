// pages/content-list/content-list.js — 内容列表页
// 分类切换、文章/图文列表展示、下拉刷新、上拉加载

const request = require('../../utils/request')

Page({
  data: {
    // 分类
    categories: [],
    activeCategoryId: '',
    // 内容列表
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
    this._loadArticles(true).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this._loadArticles(false)
    }
  },

  /** 加载分类列表 */
  _loadCategories() {
    this.setData({ categories: [{ id: '', name: '全部' }] })
  },

  /** 加载内容列表 */
  _loadArticles(reset = false) {
    if (this.data.loading) return Promise.resolve()

    const page = reset ? 1 : this.data.page + 1
    this.setData({ loading: true })

    const params = { current: page, size: this.data.pageSize }
    if (this.data.activeCategoryId) params.categoryId = this.data.activeCategoryId

    return request.get('/api/v1/mp/contents', params, { auth: false }).then((data) => {
      const list = (data.records || []).map((item) => ({
        ...item,
        cover_url: item.coverUrl || item.coverImage || '',
        image: item.coverUrl || item.coverImage || '',
        publish_time: item.publishedAt || item.createTime,
        created_at: item.createTime,
        views: item.viewCount || 0,
      }))
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

  /** 选择分类 */
  onCategoryTap(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ activeCategoryId: id })
    this._loadArticles(true)
  },

  /** 点击内容跳转详情 */
  onContentTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/content-detail/content-detail?id=' + id })
  },
})
