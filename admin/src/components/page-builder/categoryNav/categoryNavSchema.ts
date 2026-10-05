/**
 * components/page-builder/categoryNav/categoryNavSchema.ts
 * 分类导航（CategoryNav）Props 的**唯一真相源**。
 *
 * 为什么要有这个文件（沿用 bannerSchema.ts / searchSchema.ts 的口径）：
 *   属性面板、画布渲染、小程序端三处都要读同一批配置。以前面板与画布各写一份
 *   默认值与合法值列表，出现过「面板能选 pill、画布不认」这类漂移。
 *   现在统一从本文件取：
 *     - CATEGORY_NAV_DEFAULT_PROPS  默认值
 *     - normalizeCategoryNavProps() 归一化 + 边界夹紧（**幂等纯函数**）
 *     - CATEGORY_NAV_PROPS_SCHEMA    JSON Schema（对外契约说明）
 *
 * 🔴 向后兼容铁律（已发布的小程序不能被新后台改坏）：
 *   1. 旧 `layout` 值全认：`grid`（无列数后缀）等价 grid-3、`grid-4`、`scroll`、
 *      `pill`、`list` —— 全部映射到新枚举且**跳转/外观行为不变**；
 *   2. 旧 `items[].icon` 兼容三种写法：图片路径、emoji、http(s) 绝对地址；
 *   3. 旧 `items[].title` 与 `items[].name` 都认（端上历史上写过 name）；
 *   4. 旧 `icon_style`：`plain` / `circle` / `square` 三值原样保留，
 *      新增 `none`（无背景原图），**`plain` 不再等同于 none**（见 normalize说明）。
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/**
 * 布局模式。
 * grid    固定网格（列数由 columns 决定）
 * scroll  单行横滑
 * paged   双行分页滑动（每页 page_size 项 + 底部指示条）
 *
 * ⚠️ 旧值 `pill`（胶囊，隐藏图标）与 `list`（竖列表）在新版被并掉：
 *   胶囊形态 = grid + icon_shape:none 的近似；竖列表 = grid columns:2。
 *   归一化时它们分别映射到 grid（列数按旧观感推），**不是删功能而是合并表述**。
 */
export type CategoryNavLayout = 'grid' | 'scroll' | 'paged'

/** 图标形状 */
export type CategoryNavIconShape = 'circle' | 'round' | 'square' | 'none'

/** 模块背景 */
export type CategoryNavSurface = 'transparent' | 'card'

/** 角标预设色 */
export type CategoryNavBadgeTone = 'red' | 'orange' | 'blue' | 'custom'

/** 单个分类项 */
export interface CategoryNavItem {
  /** 稳定唯一 id：拖拽排序 / 折叠态 key 靠它，不能用 index */
  id?: string
  /** 图标：图片 URL 或 emoji 字符（两者由 isImageIcon 判别） */
  icon?: string
  /** 分类名（≤6 字） */
  title?: string
  /** 副标题/描述（≤6 字）；为空则画布只显示单行标题 */
  subtitle?: string
  /** 落地链接 */
  link_url?: string
  /** 链接类型（与 LinkPickerField 的枚举一致，供面板回显） */
  link_type?: string
  /** 角标文本（≤4 字符，如 HOT/NEW）；为空 = 不显示 */
  badge?: string
  /** 角标预设色 */
  badge_tone?: CategoryNavBadgeTone
  /** 角标自定义色（badge_tone=custom 时生效） */
  badge_color?: string
}

export interface CategoryNavProps {
  /** 模块标题 */
  title: string
  /** 标题是否显示；false 时画布/端上不渲染标题行 */
  show_title: boolean

  /* 布局 */
  layout: CategoryNavLayout
  /** grid 模式列数 3/4/5（其它值夹到最近档） */
  columns: number
  /** paged 模式每页项数8 或 10 */
  page_size: number

  /* 列表 */
  items: CategoryNavItem[]

  /* 样式 */
  icon_shape: CategoryNavIconShape
  title_color: string
  subtitle_color: string
  subtitle_size: number
  surface: CategoryNavSurface
}

/* ------------------------------------------------------------------ */
/* 常量：区间与选项                                                     */
/* ------------------------------------------------------------------ */

export const CATEGORY_NAV_TITLE_MAX_LEN = 6
export const CATEGORY_NAV_SUBTITLE_MAX_LEN = 6
export const CATEGORY_NAV_BADGE_MAX_LEN = 4
/** 分类项上限（超过画布一屏放不下，运营也用不到） */
export const CATEGORY_NAV_MAX_ITEMS = 20
/** paged 模式每页项数合法档 */
export const CATEGORY_NAV_PAGE_SIZES = [8, 10] as const
/** grid 模式列数合法档 */
export const CATEGORY_NAV_COLUMNS = [3, 4, 5] as const

export const CATEGORY_NAV_SUBTITLE_SIZE = { min: 9, max: 13, step: 1, fallback: 10 } as const

export const CATEGORY_NAV_LAYOUT_OPTIONS: Array<{
  value: CategoryNavLayout
  label: string
  desc: string
}> = [
  { value: 'grid', label: '固定网格', desc: '规整排布，不滑动' },
  { value: 'scroll', label: '单行横滑', desc: '一行放不下时左右滑' },
  { value: 'paged', label: '双行分页', desc: '每页两行，底部分页条' },
]

export const CATEGORY_NAV_ICON_SHAPE_OPTIONS: Array<{
  value: CategoryNavIconShape
  label: string
  radius: number
}> = [
  { value: 'circle', label: '圆形', radius: 999 },
  { value: 'round', label: '圆角矩形', radius: 8 },
  { value: 'square', label: '直角', radius: 0 },
  { value: 'none', label: '无背景', radius: 0 },
]

export const CATEGORY_NAV_SURFACE_OPTIONS: Array<{ value: CategoryNavSurface; label: string; desc: string }> = [
  { value: 'transparent', label: '通栏透明', desc: '跟随页面底色，视觉更轻' },
  { value: 'card', label: '白色卡片', desc: '圆角 + 投影，与其它模块分层' },
]

export const CATEGORY_NAV_BADGE_TONES: Array<{ value: CategoryNavBadgeTone; label: string; color: string }> = [
  { value: 'red', label: '红', color: '#E85D6C' },
  { value: 'orange', label: '橙', color: '#F2762A' },
  { value: 'blue', label: '蓝', color: '#4F6DFF' },
  { value: 'custom', label: '自定义', color: '' },
]

/* ------------------------------------------------------------------ */
/* 默认值                                                              */
/* ------------------------------------------------------------------ */

export const CATEGORY_NAV_DEFAULT_PROPS: CategoryNavProps = {
  title: '快捷分类',
  show_title: true,

  layout: 'grid',
  columns: 4,
  page_size: 8,

  items: [],

  icon_shape: 'circle',
  title_color: '#475569',
  subtitle_color: '#94A3B8',
  subtitle_size: 10,
  surface: 'transparent',
}

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

let idSeed = 0
export function categoryNavItemId(): string {
  idSeed += 1
  return `cnav_${idSeed.toString(36)}`
}

function pickString<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

/** 按 Unicode 码点裁剪（避免把 emoji 劈成半个） */
export function clipByCodePoint(text: string, max: number): string {
  const chars = [...text]
  return chars.length > max ? chars.slice(0, max).join('') : text
}

/** 图片类图标判别：URL/相对路径/内联图= 图片；其余（emoji、短词）按字符渲染 */
export function isImageIcon(icon?: string): boolean {
  const s = (icon || '').trim()
  if (!s) return false
  return /^(https?:\/\/|\/|data:image|\.\/|\.\.\/)/i.test(s)
}

/**
 * 归一化 layout。
 *
 * 🔴 旧值映射（外观与跳转行为都不变）：
 *   `grid`（旧面板默认，无列数后缀）→ grid，且 columns 缺省按旧面板默认 **4**
 *   `grid-2` → grid + columns=2
 *   `grid-3` → grid + columns=3
 *   `grid-4` → grid + columns=4
 *   `scroll` → scroll
 *   `pill`  → grid（胶囊 = 隐藏图标的网格，用 icon_shape:none 表达）
 *   `list`  → grid + columns=2（竖列表在窄列下就是两列网格）
 */
export function normalizeCategoryNavLayout(
  rawLayout: unknown,
  rawColumns: unknown,
): { layout: CategoryNavLayout; columns: number; fromLegacy: boolean } {
  const layout = String(rawLayout ?? '').trim()
  const rawCol = Number(rawColumns)

  const resolveCol = (fallback: number): number => {
    if (!Number.isFinite(rawCol)) return fallback
    // 夹到最近档（2 → 3，6 → 5）
    let best: number = CATEGORY_NAV_COLUMNS[0]
    let bestDist = Infinity
    for (const c of CATEGORY_NAV_COLUMNS) {
      const d = Math.abs(c - rawCol)
      if (d < bestDist) {
        bestDist = d
        best = c
      }
    }
    return best
  }

  if (layout === 'scroll') return { layout: 'scroll', columns: resolveCol(4), fromLegacy: false }
  if (layout === 'paged') return { layout: 'paged', columns: 4, fromLegacy: false }

  if (layout === 'pill') return { layout: 'grid', columns: resolveCol(4), fromLegacy: true }
  if (layout === 'list') return { layout: 'grid', columns: 2, fromLegacy: true }

  if (layout.startsWith('grid-')) {
    const n = Number(layout.slice(5))
    return { layout: 'grid', columns: resolveCol(Number.isFinite(n) && n > 0 ? n : 4), fromLegacy: true }
  }

  // 旧 'grid' / 空 / 非法值：columns 缺省给 4（旧面板默认值），保住老页面观感
  return { layout: 'grid', columns: resolveCol(4), fromLegacy: true }
}

/** paged 每页项数只认 8 / 10 */
export function normalizePageSize(raw: unknown): number {
  const n = Number(raw)
  return CATEGORY_NAV_PAGE_SIZES.includes(n as 8 | 10) ? n : 8
}

/** 归一化单个分类项 */
export function normalizeCategoryNavItem(raw: any): CategoryNavItem {
  const src = raw && typeof raw === 'object' ? raw : {}
  return {
    id: typeof src.id === 'string' && src.id ? src.id : categoryNavItemId(),
    icon: String(src.icon || '').trim(),
    //🔴 旧数据有写 name 的（端上历史上兼容过 name），两个都认
    title: clipByCodePoint(String(src.title || src.name || '').trim(), CATEGORY_NAV_TITLE_MAX_LEN),
    subtitle: clipByCodePoint(String(src.subtitle || src.desc || '').trim(), CATEGORY_NAV_SUBTITLE_MAX_LEN),
    link_url: String(src.link_url || src.url || '').trim(),
    link_type: String(src.link_type || (src.link_url || src.url ? 'page' : 'none')),
    badge: clipByCodePoint(String(src.badge || src.badge_text || '').trim(), CATEGORY_NAV_BADGE_MAX_LEN),
    badge_tone: pickString(src.badge_tone, ['red', 'orange', 'blue', 'custom'] as const, 'red'),
    badge_color: String(src.badge_color || ''),
  }
}

/** 归一化整个 props。**纯函数**：不改传入对象，返回全新对象 */
export function normalizeCategoryNavProps(raw: Record<string, any> | undefined | null): CategoryNavProps {
  const p = raw && typeof raw === 'object' ? raw : {}
  const rawList = Array.isArray(p.items) ? p.items : []

  const { layout, columns } = normalizeCategoryNavLayout(p.layout, p.columns)

  // icon_style 的旧值 plain/circle/square 原样保留；none 是新增的「无背景原图」
  const iconShape = pickString(
    p.icon_shape !== undefined ? p.icon_shape : p.icon_style,
    ['circle', 'round', 'square', 'none'] as const,
    'circle',
  )

  return {
    title: clipByCodePoint(String(p.title ?? CATEGORY_NAV_DEFAULT_PROPS.title).trim(), CATEGORY_NAV_TITLE_MAX_LEN * 2),
    // 旧页面没有 show_title 字段 → 默认 true，绝不能让老页面标题凭空消失
    show_title: p.show_title === undefined ? true : !!p.show_title,

    layout,
    columns,
    page_size: normalizePageSize(p.page_size),

    items: rawList.slice(0, CATEGORY_NAV_MAX_ITEMS).map(normalizeCategoryNavItem),

    icon_shape: iconShape,
    title_color: String(p.title_color || CATEGORY_NAV_DEFAULT_PROPS.title_color),
    subtitle_color: String(p.subtitle_color || CATEGORY_NAV_DEFAULT_PROPS.subtitle_color),
    subtitle_size: normalizeCategorySize(p.subtitle_size),
    surface: pickString(p.surface, ['transparent', 'card'] as const, 'transparent'),
  }
}

function normalizeCategorySize(raw: unknown): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return CATEGORY_NAV_SUBTITLE_SIZE.fallback
  return Math.min(
    CATEGORY_NAV_SUBTITLE_SIZE.max,
    Math.max(CATEGORY_NAV_SUBTITLE_SIZE.min, Math.round(n)),
  )
}

/** 图标容器圆角最终值（px）；none = 不给背景也不给圆角 */
export function resolveIconRadius(shape: CategoryNavIconShape): number {
  return CATEGORY_NAV_ICON_SHAPE_OPTIONS.find((o) => o.value === shape)?.radius ?? 999
}

/** 角标最终色 */
export function resolveBadgeColor(item: CategoryNavItem): string {
  if (item.badge_tone === 'custom') return item.badge_color || CATEGORY_NAV_BADGE_TONES[0].color
  return CATEGORY_NAV_BADGE_TONES.find((t) => t.value === item.badge_tone)?.color || CATEGORY_NAV_BADGE_TONES[0].color
}

/** paged 模式下的总页数（至少 1，避免指示条算出0 页） */
export function totalPages(itemCount: number, pageSize: number): number {
  if (itemCount <= 0) return 1
  return Math.max(1, Math.ceil(itemCount / Math.max(1, pageSize)))
}

/* ------------------------------------------------------------------ */
/* JSON Schema（对外契约说明 / 校验用）                                */
/* ------------------------------------------------------------------ */

export const CATEGORY_NAV_PROPS_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://zfculture.site/schemas/category-nav-props.json',
  title: 'CategoryNavProps（分类导航组件配置）',
  type: 'object',
  additionalProperties: true,
  properties: {
    title: { type: 'string', description: '模块标题' },
    show_title: { type: 'boolean', default: true, description: '关闭时画布/端上不渲染标题行' },

    layout: {
      type: 'string',
      enum: ['grid', 'scroll', 'paged'],
      default: 'grid',
      description: '布局模式；旧值 grid-2/grid-3/grid-4/pill/list 仍被识别',
    },
    columns: { type: 'number', enum: [3, 4, 5], default: 4, description: 'grid 模式列数' },
    page_size: { type: 'number', enum: [8, 10], default: 8, description: 'paged 模式每页项数' },

    items: {
      type: 'array',
      maxItems: CATEGORY_NAV_MAX_ITEMS,
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          icon: { type: 'string', description: '图片 URL 或 emoji 字符' },
          title: { type: 'string', maxLength: CATEGORY_NAV_TITLE_MAX_LEN },
          subtitle: { type: 'string', maxLength: CATEGORY_NAV_SUBTITLE_MAX_LEN },
          link_url: { type: 'string' },
          link_type: { type: 'string', description: '与 LinkPickerField 枚举一致，供面板回显' },
          badge: { type: 'string', maxLength: CATEGORY_NAV_BADGE_MAX_LEN },
          badge_tone: { type: 'string', enum: ['red', 'orange', 'blue', 'custom'], default: 'red' },
          badge_color: { type: 'string', description: 'badge_tone=custom 时生效' },
        },
        additionalProperties: true,
      },
    },

    icon_shape: { type: 'string', enum: ['circle', 'round', 'square', 'none'], default: 'circle' },
    title_color: { type: 'string', default: CATEGORY_NAV_DEFAULT_PROPS.title_color },
    subtitle_color: { type: 'string', default: CATEGORY_NAV_DEFAULT_PROPS.subtitle_color },
    subtitle_size: {
      type: 'number',
      minimum: CATEGORY_NAV_SUBTITLE_SIZE.min,
      maximum: CATEGORY_NAV_SUBTITLE_SIZE.max,
      default: CATEGORY_NAV_SUBTITLE_SIZE.fallback,
    },
    surface: { type: 'string', enum: ['transparent', 'card'], default: 'transparent' },
  },
} as const
