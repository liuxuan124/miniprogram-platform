import { describe, it, expect } from 'vitest'
import {
  previewMockEnabled,
  findMockLeak,
  isMockColumn,
  MOCK_ID_PREFIX,
} from '@/components/page-builder/columnConfig'

/**
 * ============================================================================
 * 演示数据漏出到用户可见预览（2026-10-06 回归）
 * ============================================================================
 *
 * 起因：搭建工作台的诊断报告指出「精品专栏展示『专栏名称示例一』
 *『用于占位第二张卡，可直接替换文案』」——运营以为是自己配的内容。
 *
 * 根因：`previewMockEnabled` 缺省返回 **true**，即「DSL 里没有 preview_mock 键
 * 就开mock」。于是**任何没配专栏的页面，预览里都会冒出 6 条研发演示数据**。
 *
 * 🔴 这类缺陷靠看界面很难发现（界面"看起来正常"），
 *    所以必须用测试钉死缺省值的语义。
 */

describe('previewMockEnabled —— 演示数据缺省语义', () => {
  it('🔴 缺省必须是 false：没有该键就不开 mock', () => {
    // 这一条是本次修复的核心断言。
    // 如果哪天有人"为了编辑器体验好"改回 true，这条会红。
    expect(previewMockEnabled(undefined)).toBe(false)
    expect(previewMockEnabled(null as any)).toBe(false)
    expect(previewMockEnabled({})).toBe(false)
  })

  it('显式写 false → 不开 mock', () => {
    expect(previewMockEnabled({ preview_mock: false })).toBe(false)
  })

  it('显式写 true → 开 mock（装修器可显式开启）', () => {
    expect(previewMockEnabled({ preview_mock: true })).toBe(true)
  })

  it('其他真值不等于 true：只有严格 true 才开', () => {
    expect(previewMockEnabled({ preview_mock: 1 })).toBe(true)
    expect(previewMockEnabled({ preview_mock: 'yes' })).toBe(true)
  })

  it('preview_mock 为 null 视同缺省 → 不开', () => {
    expect(previewMockEnabled({ preview_mock: null })).toBe(false)
  })
})

describe('isMockColumn —— 演示 id 识别', () => {
  it('识别 __mock_ 前缀', () => {
    expect(isMockColumn('__mock_1')).toBe(true)
    expect(isMockColumn(MOCK_ID_PREFIX + '99')).toBe(true)
  })

  it('真实 id 不误判', () => {
    expect(isMockColumn(123)).toBe(false)
    expect(isMockColumn('real-column-id')).toBe(false)
    expect(isMockColumn(undefined)).toBe(false)
    expect(isMockColumn(null)).toBe(false)
  })
})

describe('findMockLeak —— 发布前体检：检测占位内容', () => {
  it('干净配置不报漏项', () => {
    const cfg = {
      title: '跨境财税实操',
      nav: [{ text: '首页', pagePath: 'pages/index/index' }],
      columns: [{ id: 'c1', title: '2026 政策更新', price: '¥199' }],
    }
    expect(findMockLeak(cfg)).toEqual([])
  })

  it('🔴 检测到 preview_mock 开启 → 报漏项', () => {
    const hits = findMockLeak({ preview_mock: true })
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.join()).toContain('演示数据')
  })

  it('🔴 检测到「示例N」占位文案', () => {
    const hits = findMockLeak({ title: '专栏名称示例一', desc: '用于占位第二张卡' })
    expect(hits.length).toBeGreaterThan(0)
  })

  it('检测到「新入口」默认导航名', () => {
    const hits = findMockLeak({ nav: [{ text: '新入口', url: '/pages/index/index' }] })
    expect(hits.join()).toContain('新入口')
  })

  it('检测到 TODO', () => {
    const hits = findMockLeak({ title: 'TODO 补充文案' })
    expect(hits.join()).toContain('TODO')
  })

  it('undefined / 空对象不崩', () => {
    expect(findMockLeak(undefined)).toEqual([])
    expect(findMockLeak({})).toEqual([])
  })

  it('🔴 真实业务文案不被误判', () => {
    // "示例"两字连用但不带数字，不该命中「示例N」
    const cfg = { title: '这个功能的使用示例说明', desc: '例如：跨境税率查询' }
    const hits = findMockLeak(cfg)
    expect(hits.join()).not.toContain('示例')
  })
})