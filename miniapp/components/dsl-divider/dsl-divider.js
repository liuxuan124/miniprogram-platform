// components/dsl-divider/dsl-divider.js — 分割线组件
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
    dividerStyle: '',
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
      const color = (config && config.color) || '#eeeeee'
      const thickness = (config && config.thickness) || 1
      const margin = (config && config.margin) || 24
      const style = (config && config.style) || 'line'

      let borderStyle = 'solid'
      if (style === 'dashed') borderStyle = 'dashed'
      else if (style === 'dotted') borderStyle = 'dotted'

      this.setData({
        dividerStyle: `border-top: ${thickness}rpx ${borderStyle} ${color}; margin: ${margin}rpx 0;`,
      })
    },
  },
})
