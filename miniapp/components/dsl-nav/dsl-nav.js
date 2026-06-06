// components/dsl-nav/dsl-nav.js — 导航宫格组件
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
    scrollLeft: 0,
    processedItems: [],
  },

  observers: {
    'config.items': function (items) {
      if (!Array.isArray(items)) {
        this.setData({ processedItems: [] })
        return
      }
      const processed = items.map((item) => ({
        ...item,
        text: item.title || item.text || '',
        isImageIcon: this._isImageUrl(item.icon),
        icon: item.icon || '',
        linkUrl: item.link_url || item.linkUrl || '',
      }))
      this.setData({ processedItems: processed })
    },
  },

  lifetimes: {
    attached() {
      const items = this.data.config.items || []
      if (items.length > 0) {
        const processed = items.map((item) => ({
          ...item,
          text: item.title || item.text || '',
          isImageIcon: this._isImageUrl(item.icon),
          icon: item.icon || '',
          linkUrl: item.link_url || item.linkUrl || '',
        }))
        this.setData({ processedItems: processed })
      }
    },
  },

  methods: {
    _isImageUrl: isImageUrl,

    onTapItem(e) {
      const index = e.currentTarget.dataset.index
      const item = this.data.processedItems[index]
      if (!item) return

      if (item.action) {
        executeAction(item.action)
      } else if (item.linkUrl) {
        navigatePage(item.linkUrl)
      }
    },
  },
})
