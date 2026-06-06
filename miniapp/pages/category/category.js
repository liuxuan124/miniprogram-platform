// pages/category/category.js — 分类页
const { PageService } = require('../../services/page')

Page({
  data: {
    categories: [],       // 分类列表
    activeCategory: null, // 当前选中分类
    contentList: [],      // 当前分类下的内容列表
    loading: true,        // 加载状态
    page: 1,              // 分页页码
    pageSize: 10,         // 每页数量
    hasMore: true,        // 是否有更多数据
    loadingMore: false,   // 加载更多中
  },

  onLoad() {
    this._loadCategories()
  },

  onShow() {},

  /** 下拉刷新 */
  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true })
    Promise.all([
      this._loadCategories(),
      this._loadContent(true),
    ]).finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  /** 触底加载更多 */
  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this._loadContent()
    }
  },

  /** 加载分类列表 */
  async _loadCategories() {
    try {
      const categories = await PageService.getCategoryList()
      this.setData({
        categories,
        loading: false,
      })

      // 默认选中第一个分类
      if (categories.length > 0 && !this.data.activeCategory) {
        this.setData({ activeCategory: categories[0] })
        this._loadContent(true)
      }
    } catch (err) {
      console.error('[CategoryPage] 加载分类失败:', err)
      this.setData({ loading: false })
    }
  },

  /** 切换分类 */
  onCategoryTap(e) {
    const { id } = e.currentTarget.dataset
    const category = this.data.categories.find((c) => c.id === id)
    if (category && category.id !== (this.data.activeCategory && this.data.activeCategory.id)) {
      this.setData({
        activeCategory: category,
        contentList: [],
        page: 1,
        hasMore: true,
      })
      this._loadContent(true)
    }
  },

  /** 加载内容列表 */
  async _loadContent(reset = false) {
    if (!this.data.activeCategory) return

    const currentPage = reset ? 1 : this.data.page

    this.setData({ loadingMore: true })

    try {
      const res = await PageService.getCategoryContent({
        categoryId: this.data.activeCategory.id,
        page: currentPage,
        pageSize: this.data.pageSize,
      })

      const newList = res.list || []
      this.setData({
        contentList: reset ? newList : this.data.contentList.concat(newList),
        page: currentPage + 1,
        hasMore: newList.length >= this.data.pageSize,
        loadingMore: false,
      })
    } catch (err) {
      console.error('[CategoryPage] 加载内容失败:', err)
      this.setData({ loadingMore: false })
    }
  },

  /** 内容项点击 */
  onContentTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`,
    })
  },
})
