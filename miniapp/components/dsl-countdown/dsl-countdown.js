// components/dsl-countdown/dsl-countdown.js — 倒计时组件
function pad(num) {
  return num < 10 ? '0' + num : '' + num
}

function parseEndMs(raw) {
  if (!raw) return null
  // iOS 兼容：用 / 替换 -
  const ms = new Date(String(raw).replace(/-/g, '/')).getTime()
  return Number.isFinite(ms) ? ms : null
}

Component({
  properties: {
    config: { type: Object, value: {} },
    styleString: { type: String, value: '' },
  },

  data: {
    days: '00',
    hours: '00',
    minutes: '00',
    seconds: '00',
    isExpired: false,
    hasEndTime: false,
    showDays: true,
    displayTitle: '',
    endText: '已结束',
    styleType: 'card',
    titleStyle: '',
  },

  observers: {
    config: function () {
      this._syncAndStart()
    },
  },

  lifetimes: {
    attached() {
      this._syncAndStart()
    },
    detached() {
      this._clearTimer()
    },
  },

  methods: {
    _getEndTimeRaw() {
      const config = this.data.config || {}
      return config.end_time || config.target_time || ''
    },

    _syncAndStart() {
      const config = this.data.config || {}
      const showDays = config.show_days !== false
      const titleSize = Number(config.title_font_size) || 15
      this.setData({
        displayTitle: config.title || config.label || '距离活动开始',
        endText: config.end_text || '已结束',
        styleType: config.style_type === 'banner' ? 'banner' : 'card',
        showDays,
        titleStyle: 'font-size:' + (titleSize * 2) + 'rpx',
        hasEndTime: !!this._getEndTimeRaw(),
      })
      this._startCountdown()
    },

    _startCountdown() {
      this._clearTimer()
      const targetMs = parseEndMs(this._getEndTimeRaw())
      if (!targetMs) {
        this.setData({
          days: '00',
          hours: '00',
          minutes: '00',
          seconds: '00',
          isExpired: false,
          hasEndTime: false,
        })
        return
      }

      const update = () => {
        const diff = targetMs - Date.now()
        if (diff <= 0) {
          this.setData({
            days: '00',
            hours: '00',
            minutes: '00',
            seconds: '00',
            isExpired: true,
            hasEndTime: true,
          })
          this._clearTimer()
          return
        }

        const days = Math.floor(diff / 86400000)
        let hours = Math.floor((diff % 86400000) / 3600000)
        const minutes = Math.floor((diff % 3600000) / 60000)
        const seconds = Math.floor((diff % 60000) / 1000)
        const showDays = (this.data.config || {}).show_days !== false
        if (!showDays) {
          hours = days * 24 + hours
        }

        this.setData({
          days: pad(days),
          hours: pad(hours),
          minutes: pad(minutes),
          seconds: pad(seconds),
          isExpired: false,
          hasEndTime: true,
          showDays,
        })
      }

      update()
      this._timer = setInterval(update, 1000)
    },

    _clearTimer() {
      if (this._timer) {
        clearInterval(this._timer)
        this._timer = null
      }
    },
  },
})
