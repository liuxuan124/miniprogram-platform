const { createSharePageConfig } = require('../../utils/share')
const { showTabBarForRoute } = require('../../utils/tab-bar-route')
const { getNavLayout } = require('../../utils/nav-layout')
const { resolveMediaUrl } = require('../../utils/media-url')
const warmDiscover = require('../../data/warm-discover')
const { USE_LOCAL_SOURCE, WARM_PAGE_STYLE } = require('../../data/warm-source')
const { loadTabBoundDslPage, TAB_DSL_INITIAL } = require('../../utils/dsl-tab-page')
const request = require('../../utils/request')
const productService = require('../../services/product')
const { resolveDisplayAvatarUrl } = require('../../utils/image-fallback')
const { picsum } = require('../../data/warm-media')

function parseCoverSize(url) {
  const raw = String(url || '')
  let w = 0
  let h = 0
  const pathMatch = raw.match(/\/(\d+)\/(\d+)(?:\?|$)/)
  if (pathMatch) {
    w = Number(pathMatch[1])
    h = Number(pathMatch[2])
  } else {
    const wm = raw.match(/[?&]w=(\d+)/i)
    const hm = raw.match(/[?&]h=(\d+)/i)
    if (wm && hm) {
      w = Number(wm[1])
      h = Number(hm[1])
    }
  }
  return { w, h }
}

function coverRatioClassFromUrl(url, index) {
  const { w, h } = parseCoverSize(url)
  if (w > 0 && h > 0) {
    const r = h / w
    if (r >= 1.3) return 'dc-card__cv--tall'
    if (r >= 1.05) return 'dc-card__cv--mid'
    if (r >= 0.92) return 'dc-card__cv--sq'
    return 'dc-card__cv--wide'
  }
  const cycle = ['dc-card__cv--tall', 'dc-card__cv--mid', 'dc-card__cv--sq', 'dc-card__cv--tall']
  return cycle[index % cycle.length]
}

/** 长文封面：偏竖 → 3:4，偏横 → 宽封面；无尺寸时交错，不全强制 wide */
function articleCoverRatioClass(url, index) {
  const { w, h } = parseCoverSize(url)
  if (w > 0 && h > 0) {
    return h / w >= 1 ? 'dc-card__cv--note' : 'dc-card__cv--wide'
  }
  return (index % 2 === 0) ? 'dc-card__cv--wide' : 'dc-card__cv--note'
}

/** 长文版式默认：全部双列（未配后台时也好看；装修仍可改 mixed / all_full） */
const DEFAULT_ARTICLE_LAYOUT = {
  mode: 'all_duo',
  fullEvery: 3,
  fullOnNoCover: true,
  duoStyles: ['magazine', 'row'],
}

/** 长文版式：由装修 article_layout + 单篇 discoverLayout 决定 */
function normalizeArticleLayout(raw) {
  const cfg = raw && typeof raw === 'object' ? raw : {}
  const hasMode = cfg.mode === 'all_duo' || cfg.mode === 'all_full' || cfg.mode === 'mixed'
  const mode = hasMode ? cfg.mode : DEFAULT_ARTICLE_LAYOUT.mode
  const fullEvery = Math.max(1, Number(cfg.fullEvery) || DEFAULT_ARTICLE_LAYOUT.fullEvery)
  const fullOnNoCover = cfg.fullOnNoCover !== false
  const duoStyles = Array.isArray(cfg.duoStyles) && cfg.duoStyles.length
    ? cfg.duoStyles.map(String)
    : DEFAULT_ARTICLE_LAYOUT.duoStyles.slice()
  return { mode, fullEvery, fullOnNoCover, duoStyles }
}

function pickArticleVariant(hasCover, index, layoutCfg, override) {
  const cfg = normalizeArticleLayout(layoutCfg)
  const ov = String(override || 'auto').toLowerCase()
  if (ov === 'full') return hasCover ? 'hero' : 'quote'
  if (ov === 'duo') {
    if (!hasCover) return cfg.fullOnNoCover ? 'quote' : 'magazine'
    const styles = cfg.duoStyles.length ? cfg.duoStyles : ['magazine']
    return styles[Math.max(0, Number(index) || 0) % styles.length] || 'magazine'
  }
  if (cfg.mode === 'all_full') return hasCover ? 'hero' : 'quote'
  if (cfg.mode === 'all_duo') {
    if (!hasCover) return cfg.fullOnNoCover ? 'quote' : 'magazine'
    const styles = cfg.duoStyles.length ? cfg.duoStyles : ['magazine']
    return styles[Math.max(0, Number(index) || 0) % styles.length] || 'magazine'
  }
  // mixed
  if (!hasCover) return cfg.fullOnNoCover ? 'quote' : 'magazine'
  const i = Math.max(0, Number(index) || 0)
  if (i % cfg.fullEvery === 0) return 'hero'
  const styles = cfg.duoStyles.length ? cfg.duoStyles : ['magazine', 'row']
  // 跳过通栏位后的双列样式轮换
  const duoIndex = Math.floor(i / cfg.fullEvery) * (cfg.fullEvery - 1) + (i % cfg.fullEvery) - 1
  return styles[Math.max(0, duoIndex) % styles.length] || 'magazine'
}

function articleCoverClassForVariant(variant, url, index) {
  if (variant === 'hero') return 'dc-card__cv--hero'
  if (variant === 'row') return 'dc-card__cv--row'
  return articleCoverRatioClass(url, index || 0)
}

function formatCompact(n) {
  const num = Number(n) || 0
  if (num >= 10000) return `${(num / 10000).toFixed(1).replace(/\.0$/, '')}万`
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return num ? String(num) : ''
}

function mapContentCard(item, kind, index, layoutCfg) {
  const cover = resolveMediaUrl(item.coverImage || item.coverUrl || item.cover_url || '')
  const author = item.author || item.authorName || '暖阁'
  const likes = item.likeCount || item.favoriteCount || 0
  const views = item.viewCount || item.view_count || 0
  const likeText = formatCompact(likes)
  const viewText = formatCompact(views)
  const roleRaw = item.authorRole || ''
  const roleMap = { owner: '主理人', contributor: '特约', editor: '官方', user: '' }
  const role = roleMap[roleRaw] || roleRaw
  const isArticle = kind === 'article'
  const discoverLayout = item.discoverLayout || item.discover_layout || 'auto'
  const variant = isArticle
    ? pickArticleVariant(!!cover, index || 0, layoutCfg, discoverLayout)
    : ''
  const isText = isArticle ? variant === 'quote' : (!cover && kind === 'note')
  let pill = item.pill || ''
  if (!pill && isArticle) pill = '深度长文'
  if (!pill && kind === 'note' && Array.isArray(item.tags) && item.tags[0]) pill = String(item.tags[0])
  const summaryRaw = isArticle ? String(item.summary || '').trim() : ''
  const summary = summaryRaw.length > 56 ? `${summaryRaw.slice(0, 56)}…` : summaryRaw
  let coverRatioClass = ''
  if (cover && isArticle) {
    coverRatioClass = articleCoverClassForVariant(variant, cover, index || 0)
  } else if (cover && kind === 'note') {
    coverRatioClass = 'dc-card__cv--note'
  } else if (cover) {
    coverRatioClass = coverRatioClassFromUrl(cover, index || 0)
  }
  return {
    uid: `${kind}-${item.id || index}`,
    id: item.id,
    isDemo: false,
    isText,
    kind,
    layout: isArticle ? 'article' : 'note',
    variant: variant || undefined,
    discoverLayout,
    title: item.title || '',
    summary,
    quote: isText ? (item.summary || item.title || '') : '',
    cover,
    hasCover: !!cover && variant !== 'quote',
    coverRatioClass,
    author,
    authorInitial: String(author).slice(0, 1),
    role,
    avatar: resolveDisplayAvatarUrl(item.authorAvatar || ''),
    likeText,
    statText: isArticle
      ? (viewText ? `${viewText} 阅读` : (likeText ? `❤ ${likeText}` : ''))
      : (likeText ? `❤ ${likeText}` : ''),
    pill,
    cnt: item.cnt || '',
    tags: item.tags || [],
    categoryId: item.categoryId || item.category_id,
  }
}

/** 好物卡片视觉布局：仍 kind=goods，仅换 UI */
function pickGoodsLayout(item, index) {
  const name = String((item && (item.name || item.title)) || '')
  const type = String((item && item.productType) || '').toLowerCase()
  const cat = String((item && (item.categoryName || item.typeLabel || item.role)) || '')
  const blob = `${name} ${cat} ${type}`
  // 周边 / 实物 → 笔记瀑布流
  if (/周边|杯垫|贴纸|帆布|徽章|手账|实物/.test(blob) || type === 'physical') return 'note'
  // 专栏课 / 资料包 → 长文式
  if (/专栏|课程|资料包|模板|讲/.test(blob) || type === 'column') return 'article'
  if (/资料|模板包/.test(blob) && !/电子书|EPUB|PDF|ebook/i.test(blob)) return 'article'
  if (type === 'digital' && !/电子书|EPUB|PDF|ebook/i.test(blob)) return 'article'
  // 电子书 / 标价默认 → 好物方图
  if (/电子书|EPUB|PDF|ebook/i.test(blob) || Number.isFinite(Number(item && item.price))) return 'goods'
  // 兜底交错，保证三种都出现
  return ['goods', 'note', 'article'][index % 3]
}

function mapProductCard(item, index) {
  const priceNum = item.price != null ? Number(item.price) : NaN
  const priceLabel = Number.isFinite(priceNum)
    ? `¥${Number.isInteger(priceNum) ? priceNum : priceNum.toFixed(0)}`
    : (item.price != null ? `¥${item.price}` : '')
  const originNum = item.originalPrice != null ? Number(item.originalPrice) : NaN
  const originLabel = Number.isFinite(originNum) && originNum > priceNum
    ? `¥${Number.isInteger(originNum) ? originNum : originNum.toFixed(0)}`
    : ''
  const sales = Number(item.sales || 0)
  const salesCompact = formatCompact(sales)
  const typeMap = { digital: '资料', physical: '实物', service: '服务', column: '专栏' }
  const typeLabel = item.categoryName
    || typeMap[item.productType]
    || item.typeLabel
    || '好物'
  const layout = pickGoodsLayout(item, index || 0)
  const title = item.name || item.title || '商品'
  const cover = resolveMediaUrl(item.mainImage || item.cover || '')
  const desc = String(item.summary || item.description || item.subtitle || '').trim()
  const base = {
    uid: `goods-${item.id || index}`,
    id: item.id,
    isDemo: false,
    isText: false,
    kind: 'goods',
    layout,
    title,
    quote: '',
    cover,
    hasCover: !!cover,
    author: '暖阁商城',
    authorInitial: '暖',
    role: typeLabel,
    avatar: picsum('shop1', 60, 60),
    likeText: salesCompact,
    priceLabel,
    originLabel,
    pill: typeLabel,
    cnt: '',
    categoryId: item.categoryId || item.category_id,
    tags: item.tags || [],
  }
  if (layout === 'note') {
    return {
      ...base,
      summary: '',
      coverRatioClass: cover ? 'dc-card__cv--note' : '',
      statText: sales ? `已售 ${salesCompact}` : (priceLabel || ''),
    }
  }
  if (layout === 'article') {
    const summary = desc.length > 40 ? `${desc.slice(0, 40)}…` : desc
    return {
      ...base,
      summary: summary || (priceLabel ? `${typeLabel} · ${priceLabel}` : `${typeLabel}精选`),
      // 好物编辑式固定矮横封面，双列也不半屏
      coverRatioClass: cover ? 'dc-card__cv--goods-wide' : '',
      statText: sales ? `已售 ${salesCompact}` : (priceLabel ? `${priceLabel}起` : ''),
    }
  }
  return {
    ...base,
    summary: '',
    coverRatioClass: 'dc-card__cv--sq',
    statText: sales ? `已售 ${salesCompact}` : '',
  }
}

function enrichDemoCard(item, index, layoutCfg) {
  if (!item) return item
  const kind = item.kind || 'note'
  let next = { ...item }
  if (!next.layout) {
    if (kind === 'goods') {
      next.layout = pickGoodsLayout({
        name: next.title,
        title: next.title,
        productType: '',
        categoryName: next.role,
        typeLabel: next.role,
        price: next.priceLabel || next.pill,
      }, index || 0)
    } else {
      next.layout = kind === 'article' ? 'article' : 'note'
    }
  }
  if (kind === 'article') {
    if (!next.variant) {
      next.variant = pickArticleVariant(
        !!(next.hasCover && next.cover),
        index || 0,
        layoutCfg,
        next.discoverLayout || next.discover_layout || 'auto'
      )
    }
    if (next.variant === 'quote') {
      next.isText = true
      next.hasCover = false
      if (!next.quote) next.quote = next.summary || next.title || ''
    }
  }
  if (next.layout === 'article') {
    if (!next.pill) next.pill = kind === 'goods' ? (next.role || '好物') : '深度长文'
    if (kind === 'goods' && next.hasCover) {
      next.coverRatioClass = 'dc-card__cv--goods-wide'
    } else if (kind === 'article' && next.variant && next.hasCover) {
      next.coverRatioClass = articleCoverClassForVariant(next.variant, next.cover, index || 0)
    } else if (next.hasCover) {
      next.coverRatioClass = articleCoverRatioClass(next.cover, index || 0)
    }
    if (!next.statText && next.likeText) {
      next.statText = kind === 'goods' ? `已售 ${next.likeText}` : `${next.likeText} 阅读`
    }
    if (!next.summary) {
      if (kind === 'article' && next.variant === 'quote') {
        /* quote 用 quote 字段，不把引语塞进 summary */
      } else if (next.quote && next.variant !== 'quote') {
        next.summary = next.quote
      } else if (kind === 'goods' && next.priceLabel) next.summary = `${next.role || '好物'} · ${next.priceLabel}`
      else if (kind === 'goods' && next.pill && String(next.pill).indexOf('¥') === 0) {
        next.summary = `${next.role || '好物'} · ${next.pill}`
      }
    }
  } else if (next.layout === 'goods') {
    if (!next.coverRatioClass) next.coverRatioClass = 'dc-card__cv--sq'
    if (!next.priceLabel && next.pill && String(next.pill).indexOf('¥') === 0) {
      next.priceLabel = next.pill
      next.pill = next.role || '好物'
    }
    if (!next.statText && next.likeText) next.statText = `已售 ${next.likeText}`
  } else {
    // 笔记：封面固定 3:4；好物复用时底栏展示销量/价格
    if (next.hasCover) next.coverRatioClass = 'dc-card__cv--note'
    if (!next.statText && next.likeText) {
      next.statText = kind === 'goods' ? `已售 ${next.likeText}` : `❤ ${next.likeText}`
    }
    if (kind === 'goods' && next.pill && String(next.pill).indexOf('¥') === 0) {
      if (!next.priceLabel) next.priceLabel = next.pill
      next.pill = next.role || '周边'
    }
  }
  if (!next.authorInitial && next.author) {
    next.authorInitial = String(next.author).slice(0, 1)
  }
  return next
}

function normalizeDiscoverList(list, layoutCfg) {
  return (list || []).map((item, i) => enrichDemoCard(item, i, layoutCfg))
}

/** 通栏：长文 hero/quote/row（左图右文横排应占整行）；其余走瀑布流左右列 */
function isFullSpanCard(item) {
  if (!item) return false
  if (item.kind === 'article') {
    const v = item.variant
    if (v === 'hero' || v === 'quote' || v === 'row') return true
  }
  return false
}

/** 粗估卡片相对高度，用于瀑布流填较短列 */
function estimateCardWeight(item) {
  if (!item) return 10
  if (item.layout === 'goods') return 12
  if (item.kind === 'goods' && item.layout === 'article') return 11
  if (item.layout === 'article') {
    if (item.variant === 'row') return 10
    if (item.hasCover) return 14
    return 9
  }
  if (item.isText || !item.hasCover) return 8
  if (item.coverRatioClass === 'dc-card__cv--tall') return 15
  if (item.coverRatioClass === 'dc-card__cv--mid') return 12
  if (item.coverRatioClass === 'dc-card__cv--wide') return 10
  return 13
}

/**
 * 分段布局：hero/quote/row 通栏打断；其余按高度填左右列。
 * 段内仅 1 张时用 compact 通栏（矮封面），避免半列空一边或竖图撑满屏。
 */
function buildFeedRows(list, layoutCfg) {
  const rows = []
  const normalized = normalizeDiscoverList(list, layoutCfg)
  let left = []
  let right = []
  let leftW = 0
  let rightW = 0

  const flushWf = () => {
    const total = left.length + right.length
    if (!total) return

    // 左右张数不齐时，多出的改通栏矮卡，避免半边空白
    const solos = []
    while (left.length > right.length) {
      solos.unshift(left.pop())
    }
    while (right.length > left.length) {
      solos.unshift(right.pop())
    }

    const paired = left.length + right.length
    if (paired === 1) {
      solos.unshift(left.pop() || right.pop())
    } else if (paired > 1) {
      rows.push({
        key: `wf-${rows.length}-${(left[0] || right[0]).uid}`,
        type: 'wf',
        compact: false,
        items: [],
        leftList: left.slice(),
        rightList: right.slice(),
      })
    }

    solos.forEach((item) => {
      rows.push({
        key: `solo-${rows.length}-${item.uid}`,
        type: 'full',
        compact: true,
        items: [item],
        leftList: [],
        rightList: [],
      })
    })

    left = []
    right = []
    leftW = 0
    rightW = 0
  }

  normalized.forEach((item) => {
    if (isFullSpanCard(item)) {
      flushWf()
      rows.push({
        key: `full-${rows.length}-${item.uid}`,
        type: 'full',
        compact: false,
        items: [item],
        leftList: [],
        rightList: [],
      })
      return
    }
    if (leftW <= rightW) {
      left.push(item)
      leftW += estimateCardWeight(item)
    } else {
      right.push(item)
      rightW += estimateCardWeight(item)
    }
  })
  flushWf()
  return rows
}

function interleave(arrays) {
  const out = []
  const max = Math.max.apply(null, arrays.map((a) => a.length).concat([0]))
  for (let i = 0; i < max; i++) {
    arrays.forEach((arr) => {
      if (i < arr.length) out.push(arr[i])
    })
  }
  return out
}

const DEFAULT_TABS = warmDiscover.normalizeTabs(warmDiscover.TABS)
const DEMO_ALL_ROWS = buildFeedRows(warmDiscover.listForTab('all'))

Page({
  ...createSharePageConfig(),
  data: {
    themePageStyle: WARM_PAGE_STYLE,
    statusBarHeight: getNavLayout().statusBarHeight,
    discoverTabsConfig: DEFAULT_TABS,
    tabs: DEFAULT_TABS.map((t) => ({ key: t.key, label: t.label })),
    activeTab: DEFAULT_TABS[0] ? DEFAULT_TABS[0].key : 'all',
    chips: DEFAULT_TABS[0] ? DEFAULT_TABS[0].chips : [],
    activeChip: '全部',
    activeChipIndex: 0,
    feedRows: USE_LOCAL_SOURCE ? DEMO_ALL_ROWS : [],
    articleLayout: normalizeArticleLayout(DEFAULT_ARTICLE_LAYOUT),
    page: 1,
    pageSize: 12,
    hasMore: false,
    ...TAB_DSL_INITIAL,
    loading: !USE_LOCAL_SOURCE,
    refreshing: false,
    isEmpty: false,
    footerText: USE_LOCAL_SOURCE ? '—— 到底啦 ——' : '加载中…',
    usingDemo: !!USE_LOCAL_SOURCE,
    showBanner: true,
    recruitBanner: {
      title: '创作者招募中',
      desc: '目前由暖阁编辑部与特约作者供稿，欢迎投稿加入',
      cta: '去投稿',
    },
  },

  onLoad() {
    try {
      const sys = wx.getSystemInfoSync()
      if (sys && sys.statusBarHeight) {
        this.setData({ statusBarHeight: sys.statusBarHeight })
      }
    } catch (e) { /* ignore */ }
    if (!USE_LOCAL_SOURCE) {
      const SystemService = require('../../services/system')
      SystemService.fetchSystemConfig(true).then((config) => {
        const b = config && (config.creator_recruit_banner || config.creatorRecruitBanner)
        if (b && (b.title || b.desc)) {
          this.setData({
            recruitBanner: {
              title: b.title || '创作者招募中',
              desc: b.desc || '目前由暖阁编辑部与特约作者供稿，欢迎投稿加入',
              cta: b.cta || '去投稿',
            },
          })
        }
      }).catch(() => {})
    }
    if (!USE_LOCAL_SOURCE) {
      loadTabBoundDslPage(this, '/pages/discover/discover').then((ok) => {
        if (ok || this.data.dslMode) return
        this._applyDiscoverConfig(
          this.data.discoverTabs || this.data.tabsConfig,
          this.data.articleLayout || this.data.article_layout
        )
        const first = (this.data.discoverTabsConfig || [])[0]
        this._switchTab(first ? first.key : 'all', true)
      })
      return
    }
    this._switchTab(this.data.activeTab || 'all', true)
  },

  onShow() {
    wx.hideTabBar({ animation: false, fail() {} })
    this.setData({ themePageStyle: WARM_PAGE_STYLE })
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      showTabBarForRoute(this, '/pages/discover/discover')
    }
  },

  onPullDownRefresh() {
    this._reload().finally(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {},

  onRefresh() {
    this.setData({ refreshing: true })
    this._reload().finally(() => this.setData({ refreshing: false }))
  },

  _applyDiscoverConfig(rawTabs, articleLayout) {
    const normalized = warmDiscover.normalizeTabs(
      Array.isArray(rawTabs) && rawTabs.length ? rawTabs : warmDiscover.TABS
    )
    const first = normalized[0]
    const patch = {
      discoverTabsConfig: normalized,
      tabs: normalized.map((t) => ({ key: t.key, label: t.label })),
    }
    patch.articleLayout = normalizeArticleLayout(
      articleLayout && typeof articleLayout === 'object' ? articleLayout : DEFAULT_ARTICLE_LAYOUT
    )
    this.setData(patch)
    return first
  },

  _currentTab() {
    return warmDiscover.tabByKey(this.data.discoverTabsConfig, this.data.activeTab)
  },

  _currentChip() {
    const tab = this._currentTab()
    const chips = (tab && tab.chips) || []
    const idx = Number(this.data.activeChipIndex) || 0
    return chips[idx] || chips[0] || { label: '全部', filter: 'all' }
  },

  _applyList(list, usingDemo) {
    const feedRows = buildFeedRows(list, this.data.articleLayout)
    const count = (list || []).length
    this.setData({
      feedRows,
      usingDemo: !!usingDemo,
      isEmpty: count === 0,
      hasMore: false,
      footerText: count ? '—— 到底啦 ——' : '暂无内容',
      loading: false,
    })
  },

  _reload() {
    if (USE_LOCAL_SOURCE) {
      const tab = this._currentTab()
      const source = (tab && tab.source) || this.data.activeTab || 'all'
      const list = warmDiscover.filterLocalList(
        warmDiscover.listForTab(source),
        this._currentChip()
      )
      this._applyList(list, true)
      return Promise.resolve()
    }
    return this._loadFromApi()
  },

  _fetchContents(contentType, chip) {
    const params = {
      current: 1,
      size: contentType ? 20 : 12,
    }
    if (contentType) params.contentType = contentType
    const c = warmDiscover.normalizeChip(chip)
    if (c && c.filter === 'tag' && (c.tag || c.label)) {
      params.tag = c.tag || c.label
    }
    if (c && c.filter === 'category' && c.categoryId != null && c.categoryId !== '') {
      params.categoryId = c.categoryId
    }
    return request.get('/api/v1/mp/contents', params, { auth: false, showError: false })
      .then((res) => {
        const records = (res && (res.records || res.list)) || []
        const layoutCfg = this.data.articleLayout
        return records.map((row, i) => mapContentCard(
          row,
          contentType || (row.contentType === 'article' ? 'article' : 'note'),
          i,
          layoutCfg
        ))
      })
      .catch(() => [])
  },

  _fetchGoods(chip) {
    const params = { current: 1, size: 20 }
    const c = warmDiscover.normalizeChip(chip)
    if (c && c.filter === 'category' && c.categoryId != null && c.categoryId !== '') {
      params.categoryId = c.categoryId
    }
    if (c && c.filter === 'tag' && (c.tag || c.label) && c.label !== '全部') {
      params.keyword = c.tag || c.label
    }
    return productService.getProductList(Object.assign({ showError: false }, params))
      .then((res) => {
        const records = (res && (res.records || res.list || res.items)) || []
        return records.map((row, i) => mapProductCard(row, i))
      })
      .catch(() => [])
  },

  _loadFromApi() {
    const tab = this._currentTab()
    const source = (tab && tab.source) || this.data.activeTab || 'note'
    const chip = this._currentChip()
    this.setData({ loading: true })

    if (source === 'goods') {
      return this._fetchGoods(chip).then((list) => this._applyList(list, false))
    }
    if (source === 'all') {
      return Promise.all([
        this._fetchContents('note', chip),
        this._fetchContents('article', chip),
        this._fetchGoods(chip),
      ]).then(([notes, articles, goods]) => {
        this._applyList(interleave([notes, articles, goods]), false)
      })
    }
    const contentType = source === 'article' ? 'article' : 'note'
    return this._fetchContents(contentType, chip).then((list) => this._applyList(list, false))
  },

  _switchTab(tabKey, force) {
    const config = this.data.discoverTabsConfig || DEFAULT_TABS
    const tab = warmDiscover.tabByKey(config, tabKey)
    const key = tab ? tab.key : (tabKey || 'all')
    if (!force && key === this.data.activeTab) return
    const chips = (tab && tab.chips) || warmDiscover.chipsForTab(key, config)
    const firstChip = chips[0] || { label: '全部', filter: 'all' }
    if (USE_LOCAL_SOURCE) {
      const source = (tab && tab.source) || key
      this._applyList(
        warmDiscover.filterLocalList(warmDiscover.listForTab(source), firstChip),
        true
      )
    } else {
      this.setData({ feedRows: [], usingDemo: false, isEmpty: false, loading: true })
    }
    this.setData({
      activeTab: key,
      chips,
      activeChip: firstChip.label,
      activeChipIndex: 0,
      showBanner: !!(tab && tab.showBanner),
    })
    if (!USE_LOCAL_SOURCE) this._loadFromApi()
  },

  onTabTap(e) {
    const key = e.currentTarget.dataset.key
    if (!key) return
    this._switchTab(key, false)
  },

  onChipTap(e) {
    const idx = Number(e.currentTarget.dataset.index)
    const chip = (this.data.chips || [])[idx]
    if (!chip) return
    if (idx === this.data.activeChipIndex && chip.label === this.data.activeChip) return
    this.setData({
      activeChip: chip.label,
      activeChipIndex: idx,
      loading: !USE_LOCAL_SOURCE,
    })
    this._reload()
  },

  onTapNote(e) {
    const id = e.currentTarget.dataset.id
    const kind = e.currentTarget.dataset.kind || this.data.activeTab
    const isDemo = !!(e.currentTarget.dataset.demo || this.data.usingDemo)
    if (kind === 'goods') {
      if (isDemo || USE_LOCAL_SOURCE) {
        wx.navigateTo({ url: '/pages/product-detail/product-detail?demo=goods' })
      } else if (!id) {
        wx.showToast({ title: '商品暂不可用', icon: 'none' })
      } else {
        wx.navigateTo({ url: `/pages/product-detail/product-detail?id=${id}` })
      }
      return
    }
    if (isDemo || USE_LOCAL_SOURCE) {
      wx.navigateTo({
        url: kind === 'article'
          ? '/pages/content-detail/content-detail?demo=1'
          : '/pages/content-detail/content-detail?demo=note',
      })
      return
    }
    if (!id) {
      wx.showToast({ title: '内容暂不可用', icon: 'none' })
      return
    }
    wx.navigateTo({ url: `/pages/content-detail/content-detail?id=${id}` })
  },

  onTapContribute() {
    wx.navigateTo({ url: '/pages/contribute/contribute' })
  },

  onTapSearch() {
    wx.navigateTo({ url: '/pages/search/search' })
  },
})
