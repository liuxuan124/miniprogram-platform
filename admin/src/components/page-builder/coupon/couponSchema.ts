/**
 * components/page-builder/coupon/couponSchema.ts
 * 优惠券（Coupon）Props 的**唯一真相源**。
 *
 * 为什么要有这个文件（沿用 bannerSchema / searchSchema / categoryNavSchema 的口径）：
 *   属性面板、画布渲染、端上渲染三处都要读同一批配置。以前面板与画布各写一份
 *   默认值与合法值列表（画布的 `layout` 兜底甚至和面板的 `style_type` 不是同一个键），
 *   出现「面板改了画布不变」这类漂移。现在统一从本文件取：
 *     - COUPON_DEFAULT_PROPS   默认值
 *     - normalizeCouponProps() 归一化 + 边界夹紧（**幂等纯函数**）
 *     - COUPON_PROPS_SCHEMA    JSON Schema（对外契约说明）
 *
 * 🔴 向后兼容铁律（已发布的小程序不能被新后台改坏）：
 *   1. 旧 `style_type`（horizontal/vertical）与 `layout`（horizontal/vertical/stack）**两个键都认**；
 *      映射到新的 `layout`（scroll/grid/stack）后**观感尽量贴近原值**：
 *        horizontal → scroll（横向单行滑动）
 *        vertical→ stack（纵向平铺）
 *        stack     → stack
 *   2. 旧 `limit` 继续作为「展示数量」，新字段 `display_limit` 缺省时回落读它；
 *   3. 旧 `button_text` 继续作为「待领取文案」，新字段 `claim_text` 缺省时回落读它；
 *   4. 旧 `title_font_size` / `subtitle_font_size` **原样保留**（不迁字段名），
 *      只是从「内容面板」搬到「样式面板」—— 权责归位，DSL 不变，老页面零影响。
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 数据来源模式 */
export type CouponDataMode = 'auto' | 'manual'

/** 券类型筛选（对应 CouponRecord.type） */
export type CouponFilterType = 'newcomer' | 'all' | 'fixed' | 'percent'

/** 排序方式 */
export type CouponSort = 'amountDesc' | 'expiringSoon' | 'latest'

/** 排列布局 */
export type CouponLayout = 'scroll' | 'grid' | 'stack'

/** 票券风格 */
export type CouponTheme = 'tear' | 'punch' | 'rounded'

/** 手动自选模式下被选中的券（只存必要字段，详情在渲染时按 id 回查） */
export interface CouponPick {
  id: number
  /** 冗余存一份名称/面额：端上离线渲染与列表折叠态都要用，不必再发一次请求 */
  name?: string
  display_value?: string
  condition?: string
}

export interface CouponProps {
  /* 标题栏 */
  title: string
  /** 是否显示「查看更多」入口 */
  show_more: boolean
  more_text: string
  more_link: string

  /* 数据来源 */
  data_mode: CouponDataMode
  /** auto 模式：类型筛选（空 = 全部） */
  filter_types: CouponFilterType[]
  /** auto 模式：排序 */
  sort: CouponSort
  /** manual 模式：手动勾选的券（按数组顺序展示） */
  manual_items: CouponPick[]

  /* 展示数量 */
  display_limit: number

  /* 按钮状态文案 */
  claim_text: string
  use_text: string
  sold_out_text: string

  /* 异常兜底 */
  /** 无可用券时是否隐藏组件（默认 true：宁可页面少一块，不要留空壳） */
  auto_hide_when_empty: boolean

  /* 样式：布局与风格 */
  layout: CouponLayout
  theme: CouponTheme

  /* 样式：字号 */
  title_size: number
  amount_size: number
  desc_size: number

  /* 样式：色彩 */
  bg_color: string
  amount_color: string
  btn_color: string

  /* 样式：间距 */
  card_gap: number
  /** 组件上下内边距（px） */
  block_padding: number
}

/* ------------------------------------------------------------------ */
/* 常量：区间与选项                                                     */
/* ------------------------------------------------------------------ */

/** 展示数量区间 */
export const COUPON_LIMIT = { min: 1, max: 10, step: 1, fallback: 3 } as const
/** 手动选择券数量上限（超过画布放不下） */
export const COUPON_MANUAL_MAX = 20
/** 字号区间 */
export const COUPON_TITLE_SIZE = { min: 12, max: 24, step: 1, fallback: 15 } as const
export const COUPON_AMOUNT_SIZE = { min: 16, max: 36, step: 1, fallback: 24 } as const
export const COUPON_DESC_SIZE = { min: 9, max: 16, step: 1, fallback: 11 } as const
/** 间距区间 */
export const COUPON_GAP = { min: 4, max: 20, step: 1, fallback: 8 } as const
export const COUPON_PADDING = { min: 0, max: 24, step: 2, fallback: 8 } as const

export const COUPON_DATA_MODE_OPTIONS: Array<{ value: CouponDataMode; label: string; desc: string }> = [
  { value: 'auto', label: '自动读取', desc: '按筛选条件自动取已发布券' },
  { value: 'manual', label: '手动自选', desc: '自己挑几张券展示' },
]

export const COUPON_FILTER_OPTIONS: Array<{ value: CouponFilterType; label: string }> = [
  { value: 'newcomer', label: '新人券' },
  { value: 'all', label: '通用券' },
  { value: 'fixed', label: '满减券' },
  { value: 'percent', label: '折扣券' },
]

export const COUPON_SORT_OPTIONS: Array<{ value: CouponSort; label: string; desc: string }> = [
  { value: 'amountDesc', label: '面额从大到小', desc: '大额优先，促进领取' },
  { value: 'expiringSoon', label: '即将过期优先', desc: '临期提醒，减少过期浪费' },
  { value: 'latest', label: '最新发布', desc: '按发布时间倒序' },
]

export const COUPON_LAYOUT_OPTIONS: Array<{ value: CouponLayout; label: string; desc: string }> = [
  { value: 'scroll', label: '横向单行滑动', desc: '一行放不下时左右滑' },
  { value: 'grid', label: '双列网格', desc: '两列并排，垂直方向延伸' },
  { value: 'stack', label: '纵向平铺', desc: '一行一张，信息最完整' },
]

export const COUPON_THEME_OPTIONS: Array<{ value: CouponTheme; label: string; desc: string }> = [
  { value: 'tear', label: '经典锯齿撕边', desc: '票券感最强，适合营销' },
  { value: 'punch', label: '内凹打孔卡片', desc: '两侧半圆缺口，柔和' },
  { value: 'rounded', label: '极简圆角卡片', desc: '无装饰，最干净' },
]

/* ------------------------------------------------------------------ */
/* 默认值                                                              */
/* ------------------------------------------------------------------ */

export const COUPON_DEFAULT_PROPS: CouponProps = {
  title: '领券中心',
  show_more: false,
  more_text: '更多',
  more_link: '',

  data_mode: 'auto',
  filter_types: [],
  sort: 'amountDesc',
  manual_items: [],

  display_limit: COUPON_LIMIT.fallback,

  claim_text: '立即领取',
  use_text: '去使用',
  sold_out_text: '已抢光',

  auto_hide_when_empty: true,

  layout: 'scroll',
  theme: 'tear',

  title_size: COUPON_TITLE_SIZE.fallback,
  amount_size: COUPON_AMOUNT_SIZE.fallback,
  desc_size: COUPON_DESC_SIZE.fallback,

  bg_color: '#FFF5F5',
  amount_color: '#F56C6C',
  btn_color: '#F56C6C',

  card_gap: COUPON_GAP.fallback,
  block_padding: COUPON_PADDING.fallback,
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
 * 归一化排列布局。**同时认旧 `layout` 与更旧的 `style_type`**。
 *
 * 🔴 映射口径（观感贴近原值，不擅自改已上线页面的样子）：
 *   scroll / horizontal → scroll（横向单行）
 *   stack                → stack（纵向平铺）
 *   grid                 → grid
 *   vertical             → stack（旧「纵向」= 一行一张，与 stack 同义）
 *   旧 stack（画布曾认的第三值）→ stack
 */
export function normalizeCouponLayout(rawLayout: unknown, rawStyleType: unknown): CouponLayout {
  const layout = String(rawLayout ?? '').trim()
  if (layout) {
    if (layout === 'scroll' || layout === 'horizontal') return 'scroll'
    if (layout === 'grid') return 'grid'
    if (layout === 'stack' || layout === 'vertical') return 'stack'
  }
  const styleType = String(rawStyleType ?? '').trim()
  if (styleType === 'vertical' || styleType === 'stack') return 'stack'
  return 'scroll'
}

export function normalizeCouponFilterTypes(raw: unknown): CouponFilterType[] {
  const valid = COUPON_FILTER_OPTIONS.map((o) => o.value)
  const list = Array.isArray(raw) ? raw : (typeof raw === 'string' && raw.trim() ? [raw] : [])
  const seen = new Set<CouponFilterType>()
  const out: CouponFilterType[] = []
  for (const item of list) {
    const key = String(item || '').trim() as CouponFilterType
    if (!valid.includes(key) || seen.has(key)) continue
    seen.add(key)
    out.push(key)
  }
  return out
}

export function normalizeManualItems(raw: unknown): CouponPick[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<number>()
  const out: CouponPick[] = []
  for (const item of raw) {
    const src = item && typeof item === 'object' ? item : {}
    const id = Number((src as any).id)
    if (!Number.isFinite(id) || id <= 0) continue
    if (seen.has(id)) continue
    seen.add(id)
    out.push({
      id,
      name: String(src.name || '').trim(),
      display_value: String(src.display_value || src.displayValue || '').trim(),
      condition: String(src.condition || '').trim(),
    })
    if (out.length >= COUPON_MANUAL_MAX) break
  }
  return out
}

/**
 * 归一化整个 props。**纯函数**：不改传入对象，返回全新对象。
 *
 * @param raw 原始 props
 * @param fallbackTitle 兜底标题（组件列表里可能按分类给不同默认文案）
 */
export function normalizeCouponProps(
  raw: Record<string, any> | undefined | null,
  fallbackTitle?: string,
): CouponProps {
  const p = raw && typeof raw === 'object' ? raw : {}

  // 🔴 旧字段回落：limit / button_text 继续生效，保证老页面读数不变
  const rawLimit = p.display_limit !== undefined ? p.display_limit : p.limit
  const rawClaim = p.claim_text !== undefined ? p.claim_text : p.button_text

  return {
    title: String(p.title ?? (fallbackTitle !== undefined ? fallbackTitle : COUPON_DEFAULT_PROPS.title)),
    show_more: p.show_more === undefined ? false : !!p.show_more,
    more_text: String(p.more_text || COUPON_DEFAULT_PROPS.more_text).slice(0, 6),
    more_link: String(p.more_link || '').trim(),

    data_mode: pickString(p.data_mode, ['auto', 'manual'] as const, 'auto'),
    filter_types: normalizeCouponFilterTypes(p.filter_types),
    sort: pickString(p.sort, ['amountDesc', 'expiringSoon', 'latest'] as const, 'amountDesc'),
    manual_items: normalizeManualItems(p.manual_items),

    display_limit: clampNumber(rawLimit, COUPON_LIMIT.min, COUPON_LIMIT.max, COUPON_LIMIT.step, COUPON_LIMIT.fallback),

    claim_text: String(rawClaim || COUPON_DEFAULT_PROPS.claim_text).slice(0, 6),
    use_text: String(p.use_text || COUPON_DEFAULT_PROPS.use_text).slice(0, 6),
    sold_out_text: String(p.sold_out_text || COUPON_DEFAULT_PROPS.sold_out_text).slice(0, 6),

    auto_hide_when_empty: p.auto_hide_when_empty === undefined ? true : !!p.auto_hide_when_empty,

    layout: normalizeCouponLayout(p.layout, p.style_type),
    theme: pickString(p.theme, ['tear', 'punch', 'rounded'] as const, 'tear'),

    // 字号沿用旧字段名（DSL 不变，只是面板搬家）
    title_size: clampNumber(p.title_font_size, COUPON_TITLE_SIZE.min, COUPON_TITLE_SIZE.max, 1, COUPON_TITLE_SIZE.fallback),
    amount_size: clampNumber(p.amount_font_size, COUPON_AMOUNT_SIZE.min, COUPON_AMOUNT_SIZE.max, 1, COUPON_AMOUNT_SIZE.fallback),
    desc_size: clampNumber(p.desc_font_size ?? p.subtitle_font_size, COUPON_DESC_SIZE.min, COUPON_DESC_SIZE.max, 1, COUPON_DESC_SIZE.fallback),

    bg_color: String(p.bg_color || COUPON_DEFAULT_PROPS.bg_color),
    amount_color: String(p.amount_color || COUPON_DEFAULT_PROPS.amount_color),
    btn_color: String(p.btn_color || COUPON_DEFAULT_PROPS.btn_color),

    card_gap: clampNumber(p.card_gap, COUPON_GAP.min, COUPON_GAP.max, 1, COUPON_GAP.fallback),
    block_padding: clampNumber(p.block_padding, COUPON_PADDING.min, COUPON_PADDING.max, COUPON_PADDING.step, COUPON_PADDING.fallback),
  }
}

/**
 * 券的展示态：决定按钮文案与是否置灰。
 * totalCount/usedCount 缺失时**按未领完处理** —— 宁可少置灰，也不要把还能领的券显示成抢光。
 */
export type CouponDisplayState = 'claim' | 'used' | 'soldout'

export function resolveCouponState(
  raw: { totalCount?: number; usedCount?: number; claimed?: boolean } | undefined,
  cfg: CouponProps,
): CouponDisplayState {
  if (raw?.claimed) return 'used'
  const total = Number(raw?.totalCount)
  const used = Number(raw?.usedCount)
  if (Number.isFinite(total) && total > 0 && Number.isFinite(used) && used >= total) return 'soldout'
  return 'claim'
}

/** 按钮文案 */
export function resolveButtonText(state: CouponDisplayState, cfg: CouponProps): string {
  if (state === 'soldout') return cfg.sold_out_text
  if (state === 'used') return cfg.use_text
  return cfg.claim_text
}

/* ------------------------------------------------------------------ */
/* JSON Schema（对外契约说明 / 校验用）                                */
/* ------------------------------------------------------------------ */

export const COUPON_PROPS_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://zfculture.site/schemas/coupon-props.json',
  title: 'CouponProps（优惠券组件配置）',
  type: 'object',
  additionalProperties: true,
  properties: {
    title: { type: 'string', default: COUPON_DEFAULT_PROPS.title },
    show_more: { type: 'boolean', default: false },
    more_text: { type: 'string', default: COUPON_DEFAULT_PROPS.more_text, maxLength: 6 },
    more_link: { type: 'string', default: '' },

    data_mode: { type: 'string', enum: ['auto', 'manual'], default: 'auto' },
    filter_types: {
      type: 'array',
      description: 'auto 模式的类型筛选；空 = 全部',
      items: { type: 'string', enum: ['newcomer', 'all', 'fixed', 'percent'] },
      default: [],
    },
    sort: { type: 'string', enum: ['amountDesc', 'expiringSoon', 'latest'], default: 'amountDesc' },
    manual_items: {
      type: 'array',
      maxItems: COUPON_MANUAL_MAX,
      description: 'manual 模式手选的券，按数组顺序展示',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          name: { type: 'string' },
          display_value: { type: 'string' },
          condition: { type: 'string' },
        },
        additionalProperties: true,
      },
      default: [],
    },

    display_limit: {
      type: 'number',
      minimum: COUPON_LIMIT.min,
      maximum: COUPON_LIMIT.max,
      default: COUPON_LIMIT.fallback,
      description: '旧字段 limit 仍被识别',
    },
    limit: { type: 'number', description: '旧字段：展示数量' },

    claim_text: { type: 'string', default: COUPON_DEFAULT_PROPS.claim_text, maxLength: 6 },
    use_text: { type: 'string', default: COUPON_DEFAULT_PROPS.use_text, maxLength: 6 },
    sold_out_text: { type: 'string', default: COUPON_DEFAULT_PROPS.sold_out_text, maxLength: 6 },
    button_text: { type: 'string', description: '旧字段：待领取文案' },

    auto_hide_when_empty: { type: 'boolean', default: true },

    layout: {
      type: 'string',
      enum: ['scroll', 'grid', 'stack'],
      default: 'scroll',
      description: '旧字段 style_type（horizontal/vertical）仍被识别',
    },
    style_type: { type: 'string', description: '旧字段：horizontal / vertical' },
    theme: { type: 'string', enum: ['tear', 'punch', 'rounded'], default: 'tear' },

    title_font_size: {
      type: 'number', minimum: COUPON_TITLE_SIZE.min, maximum: COUPON_TITLE_SIZE.max, default: COUPON_TITLE_SIZE.fallback,
    },
    amount_font_size: {
      type: 'number', minimum: COUPON_AMOUNT_SIZE.min, maximum: COUPON_AMOUNT_SIZE.max, default: COUPON_AMOUNT_SIZE.fallback,
    },
    desc_font_size: {
      type: 'number', minimum: COUPON_DESC_SIZE.min, maximum: COUPON_DESC_SIZE.max, default: COUPON_DESC_SIZE.fallback,
      description: '与旧字段 subtitle_font_size 共存，后者为别名',
    },
    subtitle_font_size: { type: 'number', description: '旧字段：描述字号' },

    bg_color: { type: 'string', default: COUPON_DEFAULT_PROPS.bg_color },
    amount_color: { type: 'string', default: COUPON_DEFAULT_PROPS.amount_color },
    btn_color: { type: 'string', default: COUPON_DEFAULT_PROPS.btn_color },

    card_gap: { type: 'number', minimum: COUPON_GAP.min, maximum: COUPON_GAP.max, default: COUPON_GAP.fallback },
    block_padding: { type: 'number', minimum: COUPON_PADDING.min, maximum: COUPON_PADDING.max, default: COUPON_PADDING.fallback },
  },
} as const
