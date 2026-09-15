// pages/content-list/content-list.js — list.html warm layouts（本地源优先）

const request = require('../../utils/request')
const { createSharePageConfig } = require('../../utils/share')
const { loadTabBoundDslPage, handleDslReachBottom, TAB_DSL_INITIAL } = require('../../utils/dsl-tab-page')
const { showTabBarForRoute } = require('../../utils/tab-bar-route')
const { getNavLayout } = require('../../utils/nav-layout')
const { resolveMediaUrl } = require('../../utils/media-url')
const { openContentDetail } = require('../../utils/content-id')
const { DEMO_LIST } = require('../../data/warm-demo')
const { USE_LOCAL_SOURCE, WARM_PAGE_STYLE } = require('../../data/warm-source')

function formatPublishTime(value) {
  const raw = String(value || '')
  const match = raw.match(/^\d{4}-(\d{2})-(\d{2})/)
  if (match) return `${match[1]}-${match[2]}`
  return raw.slice(0, 10)
}

function formatViews(n) {
  const v = Number(n) || 0
  if (v >= 10000) return `${(v / 10000).toFixed(1).replace(/\.0$/, '')}万`
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return v > 0 ? String(v) : ''
}

function mapApiRow(item) {
  const type = String(item.contentType || item.content_type || 'article').toLowerCase()
  const formatLabel = type === 'note' ? '笔记' : (type === 'video' ? '视频' : (type === 'moment' ? '星球' : '长文'))
  const cover = resolveMediaUrl(item.coverUrl || item.coverImage || item.cover_url || item.cover || '')
  const views = formatViews(item.viewCount || item.view_count)
  const date = formatPublishTime(item.publishedAt || item.createTime)
  const images = Array.isArray(item.images)
    ? item.images.map((u) => resolveMediaUrl(u)).filter(Boolean)
    : (cover ? [cover] : [])
  let layout = 'row'
  if (type === 'note' && images.length >= 3) layout = 'grid3'
  else if (type === 'video' || /访谈|音频|播客/.test(String(item.title || ''))) layout = 'audio'
  else if (type === 'moment' || item.planetExclusive === 1 || item.planet_exclusive === 1) layout = 'row'
  return {
    id: item.id,
    title: item.title,
    summary: item.summary || '',
    formatLabel,
    formatKey: type === 'note' ? 'note' : (type === 'video' ? 'video' : (type === 'moment' ? 'moment' : 'longform')),
    layout,
    cover_url: cover,
    cover,
    images: images.slice(0, 3),
    duration: type === 'video' ? '30:12' : '',
    meta: [date, views ? `${views} 阅读` : ''].filter(Boolean).join(' · '),
    tag: type === 'moment' ? '星球内容' : (item.visibility === 'member_only' ? '会员专享' : formatLabel),
    toMoment: type === 'moment' || item.planetExclusive === 1 || item.planet_exclusive === 1,
    viewNum: Number(item.viewCount || item.view_count || 0),
  }
}

function buildMixedLayouts(apiRows) {
  const demoRows = (DEMO_LIST.rows || []).slice()
  if (!apiRows.length) return demoRows
  // 用真实内容填充混排槽位，保证大图/音频/九宫格/星球卡仍可见
  const byType = {
    note: apiRows.filter((r) => r.formatKey === 'note'),
    video: apiRows.filter((r) => r.formatKey === 'video'),
    moment: apiRows.filter((r) => r.formatKey === 'moment' || r.toMoment),
    longform: apiRows.filter((r) => r.formatKey === 'longform'),
  }
  return demoRows.map((slot, i) => {
    let pick = null
    if (slot.layout === 'grid3' || slot.contentType === 'note') pick = byType.note[0] || byType.longform[i]
    else if (slot.layout === 'audio') pick = byType.video[0] || byType.longform[1] || apiRows[i]
    else if (slot.toMoment) pick = byType.moment[0] || apiRows.find((r) => /定价|星球/.test(r.title || '')) || apiRows[i]
    else pick = byType.longform[i] || apiRows[i % apiRows.length]
    if (!pick) return slot
    return {
      ...slot,
      id: pick.id,
      title: pick.title || slot.title,
      summary: pick.summary || slot.summary,
      cover: pick.cover || pick.cover_url || slot.cover,
      images: (pick.images && pick.images.length ? pick.images : slot.images) || [],
      meta: pick.meta || slot.meta,
      tag: pick.tag || slot.tag,
      toMoment: !!slot.toMoment || !!pick.toMoment,
    }
  })
}

function applyLocalList(page) {
  page.setData({
    themePageStyle: WARM_PAGE_STYLE,
    dslPending: false,
    dslMode: false,
    loading: false,
    loadFailed: false,
    cats: DEMO_LIST.cats,
    ranks: DEMO_LIST.ranks,
    bigCard: DEMO_LIST.big,
    layoutItems: DEMO_LIST.rows,
    apiRows: [],
    totalCount: 412,
    footerText: '共 412 篇 · 本地源数据',
  })
}

Page({
  ...createSharePageConfig(),
  data: {
    ...TAB_DSL_INITIAL,
    themePageStyle: WARM_PAGE_STYLE,
    statusBarHeight: getNavLayout().statusBarHeight,
    cats: USE_LOCAL_SOURCE ? DEMO_LIST.cats : DEMO_LIST.cats,
    activeCat: '全部',
    sortKey: 'new',
    ranks: USE_LOCAL_SOURCE ? DEMO_LIST.ranks : [],
    bigCard: USE_LOCAL_SOURCE ? DEMO_LIST.big : null,
    layoutItems: USE_LOCAL_SOURCE ? DEMO_LIST.rows : DEMO_LIST.rows,
    apiRows: [],
    totalCount: USE_LOCAL_SOURCE ? 412 : 0,
    footerText: '',
    loading: !USE_LOCAL_SOURCE,
    loadFailed: false,
  },

  onLoad() {
    if (USE_LOCAL_SOURCE) {
      try {
        const sys = wx.getSystemInfoSync()
        this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
      } catch (_) {}
      applyLocalList(this)
      return
    }
    loadTabBoundDslPage(this, '/pages/content-list/content-list').then((ok) => {
      if (ok) return
      try {
        const sys = wx.getSystemInfoSync()
        this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
      } catch (_) {}
      this._loadArticles()
    })
  },

  onShow() {
    this.setData({ themePageStyle: WARM_PAGE_STYLE })
    showTabBarForRoute(this, '/pages/content-list/content-list')
  },

  onPullDownRefresh() {
    if (USE_LOCAL_SOURCE) {
      applyLocalList(this)
      wx.stopPullDownRefresh()
      return
    }
    if (this.data.dslMode) {
      loadTabBoundDslPage(this, '/pages/content-list/content-list', true).finally(() => wx.stopPullDownRefresh())
      return
    }
    this._loadArticles().then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (USE_LOCAL_SOURCE) return
    if (this.data.dslMode) handleDslReachBottom(this)
  },

  onBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) })
  },

  onSearchTap() {
    wx.navigateTo({
      url: '/pages/search/search',
      fail: () => wx.showToast({ title: '无法打开搜索页', icon: 'none' }),
    })
  },

  onCatTap(e) {
    this.setData({ activeCat: e.currentTarget.dataset.cat || '全部' })
  },

  onSortTap(e) {
    this.setData({ sortKey: e.currentTarget.dataset.key || 'new' })
  },

  _loadArticles() {
    if (USE_LOCAL_SOURCE) {
      applyLocalList(this)
      return Promise.resolve()
    }
    if (this.data.loading && this._loadingLock) return Promise.resolve()
    this._loadingLock = true
    this.setData({ loading: true, loadFailed: false, footerText: '加载中' })
    clearTimeout(this._skTimer)
    this._skTimer = setTimeout(() => {
      if (this.data.loading) {
        this._loadingLock = false
        this.setData({ loading: false, loadFailed: true, footerText: '加载失败' })
      }
    }, 8000)
    return request
      .get('/api/v1/mp/contents', { current: 1, size: 30 }, { auth: false })
      .then((data) => {
        clearTimeout(this._skTimer)
        this._loadingLock = false
        const records = (data && data.records) || []
        const apiRows = records.map(mapApiRow)
        const ranks = apiRows
          .slice()
          .sort((a, b) => b.viewNum - a.viewNum)
          .slice(0, 4)
          .map((r, i) => ({
            id: r.id,
            title: r.title,
            views: formatViews(r.viewNum) || '—',
            top: i < 3,
          }))
        const firstLong = apiRows.find((r) => r.formatKey === 'longform' && r.cover_url) || apiRows[0]
        const bigCard = firstLong
          ? {
              id: firstLong.id,
              title: firstLong.title,
              summary: firstLong.summary || '',
              cover: firstLong.cover_url || '',
              author: firstLong.author || '暖阁',
              avatar: '',
              meta: firstLong.meta || '',
              tag: '精选',
            }
          : DEMO_LIST.big
        const layoutItems = buildMixedLayouts(apiRows)
        this.setData({
          loading: false,
          loadFailed: false,
          apiRows: [],
          ranks: ranks.length ? ranks : DEMO_LIST.ranks,
          bigCard,
          layoutItems,
          cats: DEMO_LIST.cats,
          totalCount: Number(data.total) || apiRows.length || 412,
          footerText: apiRows.length ? `共 ${Number(data.total) || apiRows.length} 篇` : '暂无内容',
        })
      })
      .catch(() => {
        clearTimeout(this._skTimer)
        this._loadingLock = false
        this.setData({
          loading: false,
          loadFailed: true,
          apiRows: [],
          ranks: [],
          bigCard: null,
          layoutItems: [],
          footerText: '加载失败',
        })
      })
  },

  onRetry() {
    this._loadArticles()
  },

  onService() {
    wx.navigateTo({ url: '/pkg-user/service-chat/service-chat' })
  },

  onContentTap(e) {
    const id = e.currentTarget.dataset.id
    if (USE_LOCAL_SOURCE) {
      wx.navigateTo({ url: '/pages/content-detail/content-detail?demo=1' })
      return
    }
    if (!id) {
      wx.showToast({ title: '内容暂不可用', icon: 'none' })
      return
    }
    openContentDetail(id)
  },

  onLayoutTap(e) {
    const { id, moment, note } = e.currentTarget.dataset
    if (USE_LOCAL_SOURCE) {
      if (moment) {
        wx.navigateTo({ url: '/pages/moment-detail/moment-detail?demo=1&from=planet' })
        return
      }
      if (note) {
        wx.navigateTo({ url: '/pages/content-detail/content-detail?demo=note' })
        return
      }
      this.onContentTap(e)
      return
    }
    if (moment && id) {
      wx.navigateTo({ url: `/pages/moment-detail/moment-detail?id=${id}&from=planet` })
      return
    }
    this.onContentTap(e)
  },
})
