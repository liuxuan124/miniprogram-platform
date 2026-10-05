/**
 * 文章列表（ArticleList）的 props 单一真相源。
 *
 * 为什么单独建文件：这个组件的字段散在三处——注册表 defaultProps、Inspector 面板、
 * 画布渲染器 + 小程序端 dsl-article-list。每处各写一份默认值/取值范围，
 * 改一处必然漏两处（历史上 `limit` 的 min/max、`empty_mode` 的枚举都出过不一致）。
 *
 * 🔴 双端铁律：新增/改名任何字段，必须同时在
 *   - admin/src/components/page-builder/renderers/ArticleListRenderer.vue
 *   - miniapp/components/dsl-article-list/dsl-article-list.js / .wxml
 *   两端按**同一规则**实现，否则画布与真机会不一致。
 */

/** 7 种排版布局，取值与 articleLayouts.ts 的 key 完全一致 */
export type ArticleListLayout =
  | 'card'
  | 'list'
  | 'compact'
  | 'overlay'
  | 'magazine'
  | 'grid'
  | 'editorial'

export const ARTICLE_LIST_LAYOUT_KEYS: ArticleListLayout[] = [
  'card',
  'list',
  'compact',
  'overlay',
  'magazine',
  'grid',
  'editorial',
]

/** 筛选排序规则 */
export type ArticleSortBy = 'newest' | 'popular' | 'recommended'

/** 内容类型筛选；空串 = 全部类型 */
export type ArticleContentType = '' | 'article' | 'image_text' | 'video'

/** 无内容时的处理策略 */
export type ArticleEmptyMode =
  /** 线上优雅兜底：整个组件不渲染（推荐） */
  | 'hide'
  /** 展示一张空状态卡片 */
  | 'placeholder'

/** 手动置顶的单篇文章（与 ArticleFeed 的 PinnedArticle 同形，便于复用 FeedPinEditor） */
export interface PinnedArticle {
  id: number | string
  title?: string
  cover?: string
}

/** 置顶上限：置顶项会挤占正文的展示位，上限太高会让「显示数量」失去意义 */
export const PIN_MAX_LIMIT = 3

/** 空状态可选图标（Emoji，零依赖、跨端一致） */
export const EMPTY_ICON_OPTIONS = ['📭', '📄', '🔍', '🌱', '✍️', '🗂️'] as const

export interface ArticleListProps {
  /* ───── 标题头 ───── */
  show_header: boolean
  title: string
  subtitle: string
  show_more: boolean
  more_text: string
  more_link: string
  more_link_type: string

  /* ───── 排版 ───── */
  layout: ArticleListLayout
  /** 旧字段，与 layout 同义；读取时 layout 优先 */
  style_type: ArticleListLayout
  /** 显示数量（篇）。区间 1–20 —— 超过 20 屏内滚不完，且拉取成本线性上升 */
  limit: number

  /* ───── 展示元素（对应需求「展示元素」配置组） ───── */
  show_cover: boolean
  show_date: boolean
  show_source_tag: boolean
  /** 阅读热度：展示 item.viewCount。旧页面无此字段 = 不显示 */
  show_views: boolean
  /** 摘要简介：列表/卡片模式下可开；报刊/杂志布局强制显示（旧行为） */
  show_summary: boolean

  /* ───── 内容筛选规则 ───── */
  data_source: {
    type: string
    params: Record<string, any>
    query: Record<string, any>
  }
  show_category_tabs: boolean
  category_tab_style: 'pill' | 'underline' | 'bold'
  category_tab_scope: 'auto' | 'picked'
  category_tab_ids: Array<number | string>
  category_tabs: Array<{ id: string; name: string }>

  /* ───── 来源标签 / 内容标签 ───── */
  source_tag_position: 'title' | 'meta' | 'cover'
  source_filter: string[]
  source_labels: Record<string, string>
  filter_platform_codes: string[]
  filter_topic_tags: string[]

  /* ───── 置顶 ───── */
  pinned: PinnedArticle[]

  /* ───── 空状态 ───── */
  empty_mode: ArticleEmptyMode
  empty_text: string
  empty_icon: string

  /* ───── 样式（存于 props，物理上归「样式」页签，见 ArticleListStyleProps.vue） ───── */
  item_gap: number
  title_font_size: number
  subtitle_font_size: number
}

/** 显示数量安全区间 */
export const LIMIT_MIN = 1
export const LIMIT_MAX = 20
export const LIMIT_FALLBACK = 6

/**
 * 双列网格布局下数量的合法步长与奇偶提示。
 *
 * 为什么 grid 要 step=2：两列网格按序填充，数量为奇数时最后一行只剩 1 篇，
 * 视觉上是一个「孤儿条目」。让运营手动发现这件事不现实，故直接约束。
 */
export function limitStepOf(layout: ArticleListLayout | string): number {
  return String(layout) === 'grid' ? 2 : 1
}

/** grid 布局 + 奇数数量时返回提示文案；其余返回空串 */
export function limitParityWarningOf(layout: ArticleListLayout | string, limit: number): string {
  if (String(layout) !== 'grid') return ''
  const n = Number(limit)
  if (!Number.isFinite(n) || n % 2 === 0) return ''
  return '建议设置为偶数以保持网格对齐'
}

/**
 * 把任意脏值夹进安全区间。
 *
 * ⚠️ 刻意**不**按步长强行取整：奇数在 grid 下是运营可见的合法状态，
 * 面板会给「建议设置为偶数」提示由运营自己决定。静默改写用户填的值比提示更糟。
 */
export function normalizeLimit(raw: unknown): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return LIMIT_FALLBACK
  return Math.min(LIMIT_MAX, Math.max(LIMIT_MIN, Math.round(n)))
}

/** 注册表用默认 props */
export const ARTICLE_LIST_DEFAULT_PROPS: Omit<ArticleListProps, 'data_source'> & {
  data_source: ArticleListProps['data_source']
} = {
  show_header: false,
  title: '',
  subtitle: '',
  show_more: false,
  more_text: '更多 ›',
  more_link: '/pkg-content/content-list/content-list',
  more_link_type: 'page',

  layout: 'list',
  style_type: 'list',
  limit: 3,

  show_cover: true,
  show_date: true,
  show_source_tag: false,
  show_views: false,
  show_summary: false,

  data_source: {
    type: 'content',
    params: { status: 'published' },
    query: { status: 'published' },
  },
  show_category_tabs: false,
  category_tab_style: 'pill',
  category_tab_scope: 'auto',
  category_tab_ids: [],
  category_tabs: [
    { id: '', name: '全部' },
    { id: '行业动态', name: '行业动态' },
    { id: '协会动态', name: '协会动态' },
    { id: '政策解读', name: '政策解读' },
    { id: '精选', name: '精选' },
    { id: '税务合规', name: '税务合规' },
    { id: '物流仓储', name: '物流仓储' },
  ],

  source_tag_position: 'meta',
  source_filter: [],
  source_labels: {},
  filter_platform_codes: [],
  filter_topic_tags: [],

  pinned: [],

  empty_mode: 'placeholder',
  empty_text: '暂时还没有内容',
  empty_icon: '📭',

  item_gap: 8,
  title_font_size: 13,
  subtitle_font_size: 11,
}

/**
 * 展示摘要简介的最终判定（两端共用同一规则）。
 *
 * 报刊细排 / 杂志首篇的排版本身依赖摘要（去掉会破坏版面语义）→ 强制显示；
 * 其余布局看 show_summary 开关。
 */
export function resolveShowSummary(
  layout: ArticleListLayout | string,
  showSummary: unknown,
): boolean {
  const l = String(layout)
  if (l === 'editorial' || l === 'magazine') return true
  return showSummary === true
}

/** 空状态是否展示卡片（hide = 整块不渲染） */
export function resolveShowEmptyCard(mode: unknown): boolean {
  return String(mode || 'placeholder') !== 'hide'
}