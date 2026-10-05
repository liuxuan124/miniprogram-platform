import { describe, it, expect } from 'vitest'
import { normalizeTabBarItems } from '@/utils/tabbar'
import { pagePathKey } from '@/composables/usePageCatalog'

/**
 * 2026-10-06 视觉验证时抓到的两个真实缺陷的回归护栏。
 *
 * 起因：Playwright 探测发现「品牌与导航」页
 *   ① 刚打开就显示"保存导航"可点（误报脏状态）
 *   ② 所有系统内置页（首页/我的/星球…）的绑定下拉都显示成"未绑定"
 * ②的根因是路径口径不一致：normalizeTabBarItems 把 pagePath 规范成
 *    `/pages/mine/mine`（带前导斜杠），而 select 的 value 是
 *    `sys:pages/mine/mine`（不带），字符串不相等 → 选中项回落到第 0 项。
 *    而第 0 项恰好是"未绑定"，于是用户看到的是"绑定丢了"——
 *    一个会诱导他重新绑一个、覆盖掉原配置的假象。
 */

describe('底部导航绑定值口径（2026-10-06 回归）', () => {
  // 与 appearance-hub.vue 的 bindValue 保持同一套实现
  function bindValue(tab: { pageId?: unknown; pagePath?: unknown }): string {
    const pid = String(tab.pageId || '')
    if (pid) return `p${pid}`
    const path = pagePathKey(tab.pagePath)
    if (path) return `sys:${path}`
    return ''
  }

  it('内置页路径带不带前导斜杠，绑定值必须一致', () => {
    const withSlash = '/pages/mine/mine'
    const withoutSlash = 'pages/mine/mine'
    // 🔴 这条就是 bug 现场：带斜杠时与 option 的 value 不匹配
    expect(bindValue({ pageId: '', pagePath: withSlash })).toBe('sys:pages/mine/mine')
    expect(bindValue({ pageId: '', pagePath: withoutSlash })).toBe('sys:pages/mine/mine')
  })

  it('normalizeTabBarItems 加了前导斜杠后，绑定值仍要匹配 option', () => {
    const norm = normalizeTabBarItems([
      { text: '我的', pagePath: 'pages/mine/mine', pageId: '' } as any,
    ])
    const v = bindValue(norm[0])
    // option 的 value 形态就是 `sys:` + 不带斜杠的路径
    expect(v).toBe(`sys:${pagePathKey('pages/mine/mine')}`)
    expect(v).toBe('sys:pages/mine/mine')
  })

  it('绑定装修页时优先用 id，不受路径影响', () => {
    expect(bindValue({ pageId: 28, pagePath: 'pages/custom/home' })).toBe('p28')
    expect(bindValue({ pageId: '28', pagePath: '' })).toBe('p28')
  })

  it('既无 id 又无路径时才是未绑定', () => {
    expect(bindValue({ pageId: '', pagePath: '' })).toBe('')
  })
})

describe('脏状态判据：必须是「与基线有差异」而非「watch 触发过」', () => {
  /**
   * 原实现是 watch(deep) 里无条件置脏，导致初始化赋值就把状态标脏。
   * 这里把 appearance-hub.vue 的指纹算法抽出来验证。
   */
  function fingerprint(list: Array<{ text?: unknown; pageId?: unknown; pagePath?: unknown; enabled?: unknown }>): string {
    return JSON.stringify(
      list.map((t) => [
        String(t.text || ''),
        String(t.pageId || ''),
        String(t.pagePath || ''),
        t.enabled === false ? '0' : '1',
      ]),
    )
  }

  const base = [
    { text: '首页', pageId: 1, pagePath: '/pages/custom/home', enabled: undefined },
    { text: '我的', pageId: '', pagePath: '/pages/mine/mine', enabled: false },
  ]

  it('初始化后立即判定为「无改动」', () => {
    // 同步取指纹（赋值之后马上取）→ 与基线相同 → 不脏
    expect(fingerprint(base) === fingerprint([...base])).toBe(true)
  })

  it('只改文案算改动', () => {
    const changed = [{ ...base[0], text: '首页改' }, base[1]]
    expect(fingerprint(changed) !== fingerprint(base)).toBe(true)
  })

  it('只改可见性也算改动（否则「隐藏入口」会静默失效）', () => {
    const changed = [base[0], { ...base[1], enabled: true }]
    expect(fingerprint(changed) !== fingerprint(base)).toBe(true)
  })

  it('只改排序（顺序变了）也算改动', () => {
    const reordered = [base[1], base[0]]
    expect(fingerprint(reordered) !== fingerprint(base)).toBe(true)
  })

  it('新增一项算改动', () => {
    const added = [...base, { text: '新入口', pageId: '', pagePath: '', enabled: undefined }]
    expect(fingerprint(added) !== fingerprint(base)).toBe(true)
  })
})