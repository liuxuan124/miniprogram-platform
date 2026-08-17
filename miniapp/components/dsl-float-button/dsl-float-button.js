// components/dsl-float-button/dsl-float-button.js — 圆形可拖动悬浮按钮（空闲贴边收起）
const { executeAction, navigatePage } = require('../../utils/render')

const ICON_MAP = {
  service: '🎧',
  cart: '🛒',
  home: '🏠',
  top: '⬆️',
  phone: '📞',
}

const IDLE_MS = 2200
const EDGE_GAP = 8

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

function resolveSize(config) {
  return Math.min(72, Math.max(40, Number(config.size) || 52))
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
      this._dockSide = 'right'
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

    /** 默认可拖；仅显式 false 时关闭 */
    _draggableEnabled() {
      const config = this.data.config || {}
      if (config.allow_drag === true) return true
      return config.draggable !== false
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
        this._snapToNearestEdge()
        this.setData({ docked: true })
      }, IDLE_MS)
    },

    _snapToNearestEdge() {
      if (this._dragLeft === null || this._dragTop === null) return
      const config = this.data.config || {}
      const size = resolveSize(config)
      const width = this._windowWidth || 375
      const height = this._windowHeight || 667
      const mid = width / 2
      const centerX = this._dragLeft + size / 2
      const side = centerX < mid ? 'left' : 'right'
      this._dockSide = side
      this._dragLeft = side === 'left'
        ? EDGE_GAP
        : Math.max(EDGE_GAP, width - size - EDGE_GAP)
      const maxTop = Math.max(EDGE_GAP, height - size - EDGE_GAP)
      this._dragTop = Math.max(EDGE_GAP, Math.min(this._dragTop, maxTop))
    },

    _refreshStyle(left, top) {
      const config = this.data.config || {}
      const position = String(config.position || 'right_bottom').replace(/-/g, '_')
      const size = resolveSize(config)
      const sizeRpx = size * 2
      const ox = Number(config.offset_x ?? 16) * 2
      const oy = Number(config.offset_y ?? 100) * 2
      const baseOpacity = Math.min(100, Math.max(40, Number(config.opacity ?? 100))) / 100
      const color = config.color || config.button_color || config.background_color || '#0f766e'
      const isLeftPos = position.indexOf('left') !== -1
      const isMiddle = position.indexOf('middle') !== -1 || position.indexOf('center') !== -1
      const docked = !!this.data.docked && this._edgeHideEnabled()
      const hidePx = Math.round(size * 0.55)
      const width = this._windowWidth || 375

      if (typeof left === 'number') this._dragLeft = left
      if (typeof top === 'number') this._dragTop = top

      if (!this._dockSide) {
        this._dockSide = isLeftPos ? 'left' : 'right'
      }

      const parts = [
        this.data.styleString || '',
        'position:fixed',
        'z-index:999',
        `width:${sizeRpx}rpx`,
        `height:${sizeRpx}rpx`,
        `min-width:${sizeRpx}rpx`,
        `background:${color}`,
        `opacity:${docked ? Math.max(0.5, baseOpacity * 0.8) : baseOpacity}`,
        'border-radius:50%',
        'padding:0',
        'overflow:hidden',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'box-shadow:0 8rpx 24rpx rgba(15,23,42,0.22)',
        'border:2rpx solid rgba(255,255,255,0.85)',
        'box-sizing:border-box',
        'transition:transform 0.28s ease, opacity 0.28s ease, left 0.2s ease, right 0.2s ease, top 0.2s ease',
      ]

      if (this.data.dragging) {
        parts.push('transition:opacity 0.15s ease')
      }

      if (this._dragLeft !== null && this._dragTop !== null) {
        parts.push(`top:${this._dragTop}px`)
        parts.push('bottom:auto')
        if (this._dockSide === 'right') {
          const right = Math.max(EDGE_GAP, width - this._dragLeft - size)
          parts.push(`right:${right}px`)
          parts.push('left:auto')
          if (docked) {
            parts.push(`transform:translateX(${hidePx}px)`)
          } else {
            parts.push('transform:none')
          }
        } else {
          parts.push(`left:${this._dragLeft}px`)
          parts.push('right:auto')
          if (docked) {
            parts.push(`transform:translateX(-${hidePx}px)`)
          } else {
            parts.push('transform:none')
          }
        }
      } else {
        parts.push(`${isLeftPos ? 'left' : 'right'}:${ox}rpx`)
        if (isMiddle) {
          parts.push('top:50%')
          parts.push('bottom:auto')
          if (docked) {
            parts.push(`transform:translate(${isLeftPos ? -hidePx : hidePx}px, -50%)`)
          } else {
            parts.push('transform:translateY(-50%)')
          }
        } else {
          parts.push(`bottom:${oy}rpx`)
          if (docked) {
            parts.push(`transform:translateX(${isLeftPos ? -hidePx : hidePx}px)`)
          } else {
            parts.push('transform:none')
          }
        }
      }

      this.setData({
        floatButtonStyle: parts.filter(Boolean).join(';'),
        displayEmoji: resolveEmoji(config),
        iconSrc: isImageIcon(config),
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
      if (!this._draggableEnabled()) return
      const touch = e.touches[0]
      const config = this.data.config || {}
      const size = resolveSize(config)
      const width = this._windowWidth || 375
      const height = this._windowHeight || 667

      if (this._dragLeft === null || this._dragTop === null) {
        const position = String(config.position || 'right_bottom').replace(/-/g, '_')
        const isLeft = position.indexOf('left') !== -1
        const isMiddle = position.indexOf('middle') !== -1 || position.indexOf('center') !== -1
        const ox = Number(config.offset_x ?? 16)
        const oy = Number(config.offset_y ?? 100)
        this._dockSide = isLeft ? 'left' : 'right'
        this._dragLeft = isLeft ? ox : Math.max(EDGE_GAP, width - size - ox)
        this._dragTop = isMiddle
          ? Math.max(EDGE_GAP, (height - size) / 2)
          : Math.max(EDGE_GAP, height - size - oy)
      }

      this._startX = touch.clientX
      this._startY = touch.clientY
      this._originLeft = this._dragLeft
      this._originTop = this._dragTop
      this._moved = false
      this.setData({ dragging: true, moved: false })
    },

    onTouchMove(e) {
      if (!this._draggableEnabled() || !this.data.dragging) return
      if (typeof e.stopPropagation === 'function') e.stopPropagation()
      const touch = e.touches[0]
      const config = this.data.config || {}
      const size = resolveSize(config)
      const width = this._windowWidth || 375
      const height = this._windowHeight || 667
      const dx = touch.clientX - (this._startX || 0)
      const dy = touch.clientY - (this._startY || 0)
      let left = (this._originLeft || 0) + dx
      let top = (this._originTop || 0) + dy
      left = Math.max(0, Math.min(left, width - size))
      top = Math.max(0, Math.min(top, height - size))
      this._dockSide = left + size / 2 < width / 2 ? 'left' : 'right'
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        this._moved = true
        if (!this.data.moved) this.setData({ moved: true })
      }
      this._refreshStyle(left, top)
    },

    onTouchEnd() {
      if (this.data.dragging) {
        this._snapToNearestEdge()
        this._refreshStyle(this._dragLeft, this._dragTop)
      }
      this.setData({ dragging: false })
      this._scheduleDock()
    },
  },
})
