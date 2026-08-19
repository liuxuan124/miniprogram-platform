// pages/knowledge-mall/knowledge-mall.js — 对齐原型「知识商城」
const productService = require('../../services/product')
const cartService = require('../../services/cart')
const { createSharePageConfig } = require('../../utils/share')

const TYPE_TABS = [
  { key: 'all', label: '全部' },
  { key: 'ebook', label: '电子书 / 资料包' },
  { key: 'consult', label: '1v1 咨询' },
  { key: 'bundle', label: '组合套装' },
]

const TYPE_LABEL = {
  digital: '数字商品 · 虚拟发货',
  ebook: '电子书 / 资料包',
  service: '1v1 咨询',
  consult: '1v1 咨询',
  physical: '实物商品 · 快递发货',
  bundle: '组合套装',
}

const FALLBACK_GLYPH = {
  ebook: { glyph: '📘', topic: 'select' },
  digital: { glyph: '📘', topic: 'select' },
  consult: { glyph: '🗓️', topic: 'platform' },
  service: { glyph: '🗓️', topic: 'platform' },
  bundle: { glyph: '📦', topic: 'supply' },
  physical: { glyph: '🛍️', topic: 'ops' },
}

const ART = {
  select: 'background:linear-gradient(135deg,#dbeafe,#93c5fd);',
  supply: 'background:linear-gradient(135deg,#d1fae5,#6ee7b7);',
  platform: 'background:linear-gradient(135deg,#ede9fe,#c4b5fd);',
  ops: 'background:linear-gradient(135deg,#ffedd5,#fdba74);',
}

function formatPrice(v) {
  if (v == null || v === '') return '0'
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

function pickCover(item) {
  return (
    item.mainImage ||
    item.main_image ||
    item.coverUrl ||
    item.cover_url ||
    item.image ||
    ''
  )
}

function pickType(item) {
  const raw = item.productType || item.product_type || ''
  if (raw) return String(raw).toLowerCase()
  try {
    const arr = typeof item.productTypes === 'string'
      ? JSON.parse(item.productTypes)
      : item.productTypes
    if (Array.isArray(arr) && arr[0]) return String(arr[0]).toLowerCase()
  } catch (e) { /* ignore */ }
  const name = String(item.name || item.title || '')
  if (/咨询|1v1|预约/.test(name)) return 'consult'
  if (/资料|电子书|案例库|清单/.test(name)) return 'ebook'
  if (/套装|组合/.test(name)) return 'bundle'
  return 'physical'
}

function matchesTypeTab(type, tab) {
  if (!tab || tab === 'all') return true
  if (tab === 'ebook') return type === 'ebook' || type === 'digital'
  if (tab === 'consult') return type === 'consult' || type === 'service'
  if (tab === 'bundle') return type === 'bundle'
  return type === tab
}

function buildMeta(item, type) {
  const base = TYPE_LABEL[type] || '商品'
  const sales = Number(item.sales || item.salesCount || item.sold || 0)
  if (type === 'service' || type === 'consult') {
    return sales > 0 ? `${base} · 已约 ${sales} 次` : `${base} · 按时段预约`
  }
  if (type === 'ebook' || type === 'digital') {
    return sales > 0 ? `数字商品 · 虚拟发货 · 已售 ${sales}` : '数字商品 · 虚拟发货'
  }
  return sales > 0 ? `${base} · 已售 ${sales}` : base
}

function buildRatingText(item) {
  const avg = item.avgScore != null ? item.avgScore
    : item.avg_score != null ? item.avg_score
      : item.rating != null ? item.rating
        : 4.9
  const count = item.reviewCount != null ? item.reviewCount
    : item.review_count != null ? item.review_count
      : item.commentCount != null ? item.commentCount
        : Number(item.sales || item.sold || 0) || 0
  const score = Number(avg).toFixed(1)
  if (count > 0) return `⭐ ${score} · ${count} 评价`
  return `⭐ ${score}`
}

function normalizeProduct(item) {
  const type = pickType(item)
  const cover = pickCover(item)
  const fb = FALLBACK_GLYPH[type] || FALLBACK_GLYPH.physical
  const useGlyph = !cover || cover.indexOf('default-product') >= 0
  return {
    ...item,
    _type: type,
    _cover: cover || '/images/default-product.svg',
    _useGlyph: useGlyph,
    _glyph: fb.glyph,
    _artStyle: ART[fb.topic] || ART.select,
    _price: formatPrice(item.price != null ? item.price : item.minPrice || item.min_price),
    _meta: buildMeta(item, type),
    _ratingText: buildRatingText(item),
  }
}

Page({
  ...createSharePageConfig(),
  data: {
    statusBarHeight: 20,
    typeTabs: TYPE_TABS,
    activeType: 'all',
    products: [],
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: true,
    loading: false,
    refreshing: false,
    isEmpty: false,
    cartCount: 0,
  },

  onLoad(options) {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
    } catch (e) { /* ignore */ }
    const fromOpt = (options && options.type) || ''
    if (fromOpt) this.setData({ activeType: fromOpt })
    this._consumeTabQuery()
    this._loadProducts(true)
  },

  onShow() {
    wx.hideTabBar({ animation: false, fail() {} })
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2, hidden: false })
    }
    this._consumeTabQuery()
    this._refreshCartCount()
  },

  _consumeTabQuery() {
    try {
      const q = wx.getStorageSync('__tab_query__/pages/knowledge-mall/knowledge-mall')
      wx.removeStorageSync('__tab_query__/pages/knowledge-mall/knowledge-mall')
      if (q && q.type && q.type !== this.data.activeType) {
        this.setData({ activeType: q.type })
        this._loadProducts(true)
      }
    } catch (_) { /* ignore */ }
  },

  onPullDownRefresh() {
    this._loadProducts(true).finally(() => wx.stopPullDownRefresh())
  },

  onRefresh() {
    this.setData({ refreshing: true })
    this._loadProducts(true).finally(() => {
      this.setData({ refreshing: false })
    })
  },

  onReachBottomLoad() {
    if (this.data.hasMore && !this.data.loading) {
      this._loadProducts(false)
    }
  },

  _loadProducts(reset = false) {
    if (this.data.loading) return Promise.resolve()
    const page = reset ? 1 : this.data.page + 1
    this.setData({ loading: true })

    // 拉取稍多后在前端按原型类型过滤（后端未必支持 productType）
    const params = { current: page, size: this.data.pageSize }

    return productService.getProductList(params)
      .then((res) => {
        let list = (res.records || res.list || res.items || []).map(normalizeProduct)
        const tab = this.data.activeType
        if (tab && tab !== 'all') {
          list = list.filter((p) => matchesTypeTab(p._type, tab))
        }
        const total = res.total || list.length
        const products = reset ? list : this.data.products.concat(list)
        this.setData({
          products,
          page,
          total,
          hasMore: page * this.data.pageSize < (res.total || 0),
          loading: false,
          isEmpty: products.length === 0,
        })
      })
      .catch(() => {
        this.setData({ loading: false, isEmpty: this.data.products.length === 0 })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  _refreshCartCount() {
    if (!cartService || typeof cartService.getCartList !== 'function') return
    cartService.getCartList()
      .then((res) => {
        const items = res.items || res.list || res.records || (Array.isArray(res) ? res : [])
        const count = items.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0)
        this.setData({ cartCount: count })
      })
      .catch(() => { /* 未登录等忽略 */ })
  },

  onTypeTap(e) {
    const key = e.currentTarget.dataset.key || 'all'
    if (key === this.data.activeType) return
    this.setData({ activeType: key })
    this._loadProducts(true)
  },

  onClearFilters() {
    this.setData({ activeType: 'all' })
    this._loadProducts(true)
  },

  onGoCart() {
    wx.navigateTo({ url: '/pages/cart/cart' })
  },

  onProductTap(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: '/pages/product-detail/product-detail?id=' + id })
  },

  onImageError(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.products[index]
    if (!item) return
    const fb = FALLBACK_GLYPH[item._type] || FALLBACK_GLYPH.physical
    this.setData({
      [`products[${index}]._useGlyph`]: true,
      [`products[${index}]._glyph`]: fb.glyph,
      [`products[${index}]._artStyle`]: ART[fb.topic] || ART.select,
    })
  },
})
