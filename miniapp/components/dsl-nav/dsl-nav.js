// components/dsl-nav/dsl-nav.js — 导航宫格组件
const { executeAction, isImageUrl, navigatePage } = require('../../utils/render')

function clampPad(v, fallback) {
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(0, Math.min(n, 48)) : fallback
}

function buildRootStyle(config) {
  const cfg = config || {}
  const padTop = clampPad(cfg.padding_top, 14)
  const padBottom = clampPad(cfg.padding_bottom, 10)
  const parts = [
    `padding-top:${padTop * 2}rpx`,
    `padding-bottom:${padBottom * 2}rpx`,
  ]
  const showFrame = cfg.show_frame !== false
  if (showFrame) {
    const radiusRaw = Number(cfg.frame_radius)
    const radius = Number.isFinite(radiusRaw) ? Math.max(0, Math.min(radiusRaw, 40)) : 16
    const bg = cfg.frame_bg || '#ffffff'
    parts.push(`background:${bg}`)
    parts.push(`border-radius:${radius * 2}rpx`)
  }
  return {
    showFrame,
    rootStyle: parts.join(';'),
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
    rootStyle: '',
  },

  observers: {
    'config': function (config) {
      const root = buildRootStyle(config)
      this.setData({
        processedItems: mapItems(config && config.items),
        showFrame: root.showFrame,
        rootStyle: root.rootStyle,
      })
    },
  },

  lifetimes: {
    attached() {
      const root = buildRootStyle(this.data.config)
      this.setData({
        processedItems: mapItems(this.data.config && this.data.config.items),
        showFrame: root.showFrame,
        rootStyle: root.rootStyle,
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
