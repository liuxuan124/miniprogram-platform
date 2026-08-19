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

function enableShareMenu() {
  if (typeof wx.showShareMenu !== 'function') return
  wx.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline'],
    fail: () => {},
  })
}

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
  const options = { ...((page && page.options) || {}) }
  if (!options.id) {
    options.id = data.id || data.activityId || data.productId || ''
  }
  if (!options.type && data.type) {
    options.type = data.type
  }

  return Object.keys(options)
    .filter((key) => SAFE_QUERY_KEYS.has(key))
    .filter((key) => options[key] !== '' && options[key] !== null && options[key] !== undefined)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(options[key]))}`)
    .join('&')
}

function buildSharePayload(page, defaults = {}) {
  const route = resolveRoute(page)
  const query = resolveQuery(page)
  const imageUrl = resolveImageUrl(page, defaults.imageUrl)
  const payload = {
    title: resolveTitle(page, defaults.title),
    path: `/${route}${query ? `?${query}` : ''}`,
  }
  if (imageUrl) payload.imageUrl = imageUrl
  return payload
}

function createSharePageConfig(defaults = {}) {
  return {
    onReady() {
      enableShareMenu()
    },

    onShareAppMessage() {
      return buildSharePayload(this, defaults)
    },

    onShareTimeline() {
      const payload = buildSharePayload(this, defaults)
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

module.exports = {
  createSharePageConfig,
  enableShareMenu,
}
