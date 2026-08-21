// components/dsl-product-list/dsl-product-list.js — 商品列表组件
const { executeAction } = require('../../utils/render')
const { formatProductPriceLabel, formatProductSalesLabel } = require('../../utils/product-price-display')
const { filterProductsByPrice, resolvePriceFilterConfig } = require('../../utils/product-price-filter')
const DatasourceService = require('../../services/datasource')
const { normalizeImageUrl } = require('../../utils/image-preload')

function calcPageSize(config) {
  const raw = Number(config && config.page_size)
  if (Number.isFinite(raw) && raw >= 5) return Math.min(raw, 30)
  return 10
}

Component({
  properties: {
    /** 组件配置 */
    config: {
      type: Object,
      value: {},
    },
    /** 运行时数据（由数据源填充） */
    runtimeData: {
      type: Array,
      value: [],
    },
    /** 数据源配置（商品流触底加载用） */
    dataSource: {
      type: Object,
      value: null,
    },
    /** 组件动作列表 */
    actions: {
      type: Array,
      value: [],
    },
    /** 自定义样式 */
    styleString: {
      type: String,
      value: '',
    },
  },

  data: {
    displayData: [],
    sectionTitle: '',
    sectionSubtitle: '',
    sectionStyle: 'bar',
    sectionAlign: 'left',
    sectionDivider: false,
    sectionTitleStyle: '',
    sectionSubtitleStyle: '',
    sectionMoreStyle: '',
    showMore: true,
    moreText: '查看更多>',
    moreLink: '/pages/knowledge-mall/knowledge-mall',
    titleStyle: '',
    priceStyle: '',
    salesStyle: '',
    layout: 'grid',
    columnCount: 2,
    itemCardStyle: '',
    itemImageStyle: '',
    gridGapStyle: 'gap:16rpx;',
    showRating: true,
    isStreamMode: false,
    hasMore: false,
    loadingMore: false,
    footerText: '',
    page: 0,
  },

  observers: {
    'runtimeData, config, dataSource': function () {
      this._onInputsChanged()
    },
  },

  lifetimes: {
    attached() {
      this._lastDisplayMode = ''
      this._streamBootstrapped = false
      this._onInputsChanged()
    },
  },

  methods: {
    loadMore() {
      if (!this.data.isStreamMode || !this.data.hasMore || this.data.loadingMore) return
      this._fetchStreamPage(false)
    },

    _onInputsChanged() {
      const config = this.data.config || {}
      const mode = config.display_mode === 'stream' ? 'stream' : 'fixed'
      if (this._lastDisplayMode !== mode) {
        this._streamBootstrapped = false
        this._lastDisplayMode = mode
      }
      this._applyPresentationStyles(config)
      if (mode === 'stream') {
        if (!this._streamBootstrapped) {
          this._bootstrapStream()
        }
        return
      }
      this._streamBootstrapped = false
      this._refreshDisplayDataFixed()
    },

    _isManualPick(config) {
      const ids = Array.isArray(config.product_ids)
        ? config.product_ids.map((id) => String(id)).filter(Boolean)
        : []
      return config.source_mode === 'manual' || ids.length > 0
    },

    _pageSize() {
      return calcPageSize(this.data.config || {})
    },

    _buildDataSource(config) {
      const ds = this.data.dataSource
      if (ds && ds.type) return ds
      const ids = Array.isArray(config.product_ids)
        ? config.product_ids.map((id) => String(id)).filter(Boolean)
        : []
      const base = { type: 'product', params: { status: 'on_sale' }, query: { status: 'on_sale' } }
      if (ids.length) {
        const idStr = ids.join(',')
        base.params.ids = idStr
        base.query.ids = idStr
      }
      return base
    },

    _resolveSource(config, runtimeData) {
      const fallback = [
        { id: 'preview-1', name: '跨境通用知识库', price: '199.00', sales: 128 },
        { id: 'preview-2', name: '跨境财税知识库', price: '299.00', sales: 86 },
      ]
      const ids = Array.isArray(config.product_ids)
        ? config.product_ids.map((id) => String(id)).filter(Boolean)
        : []
      const savedItems = Array.isArray(config.items) ? config.items : []
      let source = Array.isArray(runtimeData) && runtimeData.length ? runtimeData : []
      const mergeItem = (saved, fresh) => {
        if (!saved && !fresh) return null
        const merged = { ...(saved || {}), ...(fresh || {}) }
        const main = (fresh && (fresh.mainImage || fresh.main_image))
          || (saved && (saved.mainImage || saved.main_image))
          || ''
        if (main) {
          merged.mainImage = main
          merged.main_image = main
        }
        return merged
      }
      if (ids.length) {
        const runtimeMap = {}
        ;(runtimeData || []).forEach((item) => {
          if (item && item.id != null) runtimeMap[String(item.id)] = item
        })
        const savedMap = {}
        savedItems.forEach((item) => {
          if (item && item.id != null) savedMap[String(item.id)] = item
        })
        const ordered = ids.map((id) => mergeItem(savedMap[String(id)], runtimeMap[String(id)])).filter(Boolean)
        if (ordered.length) source = ordered
        else if (savedItems.length) source = savedItems
      } else if (!source.length && savedItems.length) {
        source = savedItems
      }
      if (!source.length) source = fallback
      return source
    },

    _applyPriceFilter(source, config) {
      const priceFilter = resolvePriceFilterConfig(config)
      if (priceFilter.mode === 'all') return source
      return filterProductsByPrice(source, priceFilter)
    },

    _mapDisplayItems(source, config, startIndex = 0) {
      const layout = ['grid', 'list', 'waterfall'].includes(config.layout) ? config.layout : 'grid'
      const artPalette = [
        { bg: '#dbeafe', glyph: '📘' },
        { bg: '#ffedd5', glyph: '☕' },
        { bg: '#e0e7ff', glyph: '📦' },
        { bg: '#dcfce7', glyph: '🎁' },
      ]
      const pickTypeLabel = (item) => {
        const raw = String(item.product_type || item.productType || item.type || item.category_name || item.categoryName || '').toLowerCase()
        const name = String(item.name || item.title || '')
        if (/实物|physical|goods|周边|手册|纸质/.test(raw) || /实物|周边|手册|纸质/.test(name)) return '实物商品'
        if (/咨询|1v1|service|服务/.test(raw)) return '1v1 咨询'
        if (/数字|digital|知识|课|资料/.test(raw)) return '数字商品'
        return '实物商品'
      }
      const pickCover = (item) => {
        const gallery = item.images
        const firstFromGallery = Array.isArray(gallery) && gallery.length ? String(gallery[0] || '').trim() : ''
        return normalizeImageUrl(String(
          item.mainImage || item.main_image || item.coverUrl || item.cover_url
          || item.coverImage || item.cover || item.image || item.pic || firstFromGallery || '',
        ).trim())
      }
      const zeroPriceDisplay = config.zero_price_display === 'free' ? 'free' : 'amount'
      return source.map((item, index) => {
        const globalIndex = startIndex + index
        const cover = pickCover(item)
        const sales = Number(item.sales || item.salesCount || item.sold || 0) || 0
        const price = item.price || item.min_price || item.minPrice || '0.00'
        const priceLabel = formatProductPriceLabel(price, zeroPriceDisplay)
        const salesLabel = formatProductSalesLabel(price, sales)
        const scoreRaw = item.avg_score || item.avgScore || item.rating || item.score
        const score = Number(scoreRaw)
        const reviews = Number(item.review_count || item.reviewCount || item.comment_count || item.comments || 0)
        const safeScore = Number.isFinite(score) && score > 0 ? score.toFixed(1) : '4.9'
        const safeReviews = reviews > 0 ? reviews : (86 + (globalIndex % 40))
        const art = artPalette[globalIndex % artPalette.length]
        return {
          ...item,
          _key: item._key || `product_${item.id || globalIndex}_${globalIndex}`,
          _cover: cover,
          _eager: globalIndex < 6,
          _price: price,
          _priceLabel: (priceLabel.withYuan ? '¥' : '') + priceLabel.text,
          _sales: sales,
          _salesLabel: salesLabel,
          _meta: pickTypeLabel(item) + ' · ' + salesLabel,
          _ratingLine: '⭐ ' + safeScore + ' · ' + safeReviews + ' 评价',
          _glyph: art.glyph,
          _artStyle: 'background:' + art.bg + ';',
        }
      })
    },

    _applyPresentationStyles(config) {
      const layout = ['grid', 'list', 'waterfall'].includes(config.layout) ? config.layout : 'grid'
      const showRating = layout === 'list' ? config.show_rating !== false : config.show_rating === true
      const titleSize = Number(config.title_font_size) > 0 ? Number(config.title_font_size) : (layout === 'list' ? 15 : 14)
      const priceSize = Number(config.price_font_size) > 0
        ? Number(config.price_font_size)
        : (Number(config.subtitle_font_size) > 0 ? Number(config.subtitle_font_size) : (layout === 'list' ? 16 : 13))
      const salesSize = Number(config.sales_font_size) > 0
        ? Number(config.sales_font_size)
        : (Number(config.subtitle_font_size) > 0 ? Number(config.subtitle_font_size) : 11)
      const columnCount = layout === 'list' ? 1 : (layout === 'waterfall' ? 2 : Number(config.columns || 2))
      const sectionStyle = ['bar', 'card', 'plain'].includes(config.section_style) ? config.section_style : 'plain'
      const sectionAlign = config.section_align === 'center' ? 'center' : 'left'
      const sectionDivider = config.section_divider === true
      const sectionTitleSize = Number(config.section_title_font_size) > 0 ? Number(config.section_title_font_size) : 16
      const sectionSubSize = Number(config.section_subtitle_font_size) > 0 ? Number(config.section_subtitle_font_size) : 11
      const sectionBold = config.section_title_bold !== false
      const isBand = sectionStyle === 'bar'
      let sectionColor = config.section_title_color || (isBand ? '#F3F7FC' : '#172033')
      if (isBand && sectionColor === '#172033') sectionColor = '#F3F7FC'
      const sectionSubColor = config.section_subtitle_color || (isBand ? '#D4E2FF' : '#7b8798')
      const showMore = config.show_more !== false
      const moreText = String(config.more_text || '查看更多>').trim() || '查看更多>'
      const moreLink = String(config.more_link || '/pages/knowledge-mall/knowledge-mall').trim()
        || '/pages/knowledge-mall/knowledge-mall'
      const moreColor = config.more_color || (isBand ? '#D4E2FF' : '#7b8798')
      const radiusRaw = config.item_border_radius
      const radiusNum = radiusRaw === undefined || radiusRaw === null || radiusRaw === ''
        ? (layout === 'list' ? 14 : 12)
        : Number(radiusRaw)
      const itemCardStyle = Number.isFinite(radiusNum)
        ? ('border-radius:' + Math.max(0, radiusNum) * 2 + 'rpx;')
        : ''
      const imgRadiusRaw = config.image_border_radius
      const imgRadiusNum = imgRadiusRaw === undefined || imgRadiusRaw === null || imgRadiusRaw === ''
        ? (layout === 'list' ? 10 : 0)
        : Number(imgRadiusRaw)
      const itemImageStyle = Number.isFinite(imgRadiusNum)
        ? ('border-radius:' + Math.max(0, imgRadiusNum) * 2 + 'rpx;')
        : ''
      const gapRaw = Number(config.item_gap)
      const itemGap = Number.isFinite(gapRaw) ? Math.max(0, Math.min(gapRaw, 48)) : (layout === 'list' ? 10 : 8)
      const gridGapStyle = layout === 'list'
        ? ('gap:' + (itemGap * 2) + 'rpx;')
        : ('grid-template-columns:repeat(' + columnCount + ',1fr);gap:' + (itemGap * 2) + 'rpx;')
      const titleBold = config.title_bold !== false
      this.setData({
        sectionTitle: String(config.title || '').trim(),
        sectionSubtitle: String(config.subtitle || '').trim(),
        sectionStyle,
        sectionAlign,
        sectionDivider,
        sectionTitleStyle: 'font-size:' + (sectionTitleSize * 2) + 'rpx;font-weight:' + (sectionBold ? '800' : '400') + ';color:' + sectionColor + ';',
        sectionSubtitleStyle: 'font-size:' + (sectionSubSize * 2) + 'rpx;color:' + sectionSubColor + ';',
        sectionMoreStyle: 'color:' + moreColor + ';',
        showMore,
        moreText,
        moreLink,
        titleStyle: 'font-size:' + (titleSize * 2) + 'rpx;font-weight:' + (titleBold ? '700' : '400') + ';',
        priceStyle: 'font-size:' + (priceSize * 2) + 'rpx;color:' + (config.price_color || '#E53935') + ';',
        salesStyle: 'font-size:' + (salesSize * 2) + 'rpx;',
        layout,
        columnCount,
        itemCardStyle,
        itemImageStyle,
        gridGapStyle,
        showRating,
      })
    },

    _bootstrapStream() {
      const config = this.data.config || {}
      const runtimeData = Array.isArray(this.data.runtimeData) ? this.data.runtimeData : []
      const pageSize = this._pageSize()
      const source = this._resolveSource(config, runtimeData)

      if (this._isManualPick(config)) {
        const filtered = this._applyPriceFilter(source, config)
        const mapped = this._mapDisplayItems(filtered, config, 0)
        this.setData({
          displayData: mapped,
          isStreamMode: false,
          hasMore: false,
          loadingMore: false,
          page: mapped.length ? 1 : 0,
          footerText: mapped.length ? '没有更多了' : '',
        })
        this._streamBootstrapped = true
        return
      }

      const filtered = this._applyPriceFilter(source, config)
      const slice = filtered.slice(0, pageSize)
      const mapped = this._mapDisplayItems(slice, config, 0)
      this.setData({
        displayData: mapped,
        isStreamMode: true,
        page: mapped.length ? 1 : 0,
        hasMore: slice.length >= pageSize,
        loadingMore: false,
        footerText: slice.length >= pageSize ? '' : (mapped.length ? '没有更多了' : ''),
      })
      this._localPool = filtered
      this._streamBootstrapped = true
    },

    _fetchStreamPage(reset) {
      const config = this.data.config || {}
      const pageSize = this._pageSize()
      const nextPage = reset ? 1 : (this.data.page || 0) + 1
      const dataSource = this._buildDataSource(config)

      if (reset) {
        this.setData({ loadingMore: false, footerText: '' })
      } else {
        this.setData({ loadingMore: true, footerText: '加载中...' })
      }

      DatasourceService.fetchPagedData(dataSource, nextPage, pageSize)
        .then(({ list, hasMore }) => {
          let filtered = this._applyPriceFilter(list || [], config)
          const startIndex = reset ? 0 : (this.data.displayData || []).length
          const mapped = this._mapDisplayItems(filtered, config, startIndex)
          const merged = reset ? mapped : (this.data.displayData || []).concat(mapped)
          const stillHasMore = hasMore || filtered.length >= pageSize
          this.setData({
            displayData: merged,
            page: nextPage,
            hasMore: stillHasMore,
            loadingMore: false,
            footerText: stillHasMore ? '' : (merged.length ? '没有更多了' : ''),
          })
        })
        .catch(() => {
          this._sliceLocalPool(reset, nextPage, pageSize, config)
        })
    },

    _sliceLocalPool(reset, nextPage, pageSize, config) {
      const pool = this._localPool || []
      const start = (nextPage - 1) * pageSize
      const slice = pool.slice(start, start + pageSize)
      const startIndex = reset ? 0 : (this.data.displayData || []).length
      const mapped = this._mapDisplayItems(slice, config, startIndex)
      const merged = reset ? mapped : (this.data.displayData || []).concat(mapped)
      const hasMore = start + pageSize < pool.length
      this.setData({
        displayData: merged,
        page: nextPage,
        hasMore,
        loadingMore: false,
        footerText: hasMore ? '' : (merged.length ? '没有更多了' : ''),
      })
    },

    _refreshDisplayDataFixed() {
      const runtimeData = Array.isArray(this.data.runtimeData) ? this.data.runtimeData : []
      const config = this.data.config || {}
      let source = this._resolveSource(config, runtimeData)
      source = this._applyPriceFilter(source, config)
      const limit = Math.max(Number(config.limit || source.length), 1)
      const displayData = this._mapDisplayItems(source.slice(0, limit), config, 0)
      this.setData({
        displayData,
        isStreamMode: false,
        hasMore: false,
        loadingMore: false,
        footerText: '',
        page: 0,
      })
    },

    onTapMore() {
      const link = String(this.data.moreLink || '/pages/knowledge-mall/knowledge-mall').trim()
      if (!link) return
      if (/^https?:\/\//i.test(link)) {
        executeAction({ type: 'webview', url: link })
        return
      }
      executeAction({ type: 'page', path: link })
    },

    onTapProduct(e) {
      const id = e.currentTarget.dataset.id
      const product = this.data.displayData.find((p) => p.id === id)

      if (product && product.action) {
        executeAction(product.action)
      } else {
        executeAction({
          type: 'page',
          path: '/pages/product-detail/product-detail?id=' + id,
        })
      }
    },
  },
})
