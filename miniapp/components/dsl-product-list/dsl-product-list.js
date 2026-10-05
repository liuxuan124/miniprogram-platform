// components/dsl-product-list/dsl-product-list.js — 商品列表组件
const { executeAction } = require('../../utils/render')
const { formatProductPriceLabel, formatProductSalesLabel } = require('../../utils/product-price-display')
const { filterProductsByPrice, resolvePriceFilterConfig } = require('../../utils/product-price-filter')
const DatasourceService = require('../../services/datasource')
const { normalizeImageUrl } = require('../../utils/image-preload')
const {
  normalizeProductListProps,
  resolveCardSurface,
  resolveCtaText,
  resolveColumnCount,
  resolveProductBadge,
  resolveOriginalPrice,
} = require('../../utils/product-list-props')

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
    moreLink: '/pages/shop/shop',
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
      const { getProductEnabledSync } = require('../../utils/product-module-gate')
      if (!getProductEnabledSync()) {
        this.setData({ displayData: [], hidden: true, showMore: false })
        return
      }
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
        { id: 'preview-1', name: '示例商品 A', price: '199.00', sales: 128 },
        { id: 'preview-2', name: '示例商品 B', price: '299.00', sales: 86 },
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
      // 🔴 归一化只做一次，布局四档与旧值映射都在 product-list-props 里
      const cfg = normalizeProductListProps(config)
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
      const zeroPriceDisplay = cfg.zeroPriceDisplay
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
        const safeScore = Number.isFinite(score) && score > 0 ? score.toFixed(1) : ''
        const safeReviews = reviews > 0 ? reviews : 0
        const art = artPalette[globalIndex % artPalette.length]
        // 🔴 0 元商品单独标记：wxml 靠它区分「免费领取」与「¥0」，
        //    画布与真机必须一致，否则运营会以为其中一端坏了。
        const priceNum = Number(price)
        const isFree = priceNum === 0
        const originalPrice = resolveOriginalPrice(item)
        const badge = resolveProductBadge(cfg.badgeMode, cfg.badgeText, priceNum, originalPrice)
        return {
          ...item,
          _key: item._key || `product_${item.id || globalIndex}_${globalIndex}`,
          _cover: cover,
          _eager: globalIndex < 6,
          _price: price,
          _priceLabel: (priceLabel.withYuan ? '¥' : '') + priceLabel.text,
          _isFree: isFree,
          _originalPrice: originalPrice > 0 ? originalPrice.toFixed(2) : '',
          _badge: badge,
          _sales: sales,
          _salesLabel: salesLabel,
          _meta: pickTypeLabel(item) + ' · ' + salesLabel,
          _ratingLine: safeScore
            ? ('⭐ ' + safeScore + (safeReviews ? (' · ' + safeReviews + ' 评价') : ''))
            : (safeReviews ? (safeReviews + ' 评价') : ''),
          _glyph: art.glyph,
          _artStyle: 'background:' + art.bg + ';',
        }
      })
    },

    /**
     * 展示样式：全部读 normalizeProductListProps 的结果。
     * 🔴 旧代码在本方法里又算了一遍布局/圆角/间距/字号/列数的默认值与兜底，
     *   和后台 props 面板各写一份 —— 改一边另一边不认。现统一到 Schema。
     */
    _applyPresentationStyles(config) {
      const cfg = normalizeProductListProps(config)
      const layout = cfg.layout
      const columnCount = resolveColumnCount(layout, cfg.columns)
      const isRow = layout === 'row'
      const showRating = cfg.showRating
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
      const moreColor = config.more_color || (isBand ? '#D4E2FF' : cfg.priceColor)

      // 卡片表面：白卡投影 / 描边 / 平铺（与后台 resolveCardSurface 同规则）
      const surface = resolveCardSurface(cfg.cardStyle, cfg.itemBorderRadius)
      const itemCardStyle = [
        'border-radius:' + (cfg.itemBorderRadius * 2) + 'rpx;',
        'background:' + surface.background + ';',
        surface.border ? ('border:' + surface.border + ';') : '',
        surface.boxShadow ? ('box-shadow:' + surface.boxShadow + ';') : '',
      ].join('')
      const itemImageStyle = 'border-radius:' + (cfg.imageBorderRadius * 2) + 'rpx;'

      // gap：rpx 化（px × 2）
      const gapRpx = cfg.itemGap * 2
      let gridGapStyle = 'gap:' + gapRpx + 'rpx;'
      if (isRow) {
        gridGapStyle = 'gap:' + gapRpx + 'rpx;'
      } else if (layout === 'scroll') {
        // 🔴 横向滑动：grid-auto-flow: column + auto-columns，卡片宽度固定且可横滑。
        //    直接写 flex 会让「两列/三列」的列数设置失效。
        gridGapStyle = 'display:grid;grid-auto-flow:column;grid-auto-columns:minmax(264rpx,42%);overflow-x:auto;gap:' + gapRpx + 'rpx;padding-bottom:8rpx;'
      } else {
        gridGapStyle = 'grid-template-columns:repeat(' + columnCount + ',minmax(0,1fr));gap:' + gapRpx + 'rpx;'
      }

      // CTA 文案
      const ctaText = cfg.cta === 'cart' ? '🛒' : resolveCtaText(cfg.cta, cfg.ctaText)
      const ctaStyle = cfg.cta === 'cart'
        ? ('color:' + cfg.priceColor + ';border:1rpx solid ' + cfg.priceColor + '44;')
        : ('background:' + cfg.priceColor + ';color:#fff;')

      this.setData({
        // 🔴 showTitle=false 时整行不渲染（wxml 用它做 wx:if）
        showTitle: cfg.showTitle,
        sectionTitle: String(cfg.title || '').trim(),
        sectionSubtitle: String(cfg.subtitle || '').trim(),
        sectionStyle,
        sectionAlign,
        sectionDivider,
        sectionTitleStyle: 'font-size:' + (sectionTitleSize * 2) + 'rpx;font-weight:' + (sectionBold ? '800' : '400') + ';color:' + sectionColor + ';',
        sectionSubtitleStyle: 'font-size:' + (sectionSubSize * 2) + 'rpx;color:' + sectionSubColor + ';',
        sectionMoreStyle: 'color:' + moreColor + ';',
        showMore: cfg.showMore,
        moreText: cfg.moreText + ' ›',
        moreLink: cfg.moreLink || '/pages/shop/shop',
        titleStyle: 'font-size:' + (cfg.titleFontSize * 2) + 'rpx;font-weight:' + (cfg.titleBold ? '700' : '400') + ';',
        // 0 元商品价格色由 wxml 按 _isFree 覆盖为绿色
        priceStyle: 'font-size:' + (cfg.priceFontSize * 2) + 'rpx;color:' + cfg.priceColor + ';',
        freePriceStyle: 'font-size:' + (cfg.priceFontSize * 2) + 'rpx;color:#1FA97A;',
        salesStyle: 'font-size:' + (cfg.salesFontSize * 2) + 'rpx;',
        showTitleInCard: cfg.showTitleInCard,
        showOriginalPrice: cfg.showOriginalPrice,
        showSales: cfg.showSales,
        ctaText,
        ctaStyle,
        badgeStyle: 'background:' + cfg.priceColor + ';',
        cardStyle: cfg.cardStyle,
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
      const link = String(this.data.moreLink || '/pages/shop/shop').trim()
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
          path: '/pkg-content/product-detail/product-detail?id=' + id,
        })
      }
    },

    /**
     * 卡片 CTA 按钮：catchtap 阻止冒泡，避免同时触发 onTapProduct 跳详情。
     *
     * 🔴 咨询类没有统一落地页（客服会话 / 二维码 / 表单各不相同），
     *   这里不猜路径：只透出事件让页面层接管，行为由业务方决定。
     *   猜一个路径写死会让「立即咨询」点进去是空白页。
     */
    onCtaTap(e) {
      const id = e.currentTarget.dataset.id
      this.triggerEvent('componentevent', {
        type: 'product_cta',
        cta: this.data.ctaText,
        productId: id,
      })
      wx.showToast({ title: '咨询功能待接入', icon: 'none' })
    },
  },
})
