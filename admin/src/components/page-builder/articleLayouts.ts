/**
 * 文章列表的 7 种布局元数据（单一真相源）。
 *
 * 为什么单独建：布局的**中文名 / 缩略示意 / 间距语义 / 是否双列**这四件事，
 * 在选择器、字段 label、提示文案、渲染器四处都要用。原先只有 `ARTICLE_LIST_LAYOUTS`
 * 一个字符串数组，导致每处都自己硬编码一份中文名 —— 改一处必然漏三处。
 *
 * ⚠️ 改动纪律：渲染器只认 `key`，新增布局必须同时在 renderers/registry.ts 注册。
 */

export const ARTICLE_LIST_LAYOUTS = [
  'card',
  'list',
  'compact',
  'overlay',
  'magazine',
  'grid',
  'editorial',
] as const

export type ArticleListLayout = (typeof ARTICLE_LIST_LAYOUTS)[number]

export interface ArticleLayoutMeta {
  key: ArticleListLayout
  /** 中文名（选择器与提示文案共用，不要各写一份） */
  label: string
  /** 一句话说明：这个布局长什么样 */
  hint: string
  /**
   * `item_gap` 字段在此布局下的语义：
   * - item：条目之间的空隙（列表/紧凑/双列/报刊）
   * - block：块与块的分隔（大图卡片、封面沉浸有明确块边界）
   * - none：该布局不支持调整间距（隐藏字段，避免给出无效控件）
   */
  gapScope: 'item' | 'block' | 'none'
  /** 缩略示意图类型，见 ArticleLayoutThumb.vue */
  thumb:
    | 'stack-card'
    | 'row-thumb'
    | 'row-text'
    | 'big-hero'
    | 'hero-plus'
    | 'grid-2col'
    | 'news-column'
}

export const ARTICLE_LAYOUT_META: Record<ArticleListLayout, ArticleLayoutMeta> = {
  card: {
    key: 'card',
    label: '卡片',
    hint: '每篇一整张大图卡，图在上、文字在下',
    gapScope: 'block',
    thumb: 'stack-card',
  },
  list: {
    key: 'list',
    label: '列表',
    hint: '左图右文横向排列，最通用',
    gapScope: 'item',
    thumb: 'row-thumb',
  },
  compact: {
    key: 'compact',
    label: '紧凑',
    hint: '纯文字条目，单屏能塞最多',
    gapScope: 'item',
    thumb: 'row-text',
  },
  overlay: {
    key: 'overlay',
    label: '封面沉浸',
    hint: '整屏大图铺满，标题压在图上',
    gapScope: 'block',
    thumb: 'big-hero',
  },
  magazine: {
    key: 'magazine',
    label: '杂志首篇',
    hint: '首篇大图 + 其余报刊式细排',
    gapScope: 'none',
    thumb: 'hero-plus',
  },
  grid: {
    key: 'grid',
    label: '双列网格',
    hint: '两列并排，适合短内容',
    gapScope: 'item',
    thumb: 'grid-2col',
  },
  editorial: {
    key: 'editorial',
    label: '报刊细排',
    hint: '无图纯文字，标题加粗分级',
    gapScope: 'item',
    thumb: 'news-column',
  },
}

/** 供 v-for / el-option 用的有序数组（顺序即 UI 顺序） */
export const ARTICLE_LAYOUT_LIST: ArticleLayoutMeta[] = ARTICLE_LIST_LAYOUTS.map(
  (k) => ARTICLE_LAYOUT_META[k],
)

export function resolveArticleLayout(raw: unknown, fallback: ArticleListLayout = 'list'): ArticleListLayout {
  const value = String(raw || '')
  return (ARTICLE_LIST_LAYOUTS as readonly string[]).includes(value)
    ? (value as ArticleListLayout)
    : fallback
}

/** 取布局元数据；未知布局回落 list 的元数据，绝不返回 undefined */
export function layoutMetaOf(raw: unknown): ArticleLayoutMeta {
  return ARTICLE_LAYOUT_META[resolveArticleLayout(raw)]
}

/**
 * `item_gap` 字段在此布局下该显示什么 label。
 *
 * 需求原案是统一叫「条目间距」，但 卡片/封面沉浸 两种布局的间距实际是「块与块的分隔」，
 * 用同一条文案会让运营以为控制的是条目内的行距。按布局给准确语义。
 */
export function gapLabelOf(raw: unknown): { label: string; hint: string } {
  const meta = layoutMetaOf(raw)
  if (meta.gapScope === 'block') {
    return { label: '卡片间距', hint: '单位 px，控制两张卡片之间的空隙' }
  }
  return { label: '条目间距', hint: '单位 px，控制每篇文章之间的空隙' }
}

export function articleCardModifier(layout: ArticleListLayout, index: number): string {
  if (layout === 'magazine') return index === 0 ? 'overlay' : 'editorial'
  return layout
}
