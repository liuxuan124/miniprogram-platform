// components/dsl-product-list/dsl-product-list.js — 商品列表组件
const { executeAction } = require('../../utils/render')

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
    moreLink: '/pages/product-list/product-list',
    titleStyle: '',
    priceStyle: '',
    salesStyle: '',
    layout: 'grid',
    columnCount: 2,
  },

  observers: {
    'runtimeData, config': function () {
      this._refreshDisplayData()
    },
  },

  lifetimes: {
    attached() {
      this._refreshDisplayData()
    },
  },

  methods: {
    _refreshDisplayData() {
      const runtimeData = Array.isArray(this.data.runtimeData) ? this.data.runtimeData : []
      const config = this.data.config || {}
      const fallback = [
        { id: 'preview-1', name: '跨境通用知识库', price: '199.00', sales: 128 },
        { id: 'preview-2', name: '跨境财税知识库', price: '299.00', sales: 86 },
      ]
      const ids = Array.isArray(config.product_ids)
        ? config.product_ids.map((id) => String(id)).filter(Boolean)
        : []
      const savedItems = Array.isArray(config.items) ? config.items : []
      let source = runtimeData.length ? runtimeData : []
      // 手动选品：按勾选顺序展示；接口无数据时回退到 DSL 内已保存 items
      if (ids.length) {
        const pool = (runtimeData.length ? runtimeData : savedItems)
        const map = {}
        pool.forEach((item) => {
          if (item && item.id != null) map[String(item.id)] = item
        })
        const ordered = ids.map((id) => map[String(id)]).filter(Boolean)
        if (ordered.length) source = ordered
        else if (savedItems.length) source = savedItems
      } else if (!source.length && savedItems.length) {
        source = savedItems
      }
      if (!source.length) source = fallback
      const limit = Math.max(Number(config.limit || source.length), 1)
      const titleBold = config.title_bold !== false
      const displayData = source.slice(0, limit).map((item, index) => ({
        ...item,
        _key: item._key || `product_${item.id || index}_${index}`,
      }))
      const titleSize = Number(config.title_font_size) > 0 ? Number(config.title_font_size) : 14
      const priceSize = Number(config.price_font_size) > 0
        ? Number(config.price_font_size)
        : (Number(config.subtitle_font_size) > 0 ? Number(config.subtitle_font_size) : 13)
      const salesSize = Number(config.sales_font_size) > 0
        ? Number(config.sales_font_size)
        : (Number(config.subtitle_font_size) > 0 ? Number(config.subtitle_font_size) : 11)
      const layout = ['grid', 'list', 'waterfall'].includes(config.layout) ? config.layout : 'grid'
      const columnCount = layout === 'list' ? 1 : (layout === 'waterfall' ? 2 : Number(config.columns || 2))
      const sectionStyle = ['bar', 'card', 'plain'].includes(config.section_style) ? config.section_style : 'bar'
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
      const moreLink = String(config.more_link || '/pages/product-list/product-list').trim()
        || '/pages/product-list/product-list'
      const moreColor = config.more_color || (isBand ? '#D4E2FF' : '#7b8798')
      this.setData({
        displayData,
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
      })
    },

    onTapMore() {
      const link = String(this.data.moreLink || '/pages/product-list/product-list').trim()
      if (!link) return
      if (/^https?:\/\//i.test(link)) {
        executeAction({ type: 'webview', url: link })
        return
      }
      executeAction({ type: 'page', path: link })
    },

    /** 点击购物车 */
    onTapCart(e) {
      const name = e.currentTarget.dataset.name || '商品'
      wx.showToast({ title: `已加入「${name}」`, icon: 'none' })
    },

    /** 点击商品 */
    onTapProduct(e) {
      const id = e.currentTarget.dataset.id
      const product = this.data.displayData.find((p) => p.id === id)

      if (product && product.action) {
        executeAction(product.action)
      } else {
        // 默认跳转商品详情
        executeAction({
          type: 'page',
          path: '/pages/product-detail/product-detail?id=' + id,
        })
      }
    },
  },
})
