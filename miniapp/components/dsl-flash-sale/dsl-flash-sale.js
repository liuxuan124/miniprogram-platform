// components/dsl-flash-sale/dsl-flash-sale.js — 限时秒杀
Component({
  properties: {
    config: {
      type: Object,
      value: {},
    },
    styleString: {
      type: String,
      value: '',
    },
  },

  data: {
    items: [],
    countdownText: '',
    isExpired: false,
    titleStyle: '',
    metaStyle: '',
    _timer: null,
  },

  observers: {
    'config': function (config) {
      this._buildItems(config)
      this._startCountdown(config)
      this._buildFontStyles(config)
    },
  },

  lifetimes: {
    attached() {
      this._buildItems(this.data.config)
      this._startCountdown(this.data.config)
      this._buildFontStyles(this.data.config)
    },
    detached() {
      this._clearTimer()
    },
  },

  methods: {
    _buildFontStyles(config) {
      const titleSize = Number(config && config.title_font_size) > 0 ? Number(config.title_font_size) : 15
      const metaSize = Number(config && config.subtitle_font_size) > 0 ? Number(config.subtitle_font_size) : 12
      this.setData({
        titleStyle: 'font-size:' + (titleSize * 2) + 'rpx',
        metaStyle: 'font-size:' + (metaSize * 2) + 'rpx',
      })
    },

    _buildItems(config) {
      const limit = Math.max(Number(config && config.limit) || 4, 1)
      const items = [
        { name: '限时爆款A', price: '69.00' },
        { name: '限时爆款B', price: '89.00' },
        { name: '限时爆款C', price: '129.00' },
        { name: '限时爆款D', price: '199.00' },
      ].slice(0, limit)
      this.setData({ items })
    },

    _startCountdown(config) {
      this._clearTimer()
      if (!config || config.countdown === false) {
        this.setData({ countdownText: '', isExpired: false })
        return
      }

      const endTime = config.end_time
      if (!endTime) {
        this.setData({ countdownText: '请设置结束时间', isExpired: false })
        return
      }

      const endMs = new Date(String(endTime).replace(/-/g, '/')).getTime()
      if (isNaN(endMs)) {
        this.setData({ countdownText: '时间格式无效', isExpired: false })
        return
      }

      const update = () => {
        const diff = Math.floor((endMs - Date.now()) / 1000)
        if (diff <= 0) {
          this.setData({ countdownText: '已结束', isExpired: true })
          this._clearTimer()
          return
        }
        const pad = (n) => (n < 10 ? '0' + n : '' + n)
        const h = pad(Math.floor(diff / 3600))
        const m = pad(Math.floor((diff % 3600) / 60))
        const s = pad(diff % 60)
        this.setData({ countdownText: '距结束 ' + h + ':' + m + ':' + s, isExpired: false })
      }

      update()
      this.data._timer = setInterval(update, 1000)
    },

    _clearTimer() {
      if (this.data._timer) {
        clearInterval(this.data._timer)
        this.data._timer = null
      }
    },
  },
})
