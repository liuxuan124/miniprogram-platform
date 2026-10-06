import { describe, it, expect } from 'vitest'
import { toRecords } from '@/utils/list-response'

/**
 * ============================================================================
 * 列表响应解析：接口返回"不认识的结构"时必须降级为空，而不是崩溃
 * ============================================================================
 *
 * 起因（2026-10-06 实测）：templates.vue 写的是
 *   storeTemplates.value = ((res as any)?.data || []) as ReleaseRecord[]
 * 当接口返回 `{ code: 100101, message: '...' }` 这类**错误对象**时，
 * `data` 为 undefined → `|| []` 生效，看起来没事；
 * 但当接口返回 `{ data: {...对象...} }`（结构变化 / 包了一层）时，
 * `data` 就是对象，随后 `.find()` / `.filter()` / `.map()` 全部抛：
 *   TypeError: X.value.filter is not a function  → 整个页面白屏。
 *
 * 🔴 与 2026-10-06 那次「页面配置显示 0 条」是**同一类缺陷的两面**：
 *    那次是"把错误当空数据静默吞掉"，这次是"把对象当数组直接崩"。
 *    正确做法只有一个：**显式判断类型，永不假设形状**。
 *
 * 把解析逻辑抽成纯函数，才能真正测到它 —— 直接测 .vue 组件会连带
 * Element Plus / pinia / 路由，测不出这一层。
 *
 * ⚠️ 本文件**导入真实的 `utils/list-response.ts`**，不在这里另写一份副本。
 *    测试里复制一份实现是最常见的自欺：改了解析逻辑测试却还在绿。
 */

describe('列表响应解析的健壮性（2026-10-06 白屏回归）', () => {
  it('正常：裸数组', () => {
    expect(toRecords([{ id: 1 }])).toHaveLength(1)
  })

  it('正常：ApiResponse 包一层数组', () => {
    expect(toRecords({ code: 200, data: [{ id: 1 }, { id: 2 }] })).toHaveLength(2)
  })

  it('正常：PageResult 的 records', () => {
    expect(toRecords({ code: 200, data: { records: [{ id: 1 }], total: 1 } })).toHaveLength(1)
  })

  it('正常：历史形态的 list', () => {
    expect(toRecords({ code: 200, data: { list: [{ id: 1 }] } })).toHaveLength(1)
  })

  it('🔴 错误响应（后端抛异常）→ 空数组，不崩', () => {
    const res = { code: 100101, message: '每页数量不能超过 100' }
    expect(() => toRecords(res)).not.toThrow()
    expect(toRecords(res)).toEqual([])
  })

  it('🔴 data 是对象（结构变化）→ 空数组，不把对象当数组', () => {
    const res = { code: 200, data: { total: 0, extra: 'whatever' } }
    const rows = toRecords(res)
    expect(rows).toEqual([])
    // 这是白屏的直接原因：rows.filter is not a function
    expect(() => rows.filter(Boolean)).not.toThrow()
    expect(() => rows.map((x: any) => x)).not.toThrow()
    expect(() => rows.find(Boolean)).not.toThrow()
  })

  it('🔴 data 是字符串 → 空数组', () => {
    expect(toRecords({ code: 200, data: 'ok' })).toEqual([])
    expect(() => toRecords({ code: 200, data: 'ok' }).filter(Boolean)).not.toThrow()
  })

  it('🔴 null / undefined / 数字 → 空数组', () => {
    expect(toRecords(null)).toEqual([])
    expect(toRecords(undefined)).toEqual([])
    expect(toRecords({ code: 200, data: null })).toEqual([])
    expect(toRecords({ code: 200, data: 0 })).toEqual([])
  })

  it('records 存在但不是数组（null）时也不能崩', () => {
    const rows = toRecords({ code: 200, data: { records: null, list: [{ id: 9 }] } })
    // records 为 null 应继续尝试 list，而不是 `records || list` 的假回退
    expect(rows).toHaveLength(1)
  })
})