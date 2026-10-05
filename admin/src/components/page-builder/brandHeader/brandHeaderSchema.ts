/**
 * components/page-builder/brandHeader/brandHeaderSchema.ts
 * 品牌顶栏（Brand Top Bar）Props 的**唯一真相源**。
 *
 * 与 Banner / ArticleFeed 同一套路：属性面板与画布渲染都只读本文件的
 * normalizeBrandHeaderProps()，避免「面板改了画布不变」。
 *
 * 🔴 向后兼容铁律（已发布的小程序不能被新后台改坏）：
 *  1. 旧配置**没有 `logo_mode`**，只靠 `logo` / `logo_text` 两个字段并存与否
 *     决定展示形态。归一化时按老语义**反推** logo_mode，历史草稿零改动可用；
 *  2. `style_type`（plain/gradient）继续生效，新增 `immersive`（沉浸透明）
 *     作为第三种模式，老配置不受影响；
 *  3. 新字段一律「有值才生效」，缺省走默认值。
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** Logo 展示形式 */
export type LogoMode = 'image' | 'text' | 'both' | 'none'
/** 背景模式 */
export type BrandBgMode = 'plain' | 'gradient' | 'immersive'
/** 图片适应方式 */
export type LogoFit = 'contain' | 'cover' | 'fill' | 'none'
/** 点击品牌区行为 */
export type BrandTapAction = 'none' | 'home' | 'intro' | 'custom'
/** 右侧快捷入口图标 */
export type ActionIcon = 'search' | 'service' | 'qrcode' | 'share'

export interface BrandHeaderProps {
  /* ---- 内容：品牌主体 ---- */
  logo_mode: LogoMode
  logo: string
  logo_text: string
  logo_text_bold: boolean
  /** Logo 与主标题之间的竖线 */
  show_divider: boolean

  title: string
  subtitle: string

  /** 点击品牌区行为 */
  tap_action: BrandTapAction
  tap_link_type: string
  tap_link_url: string

  /* ---- 内容：右侧功能区 ---- */
  show_action: boolean
  action_icon: ActionIcon
  action_label: string
  action_link_type: string
  action_link_url: string
  action_tap_action: 'none' | 'intro' | 'custom'

  /* ---- 样式：背景 ---- */
  bg_mode: BrandBgMode
  background_color: string
  gradient_from: string
  gradient_to: string
  bottom_border: boolean
  bottom_border_color: string

  /* ---- 样式：文字排版与色彩 ---- */
  title_font_size: number
  title_color: string
  title_color_light: string
  subtitle_font_size: number
  subtitle_color: string
  subtitle_color_light: string
  logo_text_color: string
  divider_color: string
  divider_color_light: string

  /* ---- 样式：Logo 尺寸 ---- */
  logo_height: number
  logo_max_width: number
  /** 保持原始宽高比（防止压扁/拉伸） */
  logo_keep_ratio: boolean
  logo_fit: LogoFit

  /* ---- 样式：间距 ---- */
  bar_padding_left: number
  bar_padding_right: number
  /** Logo / 竖线 / 标题之间的元素间隙 */
  item_gap: number

  /* ---- 样式：高级交互 ---- */
  sticky: boolean
  /** 吸顶时毛玻璃 */
  backdrop_blur: boolean
  /** 滚动后投影 */
  scroll_shadow: boolean
}

/* ------------------------------------------------------------------ */
/* 常量                                                                */
/* ------------------------------------------------------------------ */

export const LOGO_HEIGHT = { min: 16, max: 48, step: 1, fallback: 28 } as const
export const LOGO_MAX_WIDTH = { min: 48, max: 140, step: 1, fallback: 88 } as const
export const TITLE_FONT_SIZE = { min: 14, max: 20, step: 1, fallback: 15 } as const
export const SUBTITLE_FONT_SIZE = { min: 10, max: 16, step: 1, fallback: 11 } as const
export const BAR_PADDING = { min: 8, max: 24, step: 1, fallback: 12 } as const
export const ITEM_GAP = { min: 4, max: 16, step: 1, fallback: 10 } as const

/** 标题最大字数（面板字数统计与画布警示共用同一口径） */
export const TITLE_MAX_LENGTH = 30
export const SUBTITLE_MAX_LENGTH = 30

/**
 * 微信胶囊按钮预留宽度（px）。
 * iPhone 15 Pro Max 逻辑宽 440，胶囊约 87px 宽 + 右边距 ~7px ≈ 96px，
 * 与端上 `getNavLayout().capsuleRight` 的取值口径一致。
 */
export const CAPSULE_SAFE_WIDTH = 96

export const LOGO_MODE_OPTIONS = [
  { value: 'image', label: '图片' },
  { value: 'text', label: '文字' },
  { value: 'both', label: '图文' },
  { value: 'none', label: '无' },
]

export const BG_MODE_OPTIONS = [
  { value: 'plain', label: '纯色' },
  { value: 'gradient', label: '渐变' },
  { value: 'immersive', label: '沉浸' },
]

export const LOGO_FIT_OPTIONS = [
  { value: 'contain', label: '完整' },
  { value: 'cover', label: '裁切' },
  { value: 'fill', label: '拉伸' },
  { value: 'none', label: '原始' },
]

export const TAP_ACTION_OPTIONS = [
  { value: 'none', label: '无操作' },
  { value: 'home', label: '返回首页' },
  { value: 'intro', label: '弹出品牌介绍' },
  { value: 'custom', label: '自定义跳转' },
]

export const ACTION_ICON_OPTIONS = [
  { value: 'search', label: '搜索' },
  { value: 'service', label: '客服' },
  { value: 'qrcode', label: '加群活码' },
  { value: 'share', label: '分享' },
]

/** 项目品牌色板（与 ColorPickerField 的预设一致，香云纱·莨绸为主色） */
export const BRAND_PALETTE = [
  '#C08E6E', '#1D1B18', '#3B2F22', '#7A4A1D',
  '#F3DCAA', '#D9CCB8', '#8B7355', '#FFFFFF',
  '#2C1810', '#4A2C1A', '#B08968', '#E8D5C4',
]

/* ------------------------------------------------------------------ */
/* 默认值                                                              */
/* ------------------------------------------------------------------ */

export const BRAND_HEADER_DEFAULT_PROPS: BrandHeaderProps = {
  logo_mode: 'text',
  logo: '',
  logo_text: '品牌',
  logo_text_bold: true,
  show_divider: true,

  title: '品牌名称 · 一句话定位',
  subtitle: '',

  tap_action: 'none',
  tap_link_type: 'page',
  tap_link_url: '',

  show_action: false,
  action_icon: 'search',
  action_label: '',
  action_link_type: 'none',
  action_link_url: '',
  action_tap_action: 'none',

  bg_mode: 'plain',
  background_color: '#ffffff',
  gradient_from: '#002FA7',
  gradient_to: '#1A4BBF',
  bottom_border: true,
  bottom_border_color: '#eef1f6',

  title_font_size: TITLE_FONT_SIZE.fallback,
  title_color: '#172033',
  title_color_light: '#ffffff',
  subtitle_font_size: SUBTITLE_FONT_SIZE.fallback,
  subtitle_color: '#7b8798',
  subtitle_color_light: 'rgba(255,255,255,0.82)',
  logo_text_color: '#002FA7',
  divider_color: '#d0d8e8',
  divider_color_light: 'rgba(255,255,255,0.35)',

  logo_height: LOGO_HEIGHT.fallback,
  logo_max_width: LOGO_MAX_WIDTH.fallback,
  logo_keep_ratio: true,
  logo_fit: 'contain',

  bar_padding_left: BAR_PADDING.fallback,
  bar_padding_right: BAR_PADDING.fallback,
  item_gap: ITEM_GAP.fallback,

  sticky: true,
  backdrop_blur: false,
  scroll_shadow: false,
}

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

/**
 * 数值夹紧。🔴 必须**先判空再 Number()** —— `Number('')`/`Number(null)`/`Number([])`
 * 全是 0 且有限，直接夹紧会把「运营清空输入框」变成区间最小值
 * （Logo 高度 16px / 字号 14px），而不是回到默认值。
 */
export function clampBrandNumber(
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

/**
 * 🔴 Schema Migration：由旧的 `logo` / `logo_text` 并存关系**反推** logo_mode。
 * 旧渲染器的规则是「有图显示图、否则显示文字」，等价于：
 *   两者都有 → both；只有图 → image；只有文字 → text；都没有 → none
 * 这条让历史草稿在新增 logo_mode 后**表现完全不变**。
 */
export function resolveLogoMode(raw: Record<string, any>): LogoMode {
  if (raw.logo_mode !== undefined && raw.logo_mode !== null && raw.logo_mode !== '') {
    return pickEnum(raw.logo_mode, ['image', 'text', 'both', 'none'] as const, 'text')
  }
  const hasLogo = !!String(raw.logo || '').trim()
  const hasText = !!String(raw.logo_text || '').trim()
  if (hasLogo && hasText) return 'both'
  if (hasLogo) return 'image'
  if (hasText) return 'text'
  return 'none'
}

/**
 * Schema Migration：`style_type`（plain/gradient）→ `bg_mode`（多一个 immersive）。
 * 老配置里 style_type 缺省即 plain，与原行为一致。
 */
export function resolveBgMode(raw: Record<string, any>): BrandBgMode {
  if (raw.bg_mode !== undefined && raw.bg_mode !== null && raw.bg_mode !== '') {
    return pickEnum(raw.bg_mode, ['plain', 'gradient', 'immersive'] as const, 'plain')
  }
  return raw.style_type === 'gradient' ? 'gradient' : 'plain'
}

/* ------------------------------------------------------------------ */
/* 归一化                                                              */
/* ------------------------------------------------------------------ */

/** 归一化整个品牌顶栏 props。**纯函数**，不改传入对象。 */
export function normalizeBrandHeaderProps(raw: Record<string, any> | undefined | null): BrandHeaderProps {
  const p = raw && typeof raw === 'object' ? raw : {}
  const bgMode = resolveBgMode(p)
  const isDark = bgMode !== 'plain'

  return {
    /* 内容 */
    logo_mode: resolveLogoMode(p),
    logo: String(p.logo || ''),
    logo_text: String(p.logo_text || ''),
    // 旧数据没有这个字段，而旧渲染器写死 font-weight:800 → 默认给 true 才不改变表现
    logo_text_bold: p.logo_text_bold === undefined ? true : !!p.logo_text_bold,
    show_divider: p.show_divider === undefined ? true : !!p.show_divider,

    title: String(p.title ?? ''),
    subtitle: String(p.subtitle ?? ''),

    tap_action: pickEnum(p.tap_action, ['none', 'home', 'intro', 'custom'] as const, 'none'),
    tap_link_type: String(p.tap_link_type || 'page'),
    tap_link_url: String(p.tap_link_url || ''),

    show_action: p.show_action === undefined ? false : !!p.show_action,
    action_icon: pickEnum(p.action_icon, ['search', 'service', 'qrcode', 'share'] as const, 'search'),
    action_label: String(p.action_label || ''),
    action_link_type: String(p.action_link_type || 'none'),
    action_link_url: String(p.action_link_url || ''),
    action_tap_action: pickEnum(p.action_tap_action, ['none', 'intro', 'custom'] as const, 'none'),

    /* 样式：背景 */
    bg_mode: bgMode,
    background_color: String(p.background_color || '#ffffff'),
    gradient_from: String(p.gradient_from || '#002FA7'),
    gradient_to: String(p.gradient_to || '#1A4BBF'),
    bottom_border: p.bottom_border === undefined ? true : !!p.bottom_border,
    bottom_border_color: String(p.bottom_border_color || '#eef1f6'),

    /* 样式：文字 */
    title_font_size: clampBrandNumber(p.title_font_size, TITLE_FONT_SIZE.min, TITLE_FONT_SIZE.max, 1, TITLE_FONT_SIZE.fallback),
    title_color: String(p.title_color || '#172033'),
    title_color_light: String(p.title_color_light || '#ffffff'),
    subtitle_font_size: clampBrandNumber(p.subtitle_font_size, SUBTITLE_FONT_SIZE.min, SUBTITLE_FONT_SIZE.max, 1, SUBTITLE_FONT_SIZE.fallback),
    subtitle_color: String(p.subtitle_color || '#7b8798'),
    subtitle_color_light: String(p.subtitle_color_light || 'rgba(255,255,255,0.82)'),
    logo_text_color: String(p.logo_text_color || (isDark ? '#ffffff' : '#002FA7')),
    divider_color: String(p.divider_color || '#d0d8e8'),
    divider_color_light: String(p.divider_color_light || 'rgba(255,255,255,0.35)'),

    /* 样式：Logo 尺寸 */
    logo_height: clampBrandNumber(p.logo_height, LOGO_HEIGHT.min, LOGO_HEIGHT.max, 1, LOGO_HEIGHT.fallback),
    logo_max_width: clampBrandNumber(p.logo_max_width, LOGO_MAX_WIDTH.min, LOGO_MAX_WIDTH.max, 1, LOGO_MAX_WIDTH.fallback),
    // 默认开启保持比例 —— 这正是「压扁/拉伸」的根治点
    logo_keep_ratio: p.logo_keep_ratio === undefined ? true : !!p.logo_keep_ratio,
    logo_fit: pickEnum(p.logo_fit, ['contain', 'cover', 'fill', 'none'] as const, 'contain'),

    /* 样式：间距 */
    bar_padding_left: clampBrandNumber(p.bar_padding_left, BAR_PADDING.min, BAR_PADDING.max, 1, BAR_PADDING.fallback),
    bar_padding_right: clampBrandNumber(p.bar_padding_right, BAR_PADDING.min, BAR_PADDING.max, 1, BAR_PADDING.fallback),
    item_gap: clampBrandNumber(p.item_gap, ITEM_GAP.min, ITEM_GAP.max, 1, ITEM_GAP.fallback),

    /* 样式：高级交互 */
    // 旧字段是 fixed_top，保持别名同步读取；新字段 sticky 优先
    sticky: p.sticky === undefined ? (p.fixed_top !== false) : !!p.sticky,
    backdrop_blur: p.backdrop_blur === undefined ? false : !!p.backdrop_blur,
    scroll_shadow: p.scroll_shadow === undefined ? false : !!p.scroll_shadow,
  }
}

/* ------------------------------------------------------------------ */
/* 渲染侧派生                                                          */
/* ------------------------------------------------------------------ */

/** 是否深色背景（决定取浅色还是深色文字） */
export function isDarkBrandBg(bgMode: BrandBgMode): boolean {
  return bgMode === 'gradient' || bgMode === 'immersive'
}

/** 该模式下是否展示 Logo 图片 */
export function showsLogoImage(mode: LogoMode): boolean {
  return mode === 'image' || mode === 'both'
}

/** 该模式下是否展示 Logo 文字 */
export function showsLogoText(mode: LogoMode): boolean {
  return mode === 'text' || mode === 'both'
}

/**
 * 顶栏背景 CSS。
 * immersive = 沉浸式透明：底色透明 + 轻微压暗，交给下层页面透出（配合毛玻璃更有质感）。
 */
export function brandBgStyle(props: BrandHeaderProps): Record<string, string> {
  if (props.bg_mode === 'gradient') {
    return { background: `linear-gradient(90deg, ${props.gradient_from} 0%, ${props.gradient_to} 100%)` }
  }
  if (props.bg_mode === 'immersive') {
    return { background: 'rgba(255,255,255,0.72)' }
  }
  return { background: props.background_color }
}

/** 标题实际颜色（深色背景走 *_light） */
export function resolveTitleColor(props: BrandHeaderProps): string {
  return isDarkBrandBg(props.bg_mode) ? props.title_color_light : props.title_color
}

/** 副标题实际颜色 */
export function resolveSubtitleColor(props: BrandHeaderProps): string {
  if (!props.subtitle) return ''
  return isDarkBrandBg(props.bg_mode) ? props.subtitle_color_light : props.subtitle_color
}

/** 分隔线实际颜色 */
export function resolveDividerColor(props: BrandHeaderProps): string {
  return isDarkBrandBg(props.bg_mode) ? props.divider_color_light : props.divider_color
}

/**
 * 🔴 顶栏标题可用宽度：容器宽 - 左内边距 - 右侧胶囊预留 - 右内边距。
 * 画布用它判断「标题是否过长会撞到胶囊」，从而给出红色警示。
 */
export function safeTextWidth(containerWidth: number, props: BrandHeaderProps): number {
  return Math.max(
    containerWidth
      - props.bar_padding_left
      - Math.max(props.bar_padding_right, CAPSULE_SAFE_WIDTH)
      - props.item_gap,
    0,
  )
}

/** 估算文本像素宽（CJK 按 1em、ASCII 按 0.55em 估），用于碰撞预警 */
export function estimateTextWidth(text: string, fontSize: number): number {
  let units = 0
  for (const ch of text || '') {
    units += /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(ch) ? 1 : 0.55
  }
  return units * fontSize
}
