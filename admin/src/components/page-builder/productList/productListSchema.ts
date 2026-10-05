/**
 * components/page-builder/productList/productListSchema.ts
 * 商品列表（ProductList）Props 的**唯一真相源**。
 *
 * 为什么要有这个文件（沿用 banner / search / categoryNav / coupon / flashSale 的口径）：
 *   旧 `ProductListProps.vue` 是一张 260 行的平铺 `el-form`，把**内容语义**（选哪些商品）
 *   与**纯样式**（布局/圆角/间距/字号/加粗）混在同一层，导致：
 *     - 运营改一个圆角要滚过 12 个数据源字段；
 *     - 样式字段散在表单中间，视觉上像是「商品筛选的一部分」；
 *   同时 `ProductListRenderer.vue` 819 行里**又自己算了一遍**布局/圆角/间距的默认值与兜底。
 *   现在统一从本文件取：
 *     - PRODUCT_LIST_DEFAULT_PROPS  默认值
 *     - normalizeProductListProps()  归一化 + 边界夹紧（**幂等纯函数**）
 *     - PRODUCT_LIST_PROPS_SCHEMA    JSON Schema（对外契约说明）
 *
 * 🔴 向后兼容铁律（已发布的小程序不能被新后台改坏）：
 *   1. 旧 `layout`（grid/list/waterfall）与新 `layout_mode`（grid/row/waterfall/scroll）**都认**；
 *      新增 `scroll`（横向滑动），旧三值映射后**观感与跳转行为不变**：
 *        grid→grid、list→row（横向单列）、waterfall→waterfall
 *   2. 旧 `display_mode`（fixed/stream）继续作为分页策略；
 *   3. 旧 `zero_price_display`（amount/free）继续认；新增的展示要素开关缺省值与旧字段**一致**
 *      （show_price/show_sales/show_original_price 缺省 true，show_title 缺省 true）；
 *   4. 旧 `item_border_radius` / `image_border_radius` / `item_gap` / `title_font_size` /
 *      `price_font_size` / `sales_font_size` / `title_bold` **键名全部保留**
 *      —— 只是从「内容」面板搬到「样式」面板，**DSL 不变，老页面零影响**。
 *   5. 旧 `section_*` 系列（渲染器已实现但模板未用）保留，不删。
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 布局模式（新增 scroll 横向滑动） */
export type ProductListLayout = 'grid' | 'row' | 'waterfall' | 'scroll'

/** 卡片风格 */
export type ProductCardStyle = 'shadow' | 'outline' | 'flat'

/** 展示要素 */
export type DisplayElement = 'title' | 'originalPrice' | 'sales' | 'freeBadge' | 'badge'

/** CTA 按钮形态 */
export type ProductCta = 'none' | 'cart' | 'buy' | 'consult' | 'custom'

/** 选取方式 */
export type PickMode = 'rule' | 'manual'

/** 分页策略 */
export type ProductPageStrategy = 'fixed' | 'stream'

/** 角标模式 */
export type ProductBadgeMode = 'none' | 'autoDiscount' | 'hot' | 'custom'

export interface ProductListProps {
  /* 内置标题行 */
  show_title: boolean
  title: string
  subtitle: string
  show_more: boolean
  more_text: string
  more_link: string

  /* 展示要素 */
  show_title_in_card: boolean
  show_original_price: boolean
  show_sales: boolean
  /** 0 元商品展示为「免费领取」 */
  zero_price_display: 'amount' | 'free'
  show_rating: boolean
  badge_mode: ProductBadgeMode
  badge_text: string

  /* CTA 按钮 */
  cta: ProductCta
  cta_text: string

  /* 数据源 */
  pick_mode: PickMode
  manual_ids: string[]
  /** 分页策略 */
  page_strategy: ProductPageStrategy
  limit: number
  page_size: number

  /* 样式：布局 */
  layout: ProductListLayout
  /** grid 模式列数（2 / 3）；row / waterfall / scroll 忽略 */
  columns: number

  /* 样式：度量 */
  item_gap: number
  item_border_radius: number
  image_border_radius: number

  /* 样式：排版 */
  title_font_size: number
  price_font_size: number
  sales_font_size: number
  title_bold: boolean

  /* 样式：色彩与卡片 */
  price_color: string
  card_style: ProductCardStyle
}

/* ------------------------------------------------------------------ */
/* 常量：区间与选项                                                     */
/* ------------------------------------------------------------------ */

export const PRODUCT_LIST_LIMIT = { min: 1, max: 20, step: 1, fallback: 4 } as const
export const PRODUCT_LIST_PAGE_SIZE = { min: 5, max: 30, step: 5, fallback: 10 } as const
export const PRODUCT_LIST_GAP = { min: 0, max: 24, step: 1, fallback: 8 } as const
export const PRODUCT_LIST_CARD_RADIUS = { min: 0, max: 24, step: 1, fallback: 12 } as const
export const PRODUCT_LIST_IMAGE_RADIUS = { min: 0, max: 24, step: 1, fallback: 0 } as const
export const PRODUCT_LIST_TITLE_SIZE = { min: 10, max: 22, step: 1, fallback: 14 } as const
export const PRODUCT_LIST_PRICE_SIZE = { min: 10, max: 28, step: 1, fallback: 13 } as const
export const PRODUCT_LIST_SALES_SIZE = { min: 9, max: 16, step: 1, fallback: 11 } as const
/** 手动选品上限 */
export const PRODUCT_LIST_MANUAL_MAX = 30

export const PRODUCT_LIST_LAYOUT_OPTIONS: Array<{
  value: ProductListLayout
  label: string
  desc: string
  /** 该布局是否忽略「列数」 */
  ignoreColumns?: boolean
}> = [
  { value: 'grid', label: '宫格网格', desc: '两列/三列并排，常规商城位' },
  { value: 'row', label: '横向单列', desc: '一行一个，横向大卡' },
  { value: 'waterfall', label: '双列瀑布流', desc: '两列错落，弱化网格感' },
  { value: 'scroll', label: '横向滑动', desc: '一行放不下时左右滑' },
]

export const PRODUCT_LIST_COLUMN_OPTIONS = [
  { value: 2, label: '双列' },
  { value: 3, label: '三列' },
]

export const PRODUCT_LIST_CARD_STYLE_OPTIONS: Array<{ value: ProductCardStyle; label: string; desc: string }> = [
  { value: 'shadow', label: '白卡投影', desc: '纯白卡片 + 轻微投影' },
  { value: 'outline', label: '描边卡片', desc: '无底色，只有细边框' },
  { value: 'flat', label: '无底平铺', desc: '完全融入页面底色' },
]

/** 展示要素（多选 Tag）。缺省勾选项与旧字段默认值一致 */
export const PRODUCT_DISPLAY_ELEMENTS: Array<{ value: DisplayElement; label: string; hint: string }> = [
  { value: 'title', label: '商品标题', hint: '卡片内的商品名称' },
  { value: 'originalPrice', label: '划线原价', hint: '自动调取系统原价' },
  { value: 'sales', label: '销量', hint: '已售 N；0 元商品显示「已领 N」' },
  { value: 'freeBadge', label: '免费领取', hint: '0 元商品价格位显示「免费领取」' },
  { value: 'badge', label: '运营角标', hint: '折扣 / HOT / 自定义' },
]

/** 缺省开启的展示要素（与旧 show_price/show_sales 缺省 true 对齐） */
export const PRODUCT_DISPLAY_DEFAULT: DisplayElement[] = ['title', 'originalPrice', 'sales', 'freeBadge']

export const PRODUCT_CTA_OPTIONS: Array<{ value: ProductCta; label: string }> = [
  { value: 'none', label: '不显示' },
  { value: 'cart', label: '购物车图标' },
  { value: 'buy', label: '「去购买」胶囊' },
  { value: 'consult', label: '「立即咨询」按钮' },
  { value: 'custom', label: '自定义文案' },
]

export const PRODUCT_PICK_MODE_OPTIONS: Array<{ value: PickMode; label: string; desc: string }> = [
  { value: 'rule', label: '按规则筛选', desc: '分类 / 类型 / 排序 / 价格区间' },
  { value: 'manual', label: '手动添加商品', desc: '自己挑，可拖拽排序' },
]

export const PRODUCT_PAGE_STRATEGY_OPTIONS: Array<{ value: ProductPageStrategy; label: string; desc: string }> = [
  { value: 'fixed', label: '固定数量', desc: '只展示指定件数' },
  { value: 'stream', label: '瀑布流触底', desc: '滑到底自动加载下一批' },
]

export const PRODUCT_BADGE_MODE_OPTIONS: Array<{ value: ProductBadgeMode; label: string; desc: string }> = [
  { value: 'none', label: '无角标', desc: '不显示' },
  { value: 'autoDiscount', label: '自动折扣率', desc: '按售价/原价算，如「5折」' },
  { value: 'hot', label: 'HOT', desc: '固定热销标记' },
  { value: 'custom', label: '自定义', desc: '最多 4 字' },
]

/* ------------------------------------------------------------------ */
/* 默认值                                                              */
/* ------------------------------------------------------------------ */

export const PRODUCT_LIST_DEFAULT_PROPS: ProductListProps = {
  show_title: true,
  title: '热门推荐',
  subtitle: '',
  // 旧默认值是 show_more !== false（即缺省 true），保住在先
  show_more: true,
  more_text: '查看更多',
  more_link: '',

  show_title_in_card: true,
  show_original_price: true,
  show_sales: true,
  zero_price_display: 'free',
  show_rating: false,
  badge_mode: 'none',
  badge_text: '',

  cta: 'none',
  cta_text: '',

  pick_mode: 'rule',
  manual_ids: [],
  page_strategy: 'fixed',
  limit: PRODUCT_LIST_LIMIT.fallback,
  page_size: PRODUCT_LIST_PAGE_SIZE.fallback,

  layout: 'grid',
  columns: 2,

  item_gap: PRODUCT_LIST_GAP.fallback,
  item_border_radius: PRODUCT_LIST_CARD_RADIUS.fallback,
  image_border_radius: PRODUCT_LIST_IMAGE_RADIUS.fallback,

  title_font_size: PRODUCT_LIST_TITLE_SIZE.fallback,
  price_font_size: PRODUCT_LIST_PRICE_SIZE.fallback,
  sales_font_size: PRODUCT_LIST_SALES_SIZE.fallback,
  title_bold: true,

  price_color: '#E53935',
  card_style: 'shadow',
}

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

function pickString<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

function clampNumber(value: unknown, min: number, max: number, step = 1, fallback: number = min): number {
  // 🔴 先判空再 Number()：Number('')/Number(null) 都是 0 且有限，
  // 直接夹紧会把「运营清空了输入框」变成最小值。
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string' && value.trim() === '') return fallback
  if (Array.isArray(value) && value.length === 0) return fallback
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  const clamped = Math.min(max, Math.max(min, n))
  const snapped = Math.round(clamped / step) * step
  return Math.min(max, Math.max(min, snapped))
}

/**
 * 归一化布局。
 *
 * 🔴 旧值映射（观感不变）：
 *   grid      → grid
 *   list      → row（横向单列；旧 list 就是一行一个 + 大圆角 + 评分）
 *   waterfall → waterfall（旧实现强制 2 列）
 *   scroll    → scroll（新布局）
 * 另：旧数据常写 `layout: 'grid' + columns: 1`，那是单列宫格 —— 归一化到 row
 * 更符合「横向单列」的语义，但**列数仍按grid 存**，避免老页面突然变形。
 */
export function normalizeProductLayout(rawLayout: unknown, rawColumns: unknown): ProductListLayout {
  const layout = String(rawLayout ?? '').trim()
  if (layout === 'scroll') return 'scroll'
  if (layout === 'row') return 'row'
  if (layout === 'waterfall') return 'waterfall'
  if (layout === 'grid') return 'grid'
  if (layout === 'list') return 'row'
  // 旧默认 'grid'；layout 为空且 columns=1 时按横向单列处理
  if (!layout && Number(rawColumns) === 1) return 'row'
  return 'grid'
}

/** 该布局是否忽略「列数」（列数由布局固定） */
export function layoutIgnoresColumns(layout: ProductListLayout): boolean {
  return layout !== 'grid'
}

/** 布局实际渲染列数 */
export function resolveColumnCount(layout: ProductListLayout, columns: number): number {
  if (layout === 'row') return 1
  if (layout === 'waterfall') return 2
  if (layout === 'scroll') return 2
  return columns === 3 ? 3 : 2
}

/** 归一化展示要素：与旧开关字段双向同步（哪个是源都行） */
export function normalizeDisplayElements(p: Record<string, any>): DisplayElement[] {
  const valid = PRODUCT_DISPLAY_ELEMENTS.map((o) => o.value)
  const out: DisplayElement[] = []

  // 新字段 display_elements 优先
  const rawList = Array.isArray(p.display_elements) ? p.display_elements : null
  if (rawList) {
    for (const item of rawList) {
      const key = String(item || '') as DisplayElement
      if (valid.includes(key) && !out.includes(key)) out.push(key)
    }
    return out
  }

  // 旧字段推导：show_title_in_card ← title_bold 之外的 show_card_title
  if (p.show_card_title !== false) out.push('title')
  if (p.show_original_price !== false) out.push('originalPrice')
  if (p.show_sales !== false) out.push('sales')
  if (p.zero_price_display === 'free') out.push('freeBadge')
  if (p.badge_mode && p.badge_mode !== 'none') out.push('badge')
  return out
}

/**
 * 归一化整个 props。**纯函数**：不改传入对象，返回全新对象。
 */
export function normalizeProductListProps(raw: Record<string, any> | undefined | null): ProductListProps {
  const p = raw && typeof raw === 'object' ? raw : {}

  const layout = normalizeProductLayout(p.layout ?? p.layout_mode, p.columns)
  const elements = normalizeDisplayElements(p)

  // 旧 product_ids 与新 manual_ids 双向兼容
  const rawIds = Array.isArray(p.manual_ids) && p.manual_ids.length
    ? p.manual_ids
    : (Array.isArray(p.product_ids)
        ? p.product_ids
        : (() => {
            const ds = p.data_source || {}
            const fromDs = ds.params?.ids ?? ds.query?.ids
            if (Array.isArray(fromDs)) return fromDs
            if (typeof fromDs === 'string' && fromDs.trim()) return fromDs.split(',')
            return []
          })())
  const manualIds: string[] = []
  for (const id of rawIds as any[]) {
    const key = String(id ?? '').trim()
    if (!key || manualIds.includes(key)) continue
    manualIds.push(key)
    if (manualIds.length >= PRODUCT_LIST_MANUAL_MAX) break
  }

  // 旧 source_mode='manual' 与新 pick_mode 双向
  const pickMode: PickMode = (p.pick_mode === 'manual' || p.source_mode === 'manual')
    ? 'manual'
    : 'rule'

  // 旧 display_mode='stream' 与新 page_strategy 双向
  const pageStrategy: ProductPageStrategy = (p.page_strategy === 'stream' || p.display_mode === 'stream')
    ? 'stream'
    : 'fixed'

  const badgeMode = pickString(
    p.badge_mode,
    ['none', 'autoDiscount', 'hot', 'custom'] as const,
    'none',
  )

  return {
    show_title: p.show_title === undefined ? true : !!p.show_title,
    title: String(p.title ?? PRODUCT_LIST_DEFAULT_PROPS.title),
    subtitle: String(p.subtitle ?? ''),
    // 旧语义 show_more !== false —— 缺省 true，别让老页面标题栏的「更多」凭空消失
    show_more: p.show_more === undefined ? true : p.show_more !== false,
    more_text: String(p.more_text || '查看更多').slice(0, 8),
    more_link: String(p.more_link || '').trim(),

    show_title_in_card: elements.includes('title'),
    show_original_price: elements.includes('originalPrice'),
    show_sales: elements.includes('sales'),
    zero_price_display: p.zero_price_display === 'amount' ? 'amount' : 'free',
    show_rating: p.show_rating === true,
    badge_mode: badgeMode,
    badge_text: String(p.badge_text || '').slice(0, 4),

    cta: pickString(p.cta, ['none', 'cart', 'buy', 'consult', 'custom'] as const, 'none'),
    cta_text: String(p.cta_text || '').slice(0, 6),

    pick_mode: pickMode,
    manual_ids: manualIds,
    page_strategy: pageStrategy,
    limit: clampNumber(p.limit, PRODUCT_LIST_LIMIT.min, PRODUCT_LIST_LIMIT.max, PRODUCT_LIST_LIMIT.step, PRODUCT_LIST_LIMIT.fallback),
    page_size: clampNumber(p.page_size, PRODUCT_LIST_PAGE_SIZE.min, PRODUCT_LIST_PAGE_SIZE.max, PRODUCT_LIST_PAGE_SIZE.step, PRODUCT_LIST_PAGE_SIZE.fallback),

    layout,
    columns: Number(p.columns) === 3 ? 3 : 2,

    // ⚠️ 三个度量字段的缺省值**随布局走**（与旧渲染器一致）：
    //   row    → gap 10 / 圆角 14 / 图片圆角 10
    //   其它   → gap 8  / 圆角 12 / 图片圆角 0
    // 写死统一值会让老页面升级后外观突变。
    item_gap: clampNumber(
      p.item_gap,
      PRODUCT_LIST_GAP.min, PRODUCT_LIST_GAP.max, 1,
      layout === 'row' ? 10 : PRODUCT_LIST_GAP.fallback,
    ),
    item_border_radius: clampNumber(
      p.item_border_radius,
      PRODUCT_LIST_CARD_RADIUS.min, PRODUCT_LIST_CARD_RADIUS.max, 1,
      layout === 'row' ? 14 : PRODUCT_LIST_CARD_RADIUS.fallback,
    ),
    image_border_radius: clampNumber(
      p.image_border_radius,
      PRODUCT_LIST_IMAGE_RADIUS.min, PRODUCT_LIST_IMAGE_RADIUS.max, 1,
      layout === 'row' ? 10 : PRODUCT_LIST_IMAGE_RADIUS.fallback,
    ),

    title_font_size: clampNumber(p.title_font_size, PRODUCT_LIST_TITLE_SIZE.min, PRODUCT_LIST_TITLE_SIZE.max, 1, PRODUCT_LIST_TITLE_SIZE.fallback),
    price_font_size: clampNumber(
      p.price_font_size ?? p.subtitle_font_size,
      PRODUCT_LIST_PRICE_SIZE.min, PRODUCT_LIST_PRICE_SIZE.max, 1,
      layout === 'row' ? 16 : PRODUCT_LIST_PRICE_SIZE.fallback,
    ),
    sales_font_size: clampNumber(
      p.sales_font_size ?? p.subtitle_font_size,
      PRODUCT_LIST_SALES_SIZE.min, PRODUCT_LIST_SALES_SIZE.max, 1,
      PRODUCT_LIST_SALES_SIZE.fallback,
    ),
    title_bold: p.title_bold === undefined ? true : p.title_bold !== false,

    price_color: String(p.price_color || PRODUCT_LIST_DEFAULT_PROPS.price_color),
    card_style: pickString(p.card_style, ['shadow', 'outline', 'flat'] as const, 'shadow'),
  }
}

/* ------------------------------------------------------------------ */
/* 展示辅助                */
/* ------------------------------------------------------------------ */

/** 卡片背景与描边（供画布/端上共用，避免两边各算一套） */
export function resolveCardSurface(style: ProductCardStyle, radius: number): {
  background: string
  border: string
  boxShadow: string
  borderRadius: string
} {
  const base = { borderRadius: `${radius}px` }
  if (style === 'outline') {
    return { ...base, background: 'transparent', border: '1px solid #E8E2D9', boxShadow: 'none' }
  }
  if (style === 'flat') {
    return { ...base, background: 'transparent', border: 'none', boxShadow: 'none' }
  }
  return { ...base, background: '#FFFFFF', border: 'none', boxShadow: '0 4px 12px rgba(28, 43, 76, 0.06)' }
}

/** CTA 默认文案（未配自定义时） */
export function resolveCtaText(cta: ProductCta, custom: string): string {
  if (cta === 'buy') return '去购买'
  if (cta === 'consult') return '立即咨询'
  if (cta === 'custom') return custom || '咨询'
  return ''
}

/**
 * 角标文本。
 * autoDiscount：售价/原价 = 折扣；任一缺失或 price >= original 返回空串（不能显示「0折」）。
 */
export function resolveProductBadge(
  mode: ProductBadgeMode,
  customText: string,
  price: number,
  originalPrice: number,
): string {
  if (mode === 'none') return ''
  if (mode === 'hot') return 'HOT'
  if (mode === 'custom') return (customText || '').trim()
  if (!Number.isFinite(price) || !Number.isFinite(originalPrice)) return ''
  if (price <= 0 || originalPrice <= 0) return ''
  if (price >= originalPrice) return ''
  const zhe = (price / originalPrice) * 10
  const rounded = Math.round(zhe * 10) / 10
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}折`
}

/* ------------------------------------------------------------------ */
/* JSON Schema（对外契约说明 / 校验用）                                */
/* ------------------------------------------------------------------ */

export const PRODUCT_LIST_PROPS_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://zfculture.site/schemas/product-list-props.json',
  title: 'ProductListProps（商品列表组件配置）',
  type: 'object',
  additionalProperties: true,
  properties: {
    show_title: { type: 'boolean', default: true },
    title: { type: 'string', default: PRODUCT_LIST_DEFAULT_PROPS.title },
    subtitle: { type: 'string', default: '' },
    show_more: { type: 'boolean', default: true },
    more_text: { type: 'string', default: '查看更多', maxLength: 8 },
    more_link: { type: 'string', default: '' },

    display_elements: {
      type: 'array',
      description: '展示要素；旧开关字段（show_price/show_sales/...）仍被识别',
      items: { type: 'string', enum: PRODUCT_DISPLAY_ELEMENTS.map((o) => o.value) },
      default: PRODUCT_DISPLAY_DEFAULT,
    },
    zero_price_display: { type: 'string', enum: ['amount', 'free'], default: 'free' },
    show_rating: { type: 'boolean', default: false },
    badge_mode: { type: 'string', enum: ['none', 'autoDiscount', 'hot', 'custom'], default: 'none' },
    badge_text: { type: 'string', maxLength: 4 },

    cta: { type: 'string', enum: ['none', 'cart', 'buy', 'consult', 'custom'], default: 'none' },
    cta_text: { type: 'string', maxLength: 6 },

    pick_mode: { type: 'string', enum: ['rule', 'manual'], default: 'rule' },
    manual_ids: { type: 'array', maxItems: PRODUCT_LIST_MANUAL_MAX, items: { type: 'string' } },
    product_ids: { type: 'array', description: '旧字段，与 manual_ids 双向兼容' },
    page_strategy: { type: 'string', enum: ['fixed', 'stream'], default: 'fixed' },
    display_mode: { type: 'string', description: '旧字段：fixed / stream' },
    limit: { type: 'number', minimum: PRODUCT_LIST_LIMIT.min, maximum: PRODUCT_LIST_LIMIT.max, default: 4 },
    page_size: { type: 'number', minimum: PRODUCT_LIST_PAGE_SIZE.min, maximum: PRODUCT_LIST_PAGE_SIZE.max, default: 10 },

    layout: { type: 'string', enum: ['grid', 'row', 'waterfall', 'scroll'], default: 'grid' },
    layout_mode: { type: 'string', description: '旧/别名字段' },
    columns: { type: 'number', enum: [2, 3], default: 2 },

    item_gap: { type: 'number', minimum: 0, maximum: 24, default: 8 },
    item_border_radius: { type: 'number', minimum: 0, maximum: 24, default: 12 },
    image_border_radius: { type: 'number', minimum: 0, maximum: 24, default: 0 },

    title_font_size: { type: 'number', minimum: 10, maximum: 22, default: 14 },
    price_font_size: { type: 'number', minimum: 10, maximum: 28, default: 13 },
    sales_font_size: { type: 'number', minimum: 9, maximum: 16, default: 11 },
    subtitle_font_size: { type: 'number', description: '旧字段：价格/已售字号的别名' },
    title_bold: { type: 'boolean', default: true },

    price_color: { type: 'string', default: PRODUCT_LIST_DEFAULT_PROPS.price_color },
    card_style: { type: 'string', enum: ['shadow', 'outline', 'flat'], default: 'shadow' },
  },
} as const