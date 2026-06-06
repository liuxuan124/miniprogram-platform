// components/dsl-spacer/dsl-spacer.js — 空白间隔组件
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
    spacerStyle: '',
  },

  observers: {
    'config': function (config) {
      this._updateStyle(config)
    },
  },

  lifetimes: {
    attached() {
      this._updateStyle(this.data.config)
    },
  },

  methods: {
    _updateStyle(config) {
      const height = (config && config.height) || 20
      const bgColor = (config && config.background_color) || 'transparent'
      this.setData({
        spacerStyle: `height: ${height}rpx; background-color: ${bgColor};`,
      })
    },
  },
})
