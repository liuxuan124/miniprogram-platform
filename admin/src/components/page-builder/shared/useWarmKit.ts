import { computed, unref } from 'vue'
import type { MaybeRef } from 'vue'
/**
 * 19 个新组件的 Editor / Runtime 共享基座逻辑
 *
 * 核心职责（对应需求「数据健壮性与向后兼容」）：
 *   1. Mock 兜底：所有字段经 pick/pickList 读取，缺失即用 defaultProps，**绝不返回 undefined**
 *   2. 事件隔离：编辑模式下 guardInteraction() 拦截跳转与手势误触
 *   3. 同源渲染：Editor 与 Runtime 共用同一份归一化结果，避免「后台所见 ≠ 线上」
 */
import {
  guardInteraction,
  pick,
  pickList,
  pickNum,
  pickBool,
} from './contract'

export interface NormalizedBase {
  /** 归一化后的 props（已套 defaultProps 兜底） */
  safe: Record<string, any>
  /** 可见条目（已按 limit 截断） */
  items: any[]
  /** 事件隔离处理函数 */
  guard: (e: Event) => void
  /** 是否编辑模式 */
  editing: boolean
  /** 卡片底色（空则纸感默认） */
  bg: string
  /** 强调色 */
  accent: string
}

export interface UseWarmKitOptions {
  /** 兜底用的 defaultProps 工厂 */
  defaults: () => Record<string, any>
  /** 参与归一化的 props 对象 */
  source?: any
  /**
   * 是否编辑模式。
   * 允许传 boolean 或 ref/computed —— 各组件的 props 本身就是 computed，
   * 声明成 boolean 会让 TS2322 报 ComputedRef 不能赋给 boolean。
   * 内部统一用 unref 解包。
   */
  editorMode?: MaybeRef<boolean>
  /** 条目数组字段名 */
  itemKey?: string
  /** 条目截断上限字段名，0/false=不截断 */
  limitKey?: string
}

/**
 * 建立一套已兜底 + 已隔离的渲染上下文
 * 每个组件的 editor.vue / runtime.vue 都调它，保证 19 个组件行为完全一致
 */
export function useWarmKit(opts: UseWarmKitOptions) {
  const source = computed(() => unref(opts.source) || {})
  const editing = computed(() => !!unref(opts.editorMode))

  /** 兜底：先取组件 props，缺字段再取 defaultProps */
  const safe = computed(() => {
    const base = opts.defaults() || {}
    const raw = source.value || {}
    const merged: Record<string, any> = { ...base }
    for (const key of Object.keys(base)) {
      merged[key] = raw[key] === undefined ? base[key] : raw[key]
    }
    for (const key of Object.keys(raw)) {
      if (merged[key] === undefined) merged[key] = raw[key]
    }
    return merged
  })

  /** 条目：非数组给空数组，再按 limit 截断 */
  const items = computed(() => {
    const list = pickList(safe.value, opts.itemKey || 'items')
    const limit = opts.limitKey ? pickNum(safe.value, opts.limitKey, 0) : 0
    if (limit > 0) return list.slice(0, Math.max(1, Math.floor(limit)))
    return list
  })

  function guard(e: Event) {
    guardInteraction(editing.value, e)
  }

  return {
    safe,
    items,
    guard,
    editing,
    bg: computed(() => pick(safe.value, 'bgColor', '')),
    accent: computed(() => pick(safe.value, 'accentColor', '#C2410C')),
  }
}

export { pick, pickList, pickNum, pickBool, guardInteraction }
