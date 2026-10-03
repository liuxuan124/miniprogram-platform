// network-off.js — 无网络全局兜底组件
Component({
  properties: {
    show: {
      type: Boolean,
      value: false,
    },
  },

  lifetimes: {
    attached() {
      wx.onNetworkStatusChange((res) => {
        if (!res || res.networkType === 'none') {
          this.setData({ show: true })
        } else {
          this.setData({ show: false })
          this.triggerEvent('reload')
        }
      })
    },
  },

  methods: {
    onRetry() {
      this.triggerEvent('reload')
    },
  },
})