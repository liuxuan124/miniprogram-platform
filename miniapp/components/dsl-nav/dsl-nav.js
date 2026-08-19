// components/dsl-nav/dsl-nav.js — 导航宫格组件
const { executeAction, isImageUrl, navigatePage } = require('../../utils/render')

function buildFrame(config) {
  const cfg = config || {}
  const showFrame = cfg.show_frame !== false
  if (!showFrame) {
    return { showFrame: false, frameStyle: '' }
  }
  const radiusRaw = Number(cfg.frame_radius)
  const radius = Number.isFinite(radiusRaw) ? Math.max(0, Math.min(radiusRaw, 40)) : 16
  const bg = cfg.frame_bg || '#ffffff'
  return {
    showFrame: true,
    frameStyle: `background:${bg};border-radius:${radius * 2}rpx;`,
  }
}

function mapItems(items) {
  if (!Array.isArray(items)) return []
  return items.map((item) => ({
    ...item,
    text: item.title || item.text || '',
    isImageIcon: isImageUrl(item.icon),
    icon: item.icon || '',
    linkUrl: item.link_url || item.linkUrl || '',
  }))
}

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
    showFrame: true,
    frameStyle: '',
  },

  observers: {
    'config': function (config) {
      const frame = buildFrame(config)
      this.setData({
        processedItems: mapItems(config && config.items),
        showFrame: frame.showFrame,
        frameStyle: frame.frameStyle,
      })
    },
  },

  lifetimes: {
    attached() {
      const frame = buildFrame(this.data.config)
      this.setData({
        processedItems: mapItems(this.data.config && this.data.config.items),
        showFrame: frame.showFrame,
        frameStyle: frame.frameStyle,
      })
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
