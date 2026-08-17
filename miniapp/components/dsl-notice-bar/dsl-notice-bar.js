// components/dsl-notice-bar/dsl-notice-bar.js
const { navigatePage } = require('../../utils/render')

Component({
  properties: {
    config: {
      type: Object,
      value: {},
    },
    runtimeData: {
      type: Array,
      value: [],
    },
    styleString: {
      type: String,
      value: '',
    },
  },

  data: {
    closed: false,
    showIcon: true,
    showMore: false,
    closable: false,
    isHorizontal: true,
    isVertical: false,
    marqueeText: '',
    displayText: '',
    duration: 10,
    barStyle: '',
    verticalIndex: 0,
    _items: [],
  },

  observers: {
    'config, runtimeData': function () {
      this._rebuild()
    },
  },

  lifetimes: {
    attached() {
      this._rebuild()
    },
    detached() {
      this._clearTimer()
    },
  },

  methods: {
    _clearTimer() {
      if (this._timer) {
        clearInterval(this._timer)
        this._timer = null
      }
    },

    _normalizeItems(config, runtimeData) {
      if (Array.isArray(runtimeData) && runtimeData.length) {
        return runtimeData.map((item) => item.name || item.title || '').filter(Boolean)
      }
      const items = Array.isArray(config && config.items) ? config.items : []
      return items.map((x) => String(x || '').trim()).filter(Boolean)
    },

    _rebuild() {
      const config = this.data.config || {}
      const items = this._normalizeItems(config, this.data.runtimeData)
      const scrollable = config.scrollable !== false
      const direction = config.direction === 'vertical' ? 'vertical' : 'horizontal'
      const isHorizontal = scrollable && direction === 'horizontal'
      const isVertical = scrollable && direction === 'vertical'
      const speed = Math.max(Number(config.speed) || 50, 20)
      const marqueeText = items.length ? items.join('　　') : '暂无公告内容'
      const len = Math.max(marqueeText.length, 8)
      const duration = Math.max(4, (len * 14) / speed)
      const fontSize = Number(config.font_size) || 12
      const color = config.text_color || '#E53935'
      const bg = config.background_color || '#FFF9E6'
      // 圆角交给 styleString（已含 border-radius）；未设置时给默认 16rpx
      const hasRadius = this.data.styleString && /border-radius\s*:/.test(this.data.styleString)
      const barStyle = `color:${color};background:${bg};font-size:${fontSize * 2}rpx;${hasRadius ? '' : 'border-radius:16rpx;'}`

      this._clearTimer()
      this.setData({
        showIcon: config.show_icon !== false,
        showMore: !!config.show_more,
        closable: !!config.closable,
        isHorizontal,
        isVertical,
        marqueeText,
        displayText: items[0] || '暂无公告内容',
        duration,
        barStyle,
        verticalIndex: 0,
        _items: items,
        closed: false,
      })

      if (isVertical && items.length > 1) {
        const ms = Math.max(Number(config.duration) || 3000, 1000)
        this._timer = setInterval(() => {
          const list = this.data._items || []
          if (!list.length) return
          const next = (this.data.verticalIndex + 1) % list.length
          this.setData({
            verticalIndex: next,
            displayText: list[next],
          })
        }, ms)
      }
    },

    onClose() {
      this._clearTimer()
      this.setData({ closed: true })
    },

    onTap() {
      const link = ((this.data.config && this.data.config.link_url) || '').trim()
      if (!link) return
      navigatePage(link)
    },
  },
})
