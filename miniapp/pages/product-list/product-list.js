// pages/product-list/product-list.js — 商品列表页
// 分类筛选、搜索、排序、下拉刷新、上拉加载

const productService = require('../../services/product')
const { createSharePageConfig } = require('../../utils/share')

Page({
  ...createSharePageConfig(),
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
    typeTabs: [],
    activeType: '',
    productType: '',
  },

  onLoad(options) {
    if (options && options.category_id) {
      this.setData({ activeCategoryId: options.category_id })
    }
    if (options && options.keyword) {
      this.setData({ keyword: options.keyword })
    }
    if (options && (options.type === 'digital' || options.type === 'ebook')) {
      this.setData({ productType: 'digital', activeType: 'digital' })
    } else if (options && (options.type === 'service' || options.type === 'consult')) {
      this.setData({ productType: 'service', activeType: 'service' })
    }
    this._loadCategories()
    this._loadProducts(true)
  },

  onShow() {
    wx.hideTabBar({ animation: false, fail() {} })
    try {
      const q = wx.getStorageSync('__tab_query__/pages/product-list/product-list')
      if (q && typeof q === 'object') {
        wx.removeStorageSync('__tab_query__/pages/product-list/product-list')
        const type = q.type || ''
        if (type === 'digital' || type === 'ebook') {
          this.setData({ productType: 'digital', activeType: 'digital' })
          this._loadProducts(true)
        } else if (type === 'service' || type === 'consult') {
          this.setData({ productType: 'service', activeType: 'service' })
          this._loadProducts(true)
        }
      }
    } catch (e) { /* ignore */ }
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

  /** 加载分类列表（仅启用中的实物分类） */
  _loadCategories() {
    productService.getCategoryList()
      .then((list) => {
        const categories = (list || []).filter((item) => item && item.status !== 0 && item.status !== '0')
        this.setData({ categories })
      })
      .catch(() => {
        this.setData({ categories: [] })
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
    if (this.data.productType) params.productType = this.data.productType

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
    this.setData({ activeCategoryId: id || '' })
    this._loadProducts(true)
  },

  onGoCart() {
    wx.navigateTo({ url: '/pages/cart/cart' })
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

  /** D4：图片加载失败时换成统一占位图，避免裂图图标
   * 模板 src 取 image/cover_url/main_image/mainImage 中第一个真值，四个字段都要清空改写才能确保生效 */
  onImageError(e) {
    const index = e.currentTarget.dataset.index
    const fallback = '/images/default-product.svg'
    this.setData({
      [`products[${index}].image`]: fallback,
      [`products[${index}].cover_url`]: fallback,
      [`products[${index}].main_image`]: fallback,
      [`products[${index}].mainImage`]: fallback,
    })
  },

  onClearFilters() {
    this.setData({
      keyword: '',
      activeType: '',
      productType: '',
      activeCategoryId: '',
      activeSort: 'created_desc',
    })
    this._loadProducts(true)
  },
})
