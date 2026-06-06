// components/dsl-countdown/dsl-countdown.js — 倒计时组件
Component({
  properties: {
    /** 组件配置 */
    config: {
      type: Object,
      value: {},
    },
    /** 自定义样式 */
    styleString: {
      type: String,
      value: '',
    },
  },

  data: {
    days: '00',
    hours: '00',
    minutes: '00',
    seconds: '00',
    isExpired: false,
    _timer: null,
  },

  observers: {
    'config.target_time': function (targetTime) {
      if (targetTime) {
        this._startCountdown(targetTime)
      }
    },
  },

  lifetimes: {
    attached() {
      if (this.data.config.target_time) {
        this._startCountdown(this.data.config.target_time)
      }
    },
    detached() {
      this._clearTimer()
    },
  },

  methods: {
    /** 启动倒计时 */
    _startCountdown(targetTime) {
      this._clearTimer()

      const targetMs = new Date(targetTime).getTime()
      if (isNaN(targetMs)) return

      const update = () => {
        const now = Date.now()
        const diff = targetMs - now

        if (diff <= 0) {
          this.setData({
            days: '00',
            hours: '00',
            minutes: '00',
            seconds: '00',
            isExpired: true,
          })
          this._clearTimer()
          return
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)

        this.setData({
          days: this._pad(days),
          hours: this._pad(hours),
          minutes: this._pad(minutes),
          seconds: this._pad(seconds),
          isExpired: false,
        })
      }

      update()
      this.data._timer = setInterval(update, 1000)
    },

    /** 补零 */
    _pad(num) {
      return num < 10 ? '0' + num : '' + num
    },

    /** 清除定时器 */
    _clearTimer() {
      if (this.data._timer) {
        clearInterval(this.data._timer)
        this.data._timer = null
      }
    },
  },
})
