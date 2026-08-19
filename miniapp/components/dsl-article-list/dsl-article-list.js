// components/dsl-article-list/dsl-article-list.js — 文章列表（支持顶部分类标签 + 触底加载）
const { executeAction } = require('../../utils/render')
const { get } = require('../../utils/request')

function formatPublishDateTime(value) {
  if (value == null || value === '') return ''
  const raw = String(value).trim()
  const matched = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/)
  if (matched) return matched[1] + ' ' + matched[2]
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const dayOnly = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (dayOnly) return `${dayOnly[1]}-${Number(dayOnly[2])}-${Number(dayOnly[3])}`
  const normalized = (raw.indexOf('T') >= 0 || raw.indexOf('-') >= 0) ? raw.replace(/-/g, '/') : raw
  const d = new Date(normalized)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function formatArticleMeta(item) {
  const date = item.publishedAt
    || item.publishTime
    || item.publish_time
    || item.createTime
    || item.createdAt
    || item.created_at
  return formatPublishDateTime(date)
}

function normalizeArticleItem(item, index) {
  return {
    id: item.id || `local_${index + 1}`,
    title: item.title || item.name || '文章标题',
    name: item.name || item.title || '文章标题',
    cover_url: item.cover_url || item.cover || item.image || item.coverUrl || '',
    image: item.image || item.cover || item.cover_url || item.coverUrl || '',
    link_url: item.link_url || '',
    created_at: formatArticleMeta(item),
    publish_time: formatArticleMeta(item),
    source: item.source || item.categoryName || item.category_name || '',
    categoryId: item.categoryId != null ? String(item.categoryId) : (item.category_id != null ? String(item.category_id) : ''),
    categoryName: item.categoryName || item.category_name || '',
  }
}

function normalizeTabs(config) {
  const raw = Array.isArray(config && config.category_tabs) ? config.category_tabs : []
  const tabs = raw
    .map((t) => {
      const name = String(t.name || t.label || '').trim()
      if (!name) return null
      const id = t.id == null || t.id === '' ? (name === '全部' ? '' : name) : String(t.id)
      return { id, name }
    })
    .filter(Boolean)
  if (!tabs.length) {
    return [
      { id: '', name: '全部' },
      { id: '行业动态', name: '行业动态' },
      { id: '协会动态', name: '协会动态' },
    ]
  }
  if (!tabs.some((t) => t.name === '全部')) {
    tabs.unshift({ id: '', name: '全部' })
  }
  return tabs
}

/** 按屏高估算一页条数：铺满一屏 + 少量缓冲，随机型变化 */
function calcPageSize(layout) {
  try {
    const info = (wx.getWindowInfo && wx.getWindowInfo()) || wx.getSystemInfoSync()
    const h = Number(info.windowHeight) || 667
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

Component({
  properties: {
    config: { type: Object, value: {} },
    runtimeData: { type: Array, value: [] },
    actions: { type: Array, value: [] },
    styleString: { type: String, value: '' },
  },

  data: {
    displayData: [],
    sectionTitle: '',
    sectionSubtitle: '',
    sectionStyle: 'bar',
    sectionAlign: 'left',
    sectionDivider: false,
    sectionTitleStyle: '',
    sectionSubtitleStyle: '',
    sectionMoreStyle: '',
    showMore: true,
    moreText: '查看更多>',
    moreLink: '/pages/content-list/content-list',
    titleStyle: '',
    metaStyle: '',
    listStyle: '',
    layout: 'list',
    showCategoryTabs: false,
    categoryTabs: [],
    activeTabId: '',
    tabLoading: false,
    loadingMore: false,
    hasMore: true,
    page: 0,
    footerText: '',
  },

  lifetimes: {
    attached() {
      this._pageSize = calcPageSize('list')
      this._localPool = []
      this._applyConfig(this.data.runtimeData, this.data.config)
      this._loadCategoryTabsFromApi()
    },
  },

  observers: {
    'runtimeData, config': function (runtimeData, config) {
      this._applyConfig(runtimeData, config)
    },
  },

  methods: {
    /** 页面 onReachBottom 调用 */
    loadMore() {
      if (!this.data.showCategoryTabs) return
      if (!this.data.hasMore || this.data.loadingMore || this.data.tabLoading) return
      this._fetchPage(false)
    },

    _loadCategoryTabsFromApi() {
      if (this.data.config && this.data.config.show_category_tabs !== true) return
      get('/api/v1/mp/content-categories', {}, { auth: false, showError: false })
        .then((list) => {
          const rows = Array.isArray(list) ? list : (list && list.records) || []
          if (!rows.length) return
          const tabs = [{ id: '', name: '全部' }].concat(
            rows.map((c) => ({
              id: c.id != null ? String(c.id) : String(c.name || ''),
              name: String(c.name || '').trim(),
            })).filter((t) => t.name),
          )
          this.setData({ categoryTabs: tabs, showCategoryTabs: true })
          this._loadByTab(this.data.activeTabId, this.data.runtimeData, this.data.config)
        })
        .catch(() => {
          /* 后端未部署时沿用 DSL 配置 */
        })
    },

    _applyConfig(runtimeData, config) {
      const cfg = config || {}
      const titleSize = Number(cfg.title_font_size) > 0 ? Number(cfg.title_font_size) : 13
      const metaSize = Number(cfg.subtitle_font_size) > 0 ? Number(cfg.subtitle_font_size) : 11
      const raw = cfg.layout || cfg.style_type || 'list'
      const layout = ['card', 'list', 'compact'].includes(raw) ? raw : 'list'
      const sectionStyle = ['bar', 'card', 'plain'].includes(cfg.section_style) ? cfg.section_style : 'plain'
      const sectionAlign = cfg.section_align === 'center' ? 'center' : 'left'
      const sectionDivider = cfg.section_divider === true
      const sectionTitleSize = Number(cfg.section_title_font_size) > 0 ? Number(cfg.section_title_font_size) : 16
      const sectionSubSize = Number(cfg.section_subtitle_font_size) > 0 ? Number(cfg.section_subtitle_font_size) : 11
      const sectionBold = cfg.section_title_bold !== false
      const isBand = sectionStyle === 'bar'
      let sectionColor = cfg.section_title_color || (isBand ? '#F3F7FC' : '#172033')
      if (isBand && sectionColor === '#172033') sectionColor = '#F3F7FC'
      const sectionSubColor = cfg.section_subtitle_color || (isBand ? '#D4E2FF' : '#7b8798')
      const showMore = cfg.show_more !== false
      const moreText = String(cfg.more_text || '查看更多>').trim() || '查看更多>'
      const moreLink = String(cfg.more_link || '/pages/content-list/content-list').trim()
        || '/pages/content-list/content-list'
      const moreColor = cfg.more_color || (isBand ? '#D4E2FF' : '#7b8798')
      const gapRaw = Number(cfg.item_gap)
      const itemGap = Number.isFinite(gapRaw) ? Math.max(0, Math.min(gapRaw, 48)) : 8
      const showCategoryTabs = cfg.show_category_tabs === true
      const categoryTabs = showCategoryTabs ? normalizeTabs(cfg) : []
      const activeTabId = this.data.activeTabId || ''

      this._pageSize = calcPageSize(layout)

      this.setData({
        sectionTitle: String(cfg.title || '').trim(),
        sectionSubtitle: String(cfg.subtitle || '').trim(),
        sectionStyle,
        sectionAlign,
        sectionDivider,
        sectionTitleStyle: 'font-size:' + (sectionTitleSize * 2) + 'rpx;font-weight:' + (sectionBold ? '800' : '400') + ';color:' + sectionColor + ';',
        sectionSubtitleStyle: 'font-size:' + (sectionSubSize * 2) + 'rpx;color:' + sectionSubColor + ';',
        sectionMoreStyle: 'color:' + moreColor + ';',
        showMore: showCategoryTabs ? false : showMore,
        moreText,
        moreLink,
        titleStyle: 'font-size:' + (titleSize * 2) + 'rpx',
        metaStyle: 'font-size:' + (metaSize * 2) + 'rpx',
        listStyle: 'gap:' + (itemGap * 2) + 'rpx;',
        layout,
        showCategoryTabs,
        categoryTabs,
        activeTabId,
      })

      if (showCategoryTabs) {
        this._loadByTab(activeTabId, runtimeData, cfg)
      } else {
        this._localPool = []
        this.setData({
          displayData: this._normalizeDisplayData(runtimeData, cfg),
          hasMore: false,
          page: 1,
          footerText: '',
          loadingMore: false,
        })
      }
    },

    onTapTab(e) {
      const id = e.currentTarget.dataset.id
      const tabId = id == null ? '' : String(id)
      if (tabId === this.data.activeTabId) return
      this.setData({ activeTabId: tabId })
      this._loadByTab(tabId, this.data.runtimeData, this.data.config)
    },

    _loadByTab(tabId, runtimeData, config) {
      this._localPool = []
      this.setData({
        page: 0,
        hasMore: true,
        footerText: '',
        displayData: [],
      })
      this._fetchPage(true, tabId, runtimeData, config)
    },

    _fetchPage(reset, tabId, runtimeData, config) {
      const cfg = config || this.data.config || {}
      const tid = tabId != null ? tabId : this.data.activeTabId
      const pageSize = this._pageSize || calcPageSize(this.data.layout)
      const nextPage = reset ? 1 : (this.data.page || 0) + 1

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
            this._localPool = this._buildLocalPool(runtimeData || this.data.runtimeData, cfg, tid)
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
            this._localPool = this._buildLocalPool(runtimeData || this.data.runtimeData, cfg, '')
            this._sliceLocal(reset, nextPage, pageSize)
          },
        })
        return
      }

      // tabId 为分类名：本地池分页
      if (reset || !this._localPool.length) {
        this._localPool = this._buildLocalPool(runtimeData || this.data.runtimeData, cfg, tid)
      }
      this._sliceLocal(reset, nextPage, pageSize)
    },

    _requestContents({ reset, nextPage, pageSize, params, onFail }) {
      if (reset) this.setData({ tabLoading: true })
      else this.setData({ loadingMore: true, footerText: '加载中...' })

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
            tabLoading: false,
            loadingMore: false,
            footerText: hasMore ? '' : (merged.length ? '没有更多了' : ''),
          })
        })
        .catch(() => {
          if (typeof onFail === 'function') onFail()
          else {
            this.setData({
              tabLoading: false,
              loadingMore: false,
              hasMore: false,
              footerText: this.data.displayData.length ? '没有更多了' : '',
            })
          }
        })
    },

    _buildLocalPool(runtimeData, config, tabKey) {
      const all = this._normalizeDisplayData(runtimeData, { ...(config || {}), limit: 500 })
      if (!tabKey) return all
      const tab = (this.data.categoryTabs || []).find((t) => String(t.id) === String(tabKey) || t.name === tabKey)
      const name = (tab && tab.name) || String(tabKey)
      return all.filter((item) => {
        if (tab && tab.id && item.categoryId && String(item.categoryId) === String(tab.id)) return true
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
        tabLoading: false,
        loadingMore: false,
        footerText: hasMore ? '' : (merged.length ? '没有更多了' : ''),
      })
    },

    onTapMore() {
      const link = String(this.data.moreLink || '/pages/content-list/content-list').trim()
      if (!link) return
      if (/^https?:\/\//i.test(link)) {
        executeAction({ type: 'webview', url: link })
        return
      }
      executeAction({ type: 'page', path: link })
    },

    _normalizeDisplayData(runtimeData, config) {
      if (Array.isArray(runtimeData) && runtimeData.length > 0) {
        const limit = Math.max(Number((config && config.limit) || runtimeData.length), 1)
        return runtimeData.slice(0, limit).map((item, index) => normalizeArticleItem(item, index))
      }

      const items = Array.isArray(config && config.items) ? config.items : []
      const source = items.length ? items : [
        { title: '品牌故事：从内容到交易闭环', publishedAt: '2026-05-10', source: '跨境电商头条' },
        { title: '选品指南：活动与商品联动', publishedAt: '2026-05-12', source: '直击跨境' },
      ]
      const limit = Math.max(Number((config && config.limit) || source.length), 1)
      return source.slice(0, limit).map((item, index) => normalizeArticleItem(item, index))
    },

    onTapArticle(e) {
      const id = e.currentTarget.dataset.id
      const article = this.data.displayData.find((a) => String(a.id) === String(id))

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
