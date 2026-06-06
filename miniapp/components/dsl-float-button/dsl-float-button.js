// components/dsl-float-button/dsl-float-button.js — 浮动按钮组件
const { executeAction } = require('../../utils/render')

Component({
  properties: {
    /** 组件配置 */
    config: {
      type: Object,
      value: {},
    },
    /** 组件动作列表 */
    actions: {
      type: Array,
      value: [],
    },
    /** 自定义样式 */
    styleString: {
      type: String,
      value: '',
    },
  },

  data: {
    moveX: 0,
    moveY: 0,
    dragStarted: false,
    windowWidth: 375,
    windowHeight: 667,
    floatButtonStyle: '',
  },

  observers: {
    'config, styleString, moveX, moveY': function () {
      this.updateFloatButtonStyle()
    },
  },

  lifetimes: {
    attached() {
      const sysInfo = wx.getWindowInfo ? wx.getWindowInfo() : { windowWidth: 375, windowHeight: 667 }
      this.setData({
        windowWidth: sysInfo.windowWidth,
        windowHeight: sysInfo.windowHeight,
      })
      this.updateFloatButtonStyle()
    },
  },

  methods: {
    updateFloatButtonStyle() {
      const config = this.data.config || {}
      const position = config.position || 'right_bottom'
      const styleVariant = config.style_variant || ''
      const size = config.size || 100
      const shadowLevel = Number(config.shadow_level || 2)
      const horizontalProp = position.indexOf('left') !== -1 ? 'left' : 'right'
      const verticalProp = position.indexOf('center') !== -1 ? 'top' : 'bottom'
      const horizontalValue = this.data.moveX ? '0rpx' : `${config.offset_x || 20}rpx`
      const verticalValue = position.indexOf('center') !== -1 ? '45%' : `${config.offset_y || 100}rpx`
      const width = styleVariant === 'pill' || styleVariant === 'text' ? 'auto' : `${size}rpx`
      const padding = styleVariant === 'pill' ? '0 20rpx' : styleVariant === 'text' ? '0 16rpx' : '0'
      const borderRadius =
        styleVariant === 'square' ? '16rpx' : styleVariant === 'text' ? '12rpx' : styleVariant === 'pill' ? '999rpx' : '50%'
      const boxShadow =
        shadowLevel === 0
          ? 'none'
          : shadowLevel === 1
            ? '0 6rpx 14rpx rgba(0,0,0,0.14)'
            : shadowLevel === 3
              ? '0 14rpx 28rpx rgba(0,0,0,0.24)'
              : shadowLevel >= 4
                ? '0 18rpx 32rpx rgba(0,0,0,0.28)'
                : '0 10rpx 20rpx rgba(0,0,0,0.2)'

      this.setData({
        floatButtonStyle: [
          this.data.styleString || '',
          'position: fixed',
          `${horizontalProp}: ${horizontalValue}`,
          `${verticalProp}: ${verticalValue}`,
          `width: ${width}`,
          `min-height: ${size}rpx`,
          `padding: ${padding}`,
          `background-color: ${config.background_color || '#1890ff'}`,
          `border-radius: ${borderRadius}`,
          `opacity: ${(config.opacity || 100) / 100}`,
          `box-shadow: ${boxShadow}`,
          `transform: translate(${this.data.moveX}px, ${this.data.moveY}px)`,
        ].filter(Boolean).join(';'),
      })
    },

    /** 点击浮动按钮 */
    onTap() {
      const config = this.data.config || {}
      if (config.action_type === 'top') {
        const pages = getCurrentPages()
        const current = pages[pages.length - 1]
        if (current && typeof current.setData === 'function') {
          current.setData({ scrollTop: 0 })
        }
        wx.pageScrollTo({ scrollTop: 0, duration: 200 })
        return
      }
      if (config.action_type === 'phone' && config.phone) {
        executeAction({ type: 'phone', number: config.phone })
        return
      }
      if (config.action_type === 'url' && config.link_url) {
        executeAction({ type: 'webview', url: config.link_url })
        return
      }
      if (config.action_type === 'ai') {
        executeAction({ type: 'page', path: '/pages/ai-agent/ai-agent' })
        return
      }
      if (config.link_url) {
        executeAction({ type: 'page', path: config.link_url })
        return
      }
      if (this.data.actions && this.data.actions.length > 0) {
        executeAction(this.data.actions[0])
      } else if (config.action) {
        executeAction(config.action)
      }
    },

    onTouchStart() {
      this.setData({ dragStarted: false })
    },

    /** 触摸移动 */
    onTouchMove(e) {
      const config = this.data.config || {}
      if (config.allow_drag === false) return
      const touch = e.touches[0]
      const size = Number(config.size || 100)
      const halfSize = size / 2

      let x = touch.clientX - halfSize
      let y = touch.clientY - halfSize

      // 边界限制
      x = Math.max(0, Math.min(x, this.data.windowWidth - size))
      y = Math.max(0, Math.min(y, this.data.windowHeight - size))

      this.setData({
        moveX: x,
        moveY: y,
        dragStarted: true,
      })
      this.updateFloatButtonStyle()
    },
  },
})
