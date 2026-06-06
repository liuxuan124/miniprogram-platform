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
    'config.images': function (images) {
      this._resolveImages(images)
    },
  },

  lifetimes: {
    attached() {
      this._resolveImages(this.data.config.images)
    },
  },

  methods: {
    /** 解析图片列表，兼容多种数据格式 */
    _resolveImages(images) {
      if (!Array.isArray(images) || images.length === 0) {
        this.setData({ resolvedImages: [] })
        return
      }

      const resolved = images.map((item) => {
        // 格式1: 字符串 "https://xxx.jpg"
        if (typeof item === 'string') {
          return { url: item, title: '', subtitle: '', link: '', isValid: isImageUrl(item) }
        }
        // 格式2: 对象 {url: "xxx"} 或 {image: "xxx"} 或 {src: "xxx"}
        if (typeof item === 'object' && item !== null) {
          const url = item.url || item.image || item.src || ''
          const link = item.link || item.link_url || item.action || ''
          return {
            url,
            link,
            title: item.title || item.name || '',
            subtitle: item.subtitle || item.desc || item.description || '点击了解',
            isValid: isImageUrl(url),
          }
        }
        return { url: '', title: '', subtitle: '', link: '', isValid: false }
      })

      this.setData({ resolvedImages: resolved })
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
