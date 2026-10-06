import { describe, it, expect } from 'vitest'
import { extractTemplateSkeleton } from '@/utils/template-thumb'

/**
 * ============================================================================
 * 模板搜索 + 可交互预览（2026-10-06）
 * ============================================================================
 *
 * 这轮做了三件事：
 *   ① 搜索框（原来完全没有检索入口，22 个页面模板只能靠滚动）
 *   ② 二级场景筛选从一级 Tab 那一行挪下来（主次不分）
 *   ③ 预览从「单张静态图」改成「底部 tab 可点击切页的手机壳」
 *
 * ③ 的核心是**状态不能脏**：换模板要回到第 1 页、页数变少要夹紧下标，
 * 否则会停在不存在的页上、显示空白。
 */

/* ── 被测的搜索逻辑（与 templates.vue 的 matchKeyword 逐字一致）─────── */

function makeMatcher(keyword: string) {
  return (...fields: unknown[]): boolean => {
    const raw = keyword.trim().toLowerCase()
    if (!raw) return true
    // 🔴 分词 OR：与 templates.vue 的 matchKeyword 逐字一致
    const words = raw.split(/\s+/).filter(Boolean)
    const haystack = fields.map((f) => String(f ?? '').toLowerCase()).join(' \u0001 ')
    return words.some((w) => haystack.includes(w))
  }
}

describe('模板搜索匹配', () => {
  it('空关键词 → 全部通过（不改变原行为）', () => {
    const m = makeMatcher('')
    expect(m('任意模板')).toBe(true)
    expect(m(undefined, null)).toBe(true)
  })

  it('纯空格也视为空（输入框常有 trailing space）', () => {
    expect(makeMatcher('   ')('x')).toBe(true)
  })

  it('名称命中', () => {
    const m = makeMatcher('暖阁')
    expect(m('暖阁整店', 'warm', 'content')).toBe(true)
  })

  it('分类/场景命中', () => {
    const m = makeMatcher('knowledge')
    expect(m('知识付费整店', 'knowledge_pay', 'edu')).toBe(true)
  })

  it('任一字段命中即可（不需要全中）', () => {
    const m = makeMatcher('零售')
    expect(m('现代零售整店', 'retail')).toBe(true)
  })

  it('大小写不敏感', () => {
    expect(makeMatcher('WARM')('暖阁整店', 'warm')).toBe(true)
    expect(makeMatcher('warm')('暖阁整店', 'WARM')).toBe(true)
  })

  it('🔴 中英混输按空格拆词（任一词命中即可）', () => {
    // 回归：原来用整串 includes，搜「知识 knowledge」永远搜不到「知识付费整店」
    const m = makeMatcher('知识 knowledge')
    expect(m('知识付费整店', 'knowledge_pay')).toBe(true)
    // 只命中中文那半也该算命中
    expect(makeMatcher('知识 xxx')('知识付费整店')).toBe(true)
    // 只命中英文那半也算
    expect(makeMatcher('xxx knowledge')('知识付费整店', 'knowledge_pay')).toBe(true)
    // 两半都不命中才false
    expect(makeMatcher('知识 xxx')('服饰商城')).toBe(false)
  })

  it('无匹配 → false', () => {
    expect(makeMatcher('不存在的模板')('暖阁整店', 'warm')).toBe(false)
  })

  it('🔴 null/undefined 字段不崩（缺 name 的模板很常见）', () => {
    const m = makeMatcher('x')
    expect(() => m(undefined, null, '')).not.toThrow()
    expect(m(undefined, null, '')).toBe(false)
  })

  it('中英文混合关键词', () => {
    expect(makeMatcher('知识 knowledge')('知识付费整店', 'knowledge_pay')).toBe(true)
  })
})

describe('可交互预览：页数与状态', () => {
  const makeItem = (pages: Array<{ name: string; types: string[] }>) =>
    ({
      templateCode: 'test',
      snapshot: JSON.stringify({
        pages: pages.map((p) => ({
          name: p.name,
          dslContent: JSON.stringify({
            components: p.types.map((t) => ({ type: t })),
          }),
        })),
      }),
    }) as any

  it('解析出真实页数（预览 tab 个数应等于它）', () => {
    const sk = extractTemplateSkeleton(
      makeItem([
        { name: '首页', types: ['warm_home'] },
        { name: '商城', types: ['warm_shop'] },
        { name: '我的', types: ['brand_header'] },
      ]),
    )
    expect(sk).toHaveLength(3)
    expect(sk.map((s) => s.label)).toEqual(['首页', '商城', '我的'])
  })

  it('单页模板只出1 个 tab（不会多画）', () => {
    const sk = extractTemplateSkeleton(makeItem([{ name: '单页', types: ['banner'] }]))
    expect(sk).toHaveLength(1)
  })

  it('标签名超长时被截断（避免手机壳底部文字撑破）', () => {
    const sk = extractTemplateSkeleton(
      makeItem([{ name: '这是一个非常非常长的页面名称', types: ['banner'] }]),
    )
    expect(sk[0].label.length).toBeLessThanOrEqual(6)
  })

  it('🔴 换模板后页数变少，夹紧逻辑有依据（用越界下标模拟）', () => {
    // 这条测的是"为什么需要 watch 夹紧"：
    // 上一个模板 5 页时 active 可能=4，新模板只有 3 页 → 越界 → 空白
    const before = extractTemplateSkeleton(
      makeItem(Array.from({ length: 5 }, (_, i) => ({ name: `页${i}`, types: ['banner'] }))),
    )
    const after = extractTemplateSkeleton(
      makeItem(Array.from({ length: 3 }, (_, i) => ({ name: `页${i}`, types: ['banner'] }))),
    )
    expect(before).toHaveLength(5)
    expect(after).toHaveLength(3)
    // 组件里 active=4 时访问 after[4] = undefined → current 为 null → 走空态
    expect(after[4]).toBeUndefined()
  })

  it('每个页面的块数不为 0（否则预览是空屏）', () => {
    const sk = extractTemplateSkeleton(
      makeItem([
        { name: '首页', types: ['warm_home'] },
        { name: '商城', types: ['warm_shop'] },
      ]),
    )
    for (const p of sk) {
      expect(p.blocks.length).toBeGreaterThan(0)
    }
  })

  it('不同页面的块数可以不同（反映真实结构差异）', () => {
    const sk = extractTemplateSkeleton(
      makeItem([
        { name: '首页', types: ['warm_home'] },
        { name: '详情', types: ['banner', 'text'] },
      ]),
    )
    expect(sk[0].blocks.length).not.toBe(sk[1].blocks.length)
  })
})