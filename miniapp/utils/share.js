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
  const brand = (getApp() && getApp().globalData && getApp().globalData.miniappBrandConfig) || {}
  return {
    title: options.title || brand.appName || brand.name || '欢迎访问',
    path: buildSharePath(options.path, options.query),
    imageUrl: options.imageUrl || '',
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

const DEFAULT_SHARE_TITLE = '出海笔记｜跨境干货、选品与增长实战'

const PAGE_SHARE_TITLES = {
  'pages/index/index': DEFAULT_SHARE_TITLE,
  'pages/content-list/content-list': '出海笔记｜跨境实战内容中心',
  'pages/product-list/product-list': '出海笔记｜跨境知识商品与咨询服务',
  'pages/knowledge-mall/knowledge-mall': '出海笔记｜知识商城',
  'pages/search/search': '出海笔记｜搜索跨境选品与运营干货',
  'pkg-extra/activity-list/activity-list': '出海笔记｜跨境活动与实战服务',
  'pkg-trade/category/category': '出海笔记｜按主题发现跨境干货',
  'pkg-trade/reviews/reviews': '出海笔记｜用户真实评价',
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
  return entity.name
    || entity.title
    || data.shareTitle
    || data.title
    || fallbackTitle
    || PAGE_SHARE_TITLES[resolveRoute(page)]
    || DEFAULT_SHARE_TITLE
}

function resolveImageUrl(page, fallbackImageUrl) {
  const data = (page && page.data) || {}
  const entity = resolveEntity(page)
  const images = Array.isArray(entity.images) ? entity.images : []
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

module.exports = {
  defaultShare,
  buildSharePath,
  enableShareMenu,
  createSharePageConfig,
  installPageShareHook,
}
