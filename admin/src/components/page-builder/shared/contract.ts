/**
 * 19 个新增组件的共享低代码契约
 *
 * 三个渲染层共用同一套类型，保证 Schema / Editor / Runtime 永不失联：
 *   schema.ts     → 导出 Props 接口 + defaultProps 工厂 + formSchema 配置项定义
 *   editor.vue    → 消费 Props，画布渲染（含事件穿透保护）
 *   runtime.vue   → 消费 Props，移动端/小程序运行时渲染（精简标签）
 *   index.ts      → 导出 ComponentMeta（icon/label/category/defaultProps）
 */
import type { ComponentCategory, ComponentType } from '@/types/page'

/** 右侧配置项表单字段类型 */
export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'switch'
  | 'select'
  | 'color'
  | 'image'
  | 'link'
  | 'list'

/** 配置项表单字段定义 */
export interface FormField {
  /** 字段 key，对应 props 上的字段名 */
  key: string
  /** 中文标签 */
  label: string
  /** 控件类型 */
  type: FormFieldType
  /** select 专用：可选项 */
  options?: Array<{ label: string; value: string | number }>
  /** number 专用 */
  min?: number
  max?: number
  step?: number
  /** list 专用：子字段定义 */
  itemFields?: FormField[]
  /** 字段下方的灰色说明 */
  hint?: string
  /** 依赖显示：仅当该 props 字段为真值时显示本项 */
  showIf?: { key: string; equals?: unknown }
}

/** 配置项分组 */
export interface FormSection {
  /** 分组标题 */
  title: string
  /** 该组下的字段 */
  fields: FormField[]
}

/** 组件元数据（index.ts 统一导出） */
export interface ComponentMeta {
  /** 组件类型枚举值 */
  type: ComponentType
  /** 中文显示名 */
  label: string
  /** Element Plus 图标名 */
  icon: string
  /** 分类 */
  category: ComponentCategory | string
  /** 分类中文名 */
  categoryLabel: string
  /** 完整 mock 假数据 —— 拖入画布瞬间必须可视化 */
  defaultProps: () => Record<string, any>
  /** 默认样式 */
  defaultStyle: () => Record<string, any>
  /** 右侧配置项表单定义 */
  formSchema: FormSection[]
  /** 校验，返回警告数组 */
  validate?: (props: Record<string, any>) => string[]
}

/** 画布事件穿透保护：编辑模式下拦截跳转/手势误触 */
export interface EditorGuardOptions {
  /** 是否处于编辑模式（画布非预览态） */
  editorMode?: boolean
  /** 阻止的默认行为，默认 true */
  prevent?: boolean
}

/**
 * 统一的编辑态拦截处理
 * 所有带交互的组件（横滑/折叠/播放/芯片/卡片点击）都必须过这一层，
 * 防止运营在画布上误触跳到小程序页面导致编辑器状态丢失。
 */
export function guardInteraction(
  editorMode: boolean | undefined,
  e: Event,
  opts: { prevent?: boolean } = {},
): boolean {
  if (!editorMode) return false
  e.stopPropagation()
  if (opts.prevent !== false && 'preventDefault' in e) e.preventDefault()
  return true
}

/**
 * Mock 兜底读取器 —— 任何字段缺失都不许返回 undefined
 * 拖入画布白屏的根因 99% 是这里没做兜底
 */
export function pick<T>(source: any, key: string, fallback: T): T {
  if (!source || typeof source !== 'object') return fallback
  const v = source[key]
  if (v === undefined || v === null || v === '') return fallback
  return v as T
}

/** 数组兜底：非数组一律给空数组，绝不返回 undefined */
export function pickList(source: any, key: string): any[] {
  const v = source?.[key]
  return Array.isArray(v) ? v : []
}

/** 数字兜底 */
export function pickNum(source: any, key: string, fallback: number): number {
  const n = Number(source?.[key])
  return Number.isFinite(n) ? n : fallback
}

/** 布尔兜底 */
export function pickBool(source: any, key: string, fallback = false): boolean {
  const v = source?.[key]
  return typeof v === 'boolean' ? v : fallback
}
