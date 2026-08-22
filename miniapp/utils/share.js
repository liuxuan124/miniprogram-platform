// utils/share.js — 全站默认分享 + 邀请归因
function buildSharePath(path, query) {
  const app = getApp()
  const user = (app && app.globalData && app.globalData.userInfo) || {}
  const inviterId = user.id || user.userId || (app && app.globalData && app.globalData.userId) || ''
  const parts = []
  if (query && typeof query === 'object') {
    Object.keys(query).forEach((k) => {
      if (query[k] != null && query[k] !== '') parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(query[k]))
    })
  }
  if (inviterId) parts.push('inviterId=' + encodeURIComponent(inviterId))
  const qs = parts.length ? '?' + parts.join('&') : ''
  return (path || '/pages/index/index') + qs
}

function defaultShare(options = {}) {
  const brand = (getApp() && getApp().globalData && getApp().globalData.miniappBrandConfig) || {}
  return {
    title: options.title || brand.name || '欢迎访问',
    path: buildSharePath(options.path, options.query),
    imageUrl: options.imageUrl || '',
  }
}

function installPageShareHook() {
  if (typeof Page !== 'function') return
  if (Page.__shareHookInstalled) return
  const originPage = Page
  Page = function (config) {
    config = config || {}
    if (!config.onShareAppMessage) {
      config.onShareAppMessage = function () {
        return defaultShare({ path: '/' + (this.route || 'pages/index/index') })
      }
    }
    if (!config.onShareTimeline) {
      config.onShareTimeline = function () {
        const share = defaultShare({ path: '/' + (this.route || 'pages/index/index') })
        return { title: share.title, query: (share.path.split('?')[1] || ''), imageUrl: share.imageUrl }
      }
    }
    return originPage(config)
  }
  Page.__shareHookInstalled = true
}

module.exports = { defaultShare, buildSharePath, installPageShareHook }
