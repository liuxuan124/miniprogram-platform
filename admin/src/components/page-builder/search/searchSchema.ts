/**
 * components/page-builder/search/searchSchema.ts
 * 搜索组件（Search）Props 的**唯一真相源**。
 *
 * 为什么要有这个文件（沿用 bannerSchema.ts 的口径）：
 *   属性面板（SearchProps.vue）与画布渲染（SearchRenderer.vue）必须读同一批配置。
 *   以前两边各写一份默认值，结果出现「面板里改了画布不变」「面板显示轮播 3 秒、
 *   实际按 0 跑」这类漂移。现在统一从本文件取：
 *     - SEARCH_DEFAULT_PROPS     默认值
 *     - normalizeSearchProps()  归一化 + 边界夹紧（**幂等**、纯函数）
 *     - SEARCH_PROPS_SCHEMA     JSON Schema（对外契约说明）
 *
 * 🔴 向后兼容铁律（已发布的小程序不能被新后台改坏）：
 *   1. 旧字段 `placeholder`（单个字符串）、`scope`（单值枚举）继续被识别；
 *   2. 新字段一律「有值才生效」，缺省走默认值，绝不改变老配置的**跳转行为**；
 *   3. 归一化只读不写原始对象，**不修改 props 引用**（否则触发 Vue 无限更新）。
 *
 * ⚠️ 旧 `scope: 'content'`（内容/长文）的映射说明：
 *   新一轮勾选项里没有独立的「内容」，最接近的是「专栏/课程」。
 *   两者在小程序端的跳转目标完全一致（都是 /pages/search/search），
 *   所以 legacy 映射到 column **不会改变任何已上线页面的行为**。
 */

import { clampNumber } from '../banner/bannerSchema'

/* ------------------------------------------------------------------ */
/* 类型                                */
/* ------------------------------------------------------------------ */

/** 检索范围 key。空数组 = 全部（与旧 `scope:'all'` 等价） */
export type SearchScopeKey = 'product' | 'column' | 'activity' | 'file'

/** 右侧附加交互 */
export type SearchRightAction = 'none' | 'button' | 'scan' | 'category'

/** 点击搜索框的落地目标 */
export type SearchTapTarget = 'search' | 'link' | 'popup'

/** 框体风格 */
export type SearchShape = 'capsule' | 'soft' | 'square'

/** 内容对齐 */
export type SearchAlign = 'left' | 'center'

export interface SearchProps {
  /* 基础内容 */
  /** 多词轮播提示词；单条 ≤20 字符，最多 6 条。空数组回落到默认词 */
  placeholders: string[]
  /** 轮播间隔（秒），1~10 */
  placeholder_interval: number

  /* 检索范围 */
  /** 勾选范围；**空数组 = 全部**（不是「什么都不搜」） */
  scopes: SearchScopeKey[]

  /* 扩展功能 */
  right_action: SearchRightAction
  /** right_action === 'button' 时的按钮文案 */
  right_action_text: string
  tap_target: SearchTapTarget
  /** tap_target === 'link' 时的落地路径 */
  link_url: string

  /* 样式 */
  shape: SearchShape
  align: SearchAlign
  bg_color: string
  text_color: string
  /** 边框粗细 0~2px；0 = 无边框 */
  border_width: number
  border_color: string

  /* 吸顶常驻 */
  sticky: boolean
  /** 吸顶时覆盖在内容之上的背景色（不填则沿用 bg_color） */
  sticky_bg: string
}

/* ------------------------------------------------------------------ */
/* 常量：区间与选项                */
/* ------------------------------------------------------------------ */

/** 单条提示词字数上限 */
export const SEARCH_PLACEHOLDER_MAX_LEN = 20
/** 提示词条数上限（再多画布就挤不下了） */
export const SEARCH_PLACEHOLDER_MAX_ITEMS = 6
/** 轮播间隔区间（秒） */
export const SEARCH_PLACEHOLDER_INTERVAL = { min: 1, max: 10, step: 1, fallback: 3 } as const
/** 边框粗细区间 */
export const SEARCH_BORDER_WIDTH = { min: 0, max: 2, step: 1, fallback: 1 } as const

/** 检索范围选项。**不包含「全部」** —— 全部由「空数组」表达，避免 all 与各项并存产生歧义 */
export const SEARCH_SCOPE_OPTIONS: Array<{ value: SearchScopeKey; label: string; desc: string }> = [
  { value: 'product', label: '商品', desc: '商城在售商品' },
  { value: 'column', label: '专栏/课程', desc: '付费专栏与课程' },
  { value: 'activity', label: '活动', desc: '报名中的活动' },
  { value: 'file', label: '资料库', desc: '可下载资料' },
]

/** 旧 scope 单值 → 新 scopes 数组。'all' → 空数组（=全部） */
const LEGACY_SCOPE_MAP: Record<string, SearchScopeKey[]> = {
  all: [],
  product: ['product'],
  // 旧「内容」与新「专栏/课程」跳转目标一致，映射后行为不变
  content: ['column'],
  article: ['column'],
  column: ['column'],
  activity: ['activity'],
  file: ['file'],
}

export const SEARCH_RIGHT_ACTION_OPTIONS: Array<{ value: SearchRightAction; label: string }> = [
  { value: 'none', label: '无' },
  { value: 'button', label: '搜索按钮' },
  { value: 'scan', label: '扫一扫' },
  { value: 'category', label: '分类' },
]

export const SEARCH_TAP_TARGET_OPTIONS: Array<{ value: SearchTapTarget; label: string; desc: string }> = [
  { value: 'search', label: '默认搜索页', desc: '进入小程序原生搜索结果页' },
  { value: 'link', label: '自定义页面', desc: '跳到指定页面（如活动列表）' },
  { value: 'popup', label: '弹窗搜索', desc: '在当前页浮层内直接搜索' },
]

export const SEARCH_SHAPE_OPTIONS: Array<{ value: SearchShape; label: string; radius: number }> = [
  { value: 'capsule', label: '胶囊', radius: 20 },
  { value: 'soft', label: '微圆角', radius: 8 },
  { value: 'square', label: '直角', radius: 0 },
]

export const SEARCH_ALIGN_OPTIONS: Array<{ value: SearchAlign; label: string }> = [
  { value: 'left', label: '居左' },
  { value: 'center', label: '居中' },
]

/* ------------------------------------------------------------------ */
/* 默认值                 */
/* ------------------------------------------------------------------ */

export const SEARCH_DEFAULT_PLACEHOLDERS = ['搜索商品 / 文章 / 活动', '搜你想找的资料', '输入关键词试试']

export const SEARCH_DEFAULT_PROPS: SearchProps = {
  placeholders: [...SEARCH_DEFAULT_PLACEHOLDERS],
  placeholder_interval: SEARCH_PLACEHOLDER_INTERVAL.fallback,

  scopes: [],

  right_action: 'none',
  right_action_text: '搜索',
  tap_target: 'search',
  link_url: '',

  shape: 'capsule',
  align: 'left',
  bg_color: '#F4F7FB',
  text_color: '#8A94A6',
  border_width: 1,
  border_color: '#E3E8F0',

  sticky: false,
  sticky_bg: '#FFFFFF',
}

/* ------------------------------------------------------------------ */
/* 工具                */
/* ------------------------------------------------------------------ */

function pickString<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

/**
 * 归一化提示词列表。
 * 兼容三种来源：数组 / 单个字符串（旧 `placeholder`）/ 空。
 * 单条裁到 20 字（**按 Unicode 码点切**，避免把 emoji 劈成半个），
 * 丢掉 trim 后为空的条目，全空则回落默认词。
 */
export function normalizePlaceholders(raw: unknown): string[] {
  const list = Array.isArray(raw)
    ? raw
    : (typeof raw === 'string' && raw.trim() ? [raw] : [])

  const cleaned = list
    .map((item) => {
      const text = typeof item === 'string' ? item : String((item as any)?.text ?? '')
      return [...text.trim()].slice(0, SEARCH_PLACEHOLDER_MAX_LEN).join('')
    })
    .filter((text) => text.length > 0)
    .slice(0, SEARCH_PLACEHOLDER_MAX_ITEMS)

  return cleaned.length ? cleaned : [...SEARCH_DEFAULT_PLACEHOLDERS]
}

/** 归一化检索范围：过滤非法 key、去重；空数组 = 全部 */
export function normalizeScopes(raw: unknown, legacyScope?: unknown): SearchScopeKey[] {
  const valid = SEARCH_SCOPE_OPTIONS.map((o) => o.value)
  let source: unknown = raw

  // 新字段缺失时读旧 scope 单值
  if (!Array.isArray(source)) {
    const legacy = String(legacyScope ?? '').trim()
    source = legacy ? (LEGACY_SCOPE_MAP[legacy] ?? []) : []
  }

  if (!Array.isArray(source)) return []

  const seen = new Set<SearchScopeKey>()
  const result: SearchScopeKey[] = []
  for (const item of source) {
    const key = String(item || '').trim() as SearchScopeKey
    if (!valid.includes(key) || seen.has(key)) continue
    seen.add(key)
    result.push(key)
  }
  return result
}

/**
 * 归一化整个 Search props。
 * **纯函数**：不改传入对象，返回全新对象。
 */
export function normalizeSearchProps(raw: Record<string, any> | undefined | null): SearchProps {
  const p = raw && typeof raw === 'object' ? raw : {}

  return {
    placeholders: normalizePlaceholders(p.placeholders !== undefined ? p.placeholders : p.placeholder),
    placeholder_interval: clampNumber(
      p.placeholder_interval,
      SEARCH_PLACEHOLDER_INTERVAL.min,
      SEARCH_PLACEHOLDER_INTERVAL.max,
      SEARCH_PLACEHOLDER_INTERVAL.step,
      SEARCH_PLACEHOLDER_INTERVAL.fallback,
    ),

    scopes: normalizeScopes(p.scopes, p.scope),

    right_action: pickString(p.right_action, ['none', 'button', 'scan', 'category'] as const, 'none'),
    right_action_text: String(p.right_action_text || '搜索').slice(0, 6),
    tap_target: pickString(p.tap_target, ['search', 'link', 'popup'] as const, 'search'),
    link_url: String(p.link_url || '').trim(),

    shape: pickString(p.shape, ['capsule', 'soft', 'square'] as const, 'capsule'),
    align: pickString(p.align, ['left', 'center'] as const, 'left'),
    bg_color: String(p.bg_color || SEARCH_DEFAULT_PROPS.bg_color),
    text_color: String(p.text_color || SEARCH_DEFAULT_PROPS.text_color),
    border_width: clampNumber(
      p.border_width,
      SEARCH_BORDER_WIDTH.min,
      SEARCH_BORDER_WIDTH.max,
      SEARCH_BORDER_WIDTH.step,
      SEARCH_BORDER_WIDTH.fallback,
    ),
    border_color: String(p.border_color || SEARCH_DEFAULT_PROPS.border_color),

    sticky: p.sticky === undefined ? false : !!p.sticky,
    sticky_bg: String(p.sticky_bg || SEARCH_DEFAULT_PROPS.sticky_bg),
  }
}

/** 框体圆角最终值（px） */
export function resolveSearchRadius(shape: SearchShape): number {
  return SEARCH_SHAPE_OPTIONS.find((o) => o.value === shape)?.radius ?? 20
}

/** 范围摘要：空数组 = 全部 */
export function scopeSummary(scopes: SearchScopeKey[]): string {
  if (!scopes.length) return '全部'
  return SEARCH_SCOPE_OPTIONS.filter((o) => scopes.includes(o.value)).map((o) => o.label).join(' / ')
}

/** 范围是否只勾了活动（小程序端据此跳活动列表页，保持旧行为） */
export function isActivityOnly(scopes: SearchScopeKey[]): boolean {
  return scopes.length === 1 && scopes[0] === 'activity'
}

/** 是否全部（空数组） */
export function isAllScope(scopes: SearchScopeKey[]): boolean {
  return scopes.length === 0
}

/**
 * 实际生效的背景色。
 *
 * 🔴 CSS 没法表达「常态用 A 色、吸顶后换 B 色」而不加滚动监听，
 *    所以开启吸顶时**全程**用吸顶底色（运营选它就是要它常驻在顶部）；
 *    没单独配 sticky_bg 则沿用常态底色，保证至少可读、不透明穿帮。
 *
 * ⚠️ 此规则必须与 miniapp/utils/search-props.js 的 effectiveBg 一致。
 */
export function resolveSearchBg(props: SearchProps): string {
  return props.sticky ? (props.sticky_bg || props.bg_color) : props.bg_color
}

/* ------------------------------------------------------------------ */
/* JSON Schema（对外契约说明 / 校验用）            */
/* ------------------------------------------------------------------ */

export const SEARCH_PROPS_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://zfculture.site/schemas/search-props.json',
  title: 'SearchProps（搜索组件配置）',
  type: 'object',
  additionalProperties: true,
  properties: {
    placeholders: {
      type: 'array',
      description: '轮播提示词列表；单条 ≤20 字符，最多 6 条。为空则回落默认词',
      maxItems: SEARCH_PLACEHOLDER_MAX_ITEMS,
      items: { type: 'string', maxLength: SEARCH_PLACEHOLDER_MAX_LEN },
    },
    placeholder: { type: 'string', description: '旧字段：单个提示词（仍被识别，新逻辑优先读 placeholders）' },
    placeholder_interval: {
      type: 'number',
      minimum: SEARCH_PLACEHOLDER_INTERVAL.min,
      maximum: SEARCH_PLACEHOLDER_INTERVAL.max,
      default: SEARCH_PLACEHOLDER_INTERVAL.fallback,
      description: '轮播间隔（秒）',
    },

    scopes: {
      type: 'array',
      description: '检索范围；空数组 = 全部',
      items: { type: 'string', enum: SEARCH_SCOPE_OPTIONS.map((o) => o.value) },
      default: [],
    },
    scope: { type: 'string', description: '旧字段：单值范围（all/product/content/activity）' },

    right_action: { type: 'string', enum: ['none', 'button', 'scan', 'category'], default: 'none' },
    right_action_text: { type: 'string', default: '搜索', maxLength: 6 },
    tap_target: { type: 'string', enum: ['search', 'link', 'popup'], default: 'search' },
    link_url: { type: 'string', default: '', description: 'tap_target=link 时的落地路径' },

    shape: { type: 'string', enum: ['capsule', 'soft', 'square'], default: 'capsule' },
    align: { type: 'string', enum: ['left', 'center'], default: 'left' },
    bg_color: { type: 'string', default: SEARCH_DEFAULT_PROPS.bg_color },
    text_color: { type: 'string', default: SEARCH_DEFAULT_PROPS.text_color },
    border_width: { type: 'number', minimum: 0, maximum: 2, default: 1 },
    border_color: { type: 'string', default: SEARCH_DEFAULT_PROPS.border_color },

    sticky: { type: 'boolean', default: false, description: '页面滚动时吸顶常驻' },
    sticky_bg: { type: 'string', default: SEARCH_DEFAULT_PROPS.sticky_bg },
  },
} as const