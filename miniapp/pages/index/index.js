// pages/index/index.js — 暖阁首页（API 真源；FORCE_LOCAL_DEMO 时用本地演示）
const { AuthService } = require('../../services/auth')
const { AuthUtil } = require('../../utils/auth')
const { get } = require('../../utils/request')
const { createSharePageConfig } = require('../../utils/share')
const { showTabBarForRoute, hideNativeTabBar } = require('../../utils/tab-bar-route')
const { getNavLayout } = require('../../utils/nav-layout')
const { FORCE_LOCAL_DEMO, USE_LOCAL_SOURCE } = require('../../data/warm-source')
const HomeService = require('../../services/home')
const { loadTabBoundDslPage, handleDslReachBottom, TAB_DSL_INITIAL } = require('../../utils/dsl-tab-page')
const { parseDSL } = require('../../utils/render')

function loadGoldenParityBatch(key) {
  const map = {
    1: () => require('../../data/golden-batches/batch-1.json'),
    2: () => require('../../data/golden-batches/batch-2.json'),
    3: () => require('../../data/golden-batches/batch-3.json'),
    4: () => require('../../data/golden-batches/batch-4.json'),
    5: () => require('../../data/golden-batches/batch-5.json'),
    6: () => require('../../data/golden-batches/batch-6.json'),
  }
  const fn = map[Number(key)]
  if (!fn) return null
  try {
    return fn()
  } catch (e) {
    return null
  }
}
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
    url: `/pkg-content/content-detail/content-detail?id=${f.contentId}`,
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
    url: c.productId ? `/pkg-content/product-detail/product-detail?id=${c.productId}` : '',
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
        ? `/pkg-content/moment-detail/moment-detail?id=${id}`
        : `/pkg-content/content-detail/content-detail?id=${id}`)
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
    userAvatar: d.userAvatar || '',
    greetTitle: d.greetTitle || '你好',
    brandName: d.brandName || '',
    isLoggedIn: !!d.isLoggedIn,
    isPlatformMember: !!d.isPlatformMember,
    memberLevelName: d.memberLevelName || '',
    memberBadgeLabel: d.memberBadgeLabel || '',
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
    parityBatch: '',
    // 等远程装修时仍先画 DEMO 首页壳，不挡成空白「加载中」
    dslPending: true,
    loading: false,
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

  /** automator：SelectorQuery 抽真实渲染指纹（避免 devtools automator 的 $$ 超时） */
  getParityRenderBlocks() {
    const flow = this.data.flowComponents || []
    const floats = this.data.floatComponents || []
    const collectTextLen = (textRes, viewRes) => {
      const chunks = []
      ;[textRes, viewRes].forEach((arr) => {
        if (!Array.isArray(arr)) return
        arr.forEach((n) => {
          if (n && n.text) chunks.push(String(n.text))
        })
      })
      const text = chunks.join(' ').replace(/\s+/g, ' ').trim()
      return { textLen: text.length, sample: text.slice(0, 48) }
    }
    const measureFlow = (comp) => new Promise((resolve) => {
      const sel = `#parity-${comp.id}`
      const q = wx.createSelectorQuery().in(this)
      q.select(sel).boundingClientRect()
      q.selectAll(`${sel} >>> text`).fields({ text: true })
      q.selectAll(`${sel} >>> view`).fields({ text: true })
      q.selectAll(`${sel} >>> view`).boundingClientRect()
      q.selectAll(`${sel} >>> image`).boundingClientRect()
      q.selectAll(`${sel} >>> button`).boundingClientRect()
      q.exec((res) => {
        const rect = (res && res[0]) || {}
        const textMeta = collectTextLen(res[1], res[2])
        const viewRects = Array.isArray(res[3]) ? res[3] : []
        const imgs = Array.isArray(res[4]) ? res[4].length : 0
        const buttons = Array.isArray(res[5]) ? res[5].length : 0
        const hasVisibleDescendant = viewRects.some((item) => (
          item && (item.width || 0) > 2 && (item.height || 0) > 2
        ))
        resolve({
          type: comp.type || '',
          id: comp.id,
          textLen: textMeta.textLen,
          imgs,
          buttons,
          visible: (rect.height || 0) > 2 || hasVisibleDescendant,
          sample: textMeta.sample,
        })
      })
    })
    const chain = flow.reduce(
      (prev, comp) => prev.then((list) => measureFlow(comp).then((block) => {
        list.push(block)
        return list
      })),
      Promise.resolve([]),
    )
    const measureFloat = (comp) => new Promise((resolve) => {
      const q = wx.createSelectorQuery().in(this)
      const sel = `#parity-float-${comp.id}`
      q.select(sel).boundingClientRect()
      q.selectAll(`${sel} >>> text`).fields({ text: true })
      q.exec((res) => {
        const rect = (res && res[0]) || {}
        const textNodes = Array.isArray(res[1]) ? res[1] : []
        const text = textNodes.map((n) => (n && n.text ? String(n.text) : '')).join(' ').replace(/\s+/g, ' ').trim()
        resolve({
          textLen: text.length,
          imgs: 0,
          buttons: 1,
          visible: (rect.height || 0) > 2,
          sample: text.slice(0, 48),
        })
      })
    })
    return chain.then((list) => floats.reduce(
      (prev, comp) => prev.then((blocks) => {
        if (!comp || !comp.id) return blocks
        return measureFloat(comp).then((m) => {
          blocks.push({
            type: 'float_button',
            id: comp.id,
            textLen: m.textLen,
            imgs: m.imgs,
            buttons: m.buttons > 0 ? m.buttons : 1,
            visible: m.visible,
            sample: m.sample,
          })
          return blocks
        })
      }),
      Promise.resolve(list),
    ))
  },

  /** automator 灌入黄金批次（RENDER-PARITY） */
  setParityPayload(payload) {
    if (!payload || typeof payload !== 'object') return Promise.resolve()
    return new Promise((resolve) => {
      this.setData({
        dslMode: true,
        dslPending: false,
        loading: false,
        error: '',
        flowComponents: payload.flowComponents || [],
        floatComponents: payload.floatComponents || [],
        parityBatch: payload.parityBatch || '',
      }, resolve)
    })
  },

  _loadParityBatch(batchKey) {
    const batch = loadGoldenParityBatch(batchKey)
    if (!batch) {
      this.setData({
        dslMode: true,
        dslPending: false,
        loading: false,
        error: `缺少黄金批次 ${batchKey}`,
        flowComponents: [],
        floatComponents: [],
      })
      return
    }
    const parsed = parseDSL(batch)
    const flowComponents = []
    const floatComponents = []
    ;(parsed.components || []).forEach((item) => {
      if (item && item.type === 'float_button') floatComponents.push(item)
      else flowComponents.push(item)
    })
    this.setData({
      dslMode: true,
      dslPending: false,
      loading: false,
      error: '',
      flowComponents,
      floatComponents,
      parityBatch: String(batchKey),
    })
  },

  _parityBatchFromRoute(options) {
    const fromOpt = options && (options.parityBatch || options.paritybatch)
    if (fromOpt) return String(fromOpt)
    try {
      const pages = getCurrentPages()
      const cur = pages[pages.length - 1]
      const q = (cur && cur.options) || {}
      if (q.parityBatch || q.paritybatch) return String(q.parityBatch || q.paritybatch)
    } catch (e) { /* ignore */ }
    return ''
  },

  onLoad(options) {
    hideNativeTabBar()
    try {
      const app = getApp()
      if (app && app.globalData && app.globalData.__renderParityAutomator) {
        this.setData({
          dslPending: false,
          dslMode: false,
          loading: false,
          error: '',
          flowComponents: [],
          floatComponents: [],
          parityBatch: '',
        })
        return
      }
    } catch (e) { /* ignore */ }
    const parityBatch = this._parityBatchFromRoute(options)
    if (parityBatch && loadGoldenParityBatch(parityBatch)) {
      this._loadParityBatch(parityBatch)
      return
    }
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
      if (ok || this.data.dslMode) return
      if (!(this.data.homeBlocks || []).length) {
        this._setWarm({ homeBlocks: [], dslPending: false, loadError: false })
      }
      if ((this.data.homeBlocks || []).length) this._load()
    })
  },

  onShow() {
    hideNativeTabBar()
    showTabBarForRoute(this, '/pages/index/index')

    const routeBatch = this._parityBatchFromRoute()
    if (routeBatch && loadGoldenParityBatch(routeBatch)) {
      if (String(this.data.parityBatch) !== String(routeBatch)) {
        this._loadParityBatch(routeBatch)
      }
      return
    }
    if (this.data.parityBatch) {
      return
    }

    const { onTabPageShow } = require('../../utils/content-release-sync')
    onTabPageShow(this, '/pages/index/index', () => {
      if (!this.data.dslMode) this._load()
    })

    AuthService.silentLogin()
      .catch(() => false)
      .finally(() => {
        if (!this.data.dslMode) this._applyGreet()
      })
  },

  onPullDownRefresh() {
    if (this.data.parityBatch) {
      wx.stopPullDownRefresh()
      return
    }
    if (USE_LOCAL_SOURCE || FORCE_LOCAL_DEMO) {
      this._load().finally(() => wx.stopPullDownRefresh())
      return
    }
    const { onTabPagePullDownRefresh } = require('../../utils/content-release-sync')
    onTabPagePullDownRefresh(this, '/pages/index/index', () => this._load())
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
        isPlatformMember: false,
        memberLevelName: '',
        memberBadgeLabel: '',
        greetTitle: greet,
        userAvatar: '',
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
        const platformMember = !!(data.platformMemberActive || data.memberActive)
        const levelName = String(data.levelName || '').trim()
        this._setWarm({
          streakDays: Number(data.continuousSignDays) || 0,
          greetTitle: nick ? `${greet}，${nick}` : greet,
          userAvatar: pickDisplayAvatarUrl(avatar, data.avatarUrl),
          isPlatformMember: platformMember,
          memberLevelName: levelName,
          memberBadgeLabel: platformMember ? (levelName || '年度会员') : '',
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
      this._go('/pkg-content/contribute/contribute')
      return
    }
    const name = d.name || ''
    const id = d.id || ''
    if (!name) {
      this._go('/pkg-content/author-list/author-list')
      return
    }
    const q = [
      `author=${encodeURIComponent(name)}`,
      id ? `id=${encodeURIComponent(id)}` : '',
    ].filter(Boolean).join('&')
    this._go(`/pkg-content/author-feed/author-feed?${q}`)
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
      this._go(`/pkg-content/product-detail/product-detail?id=${id}`)
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
    if (id) this._go(`/pkg-content/content-detail/content-detail?id=${id}`)
  },

  goPlanet(e) {
    const detail = (e && e.detail) || {}
    const url = detail.url || '/pkg-content/planet-feed/planet-feed?planetId=warm-main'
    wx.navigateTo({ url, fail: () => wx.switchTab({ url: '/pages/planet/planet' }) })
  },

  /** 星球卡上「设为主星球」成功后：重拉聚合，让整页（问候/动态流）都跟着切主星球 */
  onMainPlanetChange() {
    this._load()
  },

  /** 首页半屏切换里点了未加入的星球 → 进介绍页 */
  onPlanetIntro(e) {
    const id = (e && e.detail && e.detail.planetId) || ''
    const url = id
      ? `/pkg-content/planet-intro/planet-intro?planetId=${encodeURIComponent(id)}`
      : ''
    if (!url) return
    wx.navigateTo({ url, fail: () => {} })
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
