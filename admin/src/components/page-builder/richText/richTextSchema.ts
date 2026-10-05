/**
 * components/page-builder/richText/richTextSchema.ts
 * 富文本（Rich Text）Props 的**唯一真相源**。
 *
 * 与 Banner / ArticleFeed / BrandHeader 同一套路：面板与画布都只读本文件的
 * normalizeRichTextProps()，避免「面板改了画布不变」。
 *
 * 🔴 向后兼容铁律：
 *  1. 老配置只有 `content`（HTML 字符串）与 `text_color`/`background_color`；
 *     新增排版字段一律「有值才生效」，缺省走默认值，**不改变老页面观感**；
 *  2. 容器样式与富文本内部样式**彻底解耦** —— 字号/行高/段距挂在容器上靠继承生效，
 *     不去逐个改内联 style，否则改一次要重排全文。
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 容器背景 */
export type RichContainerBg = 'none' | 'card' | 'paper'
/** 提示卡片风格 */
export type CalloutStyle = 'point' | 'warn' | 'notice' | 'conclusion'
/** 图片对齐 */
export type RichImgAlign = 'left' | 'center' | 'full'

export interface RichTextProps {
  /** 富文本 HTML（唯一内容源） */
  content: string

  /* ---- 全局排版规范（作用于容器，子元素继承） ---- */
  base_font_size: number
  text_color: string
  /** 行高倍数：1.5 / 1.75 / 2.0 */
  line_height: 1.5 | 1.75 | 2
  /** 段落间距 px */
  paragraph_gap: number

  /* ---- 外层容器 ---- */
  padding_x: number
  padding_y: number
  margin_y: number
  container_bg: RichContainerBg
  container_radius: boolean

  /* ---- 兼容字段（老配置） ---- */
  background_color?: string
}

/* ------------------------------------------------------------------ */
/* 常量                                                                */
/* ------------------------------------------------------------------ */

export const BASE_FONT_SIZE = { min: 12, max: 18, step: 1, fallback: 14 } as const
export const PARAGRAPH_GAP = { min: 4, max: 16, step: 1, fallback: 8 } as const
export const PADDING_X = { min: 0, max: 24, step: 1, fallback: 16 } as const
export const PADDING_Y = { min: 0, max: 24, step: 1, fallback: 12 } as const
export const MARGIN_Y = { min: 0, max: 32, step: 1, fallback: 8 } as const

/** 编辑框高度（面板内） */
export const EDITOR_HEIGHT = { min: 200, max: 500, step: 20, fallback: 240 } as const

export const LINE_HEIGHT_OPTIONS = [
  { value: 1.5, label: '1.5 倍' },
  { value: 1.75, label: '1.75 倍' },
  { value: 2, label: '2.0 倍' },
]

export const CONTAINER_BG_OPTIONS = [
  { value: 'none', label: '无' },
  { value: 'card', label: '卡片底' },
  { value: 'paper', label: '纸质感' },
]

/**
 * 提示卡片（Callout）预设。
 * ⚠️ 内联样式随 HTML 下发 —— 小程序 `rich-text` 对外部 class 支持极差，
 *    写在 WXSS 里端上不生效，所以必须内联（与既有「要点卡/警示卡」做法一致）。
 */
export const CALLOUT_PRESETS: Record<CalloutStyle, {
  label: string
  icon: string
  desc: string
  style: string
  labelColor: string
}> = {
  point: {
    label: '知识要点',
    icon: '💡',
    desc: '绿色左标',
    style: 'margin:1em 0;padding:12px 14px;background:#f7faf8;border-left:4px solid #2f9350;border-radius:0 10px 10px 0;color:#4a5568;',
    labelColor: '#2f7a42',
  },
  warn: {
    label: '避坑警示',
    icon: '⚠️',
    desc: '橙色左标',
    style: 'margin:1em 0;padding:12px 14px;background:#fffaef;border-left:4px solid #d97706;border-radius:0 10px 10px 0;color:#7a5b16;',
    labelColor: '#b45309',
  },
  notice: {
    label: '政策通知',
    icon: '📌',
    desc: '蓝色左标',
    style: 'margin:1em 0;padding:12px 14px;background:#f4f8fd;border-left:4px solid #2b6cb0;border-radius:0 10px 10px 0;color:#3d4f63;',
    labelColor: '#2b6cb0',
  },
  conclusion: {
    label: '核心结论',
    icon: '🎯',
    desc: '紫色左标',
    style: 'margin:1em 0;padding:12px 14px;background:#f8f5fd;border-left:4px solid #6b46c1;border-radius:0 10px 10px 0;color:#4a3f63;',
    labelColor: '#6b46c1',
  },
}

export const CALLOUT_OPTIONS = (Object.keys(CALLOUT_PRESETS) as CalloutStyle[]).map((key) => ({
  value: key,
  label: CALLOUT_PRESETS[key].label,
  icon: CALLOUT_PRESETS[key].icon,
  desc: CALLOUT_PRESETS[key].desc,
}))

export const IMG_ALIGN_OPTIONS: Array<{ value: RichImgAlign; label: string }> = [
  { value: 'left', label: '居左' },
  { value: 'center', label: '居中' },
  { value: 'full', label: '铺满' },
]

/** 项目品牌预设色（文字色 / 高亮色共用） */
export const RICH_TEXT_PRESET_COLORS = [
  '#333333', '#172033', '#C08E6E', '#002FA7',
  '#2f7a42', '#b45309', '#c0392b', '#6b46c1',
]

/* ------------------------------------------------------------------ */
/* 默认值                                                              */
/* ------------------------------------------------------------------ */

export const RICH_TEXT_DEFAULT_PROPS: RichTextProps = {
  content: '',

  base_font_size: BASE_FONT_SIZE.fallback,
  text_color: '#333333',
  line_height: 1.75,
  paragraph_gap: PARAGRAPH_GAP.fallback,

  padding_x: PADDING_X.fallback,
  padding_y: PADDING_Y.fallback,
  margin_y: MARGIN_Y.fallback,
  container_bg: 'none',
  container_radius: true,
}

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

/** 数值夹紧（先判空再 Number —— Number('')===0 会把清空输入框变成区间最小值） */
export function clampRichNumber(
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

/* ------------------------------------------------------------------ */
/* 归一化                                                              */
/* ------------------------------------------------------------------ */

/** 归一化富文本 props。**纯函数**，不改传入对象。 */
export function normalizeRichTextProps(raw: Record<string, any> | undefined | null): RichTextProps {
  const p = raw && typeof raw === 'object' ? raw : {}
  return {
    content: String(p.content || ''),
    base_font_size: clampRichNumber(p.base_font_size ?? p.font_size, BASE_FONT_SIZE.min, BASE_FONT_SIZE.max, BASE_FONT_SIZE.step, BASE_FONT_SIZE.fallback),
    text_color: String(p.text_color || '#333333'),
    line_height: pickEnum(Number(p.line_height), [1.5, 1.75, 2] as const, 1.75),
    paragraph_gap: clampRichNumber(p.paragraph_gap, PARAGRAPH_GAP.min, PARAGRAPH_GAP.max, PARAGRAPH_GAP.step, PARAGRAPH_GAP.fallback),
    padding_x: clampRichNumber(p.padding_x, PADDING_X.min, PADDING_X.max, PADDING_X.step, PADDING_X.fallback),
    padding_y: clampRichNumber(p.padding_y, PADDING_Y.min, PADDING_Y.max, PADDING_Y.step, PADDING_Y.fallback),
    margin_y: clampRichNumber(p.margin_y, MARGIN_Y.min, MARGIN_Y.max, MARGIN_Y.step, MARGIN_Y.fallback),
    container_bg: pickEnum(p.container_bg, ['none', 'card', 'paper'] as const, 'none'),
    container_radius: p.container_radius === undefined ? true : !!p.container_radius,
    background_color: p.background_color ? String(p.background_color) : undefined,
  }
}

/* ------------------------------------------------------------------ */
/* 渲染侧派生                                                          */
/* ------------------------------------------------------------------ */

/** 容器背景色（none = 透明） */
export function richContainerBg(bg: RichContainerBg): string {
  if (bg === 'card') return '#ffffff'
  if (bg === 'paper') return '#faf7f0'
  return 'transparent'
}

/**
 * 容器样式：字号/行高/字色挂容器靠**继承**生效，
 * 不去逐个改内联 style —— 否则改一次字号要重排全文 HTML，且会与粘贴来的内联样式打架。
 */
export function richContainerStyle(props: RichTextProps): Record<string, string> {
  const style: Record<string, string> = {
    fontSize: `${props.base_font_size}px`,
    color: props.text_color,
    lineHeight: String(props.line_height),
    paddingLeft: `${props.padding_x}px`,
    paddingRight: `${props.padding_x}px`,
    paddingTop: `${props.padding_y}px`,
    paddingBottom: `${props.padding_y}px`,
    marginTop: `${props.margin_y}px`,
    marginBottom: `${props.margin_y}px`,
    background: props.container_bg === 'none'
      ? (props.background_color || 'transparent')
      : richContainerBg(props.container_bg),
  }
  if (props.container_bg !== 'none' && props.container_radius) {
    style.borderRadius = '10px'
  }
  return style
}

/** 去掉 HTML 标签后的纯文本（字数统计 / 空态判定共用） */
export function richTextPlain(html: string): string {
  return String(html || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s/g, '')
}

/** 空态判定：有标签但没文字（如仅 <p><br></p>）也算空 */
export function isRichTextEmpty(html: string): boolean {
  const plain = richTextPlain(html)
  if (plain) return false
  // 允许纯图片内容
  return !/<img\b/i.test(String(html || ''))
}
