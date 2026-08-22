// components/dsl-note-feed/dsl-note-feed.js — 笔记瀑布流（小红书双列）
const { executeAction } = require('../../utils/render')
const { get } = require('../../utils/request')
const { resolveMediaUrl } = require('../../utils/media-url')
const { buildNoteGalleryUrls } = require('../../utils/note-content')

function formatLikeCount(n) {
  const num = Math.max(0, Number(n) || 0)
  if (num >= 10000) {
    const v = (num / 10000).toFixed(1).replace(/\.0$/, '')
    return `${v}w`
  }
  if (num >= 1000) {
    const v = (num / 1000).toFixed(1).replace(/\.0$/, '')
    return `${v}k`
  }
  return String(num)
}

function normalizeNoteItem(item, index) {
  const images = Array.isArray(item.images) ? item.images : []
  const coverRaw = item.cover_url || item.cover || item.image || item.coverUrl || item.coverImage || ''
  const gallery = buildNoteGalleryUrls(coverRaw, images)
  const cover = resolveMediaUrl(gallery[0] || '')
  const author = String(item.author || item.authorName || '作者').trim() || '作者'
  return {
    id: item.id || `local_${index + 1}`,
    title: item.title || item.name || '笔记标题',
    cover_url: cover,
    image_count: gallery.length,
    author_name: author,
    author_avatar: resolveMediaUrl(item.authorAvatar || item.author_avatar || ''),
    author_initial: author.slice(0, 1),
    like_text: formatLikeCount(item.likeCount || item.like_count || 0),
    view_text: `阅读 ${Math.max(0, Number(item.viewCount || item.view_count || 0))}`,
    categoryId: item.categoryId != null ? String(item.categoryId) : (item.category_id != null ? String(item.category_id) : ''),
    categoryName: item.categoryName || item.category_name || '',
  }
}

function calcPageSize(config) {
  const raw = Number(config && config.page_size)
  if (Number.isFinite(raw) && raw >= 6) return Math.min(raw, 30)
  return 12
}

function extractRecords(data) {
  if (!data) return []
  if (Array.isArray(data.records)) return data.records
  if (Array.isArray(data.list)) return data.list
  if (Array.isArray(data)) return data
  return []
}

function resolveHasMore(data, page, pageSize, fetchedLen) {
  if (data && typeof data.total === 'number' && data.total >= 0) {
    return page * pageSize < data.total
  }
  if (data && typeof data.pages === 'number' && data.pages > 0) {
    return page < data.pages
  }
  return fetchedLen >= pageSize
}

function resolveThemePrimary() {
  try {
    const app = getApp()
    const theme = (app && app.globalData && app.globalData.miniappThemeConfig) || {}
    return theme.primaryColor || theme.tabBarActiveColor || '#ec2f55'
  } catch (e) {
    return '#ec2f55'
  }
}

function hexToRgba(hex, alpha) {
  const raw = String(hex || '').replace('#', '').trim()
  if (!raw) return `rgba(236, 47, 85, ${alpha})`
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw.slice(0, 6)
  const num = parseInt(full, 16)
  if (Number.isNaN(num)) return `rgba(236, 47, 85, ${alpha})`
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function buildActiveTabStyle(primary) {
  const color = primary || '#ec2f55'
  return `color:${color};background:${hexToRgba(color, 0.12)};font-weight:700;`
}

Component({
  properties: {
    config: { type: Object, value: {} },
    runtimeData: { type: Array, value: [] },
    actions: { type: Array, value: [] },
    styleString: { type: String, value: '' },
  },

  data: {
    displayData: [],
    listStyle: '',
    itemCardStyle: '',
    loading: false,
    loadingMore: false,
    tabLoading: false,
    hasMore: true,
    page: 0,
    footerText: '',
    showCategoryTabs: false,
    categoryTabs: [],
    activeTabId: '',
    activeTabStyle: '',
    layout: 'masonry',
  },

  lifetimes: {
    attached() {
      this.setData({ activeTabStyle: buildActiveTabStyle(resolveThemePrimary()) })
    },
  },

  observers: {
    config(config) {
      if (!config || typeof config !== 'object') return
      this._applyConfig(config)
      if (config.show_category_tabs === true && (this.data.categoryTabs || []).length <= 1) {
        this._loadCategoryTabsFromApi()
      }
    },
    runtimeData(runtimeData) {
      const cfg = this.data.config || {}
      if (cfg.show_category_tabs === true) return
      if (Array.isArray(runtimeData) && runtimeData.length && !this.data.displayData.length && !this.data.loading) {
        this._bootstrapFromRuntime(runtimeData)
      }
    },
  },

  methods: {
    loadMore() {
      if (!this.data.hasMore || this.data.loadingMore || this.data.loading || this.data.tabLoading) return
      this._fetchPage(false)
    },

    _loadCategoryTabsFromApi() {
      const cfg = this.data.config || {}
      if (cfg.show_category_tabs !== true || this._categoryTabsLoading) return
      this._categoryTabsLoading = true
      get('/api/v1/mp/content-categories', {}, { auth: false, showError: false })
        .then((list) => {
          let rows = []
          if (Array.isArray(list)) rows = list
          else if (list && Array.isArray(list.data)) rows = list.data
          else if (list && Array.isArray(list.records)) rows = list.records
          const tabs = [{ id: '', name: '全部' }].concat(
            rows
              .filter((c) => c && (c.status === undefined || Number(c.status) === 1))
              .filter((c) => {
                const pid = c.parentId != null ? c.parentId : c.parent_id
                return pid == null || Number(pid) === 0
              })
              .map((c) => ({
                id: c.id != null ? String(c.id) : String(c.name || ''),
                name: String(c.name || '').trim(),
              }))
              .filter((t) => t.name),
          )
          this.setData({ categoryTabs: tabs, showCategoryTabs: true })
          this._loadByTab(this.data.activeTabId)
        })
        .catch(() => {
          this.setData({ categoryTabs: [{ id: '', name: '全部' }], showCategoryTabs: true })
        })
        .finally(() => {
          this._categoryTabsLoading = false
        })
    },

    _applyConfig(cfg) {
      const config = cfg || {}
      const gapRaw = Number(config.item_gap)
      const itemGap = Number.isFinite(gapRaw) ? Math.max(0, Math.min(gapRaw, 48)) : 11
      this._pageSize = calcPageSize(config)
      const radiusRaw = config.item_border_radius
      const radiusNum = radiusRaw === undefined || radiusRaw === null || radiusRaw === ''
        ? 14
        : Number(radiusRaw)
      const itemCardStyle = Number.isFinite(radiusNum)
        ? (`border-radius:${Math.max(0, radiusNum) * 2}rpx;`)
        : ''
      const showCategoryTabs = config.show_category_tabs === true
      const layoutRaw = String(config.layout || 'masonry').toLowerCase()
      const layout = layoutRaw === 'wechat' ? 'wechat' : 'masonry'
      this.setData({
        listStyle: `gap:${itemGap * 2}rpx;`,
        itemCardStyle,
        showCategoryTabs,
        layout,
      })
      if (showCategoryTabs) {
        if (!this.data.categoryTabs.length) {
          this.setData({ categoryTabs: [{ id: '', name: '全部' }] })
        }
      } else if (!this.data.displayData.length) {
        this._resetAndLoad(true)
      }
    },

    onTapTab(e) {
      const tabId = e.currentTarget.dataset.id == null ? '' : String(e.currentTarget.dataset.id)
      if (tabId === this.data.activeTabId) return
      this.setData({ activeTabId: tabId })
      this._loadByTab(tabId)
    },

    _loadByTab(tabId) {
      this._localPool = []
      this.setData({
        page: 0,
        hasMore: true,
        footerText: '',
        displayData: [],
      })
      this._fetchPage(true, tabId)
    },

    _bootstrapFromRuntime(runtimeData) {
      const pageSize = this._pageSize || calcPageSize(this.data.config)
      const mapped = (runtimeData || []).slice(0, pageSize).map((item, index) => normalizeNoteItem(item, index))
      this.setData({
        displayData: mapped,
        page: mapped.length ? 1 : 0,
        hasMore: (runtimeData || []).length >= pageSize,
        footerText: (runtimeData || []).length >= pageSize ? '' : (mapped.length ? '没有更多了' : ''),
      })
    },

    _resetAndLoad(useRuntime) {
      const runtime = Array.isArray(this.data.runtimeData) ? this.data.runtimeData : []
      if (useRuntime && runtime.length) {
        this._bootstrapFromRuntime(runtime)
        return
      }
      this.setData({
        displayData: [],
        page: 0,
        hasMore: true,
        footerText: '',
        loading: true,
        loadingMore: false,
      })
      this._fetchPage(true)
    },

    _fetchPage(reset, tabId) {
      const cfg = this.data.config || {}
      const pageSize = this._pageSize || calcPageSize(cfg)
      const nextPage = reset ? 1 : (this.data.page || 0) + 1
      const tid = tabId != null ? tabId : this.data.activeTabId

      if (reset) {
        this.setData({ loading: true, footerText: '', tabLoading: cfg.show_category_tabs === true })
      } else {
        this.setData({ loadingMore: true, footerText: '加载中...' })
      }

      const params = {
        current: nextPage,
        size: pageSize,
        contentType: 'note',
        status: 'published',
      }
      if (tid && /^\d+$/.test(String(tid))) {
        params.categoryId = Number(tid)
      }

      get('/api/v1/mp/contents', params, { auth: false, showError: false })
        .then((data) => {
          const records = extractRecords(data)
          const mapped = records.map((item, index) => normalizeNoteItem(item, index))
          const merged = reset ? mapped : (this.data.displayData || []).concat(mapped)
          const hasMore = resolveHasMore(data, nextPage, pageSize, mapped.length)
          this.setData({
            displayData: merged,
            page: nextPage,
            hasMore,
            loading: false,
            loadingMore: false,
            tabLoading: false,
            footerText: hasMore ? '' : (merged.length ? '没有更多了' : ''),
          })
        })
        .catch(() => {
          if (reset || !this._localPool || !this._localPool.length) {
            this._localPool = this._buildLocalPool(this.data.runtimeData, tid)
          }
          this._sliceLocal(reset, nextPage, pageSize)
        })
    },

    _buildLocalPool(runtimeData, tabKey) {
      const all = (runtimeData || []).map((item, index) => normalizeNoteItem(item, index))
      if (!tabKey) return all
      const tab = (this.data.categoryTabs || []).find((t) => String(t.id) === String(tabKey))
      return all.filter((item) => {
        if (tab && tab.id && item.categoryId && String(item.categoryId) === String(tab.id)) return true
        const name = (tab && tab.name) || String(tabKey)
        return `${item.categoryName || ''} ${item.title || ''}`.indexOf(name) >= 0
      })
    },

    _sliceLocal(reset, nextPage, pageSize) {
      const pool = this._localPool || []
      const start = (nextPage - 1) * pageSize
      const slice = pool.slice(start, start + pageSize)
      const merged = reset ? slice : (this.data.displayData || []).concat(slice)
      const hasMore = start + pageSize < pool.length
      this.setData({
        displayData: merged,
        page: nextPage,
        hasMore,
        loading: false,
        loadingMore: false,
        tabLoading: false,
        footerText: hasMore ? '' : (merged.length ? '没有更多了' : ''),
      })
    },

    onTapNote(e) {
      const id = e.currentTarget.dataset.id
      executeAction({
        type: 'page',
        path: '/pages/content-detail/content-detail?id=' + id,
      })
    },
  },
})
