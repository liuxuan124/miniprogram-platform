// utils/share.js — 全站默认分享 + 邀请归因
function buildSharePath(path, query) {
  const app = getApp()
  const user = (app && app.globalData && app.globalData.userInfo) || {}
  const inviterId = user.id || user.userId || (app && app.globalData && app.globalData.userId) || ''
  const parts = []
  if (query && typeof query === 'object') {
    Object.keys(query).forEach((k) => {
      if (query[k] != null && query[k] !== '') {
        parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(query[k]))
      }
    })
  }
  if (inviterId) parts.push('inviterId=' + encodeURIComponent(inviterId))
  const qs = parts.length ? '?' + parts.join('&') : ''
  return (path || '/pages/index/index') + qs
}

function defaultShare(options = {}) {
  const app = getApp()
  const brand = (app && app.globalData && app.globalData.miniappBrandConfig) || {}
  const cachedShare = readCachedShareConfig()
  return {
    title: options.title || cachedShare.title || brand.appName || brand.name || '欢迎访问',
    path: buildSharePath(options.path, options.query),
    imageUrl: options.imageUrl || cachedShare.imageUrl || brand.shareImage || '',
  }
}

function enableShareMenu() {
  if (typeof wx.showShareMenu !== 'function') return
  wx.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline'],
    fail() {},
  })
}

const DEFAULT_SHARE_TITLE = '欢迎访问'

function readCachedShareConfig() {
  try {
    const app = typeof getApp === 'function' ? getApp() : null
    const fromApp = (app && app.globalData && app.globalData.shareConfig) || {}
    const { StorageUtil } = require('./storage')
    const cached = (StorageUtil.get && StorageUtil.get('system_config')) || {}
    const brand = (app && app.globalData && app.globalData.miniappBrandConfig) || {}
    return {
      title: String(fromApp.title || cached.miniappShareTitle || brand.appName || '').trim(),
      imageUrl: String(fromApp.imageUrl || cached.miniappShareImage || brand.shareImage || '').trim(),
    }
  } catch (e) {
    return { title: '', imageUrl: '' }
  }
}

const PAGE_SHARE_TITLES = {
  'pages/index/index': '',
  'pages/discover/discover': '',
  'pages/content-list/content-list': '',
  'pages/shop/shop': '',
  'pages/planet/planet': '',
  'pages/mine/mine': '',
}

const SAFE_QUERY_KEYS = new Set([
  'id',
  'type',
  'category',
  'categoryId',
  'topic',
  'keyword',
  'q',
])

function resolveRoute(page) {
  return (page && page.route) || 'pages/index/index'
}

function resolveEntity(page) {
  const data = (page && page.data) || {}
  return data.product || data.article || data.activity || data.detail || {}
}

function resolveTitle(page, fallbackTitle) {
  const data = (page && page.data) || {}
  const entity = resolveEntity(page)
  const cachedShare = readCachedShareConfig()
  return entity.name
    || entity.title
    || data.shareTitle
    || data.title
    || fallbackTitle
    || PAGE_SHARE_TITLES[resolveRoute(page)]
    || cachedShare.title
    || DEFAULT_SHARE_TITLE
}

function resolveImageUrl(page, fallbackImageUrl) {
  const data = (page && page.data) || {}
  const entity = resolveEntity(page)
  const images = Array.isArray(entity.images) ? entity.images : []
  const cachedShare = readCachedShareConfig()
  return entity.shareImage
    || entity.share_image
    || entity.coverUrl
    || entity.cover_url
    || entity.mainImage
    || entity.main_image
    || entity.imageUrl
    || entity.image_url
    || entity.cover
    || images[0]
    || data.shareImage
    || fallbackImageUrl
    || cachedShare.imageUrl
    || ''
}

function resolveQuery(page) {
  const data = (page && page.data) || {}
  const options = Object.assign({}, (page && page.options) || {})
  if (!options.id) {
    options.id = data.id || data.activityId || data.productId || ''
  }
  if (!options.type && data.type) {
    options.type = data.type
  }

  const filtered = {}
  Object.keys(options).forEach((key) => {
    if (!SAFE_QUERY_KEYS.has(key)) return
    if (options[key] === '' || options[key] == null) return
    filtered[key] = String(options[key])
  })
  return filtered
}

function buildSharePayload(page, defaults) {
  const route = resolveRoute(page)
  const query = resolveQuery(page)
  const imageUrl = resolveImageUrl(page, defaults && defaults.imageUrl)
  const payload = {
    title: resolveTitle(page, defaults && defaults.title),
    path: buildSharePath('/' + route, query),
  }
  if (imageUrl) payload.imageUrl = imageUrl
  return payload
}

/**
 * 页面侧分享配置（多页 Page({ ...createSharePageConfig() }) 依赖此导出）。
 * 勿删除：缺失会导致页面 JS 加载即崩 → 白屏。
 */
function createSharePageConfig(defaults) {
  const opts = defaults || {}
  return {
    onReady() {
      enableShareMenu()
    },
    onShareAppMessage() {
      return buildSharePayload(this, opts)
    },
    onShareTimeline() {
      const payload = buildSharePayload(this, opts)
      const queryIndex = payload.path.indexOf('?')
      const result = {
        title: payload.title,
        query: queryIndex >= 0 ? payload.path.slice(queryIndex + 1) : '',
      }
      if (payload.imageUrl) result.imageUrl = payload.imageUrl
      return result
    },
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

/** 打开暖阁自定义分享面板（勿直接 open-type=share，否则会跳过面板直达原生选聊天） */
function openWarmShareSheet(opts) {
  const o = opts || {}
  const q = []
  const push = (k, v) => {
    if (v == null || v === '') return
    q.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(v)))
  }
  push('title', o.title)
  push('path', o.path)
  push('cover', o.cover)
  push('quote', o.quote)
  push('code', o.code)
  push('contentId', o.contentId)
  const url = '/pages/share/share' + (q.length ? '?' + q.join('&') : '')
  wx.navigateTo({
    url,
    fail: () => wx.showToast({ title: '无法打开分享', icon: 'none' }),
  })
}

module.exports = {
  defaultShare,
  buildSharePath,
  enableShareMenu,
  createSharePageConfig,
  installPageShareHook,
  openWarmShareSheet,
}
