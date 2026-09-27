/**
 * 装修页 warm_* 区块：拉取 /api/v1/mp/home/warm 并与 warm_greet.props 合并
 */
const HomeService = require('../services/home')
const { getNavLayout } = require('./nav-layout')
const { AuthUtil } = require('./auth')
const { get } = require('./request')

const WARM_BLOCK_TYPES = new Set([
  'warm_greet',
  'warm_authors',
  'warm_feature',
  'warm_columns',
  'warm_planet_rec',
  'warm_feed',
])

function filterFeedBySeg(feed, key) {
  if (!key || key === 'rec') return feed
  return (feed || []).filter((i) => i.seg === key)
}

function mapFeature(f) {
  if (!f || !f.contentId) return null
  return {
    contentId: f.contentId,
    tag: f.tag || '今日精选',
    title: f.title || '',
    cover: f.cover || '',
    meta: Array.isArray(f.meta) ? f.meta : [],
    contentType: f.contentType || 'article',
    url: `/pkg-content/content-detail/content-detail?id=${f.contentId}`,
  }
}

function mapColumn(c) {
  const productId = c.productId
  return {
    id: productId,
    productId,
    title: c.title || '',
    cover: c.cover || '',
    badge: c.badge || '',
    badgeGold: !!c.badgeGold,
    desc: c.desc || '',
    price: c.price ? `¥${String(c.price).replace(/^[¥￥]/, '')}` : '',
    origin: c.origin ? `¥${String(c.origin).replace(/^[¥￥]/, '')}` : '',
    url: productId ? `/pkg-content/product-detail/product-detail?id=${productId}` : '',
  }
}

function mapFeedItem(f) {
  const id = f.contentId
  const isMoment = f.seg === 'qa' || f.contentType === 'moment'
  const images = Array.isArray(f.images) ? f.images.filter(Boolean) : []
  return {
    id,
    contentId: id,
    seg: f.seg || 'article',
    type: f.type || 'post',
    title: f.title || '',
    summary: f.summary && f.summary !== f.title ? f.summary : (f.summary || ''),
    tag: f.tag || '',
    tagGold: !!f.tagGold,
    meta: f.meta || '',
    cover: f.cover || '',
    images,
    contentType: f.contentType || 'article',
    url: id
      ? (isMoment
        ? `/pkg-content/moment-detail/moment-detail?id=${id}`
        : `/pkg-content/content-detail/content-detail?id=${id}`)
      : '',
  }
}

function normalizeNavLabel(label) {
  if (label === '内容列表' || label === '知识库') return '长文'
  return label || ''
}

function buildWarmView(apiData, components) {
  const layout = getNavLayout()
  const greetBlock = (components || []).find((c) => c && c.type === 'warm_greet')
  const greetProps = (greetBlock && greetBlock.props) || {}
  const tpl = greetProps.greet_template || greetProps.greetTemplate
  const feedAll = ((apiData && apiData.feed) || []).map(mapFeedItem)
  const segs = ((apiData && apiData.segs) || []).map((s, i) => Object.assign({}, s, {
    on: s.on != null ? !!s.on : (s.key === 'rec' || (!(apiData.segs || []).some((x) => x.on) && i === 0)),
  }))
  const activeSeg = (segs.find((s) => s.on) || segs[0] || { key: 'rec' }).key
  const navsFromProps = Array.isArray(greetProps.navs) ? greetProps.navs : []
  const navsFromApi = (apiData && apiData.navs) || []
  const navs = (navsFromProps.length ? navsFromProps : navsFromApi).map((n) => Object.assign({}, n, {
    label: normalizeNavLabel(n.label),
  }))

  let brandName = ''
  try {
    const app = getApp()
    const brand = (app && app.globalData && app.globalData.miniappBrandConfig) || {}
    brandName = String(brand.appName || brand.name || '').trim()
  } catch (e) { /* ignore */ }

  return {
    statusBarHeight: layout.statusBarHeight || 20,
    greetTitle: (typeof tpl === 'string' && tpl.trim()) ? tpl.trim() : ((apiData && apiData.greetTemplate) || '你好'),
    userAvatar: '',
    brandName,
    isLoggedIn: false,
    isPlatformMember: false,
    memberLevelName: '',
    memberBadgeLabel: '',
    streakDays: Number((apiData && apiData.streakDays) || 0),
    todayCount: Number((apiData && apiData.todayCount) || 0),
    noticeDot: false,
    vipBar: (apiData && apiData.vipBar) || null,
    navs,
    authors: (apiData && apiData.authors) || [],
    feature: mapFeature(apiData && apiData.feature),
    columns: ((apiData && apiData.columns) || []).map(mapColumn),
    planet: (apiData && apiData.planet) || { title: '', members: '', items: [], cta: '' },
    segs,
    feedAll,
    feed: filterFeedBySeg(feedAll, activeSeg),
    activeSeg,
    loading: false,
    loadError: false,
  }
}

async function hydrateWarmHomeRuntime(components) {
  const list = Array.isArray(components) ? components : []
  const hasWarm = list.some((c) => c && WARM_BLOCK_TYPES.has(c.type))
  if (!hasWarm) return list

  let apiData = {}
  try {
    apiData = await HomeService.getWarmHome()
  } catch (e) {
    apiData = {}
  }
  const warmView = buildWarmView(apiData, list)
  if (AuthUtil.isLoggedIn()) {
    try {
      const mine = await get('/api/v1/mp/mine/overview', {}, { auth: true, showError: false })
      if (mine) {
        warmView.isLoggedIn = true
        const platformMember = !!(mine.platformMemberActive || mine.memberActive)
        warmView.isPlatformMember = platformMember
        warmView.memberLevelName = String(mine.levelName || '').trim()
        if (platformMember) {
          warmView.memberBadgeLabel = warmView.memberLevelName || '年度会员'
        }
        const nick = String(mine.nickname || '').trim()
        if (nick) {
          warmView.greetTitle = `${warmView.greetTitle}，${nick}`
        }
      }
    } catch (e) { /* ignore */ }
  }

  return list.map((c) => {
    if (!c || !WARM_BLOCK_TYPES.has(c.type)) return c
    return Object.assign({}, c, {
      runtimeData: warmView,
      runtimeDataLoaded: true,
    })
  })
}

module.exports = {
  WARM_BLOCK_TYPES,
  hydrateWarmHomeRuntime,
  buildWarmView,
}
