// components/dsl-article-feed/dsl-article-feed.js — 文章流（全站无限加载 + 可选分类 Tab）
const { executeAction } = require('../../utils/render')
const { get } = require('../../utils/request')

function formatPublishDateTime(value) {
  if (value == null || value === '') return ''
  const raw = String(value).trim()
  const matched = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/)
  if (matched) return matched[1] + ' ' + matched[2]
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const normalized = (raw.indexOf('T') >= 0 || raw.indexOf('-') >= 0) ? raw.replace(/-/g, '/') : raw
  const d = new Date(normalized)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function normalizeArticleItem(item, index) {
  return {
    id: item.id || `local_${index + 1}`,
    title: item.title || item.name || '文章标题',
    name: item.name || item.title || '文章标题',
    cover_url: item.cover_url || item.cover || item.image || item.coverUrl || '',
    image: item.image || item.cover || item.cover_url || item.coverUrl || '',
    link_url: item.link_url || '',
    created_at: formatPublishDateTime(item.publishedAt || item.publishTime || item.publish_time || item.createTime || item.createdAt || item.created_at),
    publish_time: formatPublishDateTime(item.publishedAt || item.publishTime || item.publish_time || item.createTime || item.createdAt || item.created_at),
    source: item.source || item.categoryName || item.category_name || '',
    categoryId: item.categoryId != null ? String(item.categoryId) : (item.category_id != null ? String(item.category_id) : ''),
    categoryName: item.categoryName || item.category_name || '',
  }
}

function calcPageSize(config) {
  const raw = Number(config && config.page_size)
  if (Number.isFinite(raw) && raw >= 5) return Math.min(raw, 30)
  try {
    const info = (wx.getWindowInfo && wx.getWindowInfo()) || wx.getSystemInfoSync()
    const h = Number(info.windowHeight) || 667
    const layout = (config && config.layout) || 'list'
    let itemH = 76
    if (layout === 'compact') itemH = 56
    if (layout === 'card') itemH = 200
    const n = Math.ceil(h / itemH) + 2
    return Math.max(5, Math.min(n, 30))
  } catch (e) {
    return 10
  }
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
    return theme.primaryColor || theme.tabBarActiveColor || '#002FA7'
  } catch (e) {
    return '#002FA7'
  }
}

function hexToRgba(hex, alpha) {
  const raw = String(hex || '').replace('#', '').trim()
  if (!raw) return `rgba(0, 47, 167, ${alpha})`
  const full = raw.length === 3
    ? raw.split('').map((c) => c + c).join('')
    : raw.slice(0, 6)
  const num = parseInt(full, 16)
  if (Number.isNaN(num)) return `rgba(0, 47, 167, ${alpha})`
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function buildActiveTabStyle(primary) {
  const color = primary || '#002FA7'
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
    titleStyle: '',
    metaStyle: '',
    listStyle: '',
    itemCardStyle: '',
    layout: 'list',
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
  },

  lifetimes: {
    attached() {
      const primary = resolveThemePrimary()
      this.setData({ activeTabStyle: buildActiveTabStyle(primary) })
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
      if (this.data.showCategoryTabs) {
        this._fetchPage(false)
        return
      }
      this._fetchPage(false)
    },

    _loadCategoryTabsFromApi() {
      const cfg = this.data.config || {}
      if (cfg.show_category_tabs !== true) return
      if (this._categoryTabsLoading) return
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
          if (cfg.show_category_tabs === true) {
            this.setData({
              categoryTabs: [{ id: '', name: '全部' }],
              showCategoryTabs: true,
            })
          }
        })
        .finally(() => {
          this._categoryTabsLoading = false
        })
    },

    _applyConfig(cfg) {
      const config = cfg || {}
      const titleSize = Number(config.title_font_size) > 0 ? Number(config.title_font_size) : 13
      const metaSize = Number(config.subtitle_font_size) > 0 ? Number(config.subtitle_font_size) : 11
      const raw = config.layout || config.style_type || 'list'
      const layout = ['card', 'list', 'compact'].includes(raw) ? raw : 'list'
      const gapRaw = Number(config.item_gap)
      const itemGap = Number.isFinite(gapRaw) ? Math.max(0, Math.min(gapRaw, 48)) : 8
      this._pageSize = calcPageSize(config)
      const radiusRaw = config.item_border_radius
      const radiusNum = radiusRaw === undefined || radiusRaw === null || radiusRaw === ''
        ? 12
        : Number(radiusRaw)
      const itemCardStyle = Number.isFinite(radiusNum)
        ? ('border-radius:' + Math.max(0, radiusNum) * 2 + 'rpx;')
        : ''
      const showCategoryTabs = config.show_category_tabs === true
      this.setData({
        titleStyle: 'font-size:' + (titleSize * 2) + 'rpx;',
        metaStyle: 'font-size:' + (metaSize * 2) + 'rpx;',
        listStyle: 'gap:' + (itemGap * 2) + 'rpx;',
        itemCardStyle,
        layout,
        showCategoryTabs,
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
      const id = e.currentTarget.dataset.id
      const tabId = id == null ? '' : String(id)
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
      const cfg = this.data.config || {}
      const pageSize = this._pageSize || calcPageSize(cfg)
      const mapped = (runtimeData || []).slice(0, pageSize).map((item, index) => normalizeArticleItem(item, index))
      this.setData({
        displayData: mapped,
        page: mapped.length ? 1 : 0,
        hasMore: (runtimeData || []).length >= pageSize,
        footerText: (runtimeData || []).length >= pageSize ? '' : (mapped.length ? '没有更多了' : ''),
      })
    },

    _resetAndLoad(useRuntime) {
      const cfg = this.data.config || {}
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

      if (tid && /^\d+$/.test(String(tid))) {
        this._requestContents({
          reset,
          nextPage,
          pageSize,
          params: {
            current: nextPage,
            size: pageSize,
            categoryId: Number(tid),
            status: 'published',
          },
          onFail: () => {
            this._localPool = this._buildLocalPool(this.data.runtimeData, tid)
            this._sliceLocal(reset, nextPage, pageSize)
          },
        })
        return
      }

      if (!tid) {
        this._requestContents({
          reset,
          nextPage,
          pageSize,
          params: {
            current: nextPage,
            size: pageSize,
            status: 'published',
          },
          onFail: () => {
            this._localPool = this._buildLocalPool(this.data.runtimeData, '')
            this._sliceLocal(reset, nextPage, pageSize)
          },
        })
        return
      }

      if (reset || !this._localPool || !this._localPool.length) {
        this._localPool = this._buildLocalPool(this.data.runtimeData, tid)
      }
      this._sliceLocal(reset, nextPage, pageSize)
    },

    _requestContents({ reset, nextPage, pageSize, params, onFail }) {
      get('/api/v1/mp/contents', params, { auth: false, showError: false })
        .then((data) => {
          const records = extractRecords(data)
          const mapped = records.map((item, index) => normalizeArticleItem(item, index))
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
          if (typeof onFail === 'function') onFail()
          else {
            this.setData({
              loading: false,
              loadingMore: false,
              tabLoading: false,
              hasMore: false,
              footerText: this.data.displayData.length ? '没有更多了' : '',
            })
          }
        })
    },

    _buildLocalPool(runtimeData, tabKey) {
      const all = (runtimeData || []).map((item, index) => normalizeArticleItem(item, index))
      if (!tabKey) return all
      const tab = (this.data.categoryTabs || []).find((t) => String(t.id) === String(tabKey) || t.name === tabKey)
      return all.filter((item) => {
        if (tab && tab.id && item.categoryId && String(item.categoryId) === String(tab.id)) return true
        const name = (tab && tab.name) || String(tabKey)
        const blob = `${item.categoryName || ''} ${item.source || ''} ${item.title || ''}`
        return blob.indexOf(name) >= 0
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

    onTapArticle(e) {
      const id = e.currentTarget.dataset.id
      const article = (this.data.displayData || []).find((a) => String(a.id) === String(id))
      if (article && article.action) {
        executeAction(article.action)
      } else if (article && article.link_url) {
        executeAction({ type: 'page', path: article.link_url })
      } else {
        executeAction({
          type: 'page',
          path: '/pages/content-detail/content-detail?id=' + id,
        })
      }
    },
  },
})
