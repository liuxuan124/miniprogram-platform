// components/dsl-activity-entry/dsl-activity-entry.js — 活动入口组件
const { executeAction, isImageUrl } = require('../../utils/render')

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
    countdownTimer: null,
    isExpired: false,
    processedConfig: null,
    processedRuntimeData: [],
  },

  observers: {
    'config': function (config) {
      if (!config) {
        this.setData({ processedConfig: null })
        return
      }
      const processed = {
        ...config,
        hasValidImage: !!(config.image && this._isImageUrl(config.image)),
      }
      this.setData({ processedConfig: processed })

      if (config.countdown && config.end_time) {
        this._startCountdown(config.end_time)
      }
    },
    'runtimeData': function (data) {
      if (!Array.isArray(data)) {
        this.setData({ processedRuntimeData: [] })
        return
      }
      const processed = data.map((item) => ({
        ...item,
        hasValidImage: !!((item.image || item.cover_url) && this._isImageUrl(item.image || item.cover_url)),
        displayImage: item.image || item.cover_url || '',
        displayTitle: item.title || item.name || '',
      }))
      this.setData({ processedRuntimeData: processed })
    },
  },

  lifetimes: {
    attached() {
      const config = this.data.config
      if (config) {
        this.setData({
          processedConfig: {
            ...config,
            hasValidImage: !!(config.image && this._isImageUrl(config.image)),
          }
        })
      }
      const data = this.data.runtimeData
      if (Array.isArray(data) && data.length > 0) {
        this.setData({
          processedRuntimeData: data.map((item) => ({
            ...item,
            hasValidImage: !!((item.image || item.cover_url) && this._isImageUrl(item.image || item.cover_url)),
            displayImage: item.image || item.cover_url || '',
            displayTitle: item.title || item.name || '',
          }))
        })
      }
    },
    detached() {
      this._clearCountdownTimer()
    },
  },

  methods: {
    _isImageUrl: isImageUrl,

    onTapActivity(e) {
      const id = e.currentTarget.dataset.id
      const activity = this.data.processedRuntimeData.find((a) => a.id === id)

      if (activity && activity.action) {
        executeAction(activity.action)
      } else if (this.data.actions && this.data.actions.length > 0) {
        executeAction(this.data.actions[0])
      } else if (id) {
        executeAction({
          type: 'page',
          path: '/pages/detail/index?id=' + id + '&type=activity',
        })
      }
    },

    _startCountdown(endTime) {
      this._clearCountdownTimer()
      const endMs = new Date(endTime).getTime()
      if (isNaN(endMs)) return

      const update = () => {
        const now = Date.now()
        const diff = endMs - now

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
      this.data.countdownTimer = setInterval(update, 1000)
    },

    _pad(num) {
      return num < 10 ? '0' + num : '' + num
    },

    _clearCountdownTimer() {
      if (this.data.countdownTimer) {
        clearInterval(this.data.countdownTimer)
        this.data.countdownTimer = null
      }
    },
  },
})
