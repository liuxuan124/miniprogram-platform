import { describe, it, expect } from 'vitest'

/**
 * ============================================================================
 * 页面管理：时间格式化 + AI 临时页识别（2026-10-06 回归）
 * ============================================================================
 *
 * 诊断报告里两个成立的问题，根因都不是"写得不够仔细"，而是**依赖了不该依赖的东西**：
 *
 * 1.「10/6 07:15:」—— 原代码 `toLocaleString('zh-CN').slice(5, 16)`，
 *    假设 locale 输出是 `2026/10/06 07:15:00`（16 字符），
 *    实际是 `2026/10/6 07:15:00`（**15 字符，月/日不补零**），
 *    切多一位 → 把秒的冒号露出来。
 *    🔴 这是**长度随日期跳变**的 bug：10/6 显示 `07:15:`，
 *       12/25 可能就正常 —— 极难靠肉眼发现规律。
 *
 * 2. AI 临时页混进「装修页」→ Tab 计数与表格「类型」列口径矛盾。
 */

/* ── 被测函数（与 pages-hub.vue 保持逐字一致的实现）────────────────────── */

export function formatPageTime(v?: string | number | null): string {
  if (v == null || v === '') return '—'
  const d = typeof v === 'number' ? new Date(v) : new Date(String(v).replace(/-/g, '/'))
  if (Number.isNaN(d.getTime())) return '—'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function isAiDraftPage(p: { path?: string }): boolean {
  return /(^|\/)pages\/custom\/ai-/.test(String(p?.path || ''))
}

/* ── 测试 ────────────────────────────────────────────────────────────── */

describe('formatPageTime —— 不依赖 locale 输出宽度', () => {
  it('🔴 月/日必须补零，且输出长度恒为 11', () => {
    // 10/6 单数字日期是原bug 的触发条件
    const s = formatPageTime('2026-10-06 07:15:00')
    expect(s).toBe('10-06 07:15')
    expect(s).toHaveLength(11)
  })

  it('🔴 输出绝不含孤立的冒号结尾（原 bug 的症状）', () => {
    for (const input of [
      '2026-10-06 07:15:00',
      '2026-10-16 23:59:59',
      '2026-12-25 00:00:00',
      '2026-01-05 08:03:00',
    ]) {
      const s = formatPageTime(input)
      expect(s).not.toMatch(/:\s*$/) // 不能以冒号结尾
      expect(s).not.toContain('::')
      expect(s.length).toBe(11)
    }
  })

  it('🔴 跨月跨年长度不变（原来会随日期跳变）', () => {
    const lens = [
      '2026-10-06 07:15:00',
      '2026-12-25 18:30:00',
      '2026-01-05 00:00:00',
    ].map((x) => formatPageTime(x).length)
    expect(new Set(lens).size).toBe(1) // 全都相同
  })

  it('补零正确：个位数月/日都补到两位', () => {
    expect(formatPageTime('2026-01-05 08:03:00')).toBe('01-05 08:03')
    expect(formatPageTime('2026-11-09 09:09:00')).toBe('11-09 09:09')
  })

  it('小时/分钟补零', () => {
    expect(formatPageTime('2026-10-06 07:05:00')).toBe('10-06 07:05')
    expect(formatPageTime('2026-10-06 23:00:00')).toBe('10-06 23:00')
  })

  it('空值 / 无效值 → 占位符，不显示 Invalid Date', () => {
    expect(formatPageTime(null)).toBe('—')
    expect(formatPageTime(undefined)).toBe('—')
    expect(formatPageTime('')).toBe('—')
    expect(formatPageTime('不是时间')).toBe('—')
  })

  it('兼容 iOS/WebView 的非标准格式（横杠→斜杠）', () => {
    // new Date('2026-10-06 07:15:00') 在 iOS 是 Invalid Date，这是项目铁律
    expect(formatPageTime('2026-10-06 07:15:00')).toBe('10-06 07:15')
  })

  it('支持时间戳入参', () => {
    const ts = new Date(2026, 9, 6, 7, 15).getTime()
    expect(formatPageTime(ts)).toBe('10-06 07:15')
  })
})

describe('isAiDraftPage —— 识别AI 临时页', () => {
  it('识别后端生成的 ai- 前缀路径', () => {
    expect(isAiDraftPage({ path: '/pages/custom/ai-1a10b24ce5b' })).toBe(true)
    expect(isAiDraftPage({ path: 'pages/custom/ai-abc123' })).toBe(true)
  })

  it('正常装修页不误判', () => {
    expect(isAiDraftPage({ path: '/pages/custom/p-l3k2j' })).toBe(false)
    expect(isAiDraftPage({ path: '/pkg-content/note-detail' })).toBe(false)
    expect(isAiDraftPage({ path: '/pages/index/index' })).toBe(false)
  })

  it('🔴 不能靠名称判断——名称被后端截断过，且可能再变', () => {
    // 名称里没有"AI"字样，只有 path 有 —— 说明按名称判断必然漏
    expect(isAiDraftPage({ path: '/pages/custom/ai-xyz' })).toBe(true)
  })

  it('空/异常入参不崩', () => {
    expect(isAiDraftPage({})).toBe(false)
    expect(isAiDraftPage({ path: '' })).toBe(false)
  })

  it('不为空时必须返回布尔值（不能是 undefined）', () => {
    // 🔴 返回 undefined 会在 filter 里被当falsy 用，导致「全部」Tab 少算
    expect(typeof isAiDraftPage({ path: '/x' })).toBe('boolean')
    expect(typeof isAiDraftPage({})).toBe('boolean')
  })
})