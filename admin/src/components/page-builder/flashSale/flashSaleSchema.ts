/**
 * components/page-builder/flashSale/flashSaleSchema.ts
 * 限时秒杀（FlashSale）Props 的**唯一真相源**。
 *
 * 为什么要有这个文件（沿用 banner / search / categoryNav / coupon 的口径）：
 *   属性面板、画布渲染、小程序端三处都要读同一批配置。以前倒计时逻辑在
 *   `FlashSaleRenderer.vue` 与 `components/dsl-flash-sale/` 各写一份，
 *   两边都能算，但**只能算 HH:mm:ss** —— 设「3 天后结束」会显示 `72:00:00`，
 *   用户完全读不出「还有3 天」。本次统一到本文件并补上「X天 HH:mm:ss」折算。
 *
 * 🔴 向后兼容铁律（已发布的小程序不能被新后台改坏）：
 *   1. 旧 `countdown !== false` 语义保留（缺省 true）；旧 `end_time` 格式不动；
 *   2. 旧 `limit` 继续作为商品数量；旧 `items[]`（name/price/original_price/link_url）继续可用；
 *   3. 旧 `product_ids` + `data_source` 保留（自动模式的取数通道）；
 *   4. 旧 `title_font_size` / `subtitle_font_size` 原样保留（只是从内容面板搬到样式面板）。
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 数据来源模式 */
export type FlashSaleDataMode = 'activity' | 'manual'

/** 陈列布局 */
export type FlashSaleLayout = 'scroll' | 'grid' | 'feature'

/** 倒计时视觉风格 */
export type CountdownStyle = 'flip' | 'plain'

/** 卡片背景形态 */
export type CardSurface = 'white' | 'gradient' | 'transparent'

/** 角标模式 */
export type BadgeMode = 'none' | 'autoDiscount' | 'custom'

/** 秒杀阶段（由时间与库存推导，不是配置项） */
export type SalePhase = 'pending' | 'running' | 'soldOut' | 'ended'

export interface FlashSaleItem {
  /** 商品 id（手动模式冗余存一份，面板折叠态与端上离线渲染都要用） */
  id?: number | string
  name?: string
  /** 秒杀价 */
  price?: string | number
  /** 划线原价 */
  original_price?: string | number
  /** 库存（用于进度条；缺省按 100 估算） */
  stock?: number
  /** 已售（用于进度条） */
  sold?: number
  link_url?: string
}

export interface FlashSaleProps {
  /* 标题栏 */
  title: string
  /** 标题左侧图标：'' = 用默认时钟；否则是图片 URL 或 emoji */
  title_icon: string
  show_more: boolean
  more_text: string
  more_link: string

  /* 倒计时 */
  countdown: boolean
  /** 结束时间（保持旧字符串格式 'YYYY-MM-DD HH:mm:ss'） */
  end_time: string
  /** 预热开始时间；给了才启用「距开始」文案 */
  start_time: string
  countdown_style: CountdownStyle
  /** 未开始文案前缀 */
  pending_text: string
  /** 进行中文案前缀 */
  running_text: string

  /* 数据来源 */
  data_mode: FlashSaleDataMode
  /** 手动自选商品 */
  manual_items: FlashSaleItem[]
  /** 自动模式关联的活动 id（可空 = 取当前进行中的活动） */
  activity_id: number | null
  /** 无活动/售罄时是否隐藏组件 */
  auto_hide_when_done: boolean

  /* 展示数量 */
  limit: number

  /* 展示要素开关 */
  show_original_price: boolean
  show_progress: boolean
  show_buy_button: boolean
  buy_text_running: string
  buy_text_pending: string
  buy_text_soldout: string
  badge_mode: BadgeMode
  badge_text: string

  /* 样式 */
  layout: FlashSaleLayout
  /** 秒杀主题色：统一联动倒计时背景、秒杀价高亮、抢购按钮 */
  theme_color: string
  card_surface: CardSurface
  /** 组件外边距 px */
  block_margin: number
  /** 组件圆角 px */
  block_radius: number
  /** 标题字号（沿用旧键名） */
  title_font_size: number
  /** 元信息字号（沿用旧键名） */
  subtitle_font_size: number
}

/* ------------------------------------------------------------------ */
/* 常量：区间与选项                                                     */
/* ------------------------------------------------------------------ */

export const FLASH_SALE_LIMIT = { min: 1, max: 8, step: 1, fallback: 4 } as const
export const FLASH_SALE_MARGIN = { min: 0, max: 24, step: 2, fallback: 10 } as const
export const FLASH_SALE_RADIUS = { min: 0, max: 24, step: 2, fallback: 12 } as const
export const FLASH_SALE_TITLE_SIZE = { min: 11, max: 24, step: 1, fallback: 13 } as const
export const FLASH_SALE_SUBTITLE_SIZE = { min: 9, max: 18, step: 1, fallback: 11 } as const
export const FLASH_SALE_MANUAL_MAX = 12

/** 倒计时超过该秒数即折算成「X天 HH:mm:ss」 */
export const COUNTDOWN_DAY_THRESHOLD = 24 * 3600

export const FLASH_SALE_DATA_MODE_OPTIONS: Array<{ value: FlashSaleDataMode; label: string; desc: string }> = [
  { value: 'activity', label: '自动关联活动', desc: '取当前进行中的秒杀活动' },
  { value: 'manual', label: '手动自选商品', desc: '自己挑几件商品上架秒杀' },
]

export const FLASH_SALE_LAYOUT_OPTIONS: Array<{ value: FlashSaleLayout; label: string; desc: string }> = [
  { value: 'scroll', label: '横向轻巧滑动', desc: '单行横滑，适合 4~8 件' },
  { value: 'grid', label: '双列网格', desc: '双列经典卡片' },
  { value: 'feature', label: '单列爆款大图', desc: '大图 + 详细信息流' },
]

export const COUNTDOWN_STYLE_OPTIONS: Array<{ value: CountdownStyle; label: string; desc: string }> = [
  { value: 'flip', label: '方块翻牌器', desc: '高对比色块，数字醒目' },
  { value: 'plain', label: '极简纯文本', desc: '一行文字，最不抢戏' },
]

export const FLASH_SALE_SURFACE_OPTIONS: Array<{ value: CardSurface; label: string; desc: string }> = [
  { value: 'white', label: '纯色白卡片', desc: '白底 + 细边框' },
  { value: 'gradient', label: '浅色渐变', desc: '主题色淡渐变，带氛围' },
  { value: 'transparent', label: '透明无框', desc: '跟随页面底色' },
]

export const FLASH_SALE_BADGE_OPTIONS: Array<{ value: BadgeMode; label: string; desc: string }> = [
  { value: 'none', label: '无角标', desc: '不显示角标' },
  { value: 'autoDiscount', label: '自动折扣率', desc: '按秒杀价/原价算，如「5折」' },
  { value: 'custom', label: '自定义文案', desc: '最多 4 字，如「爆款」' },
]

/* ------------------------------------------------------------------ */
/* 默认值                                                              */
/* ------------------------------------------------------------------ */

/** 品牌大促红 */
export const FLASH_SALE_THEME_COLOR = '#FF4D4F'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatDateTime(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** 默认结束时间：2 小时后（与旧 defaultProps 一致，保住新建组件的初始观感） */
export function defaultFlashSaleEndTime(now = Date.now()): string {
  return formatDateTime(new Date(now + 2 * 3600 * 1000))
}

export const FLASH_SALE_DEFAULT_PROPS: FlashSaleProps = {
  title: '限时秒杀',
  title_icon: '',
  show_more: false,
  more_text: '更多',
  more_link: '',

  countdown: true,
  end_time: '',
  start_time: '',
  countdown_style: 'flip',
  pending_text: '距开始',
  running_text: '距结束',

  data_mode: 'activity',
  manual_items: [],
  activity_id: null,
  auto_hide_when_done: true,

  limit: FLASH_SALE_LIMIT.fallback,

  show_original_price: true,
  show_progress: false,
  show_buy_button: true,
  buy_text_running: '立即抢',
  buy_text_pending: '设提醒',
  buy_text_soldout: '已抢光',
  badge_mode: 'none',
  badge_text: '',

  layout: 'scroll',
  theme_color: FLASH_SALE_THEME_COLOR,
  card_surface: 'white',
  block_margin: FLASH_SALE_MARGIN.fallback,
  block_radius: FLASH_SALE_RADIUS.fallback,
  title_font_size: FLASH_SALE_TITLE_SIZE.fallback,
  subtitle_font_size: FLASH_SALE_SUBTITLE_SIZE.fallback,
}

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

function pickString<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

function clampNumber(value: unknown, min: number, max: number, step = 1, fallback: number = min): number {
  // 🔴 先判空再Number()：Number('')/Number(null) 都是 0 且有限，
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
 * 解析后端的时间字符串。
 *
 * 🔴 必须把 `-` 换成 `/` 再 `new Date()`：iOS Safari / 部分安卓 WebView
 *   对 `'2026-10-08 23:59:00'` 这种格式返回 Invalid Date，
 *   而 `'2026/10/08 23:59:00'` 全平台可用。这是「倒计时显示『时间格式无效』」的根因。
 */
export function parseFlashSaleTime(raw?: string | number | null): number | null {
  if (raw === null || raw === undefined || raw === '') return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  const text = String(raw).trim()
  if (!text) return null
  const ms = new Date(text.replace(/-/g, '/')).getTime()
  if (Number.isFinite(ms)) return ms
  // 兜底：ISO 串（带 T / Z）交给原生解析
  const iso = new Date(text).getTime()
  return Number.isFinite(iso) ? iso : null
}

/** 倒计时拆解后的结构（供面板预览与画布/端上共用） */
export interface CountdownParts {
  /** 剩余总秒数（负数表示已过） */
  seconds: number
  days: number
  hours: number
  minutes: number
  secondsOfMinute: number
  /** 已过期 */
  expired: boolean
  /** 未开始（配了 start_time 且还没到） */
  pending: boolean
  /** 是否需要展示「天」位（>24h） */
  showDays: boolean
  /** HH:mm:ss 部分 */
  clock: string
  /** 完整文本「X天 HH:mm:ss」或「HH:mm:ss」 */
  text: string
}

export function buildCountdownParts(endMs: number | null, startMs?: number | null, now = Date.now()): CountdownParts {
  const empty: CountdownParts = {
    seconds: 0, days: 0, hours: 0, minutes: 0, secondsOfMinute: 0,
    expired: false, pending: false, showDays: false, clock: '00:00:00', text: '00:00:00',
  }
  if (endMs === null || !Number.isFinite(endMs)) return empty

  const diffSec = Math.floor((endMs - now) / 1000)

  // 未开始：配了 start_time 且当前早于它
  if (startMs !== null && startMs !== undefined && Number.isFinite(startMs) && now < startMs) {
    const toStart = Math.floor((startMs - now) / 1000)
    return parts(toStart, false, true)
  }
  if (diffSec <= 0) {
    return { ...empty, seconds: 0, expired: true, clock: '00:00:00', text: '00:00:00' }
  }
  return parts(diffSec, false, false)
}

function parts(totalSec: number, expired: boolean, pending: boolean): CountdownParts {
  const s = Math.max(totalSec, 0)
  const days = Math.floor(s / 86400)
  const hours = Math.floor((s % 86400) / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const sec = s % 60
  // 🔴 核心修复：超过 24h 折算成「X天 HH:mm:ss」。
  //   旧代码直接 `pad(floor(s/3600))` → 3 天后显示「72:00:00」，用户读不出天数。
  const showDays = s >= COUNTDOWN_DAY_THRESHOLD
  const clock = `${pad(hours)}:${pad(minutes)}:${pad(sec)}`
  return {
    seconds: s,
    days,
    hours,
    minutes,
    secondsOfMinute: sec,
    expired,
    pending,
    showDays,
    clock,
    text: showDays ? `${days}天 ${clock}` : clock,
  }
}

export function normalizeFlashSaleItem(raw: any): FlashSaleItem {
  const src = raw && typeof raw === 'object' ? raw : {}
  return {
    id: src.id ?? src.productId ?? src.pid,
    name: String(src.name || src.title || '').trim(),
    price: src.price ?? '',
    original_price: src.original_price ?? src.originalPrice ?? '',
    stock: Number(src.stock ?? 0) || 0,
    sold: Number(src.sold ?? src.used ?? 0) || 0,
    link_url: String(src.link_url || src.link || '').trim(),
  }
}

export function normalizeManualItems(raw: unknown): FlashSaleItem[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: FlashSaleItem[] = []
  for (const item of raw) {
    const it = normalizeFlashSaleItem(item)
    if (!it.name && !it.id) continue
    const key = String(it.id ?? it.name)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(it)
    if (out.length >= FLASH_SALE_MANUAL_MAX) break
  }
  return out
}

/**
 * 归一化整个 props。**纯函数**：不改传入对象，返回全新对象。
 *
 * @param raw 原始 props
 * @param nowNow 用于算默认 end_time 的基准（测试可注入）
 */
export function normalizeFlashSaleProps(
  raw: Record<string, any> | undefined | null,
  nowNow: number = Date.now(),
): FlashSaleProps {
  const p = raw && typeof raw === 'object' ? raw : {}

  // 🔴 旧 items 回落：老页面只存了 items，没有 manual_items
  const manualRaw = Array.isArray(p.manual_items) && p.manual_items.length
    ? p.manual_items
    : (Array.isArray(p.items) ? p.items : [])

  const actId = Number(p.activity_id)

  return {
    title: String(p.title ?? FLASH_SALE_DEFAULT_PROPS.title),
    title_icon: String(p.title_icon ?? ''),
    show_more: p.show_more === undefined ? false : !!p.show_more,
    more_text: String(p.more_text || FLASH_SALE_DEFAULT_PROPS.more_text).slice(0, 6),
    more_link: String(p.more_link || '').trim(),

    // 旧语义：countdown !== false。缺省 true
    countdown: p.countdown === undefined ? true : p.countdown !== false,
    // 旧 end_time 保持原字符串；缺省给 2 小时后（与旧 defaultProps 一致）
    end_time: String(p.end_time || defaultFlashSaleEndTime(nowNow)),
    start_time: String(p.start_time || ''),
    countdown_style: pickString(p.countdown_style, ['flip', 'plain'] as const, 'flip'),
    pending_text: String(p.pending_text || FLASH_SALE_DEFAULT_PROPS.pending_text).slice(0, 6),
    running_text: String(p.running_text || FLASH_SALE_DEFAULT_PROPS.running_text).slice(0, 6),

    data_mode: pickString(p.data_mode, ['activity', 'manual'] as const, 'activity'),
    manual_items: normalizeManualItems(manualRaw),
    activity_id: Number.isFinite(actId) && actId > 0 ? actId : null,
    auto_hide_when_done: p.auto_hide_when_done === undefined ? true : !!p.auto_hide_when_done,

    limit: clampNumber(p.limit, FLASH_SALE_LIMIT.min, FLASH_SALE_LIMIT.max, FLASH_SALE_LIMIT.step, FLASH_SALE_LIMIT.fallback),

    show_original_price: p.show_original_price === undefined ? true : !!p.show_original_price,
    show_progress: p.show_progress === undefined ? false : !!p.show_progress,
    show_buy_button: p.show_buy_button === undefined ? true : !!p.show_buy_button,
    buy_text_running: String(p.buy_text_running || FLASH_SALE_DEFAULT_PROPS.buy_text_running).slice(0, 6),
    buy_text_pending: String(p.buy_text_pending || FLASH_SALE_DEFAULT_PROPS.buy_text_pending).slice(0, 6),
    buy_text_soldout: String(p.buy_text_soldout || FLASH_SALE_DEFAULT_PROPS.buy_text_soldout).slice(0, 6),
    badge_mode: pickString(p.badge_mode, ['none', 'autoDiscount', 'custom'] as const, 'none'),
    badge_text: String(p.badge_text || '').slice(0, 4),

    layout: pickString(p.layout, ['scroll', 'grid', 'feature'] as const, 'scroll'),
    theme_color: String(p.theme_color || FLASH_SALE_THEME_COLOR),
    card_surface: pickString(p.card_surface, ['white', 'gradient', 'transparent'] as const, 'white'),
    block_margin: clampNumber(p.block_margin, FLASH_SALE_MARGIN.min, FLASH_SALE_MARGIN.max, FLASH_SALE_MARGIN.step, FLASH_SALE_MARGIN.fallback),
    block_radius: clampNumber(p.block_radius, FLASH_SALE_RADIUS.min, FLASH_SALE_RADIUS.max, FLASH_SALE_RADIUS.step, FLASH_SALE_RADIUS.fallback),
    title_font_size: clampNumber(p.title_font_size, FLASH_SALE_TITLE_SIZE.min, FLASH_SALE_TITLE_SIZE.max, 1, FLASH_SALE_TITLE_SIZE.fallback),
    subtitle_font_size: clampNumber(p.subtitle_font_size, FLASH_SALE_SUBTITLE_SIZE.min, FLASH_SALE_SUBTITLE_SIZE.max, 1, FLASH_SALE_SUBTITLE_SIZE.fallback),
  }
}

/**
 * 推导秒杀阶段。
 * @param items 商品列表
 * @param parts 倒计时拆解
 */
export function resolveSalePhase(
  items: Array<{ stock?: number; sold?: number }>,
  parts: CountdownParts,
): SalePhase {
  if (parts.expired) return 'ended'
  if (parts.pending) return 'pending'
  // 全部售罄才判soldOut；stock 缺失（0）时按「未售罄」处理 —— 宁可少置灰
  const tracked = items.filter((it) => Number(it?.stock) > 0)
  if (tracked.length && tracked.every((it) => Number(it.sold) >= Number(it.stock))) return 'soldOut'
  return 'running'
}

/** 抢购按钮文案 */
export function resolveBuyText(phase: SalePhase, cfg: FlashSaleProps): string {
  if (phase === 'pending') return cfg.buy_text_pending
  if (phase === 'soldOut' || phase === 'ended') return cfg.buy_text_soldout
  return cfg.buy_text_running
}

/** 售罄 / 结束态：按钮与价格要置灰 */
export function isDimPhase(phase: SalePhase): boolean {
  return phase === 'soldOut' || phase === 'ended'
}

/**
 * 角标文本。
 * autoDiscount：由秒杀价 / 原价算折扣 —— 5 元 / 10 元 = 5 折。
 * 🔴 任一价格缺失或非正数时返回空串（不显示），**不能显示「0折」**。
 */
export function resolveBadgeText(item: FlashSaleItem, mode: BadgeMode, customText: string): string {
  if (mode === 'none') return ''
  if (mode === 'custom') return (customText || '').trim()
  const price = Number(item.price)
  const original = Number(item.original_price)
  if (!Number.isFinite(price) || !Number.isFinite(original) || price <= 0 || original <= 0) return ''
  if (price >= original) return ''
  const zhe = (price / original) * 10
  const rounded = Math.round(zhe * 10) / 10
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}折`
}

/** 抢购进度百分比 0~100 */
export function resolveProgressPercent(item: FlashSaleItem): number {
  const stock = Number(item.stock)
  const sold = Number(item.sold)
  if (!Number.isFinite(stock) || stock <= 0) return 0
  if (!Number.isFinite(sold) || sold <= 0) return 0
  const pct = Math.round((sold / stock) * 100)
  return Math.min(100, Math.max(0, pct))
}

/* ------------------------------------------------------------------ */
/* JSON Schema（对外契约说明 / 校验用）                                */
/* ------------------------------------------------------------------ */

export const FLASH_SALE_PROPS_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://zfculture.site/schemas/flash-sale-props.json',
  title: 'FlashSaleProps（限时秒杀组件配置）',
  type: 'object',
  additionalProperties: true,
  properties: {
    title: { type: 'string', default: FLASH_SALE_DEFAULT_PROPS.title },
    title_icon: { type: 'string', default: '', description: '空 = 默认时钟图标；否则图片 URL 或 emoji' },
    show_more: { type: 'boolean', default: false },
    more_text: { type: 'string', default: '更多', maxLength: 6 },
    more_link: { type: 'string', default: '' },

    countdown: { type: 'boolean', default: true, description: '旧语义 countdown !== false' },
    end_time: { type: 'string', description: "格式 'YYYY-MM-DD HH:mm:ss'" },
    start_time: { type: 'string', description: '给了才启用「距开始」文案' },
    countdown_style: { type: 'string', enum: ['flip', 'plain'], default: 'flip' },
    pending_text: { type: 'string', default: '距开始', maxLength: 6 },
    running_text: { type: 'string', default: '距结束', maxLength: 6 },

    data_mode: { type: 'string', enum: ['activity', 'manual'], default: 'activity' },
    manual_items: {
      type: 'array',
      maxItems: FLASH_SALE_MANUAL_MAX,
      items: {
        type: 'object',
        properties: {
          id: { type: ['number', 'string'] },
          name: { type: 'string' },
          price: { type: ['string', 'number'] },
          original_price: { type: ['string', 'number'] },
          stock: { type: 'number' },
          sold: { type: 'number' },
          link_url: { type: 'string' },
        },
        additionalProperties: true,
      },
      description: '旧字段 items 仍被识别为别名',
    },
    activity_id: { type: ['number', 'null'], default: null },
    auto_hide_when_done: { type: 'boolean', default: true },

    limit: { type: 'number', minimum: FLASH_SALE_LIMIT.min, maximum: FLASH_SALE_LIMIT.max, default: 4 },

    show_original_price: { type: 'boolean', default: true },
    show_progress: { type: 'boolean', default: false },
    show_buy_button: { type: 'boolean', default: true },
    buy_text_running: { type: 'string', default: '立即抢', maxLength: 6 },
    buy_text_pending: { type: 'string', default: '设提醒', maxLength: 6 },
    buy_text_soldout: { type: 'string', default: '已抢光', maxLength: 6 },
    badge_mode: { type: 'string', enum: ['none', 'autoDiscount', 'custom'], default: 'none' },
    badge_text: { type: 'string', maxLength: 4 },

    layout: { type: 'string', enum: ['scroll', 'grid', 'feature'], default: 'scroll' },
    theme_color: { type: 'string', default: FLASH_SALE_THEME_COLOR },
    card_surface: { type: 'string', enum: ['white', 'gradient', 'transparent'], default: 'white' },
    block_margin: { type: 'number', minimum: FLASH_SALE_MARGIN.min, maximum: FLASH_SALE_MARGIN.max, default: 10 },
    block_radius: { type: 'number', minimum: FLASH_SALE_RADIUS.min, maximum: FLASH_SALE_RADIUS.max, default: 12 },
    title_font_size: { type: 'number', minimum: FLASH_SALE_TITLE_SIZE.min, maximum: FLASH_SALE_TITLE_SIZE.max, default: 13 },
    subtitle_font_size: { type: 'number', minimum: FLASH_SALE_SUBTITLE_SIZE.min, maximum: FLASH_SALE_SUBTITLE_SIZE.max, default: 11 },
  },
} as const
