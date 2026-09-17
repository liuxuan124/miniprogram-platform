// pages/index/index.js — 暖阁首页（API 真源；FORCE_LOCAL_DEMO 时用本地演示）
const { AuthService } = require('../../services/auth')
const { AuthUtil } = require('../../utils/auth')
const { createSharePageConfig } = require('../../utils/share')
const { showTabBarForRoute } = require('../../utils/tab-bar-route')
const { getNavLayout } = require('../../utils/nav-layout')
const { FORCE_LOCAL_DEMO, USE_LOCAL_SOURCE, WARM_PAGE_STYLE } = require('../../data/warm-source')
const HomeService = require('../../services/home')
const { loadTabBoundDslPage, handleDslReachBottom, TAB_DSL_INITIAL } = require('../../utils/dsl-tab-page')

function filterFeedBySeg(feed, key) {
  const list = Array.isArray(feed) ? feed : []
  if (!key || key === 'rec') return list
  return list.filter((i) => i.seg === key)
}

function warmHomeData() {
  try { return require('../../data/warm-home') } catch (e) { return {} }
}

/** 首屏同步种子，避免 dslPending 空白「加载中」 */
const _warmSeed = warmHomeData()
const DEMO_HOME = {
  navs: _warmSeed.NAVS || [],
  authors: _warmSeed.AUTHORS || [],
  feature: _warmSeed.FEATURE || null,
  columns: _warmSeed.COLUMNS || [],
  planet: _warmSeed.PLANET || { title: '', members: '', items: [], cta: '' },
  segs: _warmSeed.SEGS || [],
  feedAll: _warmSeed.FEED || [],
  feed: typeof _warmSeed.filterFeedBySeg === 'function'
    ? _warmSeed.filterFeedBySeg(_warmSeed.FEED || [], 'rec')
    : (_warmSeed.FEED || []),
  streakDays: 18,
  todayCount: 6,
  empty: false,
}

function mapFeature(f) {
  if (!f || !f.contentId) return null
  const demo = warmHomeData().FEATURE || {}
  let title = f.title || ''
  if (demo.title && /当内容不再免费/.test(title)) title = demo.title
  return {
    contentId: f.contentId,
    tag: f.tag || demo.tag || '今日精选',
    title,
    cover: f.cover || demo.cover || '',
    meta: Array.isArray(f.meta) && f.meta.length ? f.meta : (demo.meta || []),
    contentType: f.contentType || 'article',
    url: `/pages/content-detail/content-detail?id=${f.contentId}`,
  }
}

function mapColumn(c) {
  const priceNum = String(c.price || '').replace(/[¥￥,\s]/g, '')
  const demo = (warmHomeData().COLUMNS || []).find((x) => {
    const dp = String(x.price || '').replace(/[¥￥,\s]/g, '')
    return dp && dp === priceNum
  })
  return {
    id: c.productId,
    productId: c.productId,
    title: (demo && demo.title) || c.title || '',
    cover: (demo && demo.cover) || c.cover || '',
    badge: c.badge || (demo && demo.badge) || '',
    badgeGold: c.badgeGold != null ? !!c.badgeGold : !!(demo && demo.badgeGold),
    desc: (demo && demo.desc) || c.desc || '',
    price: c.price ? `¥${String(c.price).replace(/^[¥￥]/, '')}` : ((demo && demo.price) || ''),
    origin: c.origin
      ? `¥${String(c.origin).replace(/^[¥￥]/, '')}`
      : ((demo && demo.origin) || ''),
    url: c.productId ? `/pages/product-detail/product-detail?id=${c.productId}` : '',
  }
}

function mapFeedItem(f) {
  const id = f.contentId
  const isMoment = f.seg === 'qa' || f.contentType === 'moment'
  const demo = (warmHomeData().FEED || []).find((x) =>
    (f.title && x.title && (f.title === x.title || f.title.indexOf(x.title.slice(0, 12)) === 0))
    || (f.tag && x.tag === f.tag && f.seg === x.seg)
  )
  let images = Array.isArray(f.images) ? f.images.filter(Boolean) : []
  if ((f.type === 'grid' || (demo && demo.type === 'grid')) && images.length < 3 && demo && demo.images) {
    images = demo.images
  }
  const summary = (f.summary && f.summary !== f.title)
    ? f.summary
    : ((demo && demo.summary) || f.summary || '')
  return {
    id,
    contentId: id,
    seg: f.seg || (demo && demo.seg) || 'article',
    type: f.type || (demo && demo.type) || 'post',
    title: f.title || (demo && demo.title) || '',
    summary,
    tag: f.tag || (demo && demo.tag) || '',
    tagGold: f.tagGold != null ? !!f.tagGold : !!(demo && demo.tagGold),
    meta: f.meta || (demo && demo.meta) || '',
    cover: f.cover || (demo && demo.cover) || '',
    images,
    contentType: f.contentType || 'article',
    url: id
      ? (isMoment
        ? `/pages/moment-detail/moment-detail?id=${id}`
        : `/pages/content-detail/content-detail?id=${id}`)
      : '',
  }
}

Page({
  ...createSharePageConfig({ title: '暖阁｜慢一点，也很好' }),
  data: {
    ...TAB_DSL_INITIAL,
    // 等远程装修时仍先画 DEMO 首页壳，不挡成空白「加载中」
    dslPending: true,
    loading: false,
    themePageStyle: WARM_PAGE_STYLE,
    statusBarHeight: getNavLayout().statusBarHeight,
    greetTitle: '你好',
    userAvatar: '',
    streakDays: DEMO_HOME.streakDays,
    todayCount: DEMO_HOME.todayCount,
    noticeDot: false,
    navs: DEMO_HOME.navs,
    authors: DEMO_HOME.authors,
    feature: DEMO_HOME.feature,
    columns: DEMO_HOME.columns,
    planet: DEMO_HOME.planet,
    segs: DEMO_HOME.segs,
    feedAll: DEMO_HOME.feedAll,
    feed: DEMO_HOME.feed,
    activeSeg: 'rec',
    empty: false,
    loadError: false,
  },

  onLoad() {
    if (USE_LOCAL_SOURCE || FORCE_LOCAL_DEMO) {
      this.setData({ dslPending: false, dslMode: false })
      this._load()
      return
    }
    loadTabBoundDslPage(this, '/pages/index/index').then((ok) => {
      if (ok) return
      this._load()
    })
  },

  onShow() {
    showTabBarForRoute(this, '/pages/index/index')
    this.setData({ themePageStyle: WARM_PAGE_STYLE })
    const app = getApp()
    if (app && !app.globalData.isLoggedIn) {
      AuthService.silentLogin().catch(() => {})
    }
    if (!this.data.dslMode) this._applyGreet()
  },

  onPullDownRefresh() {
    if (USE_LOCAL_SOURCE || FORCE_LOCAL_DEMO) {
      this._load().finally(() => wx.stopPullDownRefresh())
      return
    }
    if (this.data.dslMode) {
      loadTabBoundDslPage(this, '/pages/index/index', true).finally(() => wx.stopPullDownRefresh())
      return
    }
    this._load().finally(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.dslMode) handleDslReachBottom(this)
  },

  _load() {
    if (USE_LOCAL_SOURCE || FORCE_LOCAL_DEMO) {
      const warm = require('../../data/warm-home')
      this.setData({
        navs: warm.NAVS,
        authors: warm.AUTHORS,
        feature: warm.FEATURE,
        columns: warm.COLUMNS,
        planet: warm.PLANET,
        segs: warm.SEGS,
        feedAll: warm.FEED,
        feed: warm.filterFeedBySeg(warm.FEED, 'rec'),
        activeSeg: 'rec',
        streakDays: 18,
        todayCount: 6,
        empty: false,
        loadError: false,
        loading: false,
      })
      this._applyGreet(warm.greetLine ? warm.greetLine() : '你好')
      return Promise.resolve()
    }
    this.setData({ loading: true, loadError: false })
    return HomeService.getWarmHome()
      .then((data) => {
        const feedAll = (data.feed || []).map(mapFeedItem)
        const segs = (data.segs || []).map((s, i) => Object.assign({}, s, {
          on: s.on != null ? !!s.on : (s.key === 'rec' || (!data.segs.some((x) => x.on) && i === 0)),
        }))
        const activeSeg = (segs.find((s) => s.on) || segs[0] || { key: 'rec' }).key
        this.setData({
          navs: (data.navs || []).map((n) => Object.assign({}, n, {
            label: (n.label === '内容列表' || n.label === '知识库') ? '长文' : (n.label || ''),
          })),
          authors: data.authors || [],
          feature: mapFeature(data.feature),
          columns: (data.columns || []).map(mapColumn),
          planet: data.planet || { title: '', members: '', items: [], cta: '' },
          segs,
          feedAll,
          feed: filterFeedBySeg(feedAll, activeSeg),
          activeSeg,
          streakDays: data.streakDays || 0,
          todayCount: data.todayCount || 0,
          empty: !data.feature && !(data.columns || []).length && !feedAll.length,
          loadError: false,
          loading: false,
        })
        this._applyGreet()
      })
      .catch(() => {
        this.setData({
          navs: [],
          authors: [],
          feature: null,
          columns: [],
          planet: { title: '', members: '', items: [], cta: '' },
          segs: [],
          feedAll: [],
          feed: [],
          empty: true,
          loadError: true,
          loading: false,
        })
        this._applyGreet()
      })
  },

  _applyGreet(greetTpl) {
    const warm = warmHomeData()
    const greet = (typeof warm.greetLine === 'function' ? warm.greetLine() : null)
      || greetTpl
      || '你好'
    let name = ''
    let avatar = this.data.userAvatar || ''
    try {
      const u = AuthUtil.getUserInfo && AuthUtil.getUserInfo()
      if (u && (u.nickName || u.nickname)) name = u.nickName || u.nickname
      if (u && (u.avatarUrl || u.avatar)) avatar = u.avatarUrl || u.avatar
    } catch (e) { /* ignore */ }
    this.setData({
      greetTitle: name ? `${greet}，${name}` : greet,
      userAvatar: avatar,
    })
  },

  _go(url, isTab) {
    if (!url) return
    if (isTab) {
      wx.switchTab({ url })
      return
    }
    wx.navigateTo({
      url,
      fail: () => wx.switchTab({ url }),
    })
  },

  onNav(e) {
    const { url, tab } = e.currentTarget.dataset
    this._go(url, !!tab || tab === 'true' || tab === true)
  },

  onAuthor(e) {
    if (e.currentTarget.dataset.apply) {
      this._go('/pages/contribute/contribute')
      return
    }
    this._go('/pages/content-list/content-list')
  },

  onFeature() {
    const f = this.data.feature
    if (!f || !f.url) {
      wx.showToast({ title: '暂无精选内容', icon: 'none' })
      return
    }
    this._go(f.url)
  },

  onColumn(e) {
    const id = e.currentTarget.dataset.id
    const url = e.currentTarget.dataset.url
    if (id) {
      this._go(`/pages/product-detail/product-detail?id=${id}`)
      return
    }
    if (url) this._go(url)
  },

  onFeed(e) {
    const url = e.currentTarget.dataset.url
    const id = e.currentTarget.dataset.id
    if (url) {
      this._go(url)
      return
    }
    if (id) this._go(`/pages/content-detail/content-detail?id=${id}`)
  },

  goPlanet() {
    wx.switchTab({ url: '/pages/planet/planet' })
  },

  goSearch() {
    wx.navigateTo({ url: '/pages/search/search' })
  },

  onNotice() {
    wx.navigateTo({
      url: '/pkg-user/notices/notices',
      fail: () => wx.showToast({ title: '暂无新通知', icon: 'none' }),
    })
  },

  onRetry() {
    this._load()
  },

  onSeg(e) {
    const key = e.currentTarget.dataset.key || 'rec'
    if (key === this.data.activeSeg) return
    const segs = this.data.segs.map((s) => Object.assign({}, s, { on: s.key === key }))
    this.setData({
      segs,
      activeSeg: key,
      feed: filterFeedBySeg(this.data.feedAll, key),
    })
  },
})
