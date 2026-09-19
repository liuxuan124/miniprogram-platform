// pages/product-list/product-list.js — 固定列表版式；生产走真实分类/商品

const productService = require('../../services/product')
const SystemService = require('../../services/system')
const { createSharePageConfig } = require('../../utils/share')
const { resolveMediaUrl } = require('../../utils/media-url')
const { FORCE_LOCAL_DEMO, USE_LOCAL_SOURCE, WARM_PAGE_STYLE } = require('../../data/warm-source')

const LOCAL_DEMO = FORCE_LOCAL_DEMO || USE_LOCAL_SOURCE

const DEFAULT_HEADER = {
  title: '精选好物',
  intro: '精选在售商品',
  guarantees: ['商家正常发货', '订单进度可查', '售后保障'],
  showTitle: true,
  showIntro: true,
  showGuarantees: true,
}

function flattenCategories(list, acc) {
  const rows = Array.isArray(list) ? list : []
  rows.forEach((item) => {
    if (!item) return
    if (item.status !== 0 && item.status !== '0') {
      acc.push({ id: item.id, name: item.name })
    }
    if (item.children && item.children.length) flattenCategories(item.children, acc)
  })
  return acc
}

function isVirtualProduct(item) {
  const t = String(item.productType || item.product_type || item.type || '').toLowerCase()
  const types = String(item.productTypes || item.product_types || '').toLowerCase()
  const blob = `${t} ${types}`
  return /digital|ebook|column|resource_pack|membership|virtual|course/.test(blob)
}

function isServiceProduct(item) {
  const t = String(item.productType || item.product_type || item.type || '').toLowerCase()
  const types = String(item.productTypes || item.product_types || '').toLowerCase()
  return /service/.test(`${t} ${types}`) && !isVirtualProduct(item)
}

function deliveryMeta(item) {
  if (isVirtualProduct(item)) {
    return { badge: '自动发货', ship: '虚拟发货' }
  }
  if (isServiceProduct(item)) {
    return { badge: '预约服务', ship: '到店/预约' }
  }
  return { badge: '实物发货', ship: '快递发货' }
}

function formatPrice(v) {
  if (v == null || v === '') return ''
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

function mapProduct(item) {
  const meta = deliveryMeta(item)
  const cover = resolveMediaUrl(item.mainImage || item.main_image || item.cover_url || item.image || '')
  return {
    ...item,
    image: cover,
    cover_url: cover,
    main_image: cover,
    mainImage: cover,
    price: formatPrice(item.price),
    originalPrice: formatPrice(item.originalPrice || item.original_price),
    original_price: formatPrice(item.originalPrice || item.original_price),
    sales: item.sales,
    stock: item.stock,
    badge: meta.badge,
    shipLabel: meta.ship,
  }
}

Page({
  ...createSharePageConfig(),
  data: {
    themePageStyle: WARM_PAGE_STYLE,
    keyword: '',
    categories: [],
    activeCategoryId: '',
    sortOptions: [
      { key: 'created_desc', label: '最新' },
      { key: 'sales_desc', label: '销量' },
      { key: 'price_asc', label: '价格↑' },
      { key: 'price_desc', label: '价格↓' },
    ],
    activeSort: 'created_desc',
    showSortPanel: false,
    products: [],
    page: 1,
    pageSize: 10,
    total: 0,
    hasMore: true,
    loading: false,
    refreshing: false,
    isEmpty: false,
    loadFailed: false,
    typeTabs: [],
    activeType: '',
    productType: '',
    header: DEFAULT_HEADER,
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
    this._loadHeader()
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
    this._loadHeader()
    this._loadCategories()
    this._loadProducts(true).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this._loadProducts(false)
    }
  },

  _loadHeader() {
    return SystemService.fetchSystemConfig()
      .then((config) => {
        const header = Object.assign({}, DEFAULT_HEADER, config.productListConfig || {})
        this.setData({ header })
      })
      .catch(() => {
        this.setData({ header: DEFAULT_HEADER })
      })
  },

  _loadCategories() {
    productService.getCategoryList()
      .then((list) => {
        const rows = Array.isArray(list) ? list : (list && (list.records || list.list)) || []
        const categories = flattenCategories(rows, [])
        this.setData({ categories })
      })
      .catch(() => {
        this.setData({ categories: [] })
      })
  },

  _loadProducts(reset = false) {
    if (LOCAL_DEMO) {
      this.setData({
        loading: false,
        loadFailed: false,
        products: [],
        isEmpty: true,
        hasMore: false,
        total: 0,
      })
      return Promise.resolve()
    }
    if (this.data.loading && !reset) return Promise.resolve()

    const page = reset ? 1 : this.data.page + 1
    this.setData({ loading: true, loadFailed: false })

    const params = { current: page, size: this.data.pageSize, showError: false }
    if (this.data.activeCategoryId) params.categoryId = this.data.activeCategoryId
    if (this.data.keyword) params.keyword = this.data.keyword
    if (this.data.activeSort) params.sort = this.data.activeSort
    if (this.data.productType) params.productType = this.data.productType

    return productService.getProductList(params)
      .then((res) => {
        const list = (res.records || res.list || res.items || []).map(mapProduct)
        const total = res.total || 0
        const hasMore = page * this.data.pageSize < total
        const products = reset ? list : this.data.products.concat(list)
        this.setData({
          products,
          page,
          total,
          hasMore,
          loading: false,
          loadFailed: false,
          isEmpty: products.length === 0,
        })
      })
      .catch(() => {
        this.setData({
          loading: false,
          loadFailed: true,
          products: reset ? [] : this.data.products,
          isEmpty: false,
          hasMore: reset ? false : this.data.hasMore,
        })
      })
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  onSearchConfirm() {
    this._loadProducts(true)
  },

  onSearchClear() {
    this.setData({ keyword: '' })
    this._loadProducts(true)
  },

  onCategoryTap(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ activeCategoryId: id || '' })
    this._loadProducts(true)
  },

  onGoCart() {
    wx.navigateTo({ url: '/pages/cart/cart' })
  },

  onSortToggle() {
    this.setData({ showSortPanel: !this.data.showSortPanel })
  },

  onSortSelect(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ activeSort: key, showSortPanel: false })
    this._loadProducts(true)
  },

  onSortMaskTap() {
    this.setData({ showSortPanel: false })
  },

  onProductTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/product-detail/product-detail?id=' + id })
  },

  onImageError(e) {
    const index = e.currentTarget.dataset.index
    const fallback = '/images/default-product.png'
    this.setData({
      [`products[${index}].image`]: fallback,
      [`products[${index}].cover_url`]: fallback,
      [`products[${index}].main_image`]: fallback,
      [`products[${index}].mainImage`]: fallback,
    })
  },

  onRetry() {
    this._loadHeader()
    this._loadCategories()
    this._loadProducts(true)
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
