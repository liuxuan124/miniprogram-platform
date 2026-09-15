const { AuthUtil } = require('../../utils/auth')
const { createSharePageConfig, openWarmShareSheet } = require('../../utils/share')
const { showTabBarForRoute } = require('../../utils/tab-bar-route')
const { getNavLayout } = require('../../utils/nav-layout')
const { resolveMediaUrl } = require('../../utils/media-url')
const { StorageUtil } = require('../../utils/storage')
const warmPlanet = require('../../data/warm-planet')
const { USE_LOCAL_SOURCE, WARM_PAGE_STYLE } = require('../../data/warm-source')
const PlanetService = require('../../services/planet')
const { loadTabBoundDslPage, handleDslReachBottom, TAB_DSL_INITIAL } = require('../../utils/dsl-tab-page')
const { isUnusableImageUrl } = require('../../utils/image-fallback')
const { picsum } = require('../../data/warm-media')

const MOMENT_LIKES_KEY = 'moment_likes'
const MOMENT_FAVS_KEY = 'moment_favorites'

function readMomentIds(key) {
  const raw = StorageUtil.get(key)
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'object') return Object.keys(raw).filter((k) => !!raw[k])
  return []
}

function writeMomentIds(key, ids) {
  const map = {}
  ;(ids || []).forEach((id) => {
    const k = String(id)
    if (k) map[k] = true
  })
  StorageUtil.set(key, map)
}

function hasMomentId(key, id) {
  return readMomentIds(key).includes(String(id))
}

function isTruthyDemo(v) {
  return v === true || v === 'true' || v === 1 || v === '1'
}

function parseCount(v) {
  const s = String(v == null ? '0' : v).trim().toLowerCase()
  const k = s.match(/^([\d.]+)\s*k$/)
  if (k) return Math.round(parseFloat(k[1]) * 1000)
  const n = parseInt(s.replace(/[^\d]/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}

function enrichLocalFeedItem(item) {
  const id = String(item.id || item.uid || '')
  return Object.assign({}, item, {
    id: id || item.uid || '',
    uid: item.uid || id,
    isDemo: item.isDemo !== false,
    liked: id ? hasMomentId(MOMENT_LIKES_KEY, id) : !!item.liked,
    favorited: id ? hasMomentId(MOMENT_FAVS_KEY, id) : !!item.favorited,
  })
}

/** 首屏同步种子（与 join 页 DEMO_* 同模式），避免空壳跳动 */
const DEMO_FEED = warmPlanet.FEED.map(enrichLocalFeedItem)
const DEMO_PLANET = {
  home: warmPlanet.HOME,
  segs: warmPlanet.SEGS,
  topics: warmPlanet.TOPICS,
  kpis: warmPlanet.KPIS,
  expireText: warmPlanet.EXPIRE_TEXT,
  allList: DEMO_FEED,
  list: DEMO_FEED,
  usingDemo: true,
  footerText: '—— 已加载全部 27 条今日动态 ——',
}

function relativeTime(value) {
  const raw = String(value || '').replace('T', ' ')
  const ts = Date.parse(raw)
  if (!ts) return raw.slice(0, 16) || ''
  const diff = Date.now() - ts
  if (diff < 60 * 1000) return '刚刚'
  if (diff < 3600 * 1000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400 * 1000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 7 * 86400 * 1000) return `${Math.floor(diff / 86400000)} 天前`
  return raw.slice(0, 10)
}

function formatFileSize(bytes) {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n <= 0) return ''
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  if (n >= 1024) return `${Math.round(n / 1024)} KB`
  return `${n} B`
}

function resolveFeedFile(item) {
  const attachments = Array.isArray(item.attachments) ? item.attachments : []
  if (attachments.length) {
    const a = attachments[0] || {}
    const sizeText = formatFileSize(a.size)
    const metaParts = [
      sizeText,
      item.viewCount ? `${item.viewCount} 人看过` : '',
      a.canDownload === false || item.locked ? '星球会员可看' : '可预览',
    ].filter(Boolean)
    return {
      name: a.name || '附件.pdf',
      meta: metaParts.join(' · ') || '星球会员可看',
      fileId: a.fileId || '',
      url: a.url || '',
    }
  }
  return null
}

function mapFeedItem(item) {
  const tags = Array.isArray(item.tags) ? item.tags : []
  const tagStr = tags.map((t) => String(t)).join(' ')
  const isPinned = !!(item.isPinned || item.pinned || item.top)
  const author = item.author || '球友'
  const images = Array.isArray(item.images) ? item.images.map((u) => resolveMediaUrl(u)).filter(Boolean) : []
  const likes = item.likeCount != null ? String(item.likeCount) : (item.likes || '0')
  const comments = item.commentCount != null ? String(item.commentCount) : (item.comments || '0')
  let answer = item.answer || ''
  let contentText = String(item.summary || item.title || '').replace(/<[^>]+>/g, '')
  const ansSplit = contentText.split(/\n---ANSWER---\n/)
  if (ansSplit.length > 1) {
    contentText = ansSplit[0].trim()
    if (!answer) answer = ansSplit[1].trim()
  } else {
    const ansMatch = contentText.match(/星主回答[：:]\s*([\s\S]+)/)
    if (!answer && ansMatch) {
      answer = ansMatch[1].trim()
      contentText = contentText.replace(/星主回答[：:][\s\S]+/, '').trim()
    }
  }
  return {
    uid: String(item.id || item.uid || ''),
    id: item.id || item.uid || '',
    isDemo: !!item.isDemo || !item.id,
    top: isPinned,
    isPinned,
    hot: /热议|热/.test(tagStr) || Number(item.likeCount) > 200,
    author,
    authorInitial: String(author).slice(0, 1),
    tagGold: isPinned ? '置顶' : (/精华/.test(tagStr) ? '精华' : ''),
    tag: /官方|星主/.test(tagStr)
      ? '星主'
      : (/提问|读者提问/.test(tagStr)
        ? '读者提问'
        : (/打卡/.test(tagStr)
          ? (tags.find((t) => /打卡/.test(String(t))) || '读者打卡')
          : (tags[0] || ''))),
    type: /官方|星主/.test(tagStr) ? 'official' : (/精华/.test(tagStr) ? 'essence' : (/提问/.test(tagStr) ? 'ask' : (/打卡/.test(tagStr) ? 'checkin' : ''))),
    avatar: (() => {
      const raw = resolveMediaUrl(item.authorAvatar || item.author_avatar || '')
      if (raw && !isUnusableImageUrl(raw)) return raw
      return picsum('u' + ((String(author).charCodeAt(0) % 8) + 1), 80, 80)
    })(),
    time: relativeTime(item.publishedAt || item.createTime || item.updateTime),
    content: contentText,
    answer,
    topics: tags
      .filter((t) => !/置顶|星主|精华|提问|读者提问|官方|打卡|特约/.test(String(t)))
      .map((t) => (String(t).indexOf('#') === 0 ? t : `#${t}`))
      .join(' '),
    images,
    likes,
    comments,
    liked: hasMomentId(MOMENT_LIKES_KEY, item.id || item.uid),
    favorited: hasMomentId(MOMENT_FAVS_KEY, item.id || item.uid),
    file: resolveFeedFile(item),
    cover: resolveMediaUrl(item.coverImage || ''),
  }
}

Page({
  ...createSharePageConfig(),
  data: {
    ...TAB_DSL_INITIAL,
    // 等远程装修 JSON 时仍先画 DEMO，不挡成空白「加载中」
    dslPending: true,
    loading: false,
    themePageStyle: WARM_PAGE_STYLE,
    statusBarHeight: getNavLayout().statusBarHeight,
    home: DEMO_PLANET.home,
    packages: [],
    list: DEMO_PLANET.list,
    allList: DEMO_PLANET.allList,
    segs: DEMO_PLANET.segs,
    activeSeg: 'all',
    topics: DEMO_PLANET.topics,
    kpis: DEMO_PLANET.kpis,
    expireText: DEMO_PLANET.expireText,
    refreshing: false,
    footerText: DEMO_PLANET.footerText,
    page: 1,
    hasMore: false,
    usingDemo: true,
  },

  onLoad() {
    try {
      const sys = wx.getSystemInfoSync()
      if (sys && sys.statusBarHeight) {
        this.setData({ statusBarHeight: sys.statusBarHeight })
      }
    } catch (e) { /* ignore */ }
    if (USE_LOCAL_SOURCE) {
      this.setData({ dslPending: false, dslMode: false })
      this._reload()
      return
    }
    loadTabBoundDslPage(this, '/pages/planet/planet').then((ok) => {
      if (ok) return
      this._reload()
    })
  },

  onShow() {
    wx.hideTabBar({ animation: false, fail() {} })
    this.setData({ themePageStyle: WARM_PAGE_STYLE })
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      showTabBarForRoute(this, '/pages/planet/planet')
    }
  },

  onPullDownRefresh() {
    if (USE_LOCAL_SOURCE) {
      this._reload().finally(() => wx.stopPullDownRefresh())
      return
    }
    if (this.data.dslMode) {
      loadTabBoundDslPage(this, '/pages/planet/planet', true).finally(() => wx.stopPullDownRefresh())
      return
    }
    this._reload().finally(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.dslMode) handleDslReachBottom(this)
  },

  onRefresh() {
    if (this.data.dslMode) return
    this.setData({ refreshing: true })
    this._reload().finally(() => this.setData({ refreshing: false }))
  },

  _filterSeg(allList, key) {
    let list = allList || []
    if (key === 'official') list = allList.filter((i) => i.type === 'official' || /官方|星主/.test(i.tag || ''))
    else if (key === 'essence') list = allList.filter((i) => i.type === 'essence' || i.tagGold === '精华')
    else if (key === 'ask') list = allList.filter((i) => i.type === 'ask' || /提问/.test(i.tag || ''))
    else if (key === 'checkin') list = allList.filter((i) => i.type === 'checkin' || /打卡/.test(i.tag || ''))
    return list.map((i) => Object.assign({}, i, {
      isPinned: !!(i.isPinned || i.top || i.tagGold === '置顶'),
    }))
  },

  _reload() {
    if (USE_LOCAL_SOURCE) {
      const feed = warmPlanet.FEED.map(enrichLocalFeedItem)
      this.setData(Object.assign({}, DEMO_PLANET, {
        allList: feed,
        list: this._filterSeg(feed, this.data.activeSeg),
        loading: false,
      }))
      return Promise.resolve()
    }
    // 保留 DEMO 首屏，不先清空；API 有有效数据再一次性覆盖
    return Promise.all([
      PlanetService.getPlanetHome().catch(() => null),
      PlanetService.getPlanetFeed({ current: 1, size: 30 }).catch(() => null),
    ]).then(([home, feed]) => {
      const patch = { loading: false }
      if (home) {
        patch.home = {
          title: home.title || this.data.home.title || warmPlanet.HOME.title,
          subtitle: home.subtitle || this.data.home.subtitle || warmPlanet.HOME.subtitle,
          memberActive: !!(home.memberActive || home.isMember),
        }
        if (home.packages && home.packages.length) patch.packages = home.packages
        if (home.expireText) patch.expireText = home.expireText
        if (Array.isArray(home.kpis) && home.kpis.length) patch.kpis = home.kpis
        if (Array.isArray(home.topics) && home.topics.length) patch.topics = home.topics
        if (Array.isArray(home.segs) && home.segs.length) patch.segs = home.segs
      }
      const records = (feed && (feed.records || feed.list || feed.items)) || []
      const mapped = records.map(mapFeedItem)
      if (mapped.length) {
        const list = this._filterSeg(mapped, this.data.activeSeg)
        patch.allList = mapped
        patch.list = list
        patch.usingDemo = false
        patch.footerText = `—— 已加载 ${list.length} 条 ——`
      }
      // API 空结果：保留已有 DEMO，不 wipe
      this.setData(patch)
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  _applySeg(allList, usingDemo) {
    const list = this._filterSeg(allList, this.data.activeSeg)
    this.setData({
      allList,
      list,
      usingDemo: !!usingDemo,
      footerText: list.length
        ? (usingDemo ? '—— 已加载全部 27 条今日动态 ——' : `—— 已加载 ${list.length} 条 ——`)
        : '暂无动态',
      loading: false,
    })
  },

  onSegTap(e) {
    const key = e.currentTarget.dataset.key
    if (!key || key === this.data.activeSeg) return
    if (key === 'resources') {
      wx.navigateTo({ url: '/pages/resources/resources' })
      return
    }
    this.setData({ activeSeg: key })
    this._applySeg(this.data.allList, this.data.usingDemo)
  },

  onOpenMoment(e) {
    const ds = (e.currentTarget && e.currentTarget.dataset) || {}
    const demo = isTruthyDemo(ds.demo) || !!this.data.usingDemo
    wx.navigateTo({ url: this._momentNavUrl(ds.id || ds.uid, demo) })
  },

  _momentNavUrl(id, demo) {
    const mid = String(id || '').trim()
    const asDemo = isTruthyDemo(demo) || !mid || mid.indexOf('demo') === 0 || !!this.data.usingDemo
    if (asDemo) {
      return '/pages/moment-detail/moment-detail?demo=1&from=planet' + (mid ? `&id=${encodeURIComponent(mid)}` : '')
    }
    return `/pages/moment-detail/moment-detail?id=${encodeURIComponent(mid)}&from=planet`
  },

  _resolveMomentKey(ds, item) {
    const mid = String((ds && (ds.id || ds.uid)) || (item && (item.id || item.uid)) || '')
    if (mid) return mid
    if (isTruthyDemo(ds && ds.demo) || (item && item.isDemo) || this.data.usingDemo) return 'demo'
    return ''
  },

  onLikeTap(e) {
    const ds = e.currentTarget.dataset || {}
    const list = (this.data.list || []).slice()
    const i = Number(ds.index)
    const item = list[i]
    if (!item) return
    const mid = this._resolveMomentKey(ds, item)
    if (!mid) {
      wx.showToast({ title: '内容暂不可用', icon: 'none' })
      return
    }
    const liked = !item.liked
    const base = parseCount(item.likes)
    const likes = String(Math.max(0, base + (liked ? 1 : -1)))
    const ids = readMomentIds(MOMENT_LIKES_KEY)
    if (liked) {
      if (!ids.includes(mid)) ids.push(mid)
    } else {
      const idx = ids.indexOf(mid)
      if (idx >= 0) ids.splice(idx, 1)
    }
    writeMomentIds(MOMENT_LIKES_KEY, ids)
    list[i] = Object.assign({}, item, { liked, likes })
    const allList = (this.data.allList || []).map((row) =>
      String(row.id || row.uid) === mid ? Object.assign({}, row, { liked, likes }) : row
    )
    this.setData({ list, allList })
    wx.showToast({ title: liked ? '已点赞' : '已取消点赞', icon: 'none' })
  },

  onCommentTap(e) {
    const ds = e.currentTarget.dataset || {}
    const demo = isTruthyDemo(ds.demo) || !!this.data.usingDemo
    wx.navigateTo({ url: this._momentNavUrl(ds.id || ds.uid, demo) })
  },

  onFavoriteTap(e) {
    const ds = e.currentTarget.dataset || {}
    const list = (this.data.list || []).slice()
    const i = Number(ds.index)
    const item = list[i]
    if (!item) return
    const mid = this._resolveMomentKey(ds, item)
    if (!mid) {
      wx.showToast({ title: '内容暂不可用', icon: 'none' })
      return
    }
    const favorited = !item.favorited
    const ids = readMomentIds(MOMENT_FAVS_KEY)
    if (favorited) {
      if (!ids.includes(mid)) ids.push(mid)
    } else {
      const idx = ids.indexOf(mid)
      if (idx >= 0) ids.splice(idx, 1)
    }
    writeMomentIds(MOMENT_FAVS_KEY, ids)
    list[i] = Object.assign({}, item, { favorited })
    const allList = (this.data.allList || []).map((row) =>
      String(row.id || row.uid) === mid ? Object.assign({}, row, { favorited }) : row
    )
    this.setData({ list, allList })
    wx.showToast({ title: favorited ? '已收藏' : '已取消收藏', icon: 'none' })
  },

  onShareTap(e) {
    const ds = e.currentTarget.dataset || {}
    const list = this.data.list || []
    const item = list[Number(ds.index)] || {}
    const demo = isTruthyDemo(ds.demo) || !!item.isDemo || !!this.data.usingDemo
    const mid = this._resolveMomentKey(ds, item) || 'demo'
    openWarmShareSheet({
      title: (item.content || '').slice(0, 40) || '星球动态',
      path: this._momentNavUrl(ds.id || ds.uid || item.id || item.uid, demo),
      cover: (item.images && item.images[0]) || item.cover || '',
      quote: (item.content || '').slice(0, 80),
      contentId: mid,
    })
  },

  onMoreTap() {
    wx.showActionSheet({
      itemList: ['举报', '不感兴趣'],
      success: (res) => {
        if (res.tapIndex === 0) wx.showToast({ title: '已收到举报', icon: 'none' })
        else if (res.tapIndex === 1) wx.showToast({ title: '将减少此类内容', icon: 'none' })
      },
    })
  },

  onOpenFile(e) {
    const file = (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.file) || {}
    if (file.fileId) {
      wx.navigateTo({ url: `/pages/file-preview/file-preview?id=${file.fileId}` })
      return
    }
    if (USE_LOCAL_SOURCE || this.data.usingDemo || !file.fileId) {
      wx.navigateTo({
        url: `/pages/file-preview/file-preview?demo=1&name=${encodeURIComponent(file.name || '附件.pdf')}`,
      })
      return
    }
    wx.showToast({ title: '附件暂不可用', icon: 'none' })
  },

  onHeroJoin() {
    if (this.data.home && this.data.home.memberActive) {
      wx.showToast({ title: '你已是球友', icon: 'none' })
      return
    }
    this.onRenewTap()
  },

  onRenewTap() {
    wx.navigateTo({
      url: '/pkg-user/member-center/member-center',
      fail: () => wx.navigateTo({ url: '/pages/member-center/member-center' }),
    })
  },

  onGoJoin() {
    wx.navigateTo({ url: '/pages/join/join' })
  },

  onFab() {
    const goContribute = () => {
      wx.navigateTo({
        url: '/pages/contribute/contribute?stage=2&unlocked=1',
        fail: () => wx.showToast({ title: '暂无法打开发布页', icon: 'none' }),
      })
    }
    const goAsk = () => {
      const { getQaEnabledSync, blockQaNavigation } = require('../../utils/qa-module-gate')
      if (!getQaEnabledSync() || blockQaNavigation('/pages/question-ask/question-ask')) {
        goContribute()
        return
      }
      if (!AuthUtil.isLoggedIn()) {
        wx.navigateTo({ url: '/pages/login/login' })
        return
      }
      wx.navigateTo({
        url: '/pages/question-ask/question-ask',
        fail: goContribute,
      })
    }
    wx.showActionSheet({
      itemList: ['向星主提问', '打卡 / 发帖'],
      success: (res) => {
        if (res.tapIndex === 0) goAsk()
        else goContribute()
      },
    })
  },
})
