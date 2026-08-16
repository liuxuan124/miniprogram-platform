// components/dsl-activity-entry/dsl-activity-entry.js — 活动入口组件
const { executeAction, isImageUrl, navigatePage } = require('../../utils/render')

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
    countdown: '',
    isExpired: false,
    processedConfig: {
      title: '热门活动',
      show_button: true,
      button_text: '立即预约',
      theme: 'blue',
      style_type: 'card',
      hasValidImage: false,
    },
    processedRuntimeData: [],
  },

  observers: {
    'config': function (config) {
      this._applyConfig(config)
    },
    'runtimeData': function (data) {
      this._applyRuntime(data)
    },
  },

  lifetimes: {
    attached() {
      this._applyConfig(this.data.config)
      this._applyRuntime(this.data.runtimeData)
    },
    detached() {
      this._clearCountdownTimer()
    },
  },

  methods: {
    _isImageUrl: isImageUrl,

    _fontStyle(size, fallback) {
      const n = Number(size)
      return 'font-size:' + ((Number.isFinite(n) && n > 0 ? n : fallback) * 2) + 'rpx'
    },

    _applyConfig(config) {
      if (!config) return
      const processed = {
        ...config,
        theme: config.theme || 'blue',
        style_type: (config.layout === 'banner' || config.style_type === 'full') ? 'full' : (config.layout === 'list' ? 'list' : 'card'),
        show_button: config.show_button !== false,
        show_countdown: config.show_countdown !== false,
        show_quota: config.show_quota !== false,
        quota_text: String(config.quota || config.remain_quota || 20),
        button_text: config.button_text || '立即预约',
        hasValidImage: !!(config.image && this._isImageUrl(config.image)),
        titleStyle: this._fontStyle(config.title_font_size, 14),
        metaStyle: this._fontStyle(config.subtitle_font_size, 11),
      }
      this.setData({ processedConfig: processed })

      if (processed.show_countdown && (config.end_time || config.date)) {
        this._startCountdown(config.end_time || config.date)
      } else {
        this._clearCountdownTimer()
        this.setData({ countdown: '' })
      }
    },

    _applyRuntime(data) {
      if (!Array.isArray(data) || !data.length) {
        this.setData({ processedRuntimeData: [] })
        return
      }
      const processed = data.map((item) => ({
        ...item,
        hasValidImage: !!((item.image || item.cover_url) && this._isImageUrl(item.image || item.cover_url)),
        displayImage: item.image || item.cover_url || '',
        displayTitle: item.title || item.name || '',
        date: item.date || item.activityDate || item.startTime || '',
        location: item.location || item.venue || '',
        subtitle: item.subtitle || item.desc || '',
      }))
      this.setData({ processedRuntimeData: processed })
    },

    onTapActivity(e) {
      const id = e.currentTarget.dataset.id
      const activity = this.data.processedRuntimeData.find((a) => a.id === id)
      const config = this.data.processedConfig || {}

      if (activity && activity.action) {
        executeAction(activity.action)
        return
      }
      if (this.data.actions && this.data.actions.length > 0) {
        executeAction(this.data.actions[0])
        return
      }
      if (id) {
        executeAction({
          type: 'page',
          path: '/pkg-extra/detail/index?id=' + id + '&type=activity',
        })
        return
      }
      const link = (config.link_url || '').trim()
      if (link) {
        navigatePage(link)
      }
    },

    _startCountdown(endTime) {
      this._clearCountdownTimer()
      const endMs = new Date(String(endTime).replace(/-/g, '/')).getTime()
      if (isNaN(endMs)) return

      const update = () => {
        const diff = endMs - Date.now()
        if (diff <= 0) {
          this.setData({ countdown: '已结束', isExpired: true })
          this._clearCountdownTimer()
          return
        }
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        this.setData({
          countdown: `${this._pad(hours)}:${this._pad(minutes)}:${this._pad(seconds)}`,
          isExpired: false,
        })
      }

      update()
      this._countdownTimer = setInterval(update, 1000)
    },

    _pad(num) {
      return num < 10 ? '0' + num : '' + num
    },

    _clearCountdownTimer() {
      if (this._countdownTimer) {
        clearInterval(this._countdownTimer)
        this._countdownTimer = null
      }
    },
  },
})
