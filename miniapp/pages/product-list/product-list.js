// pages/product-list/product-list.js — 商品列表页
// 分类筛选、搜索、排序、下拉刷新、上拉加载

const productService = require('../../services/product')

Page({
  data: {
    // 搜索
    keyword: '',
    // 分类
    categories: [],
    activeCategoryId: '',
    // 排序
    sortOptions: [
      { key: 'created_desc', label: '最新' },
      { key: 'sales_desc', label: '销量' },
      { key: 'price_asc', label: '价格↑' },
      { key: 'price_desc', label: '价格↓' },
    ],
    activeSort: 'created_desc',
    showSortPanel: false,
    // 商品列表
    products: [],
    page: 1,
    pageSize: 10,
    total: 0,
    hasMore: true,
    loading: false,
    refreshing: false,
    // 空状态
    isEmpty: false,
  },

  onLoad(options) {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
    if (options.category_id) {
      this.setData({ activeCategoryId: options.category_id })
    }
    if (options.keyword) {
      this.setData({ keyword: options.keyword })
    }
    this._loadCategories()
    this._loadProducts(true)
  },

  onPullDownRefresh() {
    this._loadProducts(true).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this._loadProducts(false)
    }
  },

  /** 加载分类列表 */
  _loadCategories() {
    productService.getCategoryList()
      .then((list) => {
        this.setData({ categories: [{ id: '', name: '全部' }].concat(list || []) })
      })
      .catch(() => {
        this.setData({ categories: [{ id: '', name: '全部' }] })
      })
  },

  /** 加载商品列表 */
  _loadProducts(reset = false) {
    if (this.data.loading) return Promise.resolve()

    const page = reset ? 1 : this.data.page + 1
    this.setData({ loading: true })

    const params = { current: page, size: this.data.pageSize }
    if (this.data.activeCategoryId) params.categoryId = this.data.activeCategoryId
    if (this.data.keyword) params.keyword = this.data.keyword
    if (this.data.activeSort) params.sort = this.data.activeSort

    return productService.getProductList(params)
      .then((res) => {
        const list = res.records || res.list || res.items || []
        const total = res.total || 0
        const hasMore = page * this.data.pageSize < total
        const products = reset ? list : this.data.products.concat(list)
        this.setData({
          products,
          page,
          total,
          hasMore,
          loading: false,
          isEmpty: products.length === 0,
        })
      })
      .catch(() => {
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  /** 搜索输入 */
  onSearchInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  /** 确认搜索 */
  onSearchConfirm() {
    this._loadProducts(true)
  },

  /** 清空搜索 */
  onSearchClear() {
    this.setData({ keyword: '' })
    this._loadProducts(true)
  },

  /** 选择分类 */
  onCategoryTap(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ activeCategoryId: id })
    this._loadProducts(true)
  },

  /** 切换排序面板 */
  onSortToggle() {
    this.setData({ showSortPanel: !this.data.showSortPanel })
  },

  /** 选择排序方式 */
  onSortSelect(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ activeSort: key, showSortPanel: false })
    this._loadProducts(true)
  },

  /** 关闭排序面板 */
  onSortMaskTap() {
    this.setData({ showSortPanel: false })
  },

  /** 点击商品跳转详情 */
  onProductTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/product-detail/product-detail?id=' + id })
  },
})
