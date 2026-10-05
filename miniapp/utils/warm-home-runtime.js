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

/**
 * 归一化一张星球卡。
 * 组件展示字段全部用驼峰，wxml 直接取；url 缺省走 pkg-content（后端给的 /pages/... 会由 render 别名兜底，
 * 这里直接给可用的分包路径，少一层依赖）。
 *
 * planetId 兜底很关键：后端未升级时 /home/warm 的 planet 没有 planetId 字段，
 * 若严格过滤会让整块星球区空白（发版顺序是后端先上，但灰度/回滚期仍要保底）。
 */
function mapPlanet(p) {
  if (!p) return null
  const planetId = String(p.planetId || p.id || '').trim() || 'warm-main'
  const items = (Array.isArray(p.items) ? p.items : []).filter(Boolean)
  return {
    planetId,
    title: p.title || '',
    members: p.members || '',
    cta: p.cta || '',
    items,
    emoji: p.emoji || '🪐',
    cover: p.cover || '',
    subtitle: p.subtitle || '',
    joined: !!p.joined,
    primary: !!p.primary,
    introUrl: p.introUrl || `/pkg-content/planet-intro/planet-intro?planetId=${encodeURIComponent(planetId)}`,
    feedUrl: p.feedUrl || `/pkg-content/planet-feed/planet-feed?planetId=${encodeURIComponent(planetId)}`,
  }
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

  const legacyPlanet = mapPlanet(apiData && apiData.planet)
  // 多星球：后端 planets 优先；为空时把旧单卡包成 1 张。
  // 旧后端连 planet.title 都没有时也留一个空壳，保证组件有卡可渲染而不是整块空白。
  const listPlanets = Array.isArray(apiData && apiData.planets) && apiData.planets.length
    ? apiData.planets.map(mapPlanet).filter(Boolean)
    : (legacyPlanet ? [legacyPlanet] : [mapPlanet({ planetId: 'warm-main' })])
  const primaryOnly = !!(apiData && apiData.primaryOnly)
  const primaryPlanetId = String((apiData && apiData.primaryPlanetId) || (legacyPlanet && legacyPlanet.planetId) || '')

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
    planet: legacyPlanet || { planetId: '', title: '', members: '', items: [], cta: '', emoji: '🪐' },
    planets: listPlanets,
    primaryPlanetId,
    primaryOnly,
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
