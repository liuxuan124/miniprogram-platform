// pages/index/index.js — 暖阁首页（API 真源；FORCE_LOCAL_DEMO 时用本地演示）
const { AuthService } = require('../../services/auth')
const { AuthUtil } = require('../../utils/auth')
const { get } = require('../../utils/request')
const { createSharePageConfig } = require('../../utils/share')
const { showTabBarForRoute } = require('../../utils/tab-bar-route')
const { getNavLayout } = require('../../utils/nav-layout')
const { FORCE_LOCAL_DEMO, USE_LOCAL_SOURCE, WARM_PAGE_STYLE } = require('../../data/warm-source')
const HomeService = require('../../services/home')
const { loadTabBoundDslPage, handleDslReachBottom, TAB_DSL_INITIAL } = require('../../utils/dsl-tab-page')
const { defaultHomeBlocks, annotateHomeBlocks } = require('../../utils/warm-home-template')
const { DEFAULT_AVATAR, pickDisplayAvatarUrl } = require('../../utils/image-fallback')

const _navLayout = getNavLayout()

function filterFeedBySeg(feed, key) {
  const list = Array.isArray(feed) ? feed : []
  if (!key || key === 'rec') return list
  return list.filter((i) => i.seg === key)
}

function warmHomeData() {
  try { return require('../../data/warm-home') } catch (e) { return {} }
}

const _localDemo = USE_LOCAL_SOURCE || FORCE_LOCAL_DEMO
const _warmSeed = _localDemo ? warmHomeData() : {}
const EMPTY_HOME = {
  navs: [],
  authors: [],
  feature: null,
  columns: [],
  planet: { title: '', members: '', items: [], cta: '' },
  segs: [],
  feedAll: [],
  feed: [],
  streakDays: 0,
  todayCount: 0,
  empty: true,
}
const DEMO_HOME = _localDemo ? {
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
  streakDays: 0,
  todayCount: Number(_warmSeed.todayCount) || 0,
  empty: false,
} : EMPTY_HOME

function mapFeature(f) {
  if (!f || !f.contentId) return null
  return {
    contentId: f.contentId,
    tag: f.tag || '今日精选',
    title: f.title || '',
    cover: f.cover || '',
    meta: Array.isArray(f.meta) ? f.meta : [],
    contentType: f.contentType || 'article',
    url: `/pages/content-detail/content-detail?id=${f.contentId}`,
  }
}

function mapColumn(c) {
  return {
    id: c.productId,
    productId: c.productId,
    title: c.title || '',
    cover: c.cover || '',
    badge: c.badge || '',
    badgeGold: !!c.badgeGold,
    desc: c.desc || '',
    price: c.price ? `¥${String(c.price).replace(/^[¥￥]/, '')}` : '',
    origin: c.origin ? `¥${String(c.origin).replace(/^[¥￥]/, '')}` : '',
    url: c.productId ? `/pages/product-detail/product-detail?id=${c.productId}` : '',
  }
}

function mapFeedItem(f) {
  const id = f.contentId
  const isMoment = f.seg === 'qa' || f.contentType === 'moment'
  const images = Array.isArray(f.images) ? f.images.filter(Boolean) : []
  const summary = (f.summary && f.summary !== f.title) ? f.summary : (f.summary || '')
  return {
    id,
    contentId: id,
    seg: f.seg || 'article',
    type: f.type || 'post',
    title: f.title || '',
    summary,
    tag: f.tag || '',
    tagGold: !!f.tagGold,
    meta: f.meta || '',
    cover: f.cover || '',
    images,
    contentType: f.contentType || 'article',
    url: id
      ? (isMoment
        ? `/pages/moment-detail/moment-detail?id=${id}`
        : `/pages/content-detail/content-detail?id=${id}`)
      : '',
  }
}

function evData(e) {
  if (e && e.detail && typeof e.detail === 'object' && (e.detail.url != null || e.detail.key != null || e.detail.id != null || e.detail.apply != null || e.detail.tab != null)) {
    return e.detail
  }
  return (e && e.currentTarget && e.currentTarget.dataset) || {}
}

function pickWarmView(d) {
  return {
    statusBarHeight: d.statusBarHeight || _navLayout.statusBarHeight || 0,
    userAvatar: d.userAvatar || DEFAULT_AVATAR,
    greetTitle: d.greetTitle || '你好',
    isLoggedIn: !!d.isLoggedIn,
    streakDays: Number(d.streakDays) || 0,
    todayCount: Number(d.todayCount) || 0,
    noticeDot: !!d.noticeDot,
    navs: d.navs || [],
    authors: d.authors || [],
    feature: d.feature || null,
    columns: d.columns || [],
    planet: d.planet || { title: '', members: '', items: [], cta: '' },
    segs: d.segs || [],
    feed: d.feed || [],
    loadError: !!d.loadError,
    loading: !!d.loading,
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
    statusBarHeight: _navLayout.statusBarHeight,
    greetTitle: '你好',
    userAvatar: DEFAULT_AVATAR,
    isLoggedIn: false,
    warmAuthorsTitle: '',
    warmColumnsTitle: '',
    warmPlanetTitle: '',
    streakDays: 0,
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
    homeBlocks: annotateHomeBlocks(defaultHomeBlocks()),
    warmView: pickWarmView({
      statusBarHeight: _navLayout.statusBarHeight,
      greetTitle: '你好',
      userAvatar: DEFAULT_AVATAR,
      isLoggedIn: false,
      streakDays: 0,
      todayCount: DEMO_HOME.todayCount,
      noticeDot: false,
      navs: DEMO_HOME.navs,
      authors: DEMO_HOME.authors,
      feature: DEMO_HOME.feature,
      columns: DEMO_HOME.columns,
      planet: DEMO_HOME.planet,
      segs: DEMO_HOME.segs,
      feed: DEMO_HOME.feed,
      loadError: false,
      loading: false,
    }),
  },

  _setWarm(patch) {
    const next = Object.assign({}, this.data, patch)
    patch.warmView = pickWarmView(next)
    this.setData(patch)
  },

  _greetTemplate() {
    const greetBlock = (this.data.homeBlocks || []).find((b) => b && b.type === 'warm_greet')
    const fromBlock = greetBlock && greetBlock.props && greetBlock.props.greet_template
    return fromBlock || '你好'
  },

  onLoad() {
    if (USE_LOCAL_SOURCE || FORCE_LOCAL_DEMO) {
      this._setWarm({
        dslPending: false,
        dslMode: false,
        homeBlocks: annotateHomeBlocks(defaultHomeBlocks()),
      })
      this._load()
      return
    }
    loadTabBoundDslPage(this, '/pages/index/index').then((ok) => {
      if (ok) return
      if (!(this.data.homeBlocks || []).length) {
        this._setWarm({ homeBlocks: annotateHomeBlocks(defaultHomeBlocks()) })
      }
      this._load()
    })
  },

  onShow() {
    showTabBarForRoute(this, '/pages/index/index')
    this.setData({ themePageStyle: WARM_PAGE_STYLE })
    AuthService.silentLogin()
      .catch(() => false)
      .finally(() => {
        if (!this.data.dslMode) this._applyGreet()
      })
  },

  onPullDownRefresh() {
    if (USE_LOCAL_SOURCE || FORCE_LOCAL_DEMO) {
      this._load().finally(() => wx.stopPullDownRefresh())
      return
    }
    loadTabBoundDslPage(this, '/pages/index/index', true)
      .then((ok) => {
        if (ok) return
        return this._load()
      })
      .finally(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.dslMode) handleDslReachBottom(this)
  },

  _load() {
    if (USE_LOCAL_SOURCE || FORCE_LOCAL_DEMO) {
      const warm = require('../../data/warm-home')
      this._setWarm({
        navs: warm.NAVS,
        authors: warm.AUTHORS,
        feature: warm.FEATURE,
        columns: warm.COLUMNS,
        planet: warm.PLANET,
        segs: warm.SEGS,
        feedAll: warm.FEED,
        feed: warm.filterFeedBySeg(warm.FEED, 'rec'),
        activeSeg: 'rec',
        streakDays: 0,
        todayCount: Number(warm.todayCount) || 0,
        empty: false,
        loadError: false,
        loading: false,
      })
      this._applyGreet(warm.greetLine ? warm.greetLine() : this._greetTemplate())
      return Promise.resolve()
    }
    this._setWarm({ loading: true, loadError: false })
    return HomeService.getWarmHome()
      .then((data) => {
        const feedAll = (data.feed || []).map(mapFeedItem)
        const segs = (data.segs || []).map((s, i) => Object.assign({}, s, {
          on: s.on != null ? !!s.on : (s.key === 'rec' || (!data.segs.some((x) => x.on) && i === 0)),
        }))
        const activeSeg = (segs.find((s) => s.on) || segs[0] || { key: 'rec' }).key
        this._setWarm({
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
          streakDays: 0,
          todayCount: data.todayCount || 0,
          empty: !data.feature && !(data.columns || []).length && !feedAll.length,
          loadError: false,
          loading: false,
        })
        this._applyGreet()
      })
      .catch(() => {
        this._setWarm({
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
    const greet = greetTpl || this._greetTemplate()
    if (!AuthUtil.isLoggedIn()) {
      this._setWarm({
        isLoggedIn: false,
        greetTitle: greet,
        userAvatar: DEFAULT_AVATAR,
        streakDays: 0,
      })
      return
    }
    const u = AuthUtil.getUserInfo() || {}
    const name = u.nickName || u.nickname || ''
    const avatar = pickDisplayAvatarUrl(u.avatarUrl, u.avatar)
    this._setWarm({
      isLoggedIn: true,
      greetTitle: name ? `${greet}，${name}` : greet,
      userAvatar: avatar,
    })
    get('/api/v1/mp/mine/overview', {}, { auth: true, showError: false })
      .then((data) => {
        if (!AuthUtil.isLoggedIn() || !data) return
        const nick = data.nickname || name
        this._setWarm({
          streakDays: Number(data.continuousSignDays) || 0,
          greetTitle: nick ? `${greet}，${nick}` : greet,
          userAvatar: pickDisplayAvatarUrl(avatar, data.avatarUrl),
        })
      })
      .catch(() => {})
  },

  onGreetTap() {
    if (AuthUtil.isLoggedIn()) return
    this._openLoginSheet('同步阅读记录')
  },

  _openLoginSheet(action) {
    const options = {
      action: action || '',
      onSuccess: () => this._applyGreet(),
    }
    const tryShow = () => {
      const sheet = this.selectComponent('#global-login-sheet')
      if (sheet && typeof sheet.show === 'function') {
        sheet.show(options)
        return true
      }
      return false
    }
    if (tryShow()) return
    AuthUtil.openLoginSheet(options)
  },

  _go(url, isTab) {
    if (!url) return
    // 社区列表 / 动态列表不是 Tab，禁止被旧 more_tab 误判成 switchTab
    if (/\/pages\/planet-list\//.test(url) || /\/pages\/planet-feed\//.test(url)) {
      wx.navigateTo({
        url,
        fail: (err) => {
          console.warn('[index] navigateTo failed', url, err)
          wx.showToast({ title: '页面打开失败，请重新编译', icon: 'none' })
        },
      })
      return
    }
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
    const { url, tab } = evData(e)
    this._go(url, !!tab || tab === 'true' || tab === true || tab === '1' || tab === 1)
  },

  onAuthor(e) {
    const d = evData(e)
    if (d.apply || d.apply === true || d.apply === 'true' || d.apply === '1') {
      this._go('/pages/contribute/contribute')
      return
    }
    const name = d.name || ''
    const id = d.id || ''
    if (!name) {
      this._go('/pages/author-list/author-list')
      return
    }
    const q = [
      `author=${encodeURIComponent(name)}`,
      id ? `id=${encodeURIComponent(id)}` : '',
    ].filter(Boolean).join('&')
    this._go(`/pages/author-feed/author-feed?${q}`)
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
    const d = evData(e)
    const id = d.id
    const url = d.url
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

  goPlanet(e) {
    const detail = (e && e.detail) || {}
    const url = detail.url || '/pages/planet-feed/planet-feed?planetId=warm-main'
    wx.navigateTo({ url, fail: () => wx.switchTab({ url: '/pages/planet/planet' }) })
  },

  goSearch() {
    wx.navigateTo({ url: '/pages/search/search' })
  },

  onNotice() {
    if (!AuthUtil.isLoggedIn()) {
      this._openLoginSheet('查看消息')
      return
    }
    wx.navigateTo({
      url: '/pkg-user/notices/notices',
      fail: (err) => {
        console.warn('[index] open notices failed', err)
        wx.showToast({ title: '通知页打开失败', icon: 'none' })
      },
    })
  },

  onRetry() {
    this._load()
  },

  onSeg(e) {
    const key = evData(e).key || 'rec'
    if (key === this.data.activeSeg) return
    const segs = this.data.segs.map((s) => Object.assign({}, s, { on: s.key === key }))
    this._setWarm({
      segs,
      activeSeg: key,
      feed: filterFeedBySeg(this.data.feedAll, key),
    })
  },
})
