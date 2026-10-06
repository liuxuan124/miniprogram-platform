import { describe, it, expect } from 'vitest'
import {
  formatDateTimeFull,
  formatDateTimeShort,
  formatDateOnly,
} from '@/utils/datetime'

/**
 * ============================================================================
 * 时间格式化：绝不能依赖 toLocaleString 的输出宽度
 * ============================================================================
 *
 * 2026-10-06 一天内，同一个 bug 被抓到**两次**：
 *   · pages-hub    `toLocaleString('zh-CN').slice(5, 16)` → 「10/6 07:15:」
 *   · releases-hub `toLocaleString('zh-CN').slice(0, 16)` → 「2026/10/3 18:56:」
 *
 * 根因：`toLocaleString('zh-CN')` **不补零**，所以输出长度随日期跳变：
 *   `2026/10/3 18:56:00`  → 18 字符
 *   `2026/12/25 08:00:00` → 19 字符
 * 而原代码固定 `slice(0, 16)` → 在 10/3 上切出 `2026/10/3 18:56:`（露出秒的冒号），
 * 在 12/25 上却碰巧正常。
 *
 * 🔴 这就是它能躲过肉眼 review 的原因：**不是一直坏，是看日期**。
 *    必须用测试钉死。
 */

describe('formatDateTimeFull —— 完整格式', () => {
  it('🔴 单数字月份/日期必须补零，且输出长度恒为 16', () => {
    const s = formatDateTimeFull('2026-10-06 07:15:00')
    expect(s).toBe('2026-10-06 07:15')
    expect(s).toHaveLength(16)
  })

  it('🔴 绝不含尾部孤立冒号（原 bug 症状）', () => {
    for (const input of [
      '2026-10-06 07:15:00',
      '2026-10-03 18:56:00',
      '2026-12-25 00:00:00',
      '2026-01-05 08:03:00',
      '2026-03-08 23:59:59',
    ]) {
      const s = formatDateTimeFull(input)
      expect(s).not.toMatch(/:\s*$/)
      expect(s).not.toContain('::')
      expect(s).toHaveLength(16)
    }
  })

  it('🔴 跨月跨年长度完全不变', () => {
    const lens = [
      '2026-10-06 07:15:00',
      '2026-12-25 18:30:00',
      '2026-01-05 00:00:00',
      '2027-03-08 12:00:00',
    ].map((x) => formatDateTimeFull(x).length)
    expect(new Set(lens).size).toBe(1)
  })

  it('全字段补零正确', () => {
    expect(formatDateTimeFull('2026-01-05 08:03:00')).toBe('2026-01-05 08:03')
    expect(formatDateTimeFull('2026-11-09 09:09:00')).toBe('2026-11-09 09:09')
  })

  it('斜杠格式也能解析（后端可能返回 2026/10/6）', () => {
    expect(formatDateTimeFull('2026/10/06 07:15:00')).toBe('2026-10-06 07:15')
  })

  it('空值 / 无效值 → 占位符', () => {
    expect(formatDateTimeFull(null)).toBe('—')
    expect(formatDateTimeFull(undefined)).toBe('—')
    expect(formatDateTimeFull('')).toBe('—')
    expect(formatDateTimeFull('不是时间')).toBe('—')
  })

  it('兼容 iOS：带横杠的空格分隔格式必须replace 成斜杠', () => {
    // 🔴 new Date('2026-10-06 07:15:00') 在 iOS/WebView 是 Invalid Date（项目铁律）
    const s = formatDateTimeFull('2026-10-06 07:15:00')
    expect(s).not.toBe('—')
    expect(s).toBe('2026-10-06 07:15')
  })

  it('支持时间戳入参', () => {
    const ts = new Date(2026, 9, 6, 7, 15).getTime()
    expect(formatDateTimeFull(ts)).toBe('2026-10-06 07:15')
  })
})

describe('formatDateTimeShort —— 列表短格式', () => {
  it('输出 MM-DD HH:mm，恒 11 字符', () => {
    const s = formatDateTimeShort('2026-10-06 07:15:00')
    expect(s).toBe('10-06 07:15')
    expect(s).toHaveLength(11)
  })

  it('🔴 同样不出现尾部冒号', () => {
    for (const input of ['2026-10-06 07:15:00', '2026-10-16 23:59:59']) {
      expect(formatDateTimeShort(input)).not.toMatch(/:\s*$/)
    }
  })

  it('今年不显示年份（列表里都是今年的页）', () => {
    expect(formatDateTimeShort('2026-10-06 07:15:00')).toBe('10-06 07:15')
  })
})

describe('formatDateOnly —— 仅日期', () => {
  it('输出 MM-DD', () => {
    expect(formatDateOnly('2026-10-06 07:15:00')).toBe('10-06')
  })

  it('空值 → 占位符', () => {
    expect(formatDateOnly(null)).toBe('—')
  })
})

/**
 * 回归对照：把原来的错误实现也跑一遍，证明测试确实能抓住它。
 *
 * 🔴 实测数据（Node 22 / ICU full）：
 *   new Date('2026/10/3 18:56:00').toLocaleString('zh-CN')  →"2026/10/3 18:56:00"  **18 字符**
 *   new Date('2026/12/25 08:00:00').toLocaleString('zh-CN')→ "2026/12/25 08:00:00" **19 字符**
 *   （我最初以为都是 15/16，**错了**；真正的问题是**长度随日期跳变**）
 *
 * 所以原代码 `slice(0, 16)` 在 10/3 上会切出 `2026/10/3 18:56:`
 *  （把秒的冒号露出来），在 12/25 上却"碰巧正常"。
 * 这就是为什么这个 bug 能躲过肉眼 review —— **它不是一直坏，是看日期**.
 */
describe('🔴 反例：旧实现确实会坏（证明测试有效）', () => {
  const toLocale = (v: string) =>
    new Date(v.replace(/-/g, '/')).toLocaleString('zh-CN', { hour12: false })

  it('前提：locale 输出长度随日期跳变（月/日不补零）', () => {
    const short = toLocale('2026/10/3 18:56:00') // 月 1 位、日 1 位
    const long = toLocale('2026/12/25 08:00:00') // 两位
    expect(short).toHaveLength(18)
    expect(long).toHaveLength(19)
    // 🔴 这就是根因：固定 slice 长度必然在某些日期切错
    expect(short.length).not.toBe(long.length)
  })

  it('旧 slice(0,16) 在单数字日期上会露出秒的冒号', () => {
    expect(toLocale('2026/10/3 18:56:00').slice(0, 16)).toMatch(/:\s*$/)
  })

  it('同一个 slice 在两位日期上碰巧正常 —— 所以肉眼 review 会漏掉', () => {
    expect(toLocale('2026/12/25 08:00:00').slice(0, 16)).toBe('2026/12/25 08:00')
  })

  it('而新实现在两种日期下都稳定', () => {
    expect(formatDateTimeFull('2026-10-03 18:56:00')).toBe('2026-10-03 18:56')
    expect(formatDateTimeFull('2026-12-25 08:00:00')).toBe('2026-12-25 08:00')
  })
})