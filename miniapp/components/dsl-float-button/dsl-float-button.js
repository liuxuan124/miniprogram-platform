// components/dsl-float-button/dsl-float-button.js — 浮动按钮组件
const { executeAction, navigatePage } = require('../../utils/render')

const ICON_MAP = {
  service: '🎧',
  cart: '🛒',
  home: '🏠',
  top: '⬆️',
  phone: '📞',
}

const IDLE_MS = 2500

function resolveEmoji(config) {
  if (config.icon_emoji) return config.icon_emoji
  const icon = String(config.icon || 'service')
  if (ICON_MAP[icon]) return ICON_MAP[icon]
  if (icon && !/^[a-z_]+$/i.test(icon)) return icon
  return '🎧'
}

function isImageIcon(config) {
  const img = String(config.icon_image || '').trim()
  if (img) return img
  const icon = String(config.icon || '').trim()
  if (icon.indexOf('http') === 0 || icon.indexOf('/') === 0) return icon
  return ''
}

Component({
  properties: {
    config: { type: Object, value: {} },
    actions: { type: Array, value: [] },
    styleString: { type: String, value: '' },
  },

  data: {
    floatButtonStyle: '',
    displayEmoji: '🎧',
    iconSrc: '',
    showText: false,
    displayTitle: '客服',
    dragging: false,
    moved: false,
    docked: false,
  },

  observers: {
    'config, styleString, docked': function () {
      this._refreshStyle()
    },
  },

  lifetimes: {
    attached() {
      const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
      this._windowWidth = sys.windowWidth || 375
      this._windowHeight = sys.windowHeight || 667
      this._dragLeft = null
      this._dragTop = null
      this._refreshStyle()
      this._scheduleDock()
    },
    detached() {
      this._clearDockTimer()
    },
  },

  methods: {
    _edgeHideEnabled() {
      const config = this.data.config || {}
      return config.edge_hide !== false
    },

    _clearDockTimer() {
      if (this._dockTimer) {
        clearTimeout(this._dockTimer)
        this._dockTimer = null
      }
    },

    _expand() {
      this._clearDockTimer()
      if (this.data.docked) this.setData({ docked: false })
    },

    _scheduleDock() {
      this._clearDockTimer()
      if (!this._edgeHideEnabled()) {
        if (this.data.docked) this.setData({ docked: false })
        return
      }
      this._dockTimer = setTimeout(() => {
        this.setData({ docked: true })
      }, IDLE_MS)
    },

    _refreshStyle(left, top) {
      const config = this.data.config || {}
      const position = String(config.position || 'right_bottom').replace(/-/g, '_')
      const size = Math.min(72, Math.max(36, Number(config.size) || 48))
      const sizeRpx = size * 2
      const ox = Number(config.offset_x ?? 16) * 2
      const oy = Number(config.offset_y ?? 100) * 2
      const baseOpacity = Math.min(100, Math.max(40, Number(config.opacity ?? 100))) / 100
      const color = config.color || config.button_color || config.background_color || '#1769ff'
      const showText = !!config.show_text
      const isLeft = position.indexOf('left') !== -1
      const isMiddle = position.indexOf('middle') !== -1 || position.indexOf('center') !== -1
      const docked = !!this.data.docked && this._edgeHideEnabled()
      const hidePx = Math.round(size * 0.6)

      if (typeof left === 'number') this._dragLeft = left
      if (typeof top === 'number') this._dragTop = top

      const parts = [
        this.data.styleString || '',
        'position:fixed',
        'z-index:999',
        `min-width:${sizeRpx}rpx`,
        `height:${sizeRpx}rpx`,
        `background:${color}`,
        `opacity:${docked ? Math.max(0.55, baseOpacity * 0.85) : baseOpacity}`,
        `border-radius:${showText ? '999rpx' : '50%'}`,
        `padding:${showText ? `0 ${Math.round(sizeRpx / 3)}rpx` : '0'}`,
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'box-shadow:0 8rpx 24rpx rgba(15,23,42,0.22)',
        'box-sizing:border-box',
        'transition:transform 0.28s ease, opacity 0.28s ease',
      ]

      if (this._dragLeft !== null && this._dragTop !== null) {
        parts.push(`left:${this._dragLeft}px`)
        parts.push(`top:${this._dragTop}px`)
        parts.push('right:auto')
        parts.push('bottom:auto')
        if (docked) {
          // 拖动后按当前左右半边收边
          const towardLeft = this._dragLeft < (this._windowWidth || 375) / 2
          parts.push(`transform:translateX(${towardLeft ? -hidePx : hidePx}px)`)
        } else {
          parts.push('transform:none')
        }
      } else {
        parts.push(`${isLeft ? 'left' : 'right'}:${ox}rpx`)
        if (isMiddle) {
          parts.push('top:50%')
          parts.push('bottom:auto')
          if (docked) {
            parts.push(`transform:translate(${isLeft ? -hidePx : hidePx}px, -50%)`)
          } else {
            parts.push('transform:translateY(-50%)')
          }
        } else {
          parts.push(`bottom:${oy}rpx`)
          if (docked) {
            parts.push(`transform:translateX(${isLeft ? -hidePx : hidePx}px)`)
          } else {
            parts.push('transform:none')
          }
        }
      }

      this.setData({
        floatButtonStyle: parts.filter(Boolean).join(';'),
        displayEmoji: resolveEmoji(config),
        iconSrc: isImageIcon(config),
        showText,
        displayTitle: config.title || config.text || '客服',
      })
    },

    onTap() {
      this._expand()
      this._scheduleDock()
      if (this.data.moved) {
        this.setData({ moved: false })
        return
      }
      const config = this.data.config || {}
      const actionType = config.action_type || 'link'

      if (actionType === 'top') {
        wx.pageScrollTo({ scrollTop: 0, duration: 200 })
        return
      }
      if (actionType === 'phone') {
        const phone = String(config.phone || '').trim()
        if (phone) {
          wx.makePhoneCall({ phoneNumber: phone.replace(/[^\d+]/g, '') })
        }
        return
      }
      if (actionType === 'url' && config.link_url) {
        executeAction({ type: 'webview', url: config.link_url })
        return
      }
      if (actionType === 'ai') {
        navigatePage('/pkg-user/service-chat/service-chat')
        return
      }
      if (config.link_url) {
        navigatePage(String(config.link_url).trim())
        return
      }
      if (this.data.actions && this.data.actions.length > 0) {
        executeAction(this.data.actions[0])
      }
    },

    onTouchStart(e) {
      this._expand()
      const config = this.data.config || {}
      if (!config.draggable && config.allow_drag !== true) return
      const touch = e.touches[0]
      this._startX = touch.clientX
      this._startY = touch.clientY
      this._moved = false
      this.setData({ dragging: true, moved: false })
    },

    onTouchMove(e) {
      const config = this.data.config || {}
      if (!config.draggable && config.allow_drag !== true) return
      const touch = e.touches[0]
      const size = Math.min(72, Math.max(36, Number(config.size) || 48))
      let left = touch.clientX - size / 2
      let top = touch.clientY - size / 2
      left = Math.max(0, Math.min(left, (this._windowWidth || 375) - size))
      top = Math.max(0, Math.min(top, (this._windowHeight || 667) - size))
      if (Math.abs(touch.clientX - (this._startX || 0)) > 4 || Math.abs(touch.clientY - (this._startY || 0)) > 4) {
        this._moved = true
        this.setData({ moved: true })
      }
      this._refreshStyle(left, top)
    },

    onTouchEnd() {
      this.setData({ dragging: false })
      this._scheduleDock()
    },
  },
})
