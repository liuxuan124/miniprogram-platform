// components/dsl-note-feed/dsl-note-feed.js — 笔记瀑布流（小红书双列）
const { executeAction } = require('../../utils/render')
const { get } = require('../../utils/request')
const { resolveMediaUrl } = require('../../utils/media-url')
const { buildNoteGalleryUrls } = require('../../utils/note-content')
const imageRatio = require('../../utils/image-ratio')
const { isValidContentId } = require('../../utils/content-id')
const { resolveSourceLabel, filterBySourceKeys } = require('../../utils/dsl-source-tag')
const { filterByContentTags, primaryTagQueryParam } = require('../../utils/dsl-content-tag-filter')

function applyListEnhancements(rows, config) {
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
  return filterByContentTags(list, cfg)
}

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

function stripHtmlToText(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncateText(text, max) {
  const t = String(text || '').trim()
  if (!t) return ''
  return t.length > max ? t.slice(0, max) + '…' : t
}

/**
 * 瀑布流卡片封面高度（padding-top 百分比）。
 *
 * 背景：这批内容是小红书竖长信息图（1086×1448 ≈ 3:4，甚至更长的长图），
 * 而卡片容器原本写死 `padding-top:125%`（4:5）配 `mode="aspectFill"`，
 * 结果竖图被强制裁切只显示中间一块，顶部标题和底部内容都被切掉。
 * 小红书原生瀑布流的正确做法是**按封面原始宽高比定卡片高度**。
 *
 * `item.cover_ratio` 由后端或 normalizeNoteItem 计算；若拿不到宽高，
 * 返回 null，模板回落到 wxss 的默认值 125%（保持旧卡片观感不变）。
 */
const DEFAULT_COVER_RATIO = 125

function pickRatio(...cands) {
  for (const v of cands) {
    const n = Number(v)
    if (isFinite(n) && n > 30 && n < 400) return Math.round(n * 100) / 100
  }
  return 0
}

function resolveCoverRatio(item, coverUrl) {
  // 0) URL 上带了 ?w=&h=&r=（后端 stamp_image_ratio.py 写入）—— 零请求最可靠
  const urlRatio = imageRatio.ratioFromUrl(coverUrl)
  if (urlRatio > 0) return urlRatio
  // 1) 接口字段直接给了宽高
  const w = pickRatio(item.coverWidth, item.cover_width, item.width, item.imageWidth, item.image_width)
  const h = pickRatio(item.coverHeight, item.cover_height, item.height, item.imageHeight, item.image_height)
  if (w && h) {
    return Math.max(60, Math.min(260, (h / w) * 100))
  }
  // 2) 只给了比例
  const r = pickRatio(item.coverRatio, item.cover_ratio, item.aspectRatio, item.aspect_ratio)
  if (r) return Math.max(60, Math.min(260, r))
  // 3) 显式声明的竖图/长图标记
  if (item.isLongImage || item.is_long_image) return 200
  return 0
}

function normalizeNoteItem(item, index) {
  const images = Array.isArray(item.images) ? item.images : []
  const coverRaw = item.cover_url || item.cover || item.image || item.coverUrl || item.coverImage || ''
  const gallery = buildNoteGalleryUrls(coverRaw, images)
  const cover = resolveMediaUrl(gallery[0] || '')
  const author = String(item.author || item.authorName || '作者').trim() || '作者'
  const rawId = item.id != null ? item.id : (item.contentId != null ? item.contentId : item.content_id)
  const id = isValidContentId(rawId) ? String(rawId) : ''
  const summaryRaw = item.summary || item.description || item.desc || item.content || ''
  // 优先用后端给的宽高；没有就查本地缓存（由 _probeCoverRatios 异步补齐）
  const coverRatio = resolveCoverRatio(item, cover) || imageRatio.getCached(cover)
  return {
    id,
    navigable: !!id,
    title: item.title || item.name || '笔记标题',
    cover_url: cover,
    cover_ratio: coverRatio || DEFAULT_COVER_RATIO,
    cover_ratio_known: coverRatio > 0,
    image_count: gallery.length,
    summary: truncateText(stripHtmlToText(summaryRaw), 70),
    author_name: author,
    author_avatar: resolveMediaUrl(item.authorAvatar || item.author_avatar || ''),
    author_initial: author.slice(0, 1),
    like_text: formatLikeCount(item.likeCount || item.like_count || 0),
    view_text: `阅读 ${Math.max(0, Number(item.viewCount || item.view_count || 0))}`,
    categoryId: item.categoryId != null ? String(item.categoryId) : (item.category_id != null ? String(item.category_id) : ''),
    categoryName: item.categoryName || item.category_name || '',
    sourceTag: item.sourceTag || item.source_tag || '',
    tags: item.tags || item.tagList || item.tag_list,
  }
}

/** 好物 tab：商品 → 瀑布流卡片（点击进商品详情） */
function normalizeProductItem(item) {
  const rawId = item && item.id != null ? item.id : ''
  const id = isValidContentId(rawId) ? String(rawId) : ''
  const price = Number(item && item.price)
  return {
    id,
    navigable: !!id,
    is_product: true,
    title: String((item && (item.name || item.title)) || '商品').trim() || '商品',
    cover_url: resolveMediaUrl((item && (item.mainImage || item.main_image || item.cover)) || ''),
    image_count: 0,
    summary: truncateText(stripHtmlToText((item && item.description) || ''), 40),
    author_name: '',
    author_avatar: '',
    author_initial: '',
    like_text: '',
    price_text: Number.isFinite(price) ? `¥${price.toFixed(2)}` : '',
    view_text: '',
    categoryId: '',
    categoryName: '',
    sourceTag: '',
    tags: null,
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
    bgStyle: '',
    gutterStyle: '',
    titleStyle: '',
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
    // 内容类型大 Tab（笔记/长文/好物）
    showTypeTabs: false,
    typeTabs: [],
    activeType: 0,
    showSearch: false,
    // 多图角标：plain=「N 图」右上；xhs=「图文 N」左上 +「1/N」右下
    galleryBadge: 'plain',
    // 无封面渲染文字卡（标题+摘要）
    textCard: false,
    // 点赞图标：false=♡ 线框；true=♥ 红色实心
    likeHeart: false,
  },

  lifetimes: {
    attached() {
      this.setData({ activeTabStyle: buildActiveTabStyle(resolveThemePrimary()) })
    },
  },

  observers: {
    /**
     * 列表数据任何一次变化（首屏/翻页/切 tab/筛选）都触发比例探测。
     * 用 observer 而不是逐个赋值点调用 —— 有 6 处 setData displayData，
     * 挂 observer 才不会漏，也不用改每一处。
     * 探测是异步的，且只改 cover_ratio 字段，不会引起列表位置跳动。
     */
    displayData(list) {
      if (!list || !list.length) return
      if (this._probing) return
      this._probing = true
      this._probeCoverRatios()
      // 兜底：探测内部有 6s 超时，这里再给一层延时解除锁
      setTimeout(() => { this._probing = false }, 8000)
    },

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
      if (this.data.showTypeTabs) return
      if (Array.isArray(runtimeData) && runtimeData.length && !this.data.displayData.length && !this.data.loading) {
        this._bootstrapFromRuntime(runtimeData)
      }
    },
  },

  methods: {
    /**
     * 为当前列表里还没探测出比例的封面补测宽高比。
     * 探测完成后只 setData 变化的 item，避免整表重刷导致瀑布流跳动。
     */
    _probeCoverRatios() {
      const list = this.data.displayData || []
      if (!list.length) return
      const targets = []
      list.forEach((it, idx) => {
        if (!it || !it.cover_url) return
        if (it.cover_ratio_known) return
        if (imageRatio.getCached(it.cover_url) > 0) return
        if (!targets.some((t) => t.url === it.cover_url)) {
          targets.push({ url: it.cover_url, idx: [idx] })
        } else {
          const hit = targets.find((t) => t.url === it.cover_url)
          if (hit && hit.idx.indexOf(idx) < 0) hit.idx.push(idx)
        }
      })
      if (!targets.length) {
        // 全部命中缓存，直接补 ratio
        this._applyCachedRatios()
        return
      }
      imageRatio.probe(targets.map((t) => t.url), () => this._applyCachedRatios())
    },

    /** 把缓存里的比例写回 displayData（仅改 cover_ratio 字段） */
    _applyCachedRatios() {
      const list = this.data.displayData || []
      if (!list.length) return
      const next = list.map((it) => {
        if (!it || !it.cover_url || it.cover_ratio_known) return it
        const r = imageRatio.getCached(it.cover_url)
        if (!(r > 0)) return it
        return Object.assign({}, it, { cover_ratio: r, cover_ratio_known: true })
      })
      let changed = false
      for (let i = 0; i < next.length; i += 1) {
        if (next[i] !== list[i]) { changed = true; break }
      }
      if (changed) this.setData({ displayData: next })
    },

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
      // 列表底色：运营可在后台配置（默认 #f7f7f7 小红书浅米）
      // 校验只接受 #rgb/#rrggbb，避免非法值把布局撑坏
      const bgRaw = String(config.background_color || '').trim()
      const bgColor = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(bgRaw) ? bgRaw : ''
      // 用独立字段 bgStyle，不用 styleString —— 后者是由父级 renderer
      // 作为 property 下发的（`styleString="{{comp.styleString}}"`），
      // 在组件内 setData 会被父级覆盖。
      this.setData({ bgStyle: bgColor ? `background:${bgColor};` : '' })

      // 页面左右边距（0~40px）：加在组件自身的 padding 上。
      // 注意宿主页面 .xhs-bg 也有 8rpx 边距，这里是叠加的额外值，
      // 设为 0 时即为"只保留宿主边距"的当前默认观感。
      const gutterRaw = Number(config.page_gutter)
      const gutter = Number.isFinite(gutterRaw) ? Math.max(0, Math.min(gutterRaw, 40)) : 0
      this.setData({ gutterStyle: `padding-left:${gutter * 2}rpx;padding-right:${gutter * 2}rpx;` })

      // 标题字号（24~44px）：写到每张卡片，不改 wxss
      const titleRaw = Number(config.title_size)
      const titleSize = Number.isFinite(titleRaw) ? Math.max(24, Math.min(titleRaw, 44)) : 32
      this.setData({ titleStyle: `font-size:${titleSize * 2}rpx;` })
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

      // 内容类型大 Tab：[{ label, content_type: note|article|moment|product }]
      const typeTabs = (Array.isArray(config.type_tabs) ? config.type_tabs : [])
        .map((t) => ({
          label: String((t && (t.label || t.title)) || '').trim(),
          content_type: String((t && (t.content_type || t.contentType)) || 'note').trim().toLowerCase(),
        }))
        .filter((t) => t.label)
      const showTypeTabs = typeTabs.length > 1
      const galleryBadgeRaw = String(config.gallery_badge || 'plain').toLowerCase()
      const galleryBadge = galleryBadgeRaw === 'xhs' ? 'xhs' : (galleryBadgeRaw === 'none' ? 'none' : 'plain')

      this.setData({
        listStyle: `gap:${itemGap * 2}rpx;`,
        itemCardStyle,
        showCategoryTabs,
        layout,
        showTypeTabs,
        typeTabs: showTypeTabs ? typeTabs : [],
        activeType: 0,
        showSearch: showTypeTabs && config.show_search === true,
        galleryBadge,
        textCard: config.text_card === true,
        likeHeart: config.like_heart === true,
      })
      if (showTypeTabs) {
        // 大 Tab 模式：由类型驱动数据，首tab直接拉服务端
        this._loadByType(0)
      } else if (showCategoryTabs) {
        if (!this.data.categoryTabs.length) {
          this.setData({ categoryTabs: [{ id: '', name: '全部' }] })
        }
      } else if (!this.data.displayData.length) {
        this._resetAndLoad(true)
      }
    },

    _currentType() {
      const tabs = this.data.typeTabs || []
      const t = tabs[this.data.activeType] || tabs[0]
      return (t && t.content_type) || 'note'
    },

    onTapType(e) {
      const idx = Number(e.currentTarget.dataset.index || 0)
      if (idx === this.data.activeType) return
      this._loadByType(idx)
    },

    _loadByType(idx) {
      this._localPool = []
      this.setData({
        activeType: idx,
        activeTabId: '',
        page: 0,
        hasMore: true,
        footerText: '',
        displayData: [],
      })
      this._fetchPage(true, '')
    },

    onTapSearch() {
      executeAction({ type: 'page', path: '/pages/search/search' })
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
      const cfg = this.data.config || {}
      const mapped = applyListEnhancements(
        (runtimeData || []).slice(0, pageSize).map((item, index) => normalizeNoteItem(item, index)),
        cfg,
      )
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
      const contentType = this.data.showTypeTabs ? this._currentType() : 'note'

      if (reset) {
        this.setData({ loading: true, footerText: '', tabLoading: cfg.show_category_tabs === true })
      } else {
        this.setData({ loadingMore: true, footerText: '加载中...' })
      }

      if (contentType === 'product') {
        this._fetchProductPage(reset, nextPage, pageSize)
        return
      }

      const params = {
        current: nextPage,
        size: pageSize,
        contentType,
        status: 'published',
        tag: primaryTagQueryParam(cfg) || undefined,
      }
      if (tid && /^\d+$/.test(String(tid))) {
        params.categoryId = Number(tid)
      }

      get('/api/v1/mp/contents', params, { auth: false, showError: false })
        .then((data) => {
          const records = extractRecords(data)
          const mapped = applyListEnhancements(
            records.map((item, index) => normalizeNoteItem(item, index)).filter((item) => item.navigable),
            cfg,
          )
          this._commitPage(data, reset, nextPage, pageSize, mapped)
        })
        .catch(() => {
          if (reset || !this._localPool || !this._localPool.length) {
            this._localPool = this._buildLocalPool(this.data.runtimeData, tid)
          }
          this._sliceLocal(reset, nextPage, pageSize)
        })
    },

    _fetchProductPage(reset, nextPage, pageSize) {
      get('/api/v1/mp/products', {
        current: nextPage,
        size: pageSize,
        status: 'on_sale',
      }, { auth: false, showError: false })
        .then((data) => {
          const records = extractRecords(data)
          const mapped = records.map((item) => normalizeProductItem(item)).filter((item) => item.navigable)
          this._commitPage(data, reset, nextPage, pageSize, mapped)
        })
        .catch(() => {
          this.setData({
            displayData: reset ? [] : this.data.displayData,
            loading: false,
            loadingMore: false,
            tabLoading: false,
            footerText: reset ? '' : '加载失败',
          })
        })
    },

    _commitPage(data, reset, nextPage, pageSize, mapped) {
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
      const isProduct = e.currentTarget.dataset.product === true || e.currentTarget.dataset.product === 'true'
      if (!isValidContentId(id)) {
        wx.showToast({ title: '内容暂不可用', icon: 'none' })
        return
      }
      executeAction({
        type: 'page',
        path: isProduct
          ? '/pkg-content/product-detail/product-detail?id=' + id
          : '/pkg-content/content-detail/content-detail?id=' + id,
      })
    },
  },
})
