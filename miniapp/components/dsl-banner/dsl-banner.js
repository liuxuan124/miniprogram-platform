// components/dsl-banner/dsl-banner.js — 轮播图组件
const { executeAction, isImageUrl, navigatePage } = require('../../utils/render')

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
  },

  observers: {
    'config.items, config.images, config.title': function () {
      this._resolveFromConfig(this.data.config || {})
    },
  },

  lifetimes: {
    attached() {
      this._resolveFromConfig(this.data.config || {})
    },
  },

  methods: {
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
        this.setData({ resolvedImages: [] })
        return
      }

      const broken = brokenMap || {}
      const resolved = images.map((item, index) => {
        // 格式1: 字符串 "https://xxx.jpg"
        if (typeof item === 'string') {
          return { url: item, title: '', subtitle: '', link: '', isValid: isImageUrl(item) }
        }
        // 格式2: 对象 {url: "xxx"} 或 {image: "xxx"} 或 {src: "xxx"}
        if (typeof item === 'object' && item !== null) {
          const url = item.url || item.image || item.src || ''
          const link = item.link || item.link_url || item.action || ''
          const forceFallback = !!broken[index]
          return {
            url,
            link,
            title: item.title || item.name || '',
            subtitle: item.subtitle || item.desc || item.description || '点击了解',
            isValid: !forceFallback && isImageUrl(url),
            broken: forceFallback,
          }
        }
        return { url: '', title: '', subtitle: '', link: '', isValid: false, broken: false }
      })

      this.setData({ resolvedImages: resolved })
    },

    onImageError(e) {
      const index = Number(e.currentTarget.dataset.index)
      if (!Number.isFinite(index)) return
      const list = (this.data.resolvedImages || []).map((row, i) => (
        i === index ? Object.assign({}, row, { isValid: false, broken: true }) : row
      ))
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
