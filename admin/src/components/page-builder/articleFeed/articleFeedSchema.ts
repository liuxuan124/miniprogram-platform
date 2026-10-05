/**
 * components/page-builder/articleFeed/articleFeedSchema.ts
 * 文章流（Article Feed）Props 的**唯一真相源**。
 *
 * 为什么要有这个文件：
 *   属性面板（ArticleFeedProps.vue）与画布渲染（ArticleFeedRenderer.vue）都要读同一批
 *   配置。以前两边各读各的原始 props，于是出现「面板显示一种、画布另一种」。
 *   现在统一从本文件取 normalizeArticleFeedProps()。
 *
 * 🔴 向后兼容铁律（已发布的小程序不能被新后台改坏）：
 *   1. `style_type` 是 `layout` 的**历史别名**，归一化时自动并轨，UI 上不再暴露；
 *   2. 所有新字段「有值才生效」，缺省走默认值，不改变老配置的既有表现；
 *   3. 归一化**纯函数**，不改传入对象（否则触发 Vue 无限更新）。
 */

import { ARTICLE_LIST_LAYOUTS, resolveArticleLayout, type ArticleListLayout } from '../articleLayouts'

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 数据范围 */
export type FeedScope = 'all' | 'category' | 'column'
/** 默认排序 */
export type FeedSort = 'latest' | 'views' | 'likes'
/** 加载方式 */
export type FeedLoadMode = 'infinite' | 'button' | 'pager'
/** 分类 Tab 展示形态 */
export type FeedTabStyle = 'pill' | 'underline' | 'segmented'
/** 封面宽高比 */
export type FeedCoverAspect = '16:9' | '4:3' | '1:1' | 'auto'
/** 圆角档位 */
export type FeedRadius = 0 | 4 | 8 | 12
/** 封面位置（单列/卡片形态生效） */
export type FeedCoverPosition = 'right' | 'left'
/** 容器分割风格 */
export type FeedDividerStyle = 'line' | 'card'
/** 互动热度可勾选的维度 */
export type FeedMetricKey = 'views' | 'likes' | 'reading'
/** 状态角标 */
export type FeedBadgeKey =
  | 'pinned' | 'featured' | 'latest'
  | 'original' | 'deep_report' | 'audio' | 'video'
  | 'member_only' | 'free_limited'

/** 可勾选的状态角标全集（面板按此渲染 checkbox 组） */
export const FEED_BADGE_OPTIONS: Array<{ key: FeedBadgeKey; label: string; hint: string }> = [
  { key: 'pinned', label: '置顶', hint: '系统状态' },
  { key: 'featured', label: '精选', hint: '系统状态' },
  { key: 'latest', label: '最新', hint: '系统状态' },
  { key: 'original', label: '原创', hint: '内容形式' },
  { key: 'deep_report', label: '深度研报', hint: '内容形式' },
  { key: 'audio', label: '音频', hint: '内容形式' },
  { key: 'video', label: '视频解读', hint: '内容形式' },
  { key: 'member_only', label: '会员专享', hint: '权限状态' },
  { key: 'free_limited', label: '限时免费', hint: '权限状态' },
]

/** 角标在卡片上的展示文案（端上用 emoji 时从这里取，避免各处各写一份） */
export const FEED_BADGE_TEXT: Record<FeedBadgeKey, string> = {
  pinned: '置顶',
  featured: '精选',
  latest: '最新',
  original: '原创',
  deep_report: '深度研报',
  audio: '音频',
  video: '视频解读',
  member_only: '会员专享',
  free_limited: '限时免费',
}

/** 互动热度维度 */
export const FEED_METRIC_OPTIONS: Array<{ key: FeedMetricKey; label: string }> = [
  { key: 'views', label: '阅读量' },
  { key: 'likes', label: '点赞数' },
  { key: 'reading', label: '阅读时长' },
]

export interface PinnedArticle {
  id: number | string
  title: string
  cover?: string
}

export interface ArticleFeedProps {
  /* ---- 数据源与过滤 ---- */
  scope: FeedScope
  /** scope=category 时的分类 id */
  category_id: number | string
  /** scope=column 时的专栏 id */
  column_id: number | string
  filter_platform_codes: string[]
  filter_topic_tags: string[]
  sort: FeedSort

  /** 手动置顶，最多 PIN_MAX_LIMIT 篇，数组顺序即优先级 */
  pinned: PinnedArticle[]

  /* ---- 分类 Tab 导航 ---- */
  show_category_tabs: boolean
  tab_style: FeedTabStyle
  tab_show_all: boolean

  /* ---- 加载与分页 ---- */
  load_mode: FeedLoadMode
  page_size: number
  /** 0 = 不限 */
  max_count: number
  load_more_text: string

  /* ---- 版式 ---- */
  layout: ArticleListLayout
  /** 杂志焦点流：是否启用首篇大图（关掉则全部条目同版式） */
  hero_first: boolean
  /** 首篇焦点来源：auto=自动取第一篇 / pinned=用置顶首篇 / fixed=指定固定头条 */
  hero_source: 'auto' | 'pinned' | 'fixed'
  /** hero_source=fixed 时指定的文章 id */
  hero_article_id: number | string
  /** 封面位置（单列/卡片形态生效） */
  cover_position: FeedCoverPosition
  /** 容器分割风格：line=细分割线 / card=独立卡片浮层 */
  divider_style: FeedDividerStyle

  /* ---- 元素显隐 ---- */
  show_cover: boolean
  cover_aspect: FeedCoverAspect
  cover_radius: FeedRadius

  show_excerpt: boolean
  /** 摘要截断行数 */
  excerpt_lines: 1 | 2 | 3

  show_author: boolean
  show_badge: boolean
  show_date: boolean
  show_meta: boolean

  /* ---- 卡片内容要素（本轮扩充） ---- */
  /** 专栏/话题胶囊标签 */
  show_column_tag: boolean
  /** 互动热度：勾选哪些维度（空数组 = 不展示） */
  show_metrics: FeedMetricKey[]
  /** 行动引导点「阅读全文 →」 */
  show_cta: boolean
  cta_text: string
  /** 状态角标：勾选哪些（空数组 = 不展示） */
  show_badges: FeedBadgeKey[]
  /** 状态角标位置：标题前 / 封面上 / 底部行 */
  badge_position: 'title' | 'cover' | 'meta'
  /** 摘要文字色（次级灰度） */
  excerpt_color: string

  /* ---- 排版与间距 ---- */
  item_gap: number
  card_margin: number
  title_font_size: number
  title_bold: boolean
  subtitle_font_size: number
  subtitle_color: string

  /* ---- 来源标签（沿用既有字段） ---- */
  show_source_tag: boolean
  source_tag_position: 'title' | 'meta' | 'cover'
  source_filter: string[]
  source_labels: Record<string, string>
}

/* ------------------------------------------------------------------ */
/* 常量                                                                */
/* ------------------------------------------------------------------ */

export const PAGE_SIZE = { min: 5, max: 30, step: 1, fallback: 10 } as const
export const MAX_COUNT = { min: 0, max: 200, step: 1, fallback: 0 } as const
export const ITEM_GAP = { min: 4, max: 24, step: 1, fallback: 8 } as const
export const CARD_MARGIN = { min: 0, max: 24, step: 1, fallback: 0 } as const
export const TITLE_FONT_SIZE = { min: 11, max: 24, step: 1, fallback: 13 } as const
export const SUBTITLE_FONT_SIZE = { min: 9, max: 18, step: 1, fallback: 11 } as const
export const EXCERPT_LINES = { min: 1, max: 3, step: 1, fallback: 2 } as const

/** 置顶上限：需求明确最多 3 篇 */
export const PIN_MAX_LIMIT = 3

/** 标题字号快捷档位 */
export const TITLE_SIZE_PRESETS = [
  { value: 13, label: '小' },
  { value: 15, label: '标准' },
  { value: 17, label: '大' },
] as const

/** 版式分组（用于可视化选择器的分栏标题） */
export const LAYOUT_GROUPS: Array<{ title: string; items: Array<{ value: ArticleListLayout; label: string; desc: string }> }> = [
  {
    title: '常规版式',
    items: [
      { value: 'card', label: '卡片流', desc: '封面在上、信息在下' },
      { value: 'list', label: '单列列表', desc: '左图右文' },
      { value: 'compact', label: '紧凑模式', desc: '小图窄距，一屏更多' },
    ],
  },
  {
    title: '杂志版式',
    items: [
      { value: 'magazine', label: '杂志首篇', desc: '首篇大图，余下细排' },
      { value: 'overlay', label: '封面沉浸', desc: '大图压字' },
      { value: 'grid', label: '双列网格', desc: '两列并排' },
      { value: 'editorial', label: '报刊细排', desc: '右图左文、细分隔线' },
    ],
  },
]

export const ALL_LAYOUT_ITEMS = LAYOUT_GROUPS.flatMap((g) => g.items)

export const FEED_SCOPE_OPTIONS = [
  { value: 'all', label: '全站文章' },
  { value: 'category', label: '指定分类' },
  { value: 'column', label: '指定专栏' },
] as const

export const FEED_SORT_OPTIONS = [
  { value: 'latest', label: '最新发布' },
  { value: 'views', label: '浏览量最高' },
  { value: 'likes', label: '点赞量最高' },
] as const

export const FEED_LOAD_MODE_OPTIONS = [
  { value: 'infinite', label: '触底加载' },
  { value: 'button', label: '查看更多' },
  { value: 'pager', label: '分页器' },
] as const

// 这三组要直接传给 BuilderSegmented（其 props 是可变 SegOption[]），
// 所以**不能加 `as const`** —— 否则 TS4104 readonly 不能赋给可变数组。
export const FEED_TAB_STYLE_OPTIONS = [
  { value: 'pill', label: '胶囊浮动' },
  { value: 'underline', label: '极简下划线' },
  { value: 'segmented', label: '分段选择器' },
]

export const FEED_COVER_ASPECT_OPTIONS = [
  { value: '16:9', label: '16:9' },
  { value: '4:3', label: '4:3' },
  { value: '1:1', label: '1:1' },
  { value: 'auto', label: '自动高度' },
]

export const FEED_RADIUS_OPTIONS = [
  { value: 0, label: '无' },
  { value: 4, label: '4' },
  { value: 8, label: '8' },
  { value: 12, label: '12' },
]

/* ------------------------------------------------------------------ */
/* 默认值                                                              */
/* ------------------------------------------------------------------ */

export const ARTICLE_FEED_DEFAULT_PROPS: ArticleFeedProps = {
  scope: 'all',
  category_id: '',
  column_id: '',
  filter_platform_codes: [],
  filter_topic_tags: [],
  sort: 'latest',

  pinned: [],

  show_category_tabs: false,
  tab_style: 'pill',
  tab_show_all: true,

  load_mode: 'infinite',
  page_size: PAGE_SIZE.fallback,
  max_count: MAX_COUNT.fallback,
  load_more_text: '下滑加载更多文章…',

  layout: 'list',
  // 🔴 新增字段的默认值必须「不改变老页面观感」：
  //   hero_first=true 是 magazine 版式一直以来的行为；
  //   divider_style='line' 对应老 list 版式的细线观感；
  //   其余一律关闭/空，老页面升级后视觉零变化。
  hero_first: true,
  hero_source: 'auto',
  hero_article_id: '',
  cover_position: 'right',
  divider_style: 'line',

  show_cover: true,
  cover_aspect: '16:9',
  cover_radius: 8,

  show_excerpt: false,
  excerpt_lines: 2,

  show_author: false,
  show_badge: true,
  show_date: true,
  show_meta: false,

  show_column_tag: false,
  show_metrics: [],
  show_cta: false,
  cta_text: '阅读全文 →',
  // 旧字段 show_badge 只有一个「原创」角标，迁移时映射成 show_badges 数组
  show_badges: ['original'],
  badge_position: 'meta',
  excerpt_color: '#666666',

  item_gap: ITEM_GAP.fallback,
  card_margin: CARD_MARGIN.fallback,
  title_font_size: TITLE_FONT_SIZE.fallback,
  title_bold: false,
  subtitle_font_size: SUBTITLE_FONT_SIZE.fallback,
  subtitle_color: '#94a3b8',

  show_source_tag: false,
  source_tag_position: 'meta',
  source_filter: [],
  source_labels: {},
}

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

/**
 * 数值夹紧。🔴 必须**先判空再 Number()** —— `Number('')`/`Number(null)`/`Number([])`
 * 全都是 0 且是有限数，直接夹紧会把「运营清空输入框」变成区间最小值
 * （页条数 5、间距 4px），而不是回到默认值。
 */
export function clampFeedNumber(
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

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

/** 枚举数组归一化：非数组返回空数组，非法项剔除（脏数据不该让面板渲染出空 checkbox） */
function normalizeEnumArray<T extends string>(value: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<T>()
  for (const v of value) {
    if (allowed.includes(v as T)) seen.add(v as T)
  }
  return [...seen]
}

/** 全部合法状态角标 key（供归一化白名单用） */
const FEED_BADGE_KEYS: FeedBadgeKey[] = FEED_BADGE_OPTIONS.map((o) => o.key)

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((v) => String(v ?? '').trim()).filter((v) => !!v)
}

/* ------------------------------------------------------------------ */
/* 归一化                                                              */
/* ------------------------------------------------------------------ */

/**
 * 归一化整个文章流 props。
 * **纯函数**：不改传入对象，返回全新对象。
 */
export function normalizeArticleFeedProps(raw: Record<string, any> | undefined | null): ArticleFeedProps {
  const p = raw && typeof raw === 'object' ? raw : {}

  // 🔴 Schema Migration：`style_type` 是 `layout` 的历史别名。
  //    这里一次性并轨（layout 优先），面板与画布都只读 layout，
  //    于是「未选时旧页面仍用卡片/列表/紧凑」这类面向开发者的说明可以从 UI 上删掉。
  const layout = resolveArticleLayout(p.layout ?? p.style_type, ARTICLE_FEED_DEFAULT_PROPS.layout)

  // 置顶项归一化 + 强制截断到上限（脏数据/旧数据可能超过 3 篇）
  const rawPinned = Array.isArray(p.pinned) ? p.pinned : []
  const pinned: PinnedArticle[] = rawPinned
    .map((it: any) => {
      if (it == null) return null
      if (typeof it === 'number' || typeof it === 'string') {
        return { id: it, title: '' }
      }
      const id = it.id ?? it.contentId ?? it.content_id
      if (id == null) return null
      return { id, title: String(it.title || ''), cover: it.cover ? String(it.cover) : undefined }
    })
    .filter(Boolean)
    .slice(0, PIN_MAX_LIMIT) as PinnedArticle[]

  return {
    scope: pickEnum(p.scope, ['all', 'category', 'column'] as const, 'all'),
    category_id: p.category_id ?? p.categoryId ?? '',
    column_id: p.column_id ?? p.columnId ?? '',
    filter_platform_codes: toStringArray(p.filter_platform_codes),
    filter_topic_tags: toStringArray(p.filter_topic_tags),
    sort: pickEnum(p.sort, ['latest', 'views', 'likes'] as const, 'latest'),

    pinned,

    show_category_tabs: p.show_category_tabs === undefined ? false : !!p.show_category_tabs,
    tab_style: pickEnum(p.tab_style, ['pill', 'underline', 'segmented'] as const, 'pill'),
    tab_show_all: p.tab_show_all === undefined ? true : !!p.tab_show_all,

    load_mode: pickEnum(p.load_mode, ['infinite', 'button', 'pager'] as const, 'infinite'),
    page_size: clampFeedNumber(p.page_size, PAGE_SIZE.min, PAGE_SIZE.max, PAGE_SIZE.step, PAGE_SIZE.fallback),
    max_count: clampFeedNumber(p.max_count, MAX_COUNT.min, MAX_COUNT.max, MAX_COUNT.step, MAX_COUNT.fallback),
    load_more_text: String(p.load_more_text || ARTICLE_FEED_DEFAULT_PROPS.load_more_text),

    layout,
    hero_first: p.hero_first === undefined ? true : !!p.hero_first,
    hero_source: pickEnum(p.hero_source, ['auto', 'pinned', 'fixed'] as const, 'auto'),
    hero_article_id: p.hero_article_id ?? '',
    cover_position: pickEnum(p.cover_position, ['right', 'left'] as const, 'right'),
    divider_style: pickEnum(p.divider_style, ['line', 'card'] as const, 'line'),

    show_cover: p.show_cover === undefined ? true : !!p.show_cover,
    cover_aspect: pickEnum(p.cover_aspect, ['16:9', '4:3', '1:1', 'auto'] as const, '16:9'),
    cover_radius: ([0, 4, 8, 12].includes(Number(p.cover_radius)) ? Number(p.cover_radius) : 8) as FeedRadius,

    show_excerpt: p.show_excerpt === undefined ? false : !!p.show_excerpt,
    excerpt_lines: clampFeedNumber(p.excerpt_lines, EXCERPT_LINES.min, EXCERPT_LINES.max, 1, 2) as 1 | 2 | 3,

    show_author: p.show_author === undefined ? false : !!p.show_author,
    show_badge: p.show_badge === undefined ? true : !!p.show_badge,
    show_column_tag: p.show_column_tag === undefined ? false : !!p.show_column_tag,
    show_metrics: normalizeEnumArray(p.show_metrics, ['views', 'likes', 'reading'] as const),
    show_cta: p.show_cta === undefined ? false : !!p.show_cta,
    cta_text: String(p.cta_text || ARTICLE_FEED_DEFAULT_PROPS.cta_text),
    // 🔴 Schema Migration：旧 `show_badge`（布尔，只管「原创」角标）→ `show_badges` 数组。
    //    显式给了 show_badges 就用它；没给则按旧开关推导，老页面观感不变。
    show_badges: Array.isArray(p.show_badges)
      ? normalizeEnumArray(p.show_badges, FEED_BADGE_KEYS)
      : (p.show_badge === false ? [] : ['original' as FeedBadgeKey]),
    badge_position: pickEnum(p.badge_position, ['title', 'cover', 'meta'] as const, 'meta'),
    excerpt_color: String(p.excerpt_color || '#666666'),
    show_date: p.show_date === undefined ? true : !!p.show_date,
    show_meta: p.show_meta === undefined ? false : !!p.show_meta,

    item_gap: clampFeedNumber(p.item_gap, ITEM_GAP.min, ITEM_GAP.max, ITEM_GAP.step, ITEM_GAP.fallback),
    card_margin: clampFeedNumber(p.card_margin, CARD_MARGIN.min, CARD_MARGIN.max, CARD_MARGIN.step, CARD_MARGIN.fallback),
    title_font_size: clampFeedNumber(p.title_font_size, TITLE_FONT_SIZE.min, TITLE_FONT_SIZE.max, TITLE_FONT_SIZE.step, TITLE_FONT_SIZE.fallback),
    title_bold: p.title_bold === undefined ? false : !!p.title_bold,
    subtitle_font_size: clampFeedNumber(p.subtitle_font_size, SUBTITLE_FONT_SIZE.min, SUBTITLE_FONT_SIZE.max, SUBTITLE_FONT_SIZE.step, SUBTITLE_FONT_SIZE.fallback),
    subtitle_color: String(p.subtitle_color || ARTICLE_FEED_DEFAULT_PROPS.subtitle_color),

    show_source_tag: p.show_source_tag === undefined ? false : !!p.show_source_tag,
    source_tag_position: pickEnum(p.source_tag_position, ['title', 'meta', 'cover'] as const, 'meta'),
    source_filter: toStringArray(p.source_filter),
    source_labels: (p.source_labels && typeof p.source_labels === 'object' && !Array.isArray(p.source_labels))
      ? { ...p.source_labels }
      : {},
  }
}

/* ------------------------------------------------------------------ */
/* 渲染侧派生                                                          */
/* ------------------------------------------------------------------ */

/** 封面比例 → CSS aspect-ratio 值；'auto' 返回空串表示不定高 */
export function coverAspectCss(aspect: FeedCoverAspect): string {
  switch (aspect) {
    case '16:9': return '16 / 9'
    case '4:3': return '4 / 3'
    case '1:1': return '1 / 1'
    default: return ''
  }
}

/** 是否双列网格（决定 gap 的施加方向） */
export function isGridLayout(layout: ArticleListLayout): boolean {
  return layout === 'grid'
}

/* ------------------------------------------------------------------ */
/* 需求 2.1 的 6 大版式形态                                              */
/* ------------------------------------------------------------------ */

/**
 * 6 大版式分组。**这是面板分组选择器与画布的共同口径** ——
 * 面板按它渲染 6 张线框卡，画布按同一 key 决定结构，避免两处各写一份。
 */
export const FEED_LAYOUT_GROUPS: Array<{
  key: FeedLayoutPreset
  title: string
  desc: string
  /** 映射到既有 ArticleListLayout（端上已实现的 key，不新增未注册布局） */
  layout: ArticleListLayout
}> = [
  { key: 'hero', title: '杂志焦点', desc: '首篇通栏大图 + 下方单列图文', layout: 'magazine' },
  { key: 'classic', title: '单列列表', desc: '左文右图，细线分隔，信息密度高', layout: 'list' },
  { key: 'card', title: '独立卡片', desc: '白底圆角卡片浮于浅色背景', layout: 'card' },
  { key: 'full', title: '大图沉浸', desc: '每篇通栏横幅大图 + 大标题导读', layout: 'overlay' },
  { key: 'grid', title: '双列网格', desc: '两列并排，适配高密度浏览', layout: 'grid' },
  { key: 'text', title: '纯文字', desc: '隐藏封面，紧凑纯文本排版', layout: 'compact' },
]

/** 6 大版式 preset key */
export type FeedLayoutPreset = 'hero' | 'classic' | 'card' | 'full' | 'grid' | 'text'

/** preset → 既有 layout 的双向映射 */
export const FEED_PRESET_TO_LAYOUT: Record<FeedLayoutPreset, ArticleListLayout> = {
  hero: 'magazine',
  classic: 'list',
  card: 'card',
  full: 'overlay',
  grid: 'grid',
  text: 'compact',
}

/** layout → preset（归一化旧配置时用；未匹配落到 classic） */
export function resolveLayoutPreset(layout: ArticleListLayout): FeedLayoutPreset {
  for (const g of FEED_LAYOUT_GROUPS) {
    if (g.layout === layout) return g.key
  }
  return 'classic'
}

/**
 * 纯文字版式：彻底隐藏封面。
 * 面板不必再单独给一个「显示封面」开关去和它打架。
 */
export function hidesCoverInLayout(layout: ArticleListLayout): boolean {
  return layout === 'compact'
}

/**
 * 首篇是否走「大图焦点」形态。
 * - magazine 版式 + hero_first 开启 → 首篇大图
 * - 关掉 hero_first → 首篇与其余同版式（需求 2.1「是否启用首篇大图」）
 */
export function usesHeroFirst(props: ArticleFeedProps, index: number): boolean {
  if (props.layout !== 'magazine') return false
  if (!props.hero_first) return false
  return index === 0
}

/**
 * 首篇焦点取哪一篇。
 * auto   = 排序后的第一篇
 * pinned = 置顶列表的第一篇（运营手动指定的头条）
 * fixed  = 指定的固定文章
 * 返回 null 表示「没有可用的焦点条目」，调用方应回落到 index 0。
 */
export function resolveHeroArticle(
  props: ArticleFeedProps,
  ordered: Array<{ id?: number | string }>,
): { id: number | string } | null {
  if (props.hero_source === 'pinned') {
    const first = props.pinned[0]
    return first ? { id: first.id } : null
  }
  if (props.hero_source === 'fixed') {
    const id = props.hero_article_id
    if (id === '' || id === null || id === undefined) return null
    return { id }
  }
  return ordered[0] ? { id: ordered[0].id as number | string } : null
}


export { ARTICLE_LIST_LAYOUTS, resolveArticleLayout }
export type { ArticleListLayout }
