// components/dsl-hot-news/dsl-hot-news.js
const { executeAction, navigatePage } = require('../../utils/render')
const { isValidContentId } = require('../../utils/content-id')

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function dayKey(value) {
  if (value == null || value === '') return ''
  const raw = String(value).trim()
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : ''
}

function formatMeta(item) {
  const raw = item.publishedAt || item.publishTime || item.publish_time || item.createTime || item.createdAt || ''
  const key = dayKey(raw)
  return key || ''
}

function normalizeItem(item, index) {
  const rawId = item.id != null ? item.id : (item.contentId != null ? item.contentId : item.content_id)
  const id = isValidContentId(rawId) ? String(rawId) : ''
  const link = item.link_url || item.linkUrl || ''
  return {
    id: id || `hot_${index + 1}`,
    navigable: !!id,
    title: item.title || item.name || '文章标题',
    cover: item.cover || item.coverUrl || item.coverImage || item.cover_url || item.image || '',
    meta: item.meta || formatMeta(item),
    link_url: link || (id ? `/pkg-content/content-detail/content-detail?id=${id}` : ''),
    viewCount: Number(item.viewCount || item.view_count || 0) || 0,
    publishedAt: item.publishedAt || item.publishTime || item.publish_time || item.createTime || '',
  }
}

function resolveDateParts(config) {
  const mode = (config && config.date_mode) || 'today'
  if (mode === 'none') {
    return { dateMonth: '', dateDay: '', dateWeek: '', showDateBadge: false }
  }
  let d = new Date()
  if (mode === 'fixed' && config && config.header_date) {
    const parsed = new Date(String(config.header_date).replace(/-/g, '/'))
    if (!Number.isNaN(parsed.getTime())) d = parsed
  }
  return {
    dateMonth: String(d.getMonth() + 1),
    dateDay: String(d.getDate()),
    dateWeek: WEEKDAYS[d.getDay()] || '',
    showDateBadge: true,
  }
}

function resolveLayout(cfg) {
  const raw = cfg && cfg.layout
  if (raw === 'card') return 'card'
  if (raw === 'number') return 'number'
  return 'star'
}

/* ============ 2026-10-06：与后台 hotNewsSchema.ts 对齐 ============
   🔴 三处（面板 / 画布渲染器 / 端上）必须同规则，否则「面板配了真机没生效」。
   规则与默认值见 admin/src/components/page-builder/hotNews/hotNewsSchema.ts 顶部说明。 */

const HOT_NEWS_LIMIT_MIN = 3
const HOT_NEWS_LIMIT_MAX = 20
const PREFIX_GLYPHS = { star: '★', number: '', dot: '●', fire: '🔥', none: '' }

function normalizeLimit(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 3
  return Math.min(HOT_NEWS_LIMIT_MAX, Math.max(HOT_NEWS_LIMIT_MIN, Math.round(n)))
}

function normalizeIdList(v) {
  if (!Array.isArray(v)) return []
  const seen = {}
  const out = []
  v.forEach((x) => {
    const id = String(x == null ? '' : x)
    if (id && !seen[id]) {
      seen[id] = 1
      out.push(id)
    }
  })
  return out
}

/**
 * 运营干预：排除 → 置顶。
 * 🔴 顺序不能反 —— 先排除再置顶，否则被排除的 ID 仍会占置顶位。
 * @param {string[]} pinned 置顶 ID（按数组顺序）
 * @param {string[]} excluded 排除 ID
 */
function applyOverrides(list, pinned, excluded) {
  const rows = Array.isArray(list) ? list.slice() : []
  if (!pinned.length && !excluded.length) return rows

  const ex = {}
  excluded.forEach((id) => { ex[id] = 1 })
  const kept = rows.filter((it) => !ex[String(it.id || '')])
  if (!pinned.length) return kept

  const head = []
  const taken = {}
  pinned.forEach((id) => {
    const idx = kept.findIndex((it) => String(it.id || '') === id)
    if (idx >= 0) {
      head.push(kept[idx])
      taken[idx] = 1
    }
  })
  return head.concat(kept.filter((_, i) => !taken[i]))
}

function prepareList(runtimeData, config) {
  const cfg = config || {}
  const limit = normalizeLimit(cfg.limit)
  const ds = cfg.data_source || {}
  const q = { ...(ds.query || {}), ...(ds.params || {}) }
  let rows = Array.isArray(runtimeData) ? runtimeData.map(normalizeItem) : []
  if (!rows.length && Array.isArray(cfg.items)) {
    rows = cfg.items.map(normalizeItem)
  }

  const publishDate = String(q.publish_date || '').trim()
  if (publishDate) {
    rows = rows.filter((item) => dayKey(item.publishedAt) === publishDate || (item.meta && item.meta.indexOf(publishDate) === 0))
  }

  const sortBy = String(q.sort_by || 'popular')
  if (sortBy === 'popular') {
    rows = rows.slice().sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
  } else if (sortBy === 'newest') {
    rows = rows.slice().sort((a, b) => {
      const ta = new Date(String(a.publishedAt || 0).replace(/-/g, '/')).getTime() || 0
      const tb = new Date(String(b.publishedAt || 0).replace(/-/g, '/')).getTime() || 0
      return tb - ta
    })
  }

  // 干预在截断**之前**：先排除/置顶，再按 limit 截断，
  // 否则被隐藏的条目会占掉名额导致实际展示条数少于 limit。
  const governed = applyOverrides(
    rows.filter((item) => item.navigable),
    normalizeIdList(cfg.pinned_ids),
    normalizeIdList(cfg.excluded_ids),
  )
  return governed.slice(0, limit)
}

Component({
  properties: {
    config: { type: Object, value: {} },
    runtimeData: { type: Array, value: [] },
    actions: { type: Array, value: [] },
    styleString: { type: String, value: '' },
  },

  data: {
    titleText: '今日精选',
    showMore: true,
    moreText: '查看更多 >',
    moreLink: '/pkg-content/content-list/content-list',
    titleBoxStyle: '',
    titleBgStyle: '',
    contentStyle: '',
    moreStyle: '',
    listStyle: '',
    layout: 'star',
    showCover: true,
    displayData: [],
    dateMonth: '',
    dateDay: '',
    dateWeek: '',
    showDateBadge: true,
    useUnifiedCard: false,
  },

  observers: {
    'config, runtimeData': function (config, runtimeData) {
      this._apply(config, runtimeData)
    },
  },

  lifetimes: {
    attached() {
      this._apply(this.data.config, this.data.runtimeData)
    },
  },

  methods: {
    _apply(config, runtimeData) {
      const cfg = config || {}
      const from = cfg.header_from || '#4F7CFF'
      const to = cfg.header_to || '#7BA3FF'
      const opacityRaw = Number(cfg.header_opacity)
      const opacityPct = Number.isFinite(opacityRaw) ? Math.max(40, Math.min(opacityRaw, 100)) : 96
      const titleRadius = Number.isFinite(Number(cfg.title_radius)) ? Math.max(0, Math.min(Number(cfg.title_radius), 40)) : 12
      const titleWidthRaw = Number(cfg.title_width)
      const titleWidth = Number.isFinite(titleWidthRaw) ? Math.max(40, Math.min(titleWidthRaw, 100)) : 72
      const contentRadius = Number.isFinite(Number(cfg.content_radius)) ? Math.max(0, Math.min(Number(cfg.content_radius), 40)) : 14
      const moreRadiusRaw = Number(cfg.more_radius)
      const moreRadius = Number.isFinite(moreRadiusRaw)
        ? (moreRadiusRaw > 40 ? 20 : Math.max(0, Math.min(moreRadiusRaw, 40)))
        : 20
      const moreBg = cfg.more_bg || '#EEF1FF'
      const moreColor = cfg.more_color || '#5B6CFF'
      const gapRaw = Number(cfg.item_gap)
      const gap = Number.isFinite(gapRaw) ? Math.max(0, Math.min(gapRaw, 32)) : 10
      const dateParts = resolveDateParts(cfg)
      const layout = resolveLayout(cfg)
      const headerPlain = !!cfg.header_plain
      const useUnifiedCard = headerPlain || layout === 'number'
      const cardRadius = contentRadius * 2
      const contentStyle = useUnifiedCard
        ? `border-radius:${cardRadius}rpx;background:#fffdf9;border:1px solid #efe7da;padding:24rpx;box-sizing:border-box;`
        : `border-radius:${cardRadius}rpx;`
      // 前缀图标归一（与后台 hotNewsSchema.ts 的 HOT_NEWS_PREFIX_ICONS 同白名单）
      const rawPrefix = String(cfg.prefix_icon || 'star')
      const prefixMode = ['star', 'number', 'dot', 'fire', 'none'].indexOf(rawPrefix) >= 0 ? rawPrefix : 'star'

      this.setData({
        titleText: String(cfg.title || '今日精选').trim() || '今日精选',
        showMore: cfg.show_more !== false,
        moreText: String(cfg.more_text || '查看更多 >').trim() || '查看更多 >',
        moreLink: String(cfg.more_link || '/pkg-content/content-list/content-list').trim() || '/pkg-content/content-list/content-list',
        titleBoxStyle: `min-width:${titleWidth}%;max-width:100%;border-radius:${titleRadius * 2}rpx;`,
        titleBgStyle: `opacity:${opacityPct / 100};background:linear-gradient(180deg, ${from} 0%, ${to} 100%);border-radius:${titleRadius * 2}rpx;`,
        contentStyle,
        moreStyle: `border-radius:${moreRadius * 2}rpx;background:${moreBg};color:${moreColor};`,
        listStyle: `gap:${gap * 2}rpx;`,
        layout,
        useUnifiedCard,
        showCover: cfg.show_cover !== false,
        displayData: prepareList(runtimeData, cfg),
        // 前缀图标（2026-10-06）：number 由下标渲染（wxml 里 index+1），其余给字形
        prefixMode: prefixMode,
        prefixText: prefixMode === 'number' || prefixMode === 'none' ? '' : (PREFIX_GLYPHS[prefixMode] || '★'),
        prefixClass: prefixMode === 'none' ? 'is-none' : `is-${prefixMode}`,
        ...dateParts,
      })
    },

    onTapMore() {
      const link = this.data.moreLink
      if (!link) return
      if (/^https?:\/\//i.test(link)) {
        executeAction({ type: 'webview', url: link })
      } else {
        navigatePage(link)
      }
    },

    onTapItem(e) {
      const index = e.currentTarget.dataset.index
      const item = (this.data.displayData || [])[index]
      if (!item) return
      if (item.link_url) {
        if (/^https?:\/\//i.test(item.link_url)) {
          executeAction({ type: 'webview', url: item.link_url })
        } else {
          navigatePage(item.link_url)
        }
        return
      }
      if (item.id && isValidContentId(item.id)) {
        navigatePage(`/pkg-content/content-detail/content-detail?id=${item.id}`)
        return
      }
      wx.showToast({ title: '内容暂不可用', icon: 'none' })
    },
  },
})
