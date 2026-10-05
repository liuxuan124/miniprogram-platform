/**
 * components/page-builder/banner/bannerSchema.ts
 * 轮播图（Banner）Props 的**唯一真相源**。
 *
 * 为什么要有这个文件：
 *   属性面板（BannerProps.vue）与画布渲染（BannerRenderer.vue）都要读同一批
 *   配置。以前两边各写一份默认值与夹紧逻辑，结果出现「面板里改了画布不变」
 *   「面板显示 3000 但实际按 0 跑」这类漂移。现在统一从本文件取：
 *     - BANNER_DEFAULT_PROPS  默认值
 *     - normalizeBannerProps() 归一化 + 边界夹紧（**幂等**）
 *     - BANNER_PROPS_SCHEMA    JSON Schema 定义（对外说明/校验用）
 *
 * 🔴 向后兼容铁律（已发布的小程序不能被新后台改坏）：
 *   1. 旧字段 `items`（历史别名）、`indicator_dots`（布尔开关）继续被识别；
 *   2. 新字段一律「有值才生效」，缺省走默认值，绝不改变老配置的表现；
 *   3. 归一化只读不写原始对象，**不修改 props 引用**（否则触发 Vue 无限更新）。
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

export type BannerLayoutMode = 'fullbleed' | 'card' | 'peek'
export type BannerAspectKey = '16:9' | '4:3' | '2.35:1' | '1:1' | 'custom'
export type BannerRadiusKey = 0 | 8 | 16
export type BannerShadowKey = 'none' | 'soft' | 'float'
export type BannerIndicatorType = 'dots' | 'pill' | 'line' | 'number' | 'none'
export type BannerIndicatorPos = 'center' | 'right' | 'outside'
export type BannerTextAlign = 'left' | 'center'
/** 图片填充模式 */
export type BannerObjectFit = 'cover' | 'contain'

/** 单张轮播图 */
export interface BannerImageItem {
  /** 稳定唯一 id：拖拽排序 / 折叠展开态 / 图片加载态都靠它做 key，
   *  用 index 做 key 在删除中间项时会导致 Vue 复用错节点（老代码的隐患） */
  id?: string
  image?: string
  title?: string
  subtitle?: string
  link_type?: string
  link_url?: string
  /** 单张显隐：临时下架某张图而不删配置 */
  visible?: boolean
  /** 单张自定义行动点气泡（覆盖全局 action_label）；空字符串 = 跟随全局 */
  action_label?: string
}

export interface BannerProps {
  images: BannerImageItem[]

  /* 播放逻辑 */
  autoplay: boolean
  interval: number
  loop: boolean
  allow_touch: boolean

  /* 容器与布局 */
  layout_mode: BannerLayoutMode
  /** 页面左右外边距（仅 card 模式生效） */
  page_padding: number
  /** 露边模式下左右各露出多少 px */
  peek_gutter: number
  aspect: BannerAspectKey
  /** aspect === 'custom' 时生效的固定高度 px */
  custom_height: number
  /**
   * 图片填充模式：cover 等比铺满不留黑边（默认，与端上历史行为一致）/ contain 等比完整显示留白。
   * ⚠️ 默认必须是 cover —— 端上原来写死 `mode="aspectFill"`，改默认会让老页面出现黑边。
   */
  object_fit: BannerObjectFit
  radius_preset: BannerRadiusKey
  radius_custom: number
  shadow: BannerShadowKey

  /* 指示器 */
  indicator_type: BannerIndicatorType
  indicator_pos: BannerIndicatorPos
  indicator_active_color: string
  indicator_inactive_color: string
  indicator_inactive_opacity: number

  /* 文本遮罩与排版 */
  overlay: boolean
  overlay_opacity: number
  title_size: number
  title_align: BannerTextAlign
  title_color: string
  desc_size: number
  desc_color: string
  /** 行动点气泡文案（如「查看详情」），空字符串 = 不显示 */
  action_label: string

  /* 兜底 */
  image_error_placeholder: string
}

/* ------------------------------------------------------------------ */
/* 常量：区间与预设                                                     */
/* ------------------------------------------------------------------ */

/** 间隔时间合法区间。需求要求 1000–8000，步长 500。 */
export const BANNER_INTERVAL = {
  min: 1000,
  max: 8000,
  step: 500,
  fallback: 3000,
} as const

export const BANNER_PEEK_GUTTER = { min: 15, max: 25, step: 1, fallback: 20 } as const
export const BANNER_PAGE_PADDING = { min: 12, max: 16, step: 1, fallback: 14 } as const
export const BANNER_CUSTOM_HEIGHT = { min: 80, max: 420, step: 4, fallback: 180 } as const
export const BANNER_RADIUS_CUSTOM = { min: 0, max: 40, step: 1, fallback: 12 } as const

/** 宽高比 → (宽 / 高)。用于按容器宽度反算高度。 */
export const BANNER_ASPECT_RATIO: Record<Exclude<BannerAspectKey, 'custom'>, number> = {
  '16:9': 16 / 9,
  '4:3': 4 / 3,
  '2.35:1': 2.35,
  '1:1': 1,
}

export const BANNER_LAYOUT_OPTIONS: Array<{ value: BannerLayoutMode; label: string; desc: string }> = [
  { value: 'fullbleed', label: '通栏沉浸', desc: '无外边距、0 圆角，宽度铺满' },
  { value: 'card', label: '悬浮卡片', desc: '页面左右留白，卡片质感' },
  { value: 'peek', label: '3D 画廊', desc: '两侧露边，景深层次' },
]

export const BANNER_ASPECT_OPTIONS: Array<{ value: BannerAspectKey; label: string }> = [
  { value: '16:9', label: '16:9' },
  { value: '4:3', label: '4:3' },
  { value: '2.35:1', label: '2.35:1' },
  { value: '1:1', label: '1:1' },
  { value: 'custom', label: '自定义' },
]

/** 图片填充模式：cover 等比铺满（推荐）/ contain 等比完整留白 */
export const BANNER_OBJECT_FIT_OPTIONS: Array<{ value: BannerObjectFit; label: string }> = [
  { value: 'cover', label: '覆盖裁剪' },
  { value: 'contain', label: '完整显示' },
]

export const BANNER_RADIUS_OPTIONS: Array<{ value: BannerRadiusKey; label: string }> = [  { value: 0, label: '无' },
  { value: 8, label: '微圆角' },
  { value: 16, label: '大圆角' },
]

export const BANNER_SHADOW_OPTIONS: Array<{ value: BannerShadowKey; label: string }> = [
  { value: 'none', label: '无' },
  { value: 'soft', label: '轻微' },
  { value: 'float', label: '柔和浮层' },
]

export const BANNER_INDICATOR_OPTIONS: Array<{ value: BannerIndicatorType; label: string }> = [
  { value: 'dots', label: '圆点' },
  { value: 'pill', label: '胶囊' },
  { value: 'line', label: '细长线' },
  { value: 'number', label: '数字角标' },
  { value: 'none', label: '无' },
]

export const BANNER_INDICATOR_POS_OPTIONS: Array<{ value: BannerIndicatorPos; label: string }> = [
  { value: 'center', label: '居中' },
  { value: 'right', label: '居右' },
  { value: 'outside', label: '外置浮动' },
]

/* ------------------------------------------------------------------ */
/* 默认值                                                              */
/* ------------------------------------------------------------------ */

export const BANNER_DEFAULT_PROPS: BannerProps = {
  images: [],

  autoplay: true,
  interval: BANNER_INTERVAL.fallback,
  loop: true,
  allow_touch: true,

  layout_mode: 'fullbleed',
  page_padding: BANNER_PAGE_PADDING.fallback,
  peek_gutter: BANNER_PEEK_GUTTER.fallback,
  aspect: '2.35:1',
  custom_height: BANNER_CUSTOM_HEIGHT.fallback,
  object_fit: 'cover',
  radius_preset: 0,
  radius_custom: BANNER_RADIUS_CUSTOM.fallback,
  shadow: 'none',

  indicator_type: 'dots',
  indicator_pos: 'center',
  indicator_active_color: '#ffffff',
  indicator_inactive_color: '#ffffff',
  indicator_inactive_opacity: 0.45,

  overlay: true,
  overlay_opacity: 0.45,
  title_size: 15,
  title_align: 'left',
  title_color: '#ffffff',
  desc_size: 12,
  desc_color: 'rgba(255,255,255,0.88)',
  action_label: '',

  image_error_placeholder: '',
}

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

let idSeed = 0
/** 生成列表项 id。不用 Math.random 是为了让 SSR/多次归一化结果稳定可比对。 */
export function bannerItemId(): string {
  idSeed += 1
  return `bnr_${Date.now().toString(36)}_${idSeed.toString(36)}`
}

/**
 * 数字夹紧 + 对齐步长。
 *
 * 🔴 这里必须先判「空」再 Number()：JS 的 `Number('')`、`Number(null)`、
 * `Number([])` **全是 0 且是有限数**，直接夹紧会把「运营把输入框清空了」
 * 变成 1000ms（最快档，轮播疯狂闪），而不是回到默认 3000ms。
 * 所以空串 / null / undefined / 空数组一律视作「没填」→ fallback。
 */
export function clampNumber(
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
  // 贴边时不要再被步长推出去（min=1000,step=500 → 1000；max=8000 恰好整除）
  return Math.min(max, Math.max(min, snapped))
}

function pickString<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

/** 从一条原始记录里取图片地址，兼容 url/image/src 三种历史写法 */
function readImageUrl(raw: any): string {
  if (typeof raw === 'string') return raw
  if (!raw || typeof raw !== 'object') return ''
  return String(raw.image || raw.url || raw.src || '')
}

/**
 * 归一化单条图片项。
 * 兼容：字符串 / {image} / {url} / {src}；visible 缺省为 true（老数据无此字段）。
 */
export function normalizeBannerItem(raw: any): BannerImageItem {
  if (typeof raw === 'string') {
    return { id: bannerItemId(), image: raw, title: '', subtitle: '', link_type: 'none', link_url: '', visible: true }
  }
  const src = raw && typeof raw === 'object' ? raw : {}
  return {
    id: typeof src.id === 'string' && src.id ? src.id : bannerItemId(),
    image: readImageUrl(src),
    title: String(src.title || ''),
    subtitle: String(src.subtitle || ''),
    // 老数据只有 link_url 没有 link_type，默认按 page 处理（与 LinkPickerField 一致）
    link_type: String(src.link_type || (src.link_url ? 'page' : 'none')),
    link_url: String(src.link_url || ''),
    visible: src.visible === undefined ? true : !!src.visible,
    action_label: String(src.action_label || ''),
  }
}

/**
 * 归一化整个 Banner props。
 * **纯函数**：不改传入对象，返回全新对象（Vue 里直接用于 computed 安全）。
 */
export function normalizeBannerProps(raw: Record<string, any> | undefined | null): BannerProps {
  const p = raw && typeof raw === 'object' ? raw : {}

  // images / items 是历史别名，两个都认；都空则空数组（**绝不返回 undefined**，
  // 否则渲染层 .length 会抛 Cannot read properties of undefined）
  const rawList = Array.isArray(p.images) && p.images.length
    ? p.images
    : (Array.isArray(p.items) && p.items.length ? p.items : [])
  const images = rawList.map(normalizeBannerItem)

  // 指示器类型：旧的 indicator_dots 布尔开关要能映射到新枚举
  let indicatorType: BannerIndicatorType
  if (p.indicator_type !== undefined) {
    indicatorType = pickString(p.indicator_type, ['dots', 'pill', 'line', 'number', 'none'] as const, 'dots')
  } else if (p.indicator_dots === false) {
    indicatorType = 'none'
  } else {
    indicatorType = 'dots'
  }

  return {
    images,

    autoplay: p.autoplay === undefined ? true : !!p.autoplay,
    // 🔴 核心边界保护：0 / '' / NaN 全部夹回合法区间，渲染层不再自己算 max()
    interval: clampNumber(p.interval, BANNER_INTERVAL.min, BANNER_INTERVAL.max, BANNER_INTERVAL.step, BANNER_INTERVAL.fallback),
    loop: p.loop === undefined ? (p.circular === undefined ? true : !!p.circular) : !!p.loop,
    allow_touch: p.allow_touch === undefined ? true : !!p.allow_touch,

    layout_mode: pickString(p.layout_mode, ['fullbleed', 'card', 'peek'] as const, 'fullbleed'),
    page_padding: clampNumber(p.page_padding, BANNER_PAGE_PADDING.min, BANNER_PAGE_PADDING.max, 1, BANNER_PAGE_PADDING.fallback),
    peek_gutter: clampNumber(p.peek_gutter, BANNER_PEEK_GUTTER.min, BANNER_PEEK_GUTTER.max, 1, BANNER_PEEK_GUTTER.fallback),
    aspect: pickString(p.aspect, ['16:9', '4:3', '2.35:1', '1:1', 'custom'] as const, '2.35:1'),
    custom_height: clampNumber(p.custom_height, BANNER_CUSTOM_HEIGHT.min, BANNER_CUSTOM_HEIGHT.max, BANNER_CUSTOM_HEIGHT.step, BANNER_CUSTOM_HEIGHT.fallback),
    // 🔴 默认 cover = 端上历史行为（mode="aspectFill"），老页面不会出现黑边
    object_fit: pickString(p.object_fit, ['cover', 'contain'] as const, 'cover'),
    radius_preset: ([0, 8, 16].includes(Number(p.radius_preset)) ? Number(p.radius_preset) : 0) as BannerRadiusKey,
    radius_custom: clampNumber(p.radius_custom, BANNER_RADIUS_CUSTOM.min, BANNER_RADIUS_CUSTOM.max, 1, BANNER_RADIUS_CUSTOM.fallback),
    shadow: pickString(p.shadow, ['none', 'soft', 'float'] as const, 'none'),

    indicator_type: indicatorType,
    indicator_pos: pickString(p.indicator_pos, ['center', 'right', 'outside'] as const, 'center'),
    indicator_active_color: String(p.indicator_active_color || '#ffffff'),
    indicator_inactive_color: String(p.indicator_inactive_color || '#ffffff'),
    indicator_inactive_opacity: clampNumber(p.indicator_inactive_opacity, 0, 1, 0.05, 0.45),

    overlay: p.overlay === undefined ? true : !!p.overlay,
    overlay_opacity: clampNumber(p.overlay_opacity, 0, 1, 0.05, 0.45),
    title_size: clampNumber(p.title_size, 10, 28, 1, 15),
    title_align: pickString(p.title_align, ['left', 'center'] as const, 'left'),
    title_color: String(p.title_color || '#ffffff'),
    desc_size: clampNumber(p.desc_size, 9, 20, 1, 12),
    desc_color: String(p.desc_color || 'rgba(255,255,255,0.88)'),
    action_label: String(p.action_label || ''),

    // 去首尾空格：URL 里带空格会导致端上 image 加载失败，占位图反而不可用
    image_error_placeholder: String(p.image_error_placeholder || '').trim(),
  }
}

/** 只取参与展示的图片（visible !== false）。空数组由渲染层做空态。 */
export function visibleBannerImages(images: BannerImageItem[]): BannerImageItem[] {
  return (images || []).filter((it) => it && it.visible !== false)
}

/** 圆角最终值（px） */
export function resolveBannerRadius(props: BannerProps): number {
  return props.radius_preset === 0 && props.radius_custom > 0 && props.radius_custom !== BANNER_RADIUS_CUSTOM.fallback
    ? props.radius_custom
    : props.radius_preset
}

/** 校验 URL 是否像图片；用于「填了但打不开」的提前提示 */
export function looksLikeImageUrl(value: string): boolean {
  const text = (value || '').trim()
  if (!text) return false
  if (text.startsWith('data:image/')) return true
  if (text.startsWith('http') || text.startsWith('//')) return true
  return text.startsWith('/') && /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?|$)/i.test(text)
}

/* ------------------------------------------------------------------ */
/* JSON Schema（对外契约说明 / 校验用）                                */
/* ------------------------------------------------------------------ */

export const BANNER_PROPS_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://zfculture.site/schemas/banner-props.json',
  title: 'BannerProps（轮播图组件配置）',
  type: 'object',
  additionalProperties: true,
  properties: {
    images: {
      type: 'array',
      description: '轮播图片列表；visible=false 的项仅配置保留、不参与轮播',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          image: { type: 'string', description: '图片 URL' },
          title: { type: 'string' },
          subtitle: { type: 'string' },
          link_type: { type: 'string', enum: ['none', 'page', 'product', 'content', 'webview', 'url', 'miniapp', 'phone'] },
          link_url: { type: 'string' },
          visible: { type: 'boolean', default: true },
          action_label: { type: 'string', default: '', description: '单张行动点气泡，覆盖全局' },
        },
        required: ['image'],
        additionalProperties: true,
      },
    },
    autoplay: { type: 'boolean', default: true },
    interval: { type: 'number', minimum: BANNER_INTERVAL.min, maximum: BANNER_INTERVAL.max, multipleOf: BANNER_INTERVAL.step, default: BANNER_INTERVAL.fallback },
    loop: { type: 'boolean', default: true },
    allow_touch: { type: 'boolean', default: true, description: '编辑态下关闭以避免与画布拖拽冲突' },

    layout_mode: { type: 'string', enum: ['fullbleed', 'card', 'peek'], default: 'fullbleed' },
    page_padding: { type: 'number', minimum: BANNER_PAGE_PADDING.min, maximum: BANNER_PAGE_PADDING.max, default: BANNER_PAGE_PADDING.fallback },
    peek_gutter: { type: 'number', minimum: BANNER_PEEK_GUTTER.min, maximum: BANNER_PEEK_GUTTER.max, default: BANNER_PEEK_GUTTER.fallback },
    aspect: { type: 'string', enum: ['16:9', '4:3', '2.35:1', '1:1', 'custom'], default: '2.35:1' },
    custom_height: { type: 'number', minimum: BANNER_CUSTOM_HEIGHT.min, maximum: BANNER_CUSTOM_HEIGHT.max, default: BANNER_CUSTOM_HEIGHT.fallback },
    object_fit: { type: 'string', enum: ['cover', 'contain'], default: 'cover' },
    radius_preset: { type: 'number', enum: [0, 8, 16], default: 0 },
    radius_custom: { type: 'number', minimum: 0, maximum: 40, default: 12 },
    shadow: { type: 'string', enum: ['none', 'soft', 'float'], default: 'none' },

    indicator_type: { type: 'string', enum: ['dots', 'pill', 'line', 'number', 'none'], default: 'dots' },
    indicator_pos: { type: 'string', enum: ['center', 'right', 'outside'], default: 'center' },
    indicator_active_color: { type: 'string', default: '#ffffff' },
    indicator_inactive_color: { type: 'string', default: '#ffffff' },
    indicator_inactive_opacity: { type: 'number', minimum: 0, maximum: 1, default: 0.45 },

    overlay: { type: 'boolean', default: true },
    overlay_opacity: { type: 'number', minimum: 0, maximum: 1, default: 0.45 },
    title_size: { type: 'number', minimum: 10, maximum: 28, default: 15 },
    title_align: { type: 'string', enum: ['left', 'center'], default: 'left' },
    title_color: { type: 'string', default: '#ffffff' },
    desc_size: { type: 'number', minimum: 9, maximum: 20, default: 12 },
    desc_color: { type: 'string', default: 'rgba(255,255,255,0.88)' },
    action_label: { type: 'string', default: '', description: '行动点气泡文案，空则不显示' },

    image_error_placeholder: { type: 'string', default: '' },
  },
} as const
