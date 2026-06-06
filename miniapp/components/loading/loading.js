// components/loading/loading.js — 加载状态组件
Component({
  properties: {
    /** 加载提示文字 */
    text: {
      type: String,
      value: '加载中...',
    },
    /** 是否显示 */
    show: {
      type: Boolean,
      value: true,
    },
  },

  data: {
    animating: true,
  },

  lifetimes: {
    attached() {
      this._startAnimation()
    },
    detached() {
      this._stopAnimation()
    },
  },

  methods: {
    _startAnimation() {
      this.setData({ animating: true })
    },

    _stopAnimation() {
      this.setData({ animating: false })
    },
  },
})