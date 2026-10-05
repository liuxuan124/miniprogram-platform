// components/dsl-banner/dsl-banner.js — 轮播图组件
const { executeAction, isImageUrl, navigatePage } = require('../../utils/render')

// 与后台 admin/src/components/page-builder/banner/bannerSchema.ts 保持一致
const DEFAULT_RADIUS = 0
const ASPECT_RATIO = { '16:9': 16 / 9, '4:3': 4 / 3, '2.35:1': 2.35, '1:1': 1 }

Component({
  properties: {
    config: {
      type: Object,
      value: {},
    },
    actions: {
      type: Array,
      value: [],
    },
    styleString: {
      type: String,
      value: '',
    },
  },

  data: {
    current: 0,
    resolvedImages: [],
    // —— 以下为派生展示字段，由 _syncView() 统一写入 ——
    layoutMode: 'fullbleed',
    layoutClass: 'layout-fullbleed',
    swiperStyle: '',
    shadowStyle: '',
    maskStyle: '',
    titleStyle: '',
    descStyle: '',
    interval: 3000,
    // 图片填充模式：cover → aspectFill（等比铺满）/ contain → aspectFit（完整留白）
    imageMode: 'aspectFill',
    indicatorClass: '',
    indicatorStyle: '',
    customIndicator: false,
    showNativeDots: true,
  },

  observers: {
    'config.items, config.images, config.title': function () {
      this._resolveFromConfig(this.data.config || {})
    },
    // 样式类字段（宽高比/圆角/指示器/蒙层…）任一变化都要重算
    'config.aspect, config.layout_mode, config.radius_preset, config.radius_custom, config.shadow, config.overlay, config.indicator_type, config.indicator_pos, config.page_padding, config.custom_height, config.autoplay, config.loop, config.interval, config.object_fit': function () {
      this._syncView(this.data.config || {})
    },
  },

  lifetimes: {
    attached() {
      const config = this.data.config || {}
      this._syncView(config)
      this._resolveFromConfig(config)
    },
  },

  methods: {
    /**
     * 把配置里的样式类字段一次性算好写进 data。
     * 为什么集中在一个方法：这些值彼此有依赖（布局→高度→指示器位置），
     * 分散在各 observer 里会算到一半的旧值。
     */
    _syncView(config) {
      const c = config || {}
      const indicatorType = String(c.indicator_type || 'dots')
      const heightRpx = this._heightRpx(c)
      const layoutMode = String(c.layout_mode || 'fullbleed')

      // 间隔时间做边界保护：0 / '' / NaN 一律回落到 3000
      const rawInterval = Number(c.interval)
      const interval = Number.isFinite(rawInterval) && rawInterval >= 1000
        ? Math.min(rawInterval, 8000)
        : 3000

      // 原生指示点只用于「圆点」形态，其余形态走自定义指示器
      const showNativeDots = indicatorType === 'dots'
      const customIndicator = indicatorType !== 'none' && indicatorType !== 'dots'

      // 图片填充模式：cover → aspectFill（历史行为，默认）/ contain → aspectFit
      const imageMode = String(c.object_fit || 'cover') === 'contain' ? 'aspectFit' : 'aspectFill'

      this.setData({
        layoutMode,
        layoutClass: this._layoutClass(c),
        swiperStyle: `height:${heightRpx}rpx;border-radius:${this._radiusRpx(c)}rpx;`,
        shadowStyle: this._shadowStyle(c),
        maskStyle: this._maskStyle(c),
        titleStyle: this._titleStyle(c),
        descStyle: this._descStyle(c),
        interval,
        imageMode,
        indicatorClass: customIndicator ? this._indicatorClass(c) : '',
        indicatorStyle: customIndicator ? this._indicatorStyle(c) : '',
        customIndicator,
        showNativeDots: showNativeDots && (this.data.resolvedImages || []).length > 1,
      })
    },

    _bannerListFromConfig(config) {
      const c = config || {}
      if (Array.isArray(c.items) && c.items.length) return c.items
      if (Array.isArray(c.images) && c.images.length) return c.images
      if (c.title) return [{ title: c.title, image: '' }]
      return []
    },

    _resolveFromConfig(config) {
      const prev = this.data.resolvedImages || []
      const broken = {}
      prev.forEach((row, i) => {
        if (row && row.broken) broken[i] = true
      })
      this._resolveImages(this._bannerListFromConfig(config), broken)
    },

    /** 解析图片列表，兼容多种数据格式 */
    _resolveImages(images, brokenMap) {
      if (!Array.isArray(images) || images.length === 0) {
        this.setData({ resolvedImages: [], current: 0 })
        this._syncView(this.data.config || {})
        return
      }

      const broken = brokenMap || {}
      const config = this.data.config || {}
      const globalCta = String(config.action_label || '')
      // visible === false 的项不下架，仍保留配置但不参与轮播
      const resolved = images
        .map((item, index) => {
          // 格式1: 字符串 "https://xxx.jpg"
          if (typeof item === 'string') {
            return { url: item, title: '', subtitle: '', link: '', linkType: 'none', cta: globalCta, isValid: isImageUrl(item), visible: true }
          }
          // 格式2: 对象 {url} / {image} / {src}
          if (typeof item === 'object' && item !== null) {
            const url = item.url || item.image || item.src || ''
            const link = item.link || item.link_url || item.action || ''
            const forceFallback = !!broken[index]
            return {
              url,
              link,
              linkType: String(item.link_type || (link ? 'page' : 'none')),
              title: item.title || item.name || '',
              subtitle: item.subtitle || item.desc || item.description || '点击了解',
              cta: String(item.action_label || globalCta || ''),
              isValid: !forceFallback && isImageUrl(url),
              visible: item.visible === undefined ? true : !!item.visible,
            }
          }
          return { url: '', title: '', subtitle: '', link: '', linkType: 'none', cta: globalCta, isValid: false, visible: true }
        })
        .filter((row) => row.visible !== false)

      // 过滤后当前索引可能越界（如第 1 张被隐藏时 current 仍为 0→无碍，但删过图会越界）
      const current = Math.min(Number(this.data.current) || 0, Math.max(resolved.length - 1, 0))
      this.setData({ resolvedImages: resolved, current })
      // 图片数量变了，指示器显隐要跟着重算
      this._syncView(this.data.config || {})
    },

    /** 圆角（rpx）：预设优先，自定义用 radius_custom */
    _radiusRpx(config) {
      const c = config || {}
      const preset = Number(c.radius_preset)
      if (preset === 8) return 16
      if (preset === 16) return 32
      if (preset === 0) {
        // preset=0 时允许自定义圆角；未配置则保持方角（与历史 defaultStyle 一致）
        const custom = Number(c.radius_custom)
        return Number.isFinite(custom) && custom > 0 ? Math.round(custom * 2) : 0
      }
      const legacy = Number(c.border_radius)
      return Number.isFinite(legacy) && legacy > 0 ? Math.round(legacy * 2) : DEFAULT_RADIUS * 2
    },

    /**
     * 高度：按宽高比从容器宽度反算。
     * 容器宽度以 750rpx 满宽为基准；若容器有左右 padding，通栏减半估算。
     */
    _heightRpx(config) {
      const c = config || {}
      const layout = String(c.layout_mode || 'fullbleed')
      let contentWidth = 750
      if (layout === 'card') {
        const pad = Number(c.page_padding) || 14
        contentWidth = 750 - pad * 2
      }
      if (c.aspect === 'custom') {
        const h = Number(c.custom_height)
        return Number.isFinite(h) && h > 0 ? Math.round(h * 2) : 360
      }
      const ratio = ASPECT_RATIO[c.aspect] || ASPECT_RATIO['2.35:1']
      return Math.round(contentWidth / ratio)
    },

    _layoutClass(config) {
      const c = config || {}
      const parts = ['layout-' + String(c.layout_mode || 'fullbleed')]
      if (c.overlay) parts.push('has-overlay')
      if (c.shadow && c.shadow !== 'none') parts.push('shadow-' + c.shadow)
      return parts.join(' ')
    },

    _indicatorClass(config) {
      const c = config || {}
      if (String(c.indicator_type || 'dots') === 'none') return ''
      return 'ind-' + String(c.indicator_type || 'dots') + ' ind-pos-' + String(c.indicator_pos || 'center')
    },

    _indicatorStyle(config) {
      const c = config || {}
      if (String(c.indicator_type || 'dots') === 'none') return ''
      const active = String(c.indicator_active_color || '#ffffff')
      const inactive = String(c.indicator_inactive_color || '#ffffff')
      const op = Number.isFinite(Number(c.indicator_inactive_opacity)) ? Number(c.indicator_inactive_opacity) : 0.45
      return `background:${inactive};opacity:${op};--ind-active:${active};`
    },

    _maskStyle(config) {
      const c = config || {}
      if (!c.overlay) return ''
      const op = Number.isFinite(Number(c.overlay_opacity)) ? Number(c.overlay_opacity) : 0.45
      return `background:linear-gradient(to top, rgba(0,0,0,${op}) 0%, rgba(0,0,0,${op * 0.6}) 42%, rgba(0,0,0,0) 100%);`
    },

    _titleStyle(config) {
      const c = config || {}
      const size = Number.isFinite(Number(c.title_size)) ? Number(c.title_size) : 15
      const color = String(c.title_color || '#ffffff')
      const align = c.title_align === 'center' ? 'center' : 'left'
      return `font-size:${size * 2}rpx;color:${color};text-align:${align};`
    },

    _descStyle(config) {
      const c = config || {}
      const size = Number.isFinite(Number(c.desc_size)) ? Number(c.desc_size) : 12
      const color = String(c.desc_color || 'rgba(255,255,255,0.88)')
      const align = c.title_align === 'center' ? 'center' : 'left'
      return `font-size:${size * 2}rpx;color:${color};text-align:${align};`
    },

    _shadowStyle(config) {
      const c = config || {}
      if (c.shadow === 'soft') return 'box-shadow:0 4rpx 20rpx rgba(15,23,42,0.10);'
      if (c.shadow === 'float') return 'box-shadow:0 20rpx 56rpx rgba(15,23,42,0.18);'
      return ''
    },

    onImageError(e) {
      const index = Number(e.currentTarget.dataset.index)
      if (!Number.isFinite(index)) return
      // 🔴 后台「图片加载失败占位图」此前配了没效果：出错一律回落到内置装饰块。
      // 现在优先换成运营指定的兜底图；没配才用内置块。
      const placeholder = String((this.data.config || {}).image_error_placeholder || '').trim()
      const list = (this.data.resolvedImages || []).map((row, i) => {
        if (i !== index) return row
        if (placeholder) {
          return Object.assign({}, row, {
            isValid: true,
            broken: false,
            url: placeholder,
            isPlaceholder: true,
          })
        }
        return Object.assign({}, row, { isValid: false, broken: true })
      })
      this.setData({ resolvedImages: list })
    },

    /** 轮播切换 */
    onChange(e) {
      this.setData({ current: e.detail.current })
    },

    /** 点击轮播项 */
    onTapItem(e) {
      const index = e.currentTarget.dataset.index
      const images = this.data.resolvedImages || []
      const item = images[index]

      if (item && item.link) {
        navigatePage(item.link)
      } else if (this.data.actions && this.data.actions.length > 0) {
        executeAction(this.data.actions[0])
      }
    },
  },
})
