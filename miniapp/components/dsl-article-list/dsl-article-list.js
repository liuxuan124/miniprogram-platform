// components/dsl-article-list/dsl-article-list.js — 文章列表（支持顶部分类标签 + 触底加载）
const { executeAction } = require('../../utils/render')
const { get } = require('../../utils/request')
const { resolveArticleCover } = require('../../utils/article-cover')
const { isValidContentId } = require('../../utils/content-id')
const { resolveSourceLabel, filterBySourceKeys } = require('../../utils/dsl-source-tag')
const { filterByContentTags, primaryTagQueryParam } = require('../../utils/dsl-content-tag-filter')

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
  const cover = resolveArticleCover(item)
  const rawId = item.id != null ? item.id : (item.contentId != null ? item.contentId : item.content_id)
  const id = isValidContentId(rawId) ? String(rawId) : ''
  return {
    id,
    navigable: !!id,
    title: item.title || item.name || '文章标题',
    name: item.name || item.title || '文章标题',
    cover_url: cover,
    image: cover,
    link_url: item.link_url || '',
    created_at: formatArticleMeta(item),
    publish_time: formatArticleMeta(item),
    source: item.source || item.categoryName || item.category_name || '',
    sourceTag: item.sourceTag || item.source_tag || '',
    summary: String(item.summary || item.excerpt || item.subtitle || '').trim(),
    // 阅读热度（show_views）：与后台 ArticleListRenderer.viewsOf 同规则
    view_count: Number(item.viewCount != null ? item.viewCount : item.view_count) || 0,
    viewsText: '',
    categoryId: item.categoryId != null ? String(item.categoryId) : (item.category_id != null ? String(item.category_id) : ''),
    categoryName: item.categoryName || item.category_name || '',
  }
}

/**
 * 摘要简介是否展示（与后台 articleListSchema.resolveShowSummary 同规则）。
 * 报刊细排 / 杂志首篇的排版本身依赖摘要，这两个布局强制显示。
 */
function resolveShowSummary(layout, showSummary) {
  if (layout === 'editorial' || layout === 'magazine') return true
  return showSummary === true
}

/** 阅读量文案（≥1万 折算，与后台一致） */
function formatViewsText(showViews, count) {
  if (showViews !== true) return ''
  const n = Number(count) || 0
  if (n <= 0) return '0 阅读'
  return n >= 10000 ? (n / 10000).toFixed(1) + '万 阅读' : n + ' 阅读'
}

/**
 * 🔴 手动置顶（2026-10-06 新增，需与后台 ArticleListRenderer.displayArticleItems 同规则）。
 *
 * 置顶项按配置顺序排在最前，其余按筛选后原序跟随。
 * 置顶的文章不在当前结果里（筛选条件变了）也要占位 ——
 * 否则运营会以为「置顶没生效」而反复排查。
 */
function applyPinned(list, pinned) {
  const rows = list || []
  const pins = Array.isArray(pinned) ? pinned.filter((p) => p && p.id != null && String(p.id) !== '') : []
  if (!pins.length) return rows

  const byId = {}
  rows.forEach((it) => { byId[String(it.id)] = it })

  const head = []
  const used = {}
  pins.forEach((p) => {
    const key = String(p.id)
    const hit = byId[key]
    if (hit) {
      head.push(hit)
      used[key] = true
    } else {
      head.push({ id: p.id, title: p.title || ('文章 #' + p.id), cover_url: p.cover || '', navigable: false, viewsText: '' })
    }
  })

  const rest = rows.filter((it) => !used[String(it.id)])
  return head.concat(rest)
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
    return []
  }
  if (!tabs.some((t) => t.name === '全部')) {
    tabs.unshift({ id: '', name: '全部' })
  }
  // 「分类范围」= picked 时只保留运营手选的分类；id 比较统一按字符串，
  // 否则 el-select 回传数字 id 而这里存的是字符串，手选分类会被全部滤掉。
  const pickedRaw = config && config.category_tab_ids
  if (Array.isArray(pickedRaw) && pickedRaw.length) {
    const picked = pickedRaw.map((x) => String(x))
    const kept = tabs.filter((t) => t.id !== '' && picked.indexOf(String(t.id)) >= 0)
    return kept.length ? [{ id: '', name: '全部' }].concat(kept) : [{ id: '', name: '全部' }]
  }
  return tabs
}

/**
 * 🔴 拉取量必须与展示量解耦（2026-10-05 修复，需与后台 ArticleListRenderer 同规则）。
 *
 * 背景：DSL 里的 limit 原本同时充当「拉多少」和「留多少」，而来源/标签筛选是**拉回来之后**
 * 在客户端做的 —— 于是「显示数量 2」+「筛选来源=公众号」时，若接口按最新返回的前 2 篇恰好
 * 都不是公众号，就会被筛成空白或只剩 1 篇，运营看不出原因。
 *
 * 正解：拉取时按倍数放大余量，筛选完再截 limit。
 * 内容池本身不够时如实少给，不补假数据。
 */
const FETCH_BUFFER_FACTOR = 4
const FETCH_BUFFER_MIN = 20

function hasClientFilter(config) {
  const cfg = config || {}
  const sourceFilter = Array.isArray(cfg.source_filter) && cfg.source_filter.length > 0
  const platforms = Array.isArray(cfg.filter_platform_codes) && cfg.filter_platform_codes.length > 0
  const topics = Array.isArray(cfg.filter_topic_tags) && cfg.filter_topic_tags.length > 0
  return sourceFilter || platforms || topics
}

function resolveFetchSize(limit, filtered) {
  if (!filtered) return Math.max(limit, 50)
  return Math.max(limit * FETCH_BUFFER_FACTOR, FETCH_BUFFER_MIN, limit)
}

/** 按屏高估算一页条数：铺满一屏 + 少量缓冲，随机型变化 */
function calcPageSize(layout) {
  try {
    const info = require('../../utils/system-info').getWindowInfo()
    const h = Number(info.windowHeight) || 667
    let itemH = 76
    if (layout === 'compact') itemH = 56
    if (layout === 'card') itemH = 200
    if (layout === 'overlay') itemH = 220
    if (layout === 'magazine') itemH = 140
    if (layout === 'grid') itemH = 130
    if (layout === 'editorial') itemH = 88
    const n = Math.ceil(h / itemH) + 2
    return Math.max(5, Math.min(n, 30))
  } catch (e) {
    return 10
  }
}

const ARTICLE_LAYOUTS = ['card', 'list', 'compact', 'overlay', 'magazine', 'grid', 'editorial']

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
    showHeader: false,
    showMore: false,
    moreText: '更多 ›',
    moreLink: '/pkg-content/content-list/content-list',
    titleStyle: '',
    metaStyle: '',
    listStyle: '',
    itemCardStyle: '',
    layout: 'list',
    showCategoryTabs: false,
    categoryTabs: [],
    tabStyle: 'pill',
    emptyText: '暂无内容',
    emptyIcon: '',
    emptyHide: false,
    showViews: false,
    showSummary: false,
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
      const layout = ARTICLE_LAYOUTS.indexOf(raw) >= 0 ? raw : 'list'
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
      const showCategoryTabs = cfg.show_category_tabs === true
      const showHeader = cfg.show_header === true
      const showMore = showHeader
        ? cfg.show_more === true
        : (showCategoryTabs ? false : cfg.show_more !== false)
      const moreText = String(cfg.more_text || '更多 ›').trim() || '更多 ›'
      const moreLink = String(cfg.more_link || '/pkg-content/content-list/content-list').trim()
        || '/pkg-content/content-list/content-list'
      const moreColor = cfg.more_color || (isBand ? '#D4E2FF' : '#7b8798')
      const gapRaw = Number(cfg.item_gap)
      const itemGap = Number.isFinite(gapRaw) ? Math.max(0, Math.min(gapRaw, 48)) : 8
      const radiusRaw = cfg.item_border_radius
      const radiusNum = radiusRaw === undefined || radiusRaw === null || radiusRaw === ''
        ? 12
        : Number(radiusRaw)
      const itemCardStyle = Number.isFinite(radiusNum)
        ? ('border-radius:' + Math.max(0, radiusNum) * 2 + 'rpx;')
        : ''
      const categoryTabs = showCategoryTabs ? normalizeTabs(cfg) : []
      const activeTabId = this.data.activeTabId || ''

      // 空态兜底（2026-10-05 新增，需与后台 ArticleListRenderer 同规则）
      // empty_mode=hide → 空态整块不渲染；empty_text → 自定义占位文案
      const emptyText = String(cfg.empty_text || '').trim() || '暂无内容'
      const emptyHide = cfg.empty_mode === 'hide'
      const emptyIcon = String(cfg.empty_icon || '').trim()
      // 分类范围=picked 时只保留运营手选的分类（比较统一按字符串，避免数字 id 被滤掉）
      const tabStyle = ['pill', 'underline', 'bold'].includes(cfg.category_tab_style) ? cfg.category_tab_style : 'pill'
      // 展示元素：阅读热度 / 摘要简介（与后台 resolveShowSummary 同规则）
      const showViews = cfg.show_views === true
      const showSummary = resolveShowSummary(layout, cfg.show_summary)

      this._pageSize = calcPageSize(layout)

      this.setData({
        showHeader,
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
        itemCardStyle,
        layout,
        showCategoryTabs,
        categoryTabs,
        tabStyle,
        emptyText,
        emptyIcon,
        emptyHide,
        showViews,
        showSummary,
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
            tag: primaryTagQueryParam(cfg) || undefined,
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
          const mapped = records.map((item, index) => normalizeArticleItem(item, index)).filter((item) => item.navigable)
          const merged = reset ? mapped : (this.data.displayData || []).concat(mapped)
          const hasMore = resolveHasMore(data, nextPage, pageSize, mapped.length)
          this.setData({
            displayData: this._finalizeDisplay(merged, cfg),
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
        displayData: this._finalizeDisplay(merged, this.data.config),
        page: nextPage,
        hasMore,
        tabLoading: false,
        loadingMore: false,
        footerText: hasMore ? '' : (merged.length ? '没有更多了' : ''),
      })
    },

    onTapMore() {
      const link = String(this.data.moreLink || '/pkg-content/content-list/content-list').trim()
      if (!link) return
      if (/^https?:\/\//i.test(link)) {
        executeAction({ type: 'webview', url: link })
        return
      }
      executeAction({ type: 'page', path: link })
    },

    _applySourceEnhancements(rows, config) {
      const cfg = config || {}
      let list = rows || []
      if (cfg.show_source_tag === true && Array.isArray(cfg.source_filter) && cfg.source_filter.length) {
        list = filterBySourceKeys(list, cfg.source_filter)
      }
      if (cfg.show_source_tag === true) {
        list = list.map((item) => ({
          ...item,
          sourceTagLabel: resolveSourceLabel(item, cfg.source_labels),
        }))
      }
      list = filterByContentTags(list, cfg)
      return list
    },

    /**
     * 置顶 + 阅读量文案收尾。
     *
     * ⚠️ 置顶必须在「按limit 截断」**之后**：置顶项可能因为排序/筛选落在前limit 条之外，
     * 先截断再置顶才能保证运营指定的文章真的出现在第 1 位。
     */
    _finalizeDisplay(list, config) {
      const cfg = config || {}
      const showViews = this.data.showViews === true
      const pinned = applyPinned(list, cfg.pinned)
      return pinned.map((item) => ({
        ...item,
        viewsText: formatViewsText(showViews, item.view_count),
      }))
    },

    _normalizeDisplayData(runtimeData, config) {
      let rows = []
      if (Array.isArray(runtimeData) && runtimeData.length > 0) {
        const limit = Math.max(Number((config && config.limit) || runtimeData.length), 1)
        rows = runtimeData.slice(0, resolveFetchSize(limit, hasClientFilter(config))).map((item, index) => normalizeArticleItem(item, index))
      } else {
        const items = Array.isArray(config && config.items) ? config.items : []
        const source = items.length ? items : [
          { title: '品牌故事：从内容到交易闭环', publishedAt: '2026-05-10', source: '官方资讯' },
          { title: '选品指南：活动与商品联动', publishedAt: '2026-05-12', source: '运营精选' },
        ]
        const limit = Math.max(Number((config && config.limit) || source.length), 1)
        rows = source.slice(0, resolveFetchSize(limit, hasClientFilter(config))).map((item, index) => normalizeArticleItem(item, index))
      }
      const enhanced = this._applySourceEnhancements(rows, config)
      // 筛选后再按 limit 截断：拉取量已放大余量，这里只保证不超过配置值
      const finalLimit = Math.max(Number((config && config.limit) || enhanced.length), 1)
      return this._finalizeDisplay(enhanced.slice(0, finalLimit), config)
    },

    onTapArticle(e) {
      const id = e.currentTarget.dataset.id
      if (!isValidContentId(id)) {
        wx.showToast({ title: '内容暂不可用', icon: 'none' })
        return
      }
      const article = this.data.displayData.find((a) => String(a.id) === String(id))

      if (article && article.action) {
        executeAction(article.action)
      } else if (article && article.link_url) {
        executeAction({ type: 'page', path: article.link_url })
      } else {
        executeAction({
          type: 'page',
          path: '/pkg-content/content-detail/content-detail?id=' + id,
        })
      }
    },
  },
})
