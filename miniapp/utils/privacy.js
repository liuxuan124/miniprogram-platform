/**
 * 微信隐私授权辅助
 *
 * 注意：一旦调用 wx.onNeedPrivacyAuthorization，就必须自行弹窗并 resolve，
 * 否则 chooseAvatar / 昵称等会一直 pending，表现为“点击无反应”。
 */
const privacyHelper = {
  _resolves: [],
  _handlers: [],
  _inited: false,

  init() {
    if (this._inited) return
    this._inited = true

    if (typeof wx.onNeedPrivacyAuthorization !== 'function') return

    wx.onNeedPrivacyAuthorization((resolve, eventInfo) => {
      console.log('[privacy] need authorization', eventInfo && eventInfo.referrer)
      this._resolves.push(resolve)

      let handled = false
      this._handlers.slice().forEach((handler) => {
        try {
          if (handler(eventInfo)) handled = true
        } catch (e) {
          console.warn('[privacy] handler error:', e)
        }
      })

      // 有订阅但都未处理时，不能永久挂起
      if (!handled) {
        setTimeout(() => {
          if (this._resolves.indexOf(resolve) >= 0) {
            console.warn('[privacy] unhandled authorization, auto disagree')
            try {
              resolve({ event: 'disagree' })
            } catch (e) {}
            this._resolves = this._resolves.filter((item) => item !== resolve)
          }
        }, 320)
      }
    })
  },

  /** 页面/组件订阅：需要弹隐私协议时回调 */
  subscribe(handler) {
    if (typeof handler !== 'function') return () => {}
    this._handlers.push(handler)
    return () => {
      this._handlers = this._handlers.filter((h) => h !== handler)
    }
  },

  agree(buttonId) {
    const id = buttonId || 'privacy-agree-btn'
    const list = this._resolves.splice(0, this._resolves.length)
    list.forEach((resolve) => {
      try {
        resolve({ event: 'agree', buttonId: id })
      } catch (e) {}
    })
  },

  refuse() {
    const list = this._resolves.splice(0, this._resolves.length)
    list.forEach((resolve) => {
      try {
        resolve({ event: 'disagree' })
      } catch (e) {}
    })
  },

  hasPending() {
    return this._resolves.length > 0
  },

  /** 主动拉起隐私授权（昵称聚焦前可调用） */
  requireAuthorize() {
    return new Promise((resolve) => {
      if (typeof wx.requirePrivacyAuthorize !== 'function') {
        resolve(true)
        return
      }
      wx.requirePrivacyAuthorize({
        success: () => resolve(true),
        fail: () => resolve(false),
      })
    })
  },
}

module.exports = privacyHelper
