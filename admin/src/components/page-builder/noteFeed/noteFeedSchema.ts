/**
 * components/page-builder/noteFeed/noteFeedSchema.ts
 * 笔记瀑布流（Note Waterfall）Props 的**唯一真相源**。
 *
 * 与前四轮（Banner / ArticleFeed / BrandHeader / RichText）同一套路：
 * 属性面板与画布渲染都只读本文件的 normalizeNoteFeedProps()。
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 全局列表版式（组件级） */
export type NoteGlobalLayout = 'masonry' | 'wechat'
/** 单页版式覆盖：'' = 跟随全局 */
export type NotePageLayout = '' | 'masonry' | 'wechat' | 'list'
export type NoteFilterType = 'all' | 'category' | 'tag' | 'ids'
export type NoteSort = 'new' | 'hot' | 'oldest'
export type NoteContentType = 'note' | 'article' | 'moment' | 'product'
export type NoteTabActive = 'bar' | 'fill' | 'ink'
export type NoteGalleryBadge = 'plain' | 'xhs' | 'none'
/** 互动数据展示 */
export type NoteMetric = 'like' | 'view' | 'collect' | 'none'
/** 标题行数限制 */
export type NoteTitleLines = 1 | 2 | 0

/**
 * 卡片阴影预设（2026-06 新增）。
 * - `light`：柔和微光（**默认** —— 与改前原值逐字一致，老页面零变化）
 * - `light`：柔和微光—— 卡片密集时最耐看
 * - `normal`：标准弥散 —— 层级更强，适合单列大图
 * - `custom`：才展开 X / Y / 模糊 / 扩散 / 颜色 5 列参数
 *
 * ⚠️ 此前 Schema 里 shadow 零命中，但**渲染器本来就写了**
 * `0 2px 8px rgba(15,18,25,.06)` —— 那正是「柔和微光」档。
 * 所以缺省必须是 `light`；回落 `none` 会让老页面集体丢阴影。
 */
export type NoteCardShadow = 'none' | 'light' | 'normal' | 'custom'

/** 自定义阴影参数（仅 card_shadow === 'custom' 时生效） */
export interface NoteShadowBox {
  x: number
  y: number
  blur: number
  spread: number
  color: string
}

export interface NoteTypeTab {
  label: string
  content_types: NoteContentType[]
  filter_type: NoteFilterType
  category_ids: string[]
  tag: string
  content_ids: number[]
  sort: NoteSort
  /** 本页版式覆盖：'' = 跟随全局 */
  layout: NotePageLayout
}

export interface NoteFeedProps {
  /* ---- 全局版式 ---- */
  layout: NoteGlobalLayout

  /* ---- 页签体系 ---- */
  type_tabs: NoteTypeTab[]
  show_search: boolean
  /** 二级分类标签（第二行平台分类） */
  show_sub_tabs: boolean
  show_category_tabs: boolean

  tab_font_size: number
  tab_active_style: NoteTabActive
  tab_active_color: string

  /* ---- 2026-10-06 第二批：解除写死的红条 ----
     ⚠️ 下列两项此前**完全写死在渲染器 CSS 里**，换主题只能改代码：
       · 指示器背景 `#ec2f55`（那条红杠）
       · 搜索图标颜色 */
  /** 一级 Tab 激活指示器颜色；空 = 跟随 tab_active_color */
  tab_indicator_color: string
  /** 搜索图标颜色；空 = 跟随未选文字色（tab_text_color） */
  search_icon_color: string

  /* ---- 卡片阴影（预设 + 自定义；选「自定义」才展开 5 列） ---- */
  card_shadow: NoteCardShadow
  card_shadow_custom: NoteShadowBox

  /* ---- 两层导航的容器与底色（2026-10-06 新增，此前全部硬编码） ----
     ⚠️ 这两层此前在渲染器里写死，运营只能改「选中高亮形态 / 激活主色」，
     底色、分割线、未选文字色、间距全都不给配 ——
     截图里「包住导航的白底 + 红色胶囊」换主题时只能改代码。 */
  /** 导航区整体底色（包住两层）；空 = 透明 */
  nav_bg: string
  /** 导航区圆角 px；0 = 直角 */
  nav_radius: number
  /** 首层（全部/笔记/长文/好物）底色；空 = 透明 */
  tab_bar_bg: string
  /** 首层底部分割线颜色；空字符串 = 不画分割线 */
  tab_divider_color: string
  /** 首层未选中文字色 */
  tab_text_color: string
  /** 首层字间距 px */
  tab_gap: number

  /* ---- 第二层（分类胶囊）样式 ---- */
  /** 分类胶囊字号px */
  sub_tab_font_size: number
  /** 分类胶囊未选中文字色 */
  sub_tab_text_color: string
  /** 分类胶囊底色（未选中） */
  sub_tab_bg: string
  /** 分类胶囊选中底色 */
  sub_tab_active_bg: string
  /** 分类胶囊选中文字色 */
  sub_tab_active_color: string
  /** 分类胶囊圆角 px；999 = 全圆胶囊 */
  sub_tab_radius: number
  /** 分类胶囊水平内边距 px */
  sub_tab_padding_x: number
  /** 分类胶囊之间的间距 px */
  sub_tab_gap: number

  /* ---- 数据 ---- */
  page_size: number
  filter_platform_codes: string[]
  filter_topic_tags: string[]

  /* ---- 卡片要素 ---- */
  /** 无封面时渲染为金句文字卡（关闭则显示占位图） */
  text_card: boolean
  gallery_badge: NoteGalleryBadge
  like_heart: boolean
  /** 互动数据展示维度 */
  card_metric: NoteMetric
  /** 展示来源平台小 Badge */
  show_source_badge: boolean
  show_author: boolean

  /* ---- 样式（原本混在内容 Tab 的「视觉微调」） ---- */
  item_gap: number
  item_border_radius: number
  page_gutter: number
  /** 卡片底色 */
  card_bg: string
  /** 列表背景色 */
  background_color: string
  /** 标题字号：px 逻辑口径（13~18） */
  title_size: number
  title_lines: NoteTitleLines
  text_color: string
  meta_color: string
}

/* ------------------------------------------------------------------ */
/* 常量                                                                */
/* ------------------------------------------------------------------ */

export const PAGE_SIZE = { min: 6, max: 30, step: 1, fallback: 10 } as const

/**
 * 🔴 标题字号：px 逻辑口径 13~18，默认 15。
 *
 * 原来是 24~44、默认 32 —— 那套值是按「设计稿 750 宽下的 2 倍」定的，
 * 端上再 `* 2` 转 rpx，于是面板写 32、真机视觉约 16px，
 * 造成「填 32px 实际渲染 16px」的认知偏差（需求点名的 Bug）。
 * 现统一为**面板写多少、视觉就是多少 px**，端上换算同步收敛。
 */
export const TITLE_SIZE = { min: 13, max: 18, step: 1, fallback: 15 } as const

export const TAB_FONT_SIZE = { min: 14, max: 18, step: 1, fallback: 16 } as const

/* ---- 2026-10-06 第二批补齐的区间 ----
   fallback 逐字取渲染器原硬编码值，保证老页面零视觉变化 */
export const TAB_INDICATOR_COLOR = { fallback: '#ec2f55' } as const
export const SEARCH_ICON_COLOR = { fallback: '' } as const
export const SHADOW_XY = { min: -20, max: 20, step: 1, fallback: 0 } as const
export const SHADOW_BLUR = { min: 0, max: 80, step: 1, fallback: 12 } as const
export const SHADOW_SPREAD = { min: -10, max: 20, step: 1, fallback: 0 } as const
export const SHADOW_COLOR = { fallback: 'rgba(15, 18, 25, 0.10)' } as const

/* ---- 两层导航的区间（2026-10-06 新增，与面板滑块共用） ----
   fallback 一律取**渲染器原硬编码值**，保证老页面零视觉变化。 */
export const NAV_RADIUS = { min: 0, max: 40, step: 1, fallback: 0 } as const
export const TAB_GAP = { min: 0, max: 48, step: 1, fallback: 18 } as const
export const SUB_TAB_FONT = { min: 10, max: 20, step: 1, fallback: 12 } as const
export const SUB_TAB_RADIUS = { min: 0, max: 999, step: 1, fallback: 999 } as const
export const SUB_TAB_PADDING = { min: 4, max: 32, step: 1, fallback: 14 } as const
export const SUB_TAB_GAP_RANGE = { min: 0, max: 32, step: 1, fallback: 8 } as const
export const ITEM_GAP = { min: 4, max: 16, step: 1, fallback: 10 } as const
export const ITEM_RADIUS = { min: 0, max: 16, step: 1, fallback: 12 } as const
export const PAGE_GUTTER = { min: 0, max: 16, step: 1, fallback: 0 } as const

export const GLOBAL_LAYOUT_OPTS = [
  { value: 'masonry', label: '小红书双列' },
  { value: 'wechat', label: '公众号横滑' },
]

export const PAGE_LAYOUT_OPTS = [
  { value: '', label: '跟随全局' },
  { value: 'masonry', label: '双列瀑布' },
  { value: 'wechat', label: '图文横滑' },
  { value: 'list', label: '单列列表' },
]

export const CONTENT_TYPE_OPTS: Array<{ value: NoteContentType; label: string }> = [
  { value: 'note', label: '笔记' },
  { value: 'article', label: '长文' },
  { value: 'moment', label: '动态' },
  { value: 'product', label: '好物' },
]

export const FILTER_OPTS = [
  { value: 'all', label: '全部' },
  { value: 'category', label: '分类' },
  { value: 'tag', label: '标签' },
  { value: 'ids', label: '指定' },
]

export const SORT_OPTS: Array<{ value: NoteSort; label: string }> = [
  { value: 'new', label: '最新' },
  { value: 'hot', label: '最热' },
  { value: 'oldest', label: '最早' },
]

export const TAB_ACTIVE_OPTS = [
  { value: 'bar', label: '下划线' },
  { value: 'fill', label: '胶囊背景' },
  { value: 'ink', label: '加粗变色' },
]

export const GALLERY_BADGE_OPTS = [
  { value: 'plain', label: '「N 图」' },
  { value: 'xhs', label: '「图文 N」+「1/N」' },
  { value: 'none', label: '不显示' },
]

export const CARD_METRIC_OPTS = [
  { value: 'like', label: '点赞数' },
  { value: 'view', label: '阅读量' },
  { value: 'collect', label: '收藏数' },
  { value: 'none', label: '隐藏互动' },
]

export const TITLE_LINES_OPTS = [
  { value: 1, label: '单行' },
  { value: 2, label: '最多 2 行' },
  { value: 0, label: '不限' },
]

/* ------------------------------------------------------------------ */
/* 默认值                                                              */
/* ------------------------------------------------------------------ */

export const NOTE_FEED_DEFAULT_PROPS: NoteFeedProps = {
  layout: 'masonry',

  type_tabs: [
    { label: '全部', content_types: [], filter_type: 'all', category_ids: [], tag: '', content_ids: [], sort: 'new', layout: '' },
  ],
  show_search: false,
  show_sub_tabs: true,
  show_category_tabs: true,

  tab_font_size: TAB_FONT_SIZE.fallback,
  tab_active_style: 'bar',
  tab_active_color: '',

  /* 第二批补齐（2026-10-06）：默认值 = 渲染器原硬编码，老页面零变化
     ⚠️ `card_shadow: 'none'` 因为改前渲染器**完全没写 box-shadow** */
  tab_indicator_color: TAB_INDICATOR_COLOR.fallback,
  search_icon_color: SEARCH_ICON_COLOR.fallback,
  // 🔴 缺省必须是 light：原渲染器写的是 0 2px 8px rgba(15,18,25,.06)，正是「柔和微光」
  card_shadow: 'light',
  card_shadow_custom: {
    x: SHADOW_XY.fallback,
    y: SHADOW_XY.fallback,
    blur: SHADOW_BLUR.fallback,
    spread: SHADOW_SPREAD.fallback,
    color: SHADOW_COLOR.fallback,
  },

  /* 两层导航：默认值 = 渲染器此前的硬编码值，逐字对齐，老页面零视觉变化 */
  nav_bg: '',
  nav_radius: NAV_RADIUS.fallback,
  tab_bar_bg: '',
  tab_divider_color: '#f0f1f5',
  tab_text_color: '#727a8c',
  tab_gap: TAB_GAP.fallback,
  sub_tab_font_size: SUB_TAB_FONT.fallback,
  sub_tab_text_color: '#727a8c',
  sub_tab_bg: '#f5f6f9',
  sub_tab_active_bg: '#ffedf1',
  sub_tab_active_color: '#ec2f55',
  sub_tab_radius: SUB_TAB_RADIUS.fallback,
  sub_tab_padding_x: SUB_TAB_PADDING.fallback,
  sub_tab_gap: SUB_TAB_GAP_RANGE.fallback,

  page_size: PAGE_SIZE.fallback,
  filter_platform_codes: [],
  filter_topic_tags: [],

  text_card: true,
  gallery_badge: 'plain',
  like_heart: true,
  card_metric: 'like',
  show_source_badge: false,
  show_author: true,

  item_gap: ITEM_GAP.fallback,
  item_border_radius: ITEM_RADIUS.fallback,
  page_gutter: PAGE_GUTTER.fallback,
  card_bg: '#ffffff',
  background_color: '#f7f7f7',
  title_size: TITLE_SIZE.fallback,
  title_lines: 2,
  text_color: '#333333',
  meta_color: '#7b8798',
}

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

/** 数值夹紧（先判空再 Number —— Number('')===0 会把清空输入框变成区间最小值） */
export function clampNoteNumber(
  value: unknown,
  min: number,
  max: number,
  step = 1,
  fallback: number = min,
): number {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string' && value.trim() === '') return fallback
  if (Array.isArray(value) && value.length === 0) return fallback
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  const clamped = Math.min(max, Math.max(min, n))
  const snapped = Math.round(clamped / step) * step
  return Math.min(max, Math.max(min, snapped))
}

function pickEnum<T extends string | number>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

const CARD_SHADOW_VALUES: NoteCardShadow[] = ['none', 'light', 'normal', 'custom']

/**
 * 阴影预设归一（2026-10-06）。
 * 🔴 缺省回落 `none` 而不是 `light` —— 改前渲染器**完全没写 box-shadow**，
 * 若默认给一层微光，所有老页面加载后会集体变样。
 */
export function normalizeCardShadow(raw: unknown): NoteCardShadow {
  // 🔴 fallback 必须是 light 不是 none —— 原渲染器已有 0 2px 8px 微光，
  // 回落 none 会让所有老页面加载后集体「丢失阴影」
  return pickEnum(raw, CARD_SHADOW_VALUES, 'light')
}

/**
 * 自定义阴影参数归一。
 * ⚠️ 逐项独立夹紧 + 单出口返回：中途 `return {}` 会让后面的键丢失，
 * 且 TS 会推成联合类型（项目记忆里的既有坑）。
 */
export function normalizeShadowBox(raw: unknown): NoteShadowBox {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const out: NoteShadowBox = {
    x: clampNoteNumber(src.x, SHADOW_XY.min, SHADOW_XY.max, 1, SHADOW_XY.fallback),
    y: clampNoteNumber(src.y, SHADOW_XY.min, SHADOW_XY.max, 1, SHADOW_XY.fallback),
    blur: clampNoteNumber(src.blur, SHADOW_BLUR.min, SHADOW_BLUR.max, 1, SHADOW_BLUR.fallback),
    spread: clampNoteNumber(src.spread, SHADOW_SPREAD.min, SHADOW_SPREAD.max, 1, SHADOW_SPREAD.fallback),
    color: String(src.color || SHADOW_COLOR.fallback),
  }
  return out
}

const CONTENT_TYPES: NoteContentType[] = ['note', 'article', 'moment', 'product']
const FILTER_TYPES: NoteFilterType[] = ['all', 'category', 'tag', 'ids']
const SORTS: NoteSort[] = ['new', 'hot', 'oldest']
const PAGE_LAYOUTS: NotePageLayout[] = ['', 'masonry', 'wechat', 'list']

/**
 * 页签归一化。
 * 🔴 向下兼容（历史草稿零改动可用）：
 *  ① 旧 `filter_type='type'`（单选内容类型）→ `all` + `content_types=[content_type]`；
 *  ② 旧 `category_id`（单值）→ `category_ids=[...]`；
 *  ③ 旧 `title` → `label`。
 */
export function normalizeTypeTab(t: any): NoteTypeTab {
  const rawFilter = String(t?.filter_type ?? 'all')
  const filterType: NoteFilterType = (FILTER_TYPES as string[]).includes(rawFilter)
    ? (rawFilter as NoteFilterType)
    : 'all'

  let contentTypes: NoteContentType[] = []
  if (Array.isArray(t?.content_types)) {
    contentTypes = t.content_types
      .map((v: unknown) => String(v) as NoteContentType)
      .filter((v: NoteContentType) => CONTENT_TYPES.includes(v))
  } else if (rawFilter === 'type') {
    // 旧结构：单选内容类型
    const legacy = String(t?.content_type ?? t?.contentType ?? 'note')
    if (CONTENT_TYPES.includes(legacy as NoteContentType)) {
      contentTypes = [legacy as NoteContentType]
    } else {
      contentTypes = ['note']
    }
  }

  let categoryIds: string[] = []
  if (Array.isArray(t?.category_ids)) {
    categoryIds = t.category_ids.map((v: unknown) => String(v ?? '').trim()).filter(Boolean)
  } else if (t?.category_id != null && String(t.category_id) !== '') {
    categoryIds = [String(t.category_id)]
  }

  let contentIds: number[] = []
  if (Array.isArray(t?.content_ids)) {
    contentIds = t.content_ids.map((v: unknown) => Number(v)).filter((v: number) => Number.isFinite(v))
  }

  const rawLayout = String(t?.layout ?? '')
  return {
    label: String(t?.label ?? t?.title ?? ''),
    content_types: contentTypes,
    filter_type: filterType,
    category_ids: categoryIds,
    tag: String(t?.tag ?? ''),
    content_ids: contentIds,
    sort: (SORTS as string[]).includes(String(t?.sort))
      ? (String(t?.sort) as NoteSort)
      : 'new',
    layout: (PAGE_LAYOUTS as string[]).includes(rawLayout) ? (rawLayout as NotePageLayout) : '',
  }
}

/**
 * 保存时补齐旧字段（content_type / category_id），
 * 保证未升级的小程序端能降级渲染 —— **不要删**。
 */
export function deriveLegacyFields(tab: NoteTypeTab): NoteTypeTab & {
  content_type: string
  category_id: string
} {
  return {
    ...tab,
    content_type: tab.content_types[0] || 'note',
    category_id: tab.category_ids[0] || '',
  }
}

/* ------------------------------------------------------------------ */
/* 归一化                                                              */
/* ------------------------------------------------------------------ */

/**
 * 🔴 标题字号的历史口径迁移。
 *
 * 旧面板是 24~44、默认 32，而端上渲染 `titleSize * 2rpx` ——
 * 于是「面板填 32、真机视觉约 16px」，正是需求点名的认知偏差。
 * 新口径统一为 13~18px 逻辑面板值，**面板填多少、视觉就是多少 px**。
 *
 * 对旧值的处理：>20 一律判定为旧口径并**折半**再夹紧（32 → 16），
 * 而不是直接夹到上限（32 → 18）—— 后者会让老页面标题突然变大。
 * 端上 `dsl-note-feed.js` 用同一规则，两者必须一致。
 */
export function migrateTitleSize(raw: unknown): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return TITLE_SIZE.fallback
  if (n > 20) return clampNoteNumber(Math.round(n / 2), TITLE_SIZE.min, TITLE_SIZE.max, 1, TITLE_SIZE.fallback)
  return clampNoteNumber(n, TITLE_SIZE.min, TITLE_SIZE.max, 1, TITLE_SIZE.fallback)
}

export function normalizeNoteFeedProps(raw: Record<string, any> | undefined | null): NoteFeedProps {
  const p = raw && typeof raw === 'object' ? raw : {}
  const rawTabs = Array.isArray(p.type_tabs) ? p.type_tabs : []

  return {
    layout: (String(p.layout) === 'wechat' ? 'wechat' : 'masonry'),

    type_tabs: rawTabs.length
      ? rawTabs.map(normalizeTypeTab)
      : [normalizeTypeTab(NOTE_FEED_DEFAULT_PROPS.type_tabs[0])],
    show_search: p.show_search === undefined ? false : !!p.show_search,
    show_sub_tabs: p.show_sub_tabs === undefined ? true : !!p.show_sub_tabs,
    show_category_tabs: p.show_category_tabs === undefined ? true : !!p.show_category_tabs,

    tab_font_size: clampNoteNumber(p.tab_font_size, TAB_FONT_SIZE.min, TAB_FONT_SIZE.max, 1, TAB_FONT_SIZE.fallback),
    tab_active_style: pickEnum(p.tab_active_style, ['bar', 'fill', 'ink'] as const, 'bar'),
    tab_active_color: String(p.tab_active_color || ''),

    // ---- 第二批补齐（2026-10-06）----
    // ⚠️ 归一化口径与渲染器原硬编码逐字一致：缺省才回落，空串表示「跟随」。
    // 这样运营把指示器色清空 = 跟随激活主色（而不是退回红条），
    // 而**未配置**的老页面仍拿到 #ec2f55，视觉零变化。
    tab_indicator_color: p.tab_indicator_color === undefined
      ? TAB_INDICATOR_COLOR.fallback
      : String(p.tab_indicator_color || ''),
    search_icon_color: p.search_icon_color === undefined
      ? SEARCH_ICON_COLOR.fallback
      : String(p.search_icon_color || ''),
    card_shadow: normalizeCardShadow(p.card_shadow),
    card_shadow_custom: normalizeShadowBox(p.card_shadow_custom),

    // ---- 两层导航（2026-10-06）----
    // ⚠️ 归一化口径与原硬编码逐字一致：空串/缺省要回落到「原值」而不是空，
    // 否则老页面加载后导航会突然变透明 / 分割线消失 —— 那是视觉突变。
    nav_bg: String(p.nav_bg || ''),
    nav_radius: clampNoteNumber(p.nav_radius, NAV_RADIUS.min, NAV_RADIUS.max, 1, NAV_RADIUS.fallback),
    tab_bar_bg: String(p.tab_bar_bg || ''),
    // 空串 = 不画分割线（运营可主动关掉），缺省才回落到 #f0f1f5
    tab_divider_color: p.tab_divider_color === undefined ? '#f0f1f5' : String(p.tab_divider_color || ''),
    tab_text_color: String(p.tab_text_color || '#727a8c'),
    tab_gap: clampNoteNumber(p.tab_gap, TAB_GAP.min, TAB_GAP.max, 1, TAB_GAP.fallback),
    sub_tab_font_size: clampNoteNumber(p.sub_tab_font_size, SUB_TAB_FONT.min, SUB_TAB_FONT.max, 1, SUB_TAB_FONT.fallback),
    sub_tab_text_color: String(p.sub_tab_text_color || '#727a8c'),
    sub_tab_bg: String(p.sub_tab_bg || '#f5f6f9'),
    sub_tab_active_bg: String(p.sub_tab_active_bg || '#ffedf1'),
    sub_tab_active_color: String(p.sub_tab_active_color || '#ec2f55'),
    sub_tab_radius: clampNoteNumber(p.sub_tab_radius, SUB_TAB_RADIUS.min, SUB_TAB_RADIUS.max, 1, SUB_TAB_RADIUS.fallback),
    sub_tab_padding_x: clampNoteNumber(p.sub_tab_padding_x, SUB_TAB_PADDING.min, SUB_TAB_PADDING.max, 1, SUB_TAB_PADDING.fallback),
    sub_tab_gap: clampNoteNumber(p.sub_tab_gap, SUB_TAB_GAP_RANGE.min, SUB_TAB_GAP_RANGE.max, 1, SUB_TAB_GAP_RANGE.fallback),

    page_size: clampNoteNumber(p.page_size, PAGE_SIZE.min, PAGE_SIZE.max, 1, PAGE_SIZE.fallback),
    filter_platform_codes: Array.isArray(p.filter_platform_codes)
      ? p.filter_platform_codes.map((v: unknown) => String(v)).filter(Boolean)
      : [],
    filter_topic_tags: Array.isArray(p.filter_topic_tags)
      ? p.filter_topic_tags.map((v: unknown) => String(v)).filter(Boolean)
      : [],

    text_card: p.text_card === undefined ? true : !!p.text_card,
    gallery_badge: pickEnum(p.gallery_badge, ['plain', 'xhs', 'none'] as const, 'plain'),
    like_heart: p.like_heart === undefined ? true : !!p.like_heart,
    card_metric: pickEnum(p.card_metric, ['like', 'view', 'collect', 'none'] as const, 'like'),
    show_source_badge: p.show_source_badge === undefined ? false : !!p.show_source_badge,
    show_author: p.show_author === undefined ? true : !!p.show_author,

    item_gap: clampNoteNumber(p.item_gap, ITEM_GAP.min, ITEM_GAP.max, 1, ITEM_GAP.fallback),
    item_border_radius: clampNoteNumber(p.item_border_radius, ITEM_RADIUS.min, ITEM_RADIUS.max, 1, ITEM_RADIUS.fallback),
    page_gutter: clampNoteNumber(p.page_gutter, PAGE_GUTTER.min, PAGE_GUTTER.max, 1, PAGE_GUTTER.fallback),
    card_bg: String(p.card_bg || '#ffffff'),
    background_color: String(p.background_color || '#f7f7f7'),
    // 🔴 旧值（24~44 那套设计稿 2 倍口径）折半后夹紧，不是直接夹到上限
    title_size: migrateTitleSize(p.title_size),
    title_lines: pickEnum(Number(p.title_lines), [1, 2, 0] as const, 2),
    text_color: String(p.text_color || '#333333'),
    meta_color: String(p.meta_color || '#7b8798'),
  }
}

/* ------------------------------------------------------------------ */
/* 渲染侧派生                                                          */
/* ------------------------------------------------------------------ */

/** 某页签最终生效的版式：优先本页覆盖，否则跟随全局 */
export function resolvePageLayout(tab: NoteTypeTab | undefined, global: NoteGlobalLayout): NotePageLayout {
  if (tab && tab.layout) return tab.layout
  return global
}

/** 折叠态摘要文案 */
export function tabSummary(t: NoteTypeTab): string {
  const types = t.content_types.length
    ? t.content_types.map((v) => CONTENT_TYPE_OPTS.find((o) => o.value === v)?.label || v).join('/')
    : '全部形式'
  const parts: string[] = [types]
  if (t.filter_type === 'category') parts.push(`分类 ${t.category_ids.length || 0}`)
  else if (t.filter_type === 'tag') parts.push(t.tag ? `标签 ${t.tag}` : '标签未填')
  else if (t.filter_type === 'ids') parts.push(`指定 ${t.content_ids.length}`)
  const sortLabel = SORT_OPTS.find((o) => o.value === t.sort)?.label
  if (sortLabel) parts.push(sortLabel)
  return parts.join(' · ')
}

/** 容器样式：列表底色 + 左右边距（挂在最外层，卡片自身再设底色与圆角） */
export function noteContainerStyle(props: NoteFeedProps): Record<string, string> {
  return {
    background: props.background_color,
    paddingLeft: `${props.page_gutter}px`,
    paddingRight: `${props.page_gutter}px`,
  }
}

/* ---- 品牌色板（2026-10-06 补导出） ----
   🔴 此前 `BRAND_PALETTE` 只在 brandHeaderSchema 里定义，而 NoteFeedProps /
   NoteFeedStyleProps 的模板里都在用却**没导入** —— Vue 模板取到 undefined，
   取色器的预设色板静默降级为空（不报错，所以一直没人发现）。
   这里从品牌顶栏的 Schema 转发导出，避免跨域引用，也顺手把这个坑堵上。 */
export { BRAND_PALETTE } from '../brandHeader/brandHeaderSchema'
