/**
 * 列表型接口响应的统一解包。
 *
 * ============================ 为什么需要这个文件 ============================
 * 2026-10-06 两次踩坑，一次比一次严重：
 *
 * 1. 「页面配置显示 0 条」—— 6 处把 `size` 传成 200/300/500，
 *    后端 PageDTO.normalize() 明确 `pageSize > 100` 抛 100101，
 *    而各处都写成 `d?.records || d?.list || []`，
 *    **错误响应被静默降级成空数组** → 误判成「一个页面都没有」。
 *
 * 2. 「模板管理白屏」—— templates.vue 写成 `data || []`，
 *    当接口返回 `{ data: {...对象} }` 时，
 *    `storeTemplates.filter is not a function` → **整页崩掉**。
 *
 * 🔴 这两个是同一类缺陷的两面：一面是"把错误当空数据"，一面是"把对象当数组"。
 *    共同的根因都是**假设了响应的形状**。
 *
 * 所以规则只有一条：**调用方不许自己解包，一律走这里**。
 * 它保证三件事：
 *   · 不认识的结构一律降级为**空数组**（永不把对象丢出去让调用方 .filter 崩）；
 *   · 兼容裸数组 / records / list 三种历史形态；
 *   · 不抛异常 —— 拿不到数据是"空"，不是"崩"。
 */

/**
 * @param input  完整的 axios 响应，或已解包的业务数据
 * @returns 一定是数组；结构不认识时返回空数组
 */
export function toRecords<T = any>(input: unknown): T[] {
  const d = (input as any)?.data ?? input
  if (d == null) return []
  if (Array.isArray(d)) return d as T[]
  if (Array.isArray((d as any).records)) return (d as any).records as T[]
  if (Array.isArray((d as any).list)) return (d as any).list as T[]
  // 🔴 到这里说明结构不认识：返回空数组，
  //    而不是把对象原样返回 —— 后者会在调用方 .filter/.map 处抛异常。
  return []
}

/**
 * 带状态的结果，用于需要区分「真的是空」与「读不到」的界面。
 *
 * 用法：
 *   const r = toRecordsWithStatus(res)
 *   if (r.status === 'error')  → 显示"读取失败"，不能显示 0
 *   if (r.status === 'empty')  → 可以显示 0
 */
export function toRecordsWithStatus<T = any>(
  input: unknown,
): { status: 'ready' | 'empty' | 'error'; rows: T[]; message: string } {
  // 明确的业务错误码/消息 → error，不是 empty
  const code = (input as any)?.code
  const message = String((input as any)?.message || (input as any)?.msg || '')
  if (code != null && Number(code) !== 200 && Number(code) !== 0) {
    return { status: 'error', rows: [], message: message || `接口返回 code ${code}` }
  }

  const rows = toRecords<T>(input)
  return {
    status: rows.length ? 'ready' : 'empty',
    rows,
    message,
  }
}