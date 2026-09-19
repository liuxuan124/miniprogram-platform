// pages/content-list/content-list.js — 固定 cl-* 版式；生产走真实分类/热读/推荐

const request = require('../../utils/request')
const SystemService = require('../../services/system')
const { createSharePageConfig } = require('../../utils/share')
const { loadTabBoundDslPage, handleDslReachBottom, TAB_DSL_INITIAL } = require('../../utils/dsl-tab-page')
const { showTabBarForRoute } = require('../../utils/tab-bar-route')
const { getNavLayout } = require('../../utils/nav-layout')
const { resolveMediaUrl } = require('../../utils/media-url')
const { openContentDetail } = require('../../utils/content-id')
const { DEMO_LIST } = require('../../data/warm-demo')
const { FORCE_LOCAL_DEMO, USE_LOCAL_SOURCE, WARM_PAGE_STYLE } = require('../../data/warm-source')
const { DEFAULT_AVATAR, DEFAULT_PRODUCT } = require('../../utils/image-fallback')

const LOCAL_DEMO = FORCE_LOCAL_DEMO || USE_LOCAL_SOURCE
const ALL_CAT = { id: 'all', name: '全部' }

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

function formatDuration(raw) {
  if (raw == null || raw === '') return ''
  const text = String(raw).trim()
  if (/^\d+:\d{2}(:\d{2})?$/.test(text)) return text
  const n = Number(text)
  if (!Number.isFinite(n) || n <= 0) return ''
  const total = Math.floor(n)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s < 10 ? '0' : ''}${s}`
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
  else if (type === 'video') layout = 'audio'
  const extra = Number(item.imageCount || item.image_count || images.length) || images.length
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
    imageMore: extra > 3 ? extra - 3 : 0,
    duration: type === 'video' ? formatDuration(item.videoDuration || item.video_duration || item.duration) : '',
    meta: [date, views ? `${views} 阅读` : ''].filter(Boolean).join(' · '),
    tag: type === 'moment' ? '星球内容' : (item.visibility === 'member_only' ? '会员专享' : formatLabel),
    toMoment: type === 'moment' || item.planetExclusive === 1 || item.planet_exclusive === 1,
    viewNum: Number(item.viewCount || item.view_count || 0),
    author: item.authorName || item.author || item.nickname || '暖阁',
    avatar: resolveMediaUrl(item.authorAvatar || item.avatar || ''),
  }
}

function mapBigCard(item) {
  if (!item || !item.id) return null
  const row = item.layout ? item : mapApiRow(item)
  return {
    id: row.id,
    title: row.title,
    summary: row.summary || '',
    cover: row.cover || row.cover_url || '',
    author: row.author || '暖阁',
    avatar: row.avatar || '',
    meta: row.meta || '',
    tag: '精选',
  }
}

function mapCats(list) {
  const rows = Array.isArray(list) ? list : []
  return [ALL_CAT].concat(rows.map((c) => ({
    id: String(c.id),
    name: String(c.name || '').trim() || '未命名',
  })).filter((c) => c.id))
}

function applyLocalList(page) {
  const demoCats = (DEMO_LIST.cats || []).map((name, i) => (
    typeof name === 'object' ? { id: String(name.id || i), name: name.name } : { id: i === 0 ? 'all' : String(i), name: String(name) }
  ))
  if (!demoCats.length || demoCats[0].id !== 'all') demoCats.unshift(ALL_CAT)
  page.setData({
    themePageStyle: WARM_PAGE_STYLE,
    dslPending: false,
    dslMode: false,
    loading: false,
    loadFailed: false,
    cats: demoCats,
    ranks: DEMO_LIST.ranks,
    bigCard: DEMO_LIST.big,
    layoutItems: DEMO_LIST.rows,
    apiRows: [],
    totalCount: 412,
    footerText: '共 412 篇 · 本地源数据',
  })
}

function unwrapRecords(data) {
  if (!data) return []
  if (Array.isArray(data)) return data
  return data.records || data.list || data.items || []
}

Page({
  ...createSharePageConfig(),
  data: {
    ...TAB_DSL_INITIAL,
    themePageStyle: WARM_PAGE_STYLE,
    statusBarHeight: getNavLayout().statusBarHeight,
    cats: [ALL_CAT],
    activeCat: 'all',
    sortKey: 'new',
    ranks: [],
    bigCard: null,
    layoutItems: [],
    apiRows: [],
    totalCount: 0,
    footerText: '',
    loading: !LOCAL_DEMO,
    loadFailed: false,
  },

  onLoad() {
    if (LOCAL_DEMO) {
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
    if (LOCAL_DEMO) {
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
    if (LOCAL_DEMO) return
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
    const id = e.currentTarget.dataset.id != null ? String(e.currentTarget.dataset.id) : 'all'
    if (id === this.data.activeCat) return
    this.setData({ activeCat: id })
    if (!LOCAL_DEMO) this._loadArticles()
  },

  onSortTap(e) {
    const key = e.currentTarget.dataset.key || 'new'
    if (key === this.data.sortKey) return
    this.setData({ sortKey: key })
    if (!LOCAL_DEMO) this._loadArticles()
  },

  _loadArticles() {
    if (LOCAL_DEMO) {
      applyLocalList(this)
      return Promise.resolve()
    }
    this._loadingLock = true
    this.setData({ loading: true, loadFailed: false, footerText: '加载中' })
    clearTimeout(this._skTimer)
    this._skTimer = setTimeout(() => {
      if (this.data.loading) {
        this._loadingLock = false
        this.setData({ loading: false, loadFailed: true, footerText: '加载失败' })
      }
    }, 8000)

    const sortKey = this.data.sortKey || 'new'
    const catId = this.data.activeCat && this.data.activeCat !== 'all' ? this.data.activeCat : ''
    const listQuery = { current: 1, size: 30, sortBy: sortKey }
    if (catId) listQuery.categoryId = catId

    const catReq = request.get('/api/v1/mp/content-categories', {}, { auth: false, showError: false })
      .catch(() => [])
    const cfgReq = SystemService.fetchSystemConfig().catch(() => ({}))
    const listReq = request.get('/api/v1/mp/contents', listQuery, { auth: false, showError: false })

    return Promise.all([catReq, cfgReq, listReq])
      .then(([catData, config, listData]) => {
        const listCfg = (config && config.contentListConfig) || {}
        const extras = []
        if (listCfg.showRank !== false) {
          extras.push(request.get('/api/v1/mp/contents', { current: 1, size: 4, sortBy: 'hot' }, { auth: false, showError: false }).catch(() => null))
        } else {
          extras.push(Promise.resolve(null))
        }
        if (listCfg.showFeatured !== false) {
          const featuredId = listCfg.featuredContentId
          if (featuredId) {
            extras.push(request.get('/api/v1/mp/contents', { current: 1, size: 1, id: featuredId }, { auth: false, showError: false }).catch(() => null))
          } else {
            extras.push(request.get('/api/v1/mp/contents', { current: 1, size: 1, recommended: 1 }, { auth: false, showError: false }).catch(() => null))
          }
        } else {
          extras.push(Promise.resolve(false))
        }
        return Promise.all(extras).then(([rankData, featData]) => {
          clearTimeout(this._skTimer)
          this._loadingLock = false
          const records = unwrapRecords(listData)
          const layoutItems = records.map(mapApiRow)
          const rankRows = unwrapRecords(rankData).map(mapApiRow)
          const ranks = listCfg.showRank === false
            ? []
            : rankRows.slice(0, 4).map((r, i) => ({
              id: r.id,
              title: r.title,
              views: formatViews(r.viewNum) || '—',
              top: i < 3,
            }))
          let bigCard = null
          if (listCfg.showFeatured !== false) {
            const featRows = unwrapRecords(featData)
            bigCard = mapBigCard(featRows[0])
          }
          const featuredId = bigCard && bigCard.id != null ? String(bigCard.id) : ''
          const filteredLayout = featuredId
            ? layoutItems.filter((row) => String(row.id) !== featuredId)
            : layoutItems
          const total = Number((listData && listData.total) || records.length) || 0
          this.setData({
            loading: false,
            loadFailed: false,
            apiRows: [],
            ranks,
            bigCard,
            layoutItems: filteredLayout,
            cats: mapCats(Array.isArray(catData) ? catData : unwrapRecords(catData)),
            totalCount: total,
            footerText: total ? `共 ${total} 篇` : '暂无内容',
          })
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

  onBigCoverError() {
    if (!this.data.bigCard) return
    this.setData({ 'bigCard.cover': DEFAULT_PRODUCT })
  },

  onBigAvatarError() {
    if (!this.data.bigCard) return
    this.setData({ 'bigCard.avatar': DEFAULT_AVATAR })
  },

  onContentTap(e) {
    const id = e.currentTarget.dataset.id
    if (LOCAL_DEMO) {
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
    if (LOCAL_DEMO) {
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
