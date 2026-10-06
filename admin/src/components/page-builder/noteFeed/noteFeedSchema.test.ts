import { describe, it, expect } from 'vitest'
import { normalizeNoteFeedProps, NOTE_FEED_DEFAULT_PROPS } from './noteFeedSchema'

/**
 * 两层导航样式字段（2026-10-06 新增）
 *
 * 🔴 本组的核心断言是**「老页面零视觉变化」**：
 * 此前这两层的底色/分割线/字号/间距全部硬编码在渲染器里，
 * 新增字段的默认值必须**逐字等于那些硬编码值**，
 * 否则老页面一加载导航就变色/分割线消失 —— 那是视觉突变。
 * 这些默认值就是线上现状，写错一个色值都会让所有存量页面跑偏。
 */
describe('noteFeed 两层导航样式', () => {
  it('缺省值 = 渲染器原硬编码值（老页面零变化）', () => {
    const c = normalizeNoteFeedProps({})
    // 首层
    expect(c.nav_bg).toBe('') // 原：无 background（透明）
    expect(c.nav_radius).toBe(0) // 原：无 border-radius
    expect(c.tab_bar_bg).toBe('') // 原：无 background
    expect(c.tab_divider_color).toBe('#f0f1f5') // 原：border-bottom 1px solid #f0f1f5
    expect(c.tab_text_color).toBe('#727a8c') // 原：.type-tab color
    expect(c.tab_gap).toBe(18) // 原：gap: 18px
    // 次层胶囊
    expect(c.sub_tab_font_size).toBe(12) // 原：font-size: 12px
    expect(c.sub_tab_text_color).toBe('#727a8c') // 原：.feed-tab color
    expect(c.sub_tab_bg).toBe('#f5f6f9') // 原：background #f5f6f9
    expect(c.sub_tab_active_bg).toBe('#ffedf1') // 原：.feed-tab.active background
    expect(c.sub_tab_active_color).toBe('#ec2f55') // 原：.feed-tab.active color
    expect(c.sub_tab_radius).toBe(999) // 原：border-radius: 999px
    expect(c.sub_tab_padding_x).toBe(14) // 原：padding 6px 14px
    expect(c.sub_tab_gap).toBe(8) // 原：gap: 8px
  })

  it('默认值与 DEFAULT_PROPS 一致（两处不能漂移）', () => {
    const c = normalizeNoteFeedProps({})
    const d = NOTE_FEED_DEFAULT_PROPS
    expect(c.tab_divider_color).toBe(d.tab_divider_color)
    expect(c.tab_text_color).toBe(d.tab_text_color)
    expect(c.sub_tab_bg).toBe(d.sub_tab_bg)
    expect(c.sub_tab_active_bg).toBe(d.sub_tab_active_bg)
    expect(c.sub_tab_active_color).toBe(d.sub_tab_active_color)
  })

  it('可覆盖：运营配的值能落库并反显', () => {
    const c = normalizeNoteFeedProps({
      nav_bg: '#0f1219',
      nav_radius: 12,
      tab_bar_bg: '#1b1f2a',
      tab_divider_color: '',
      tab_text_color: '#aab',
      tab_gap: 24,
      sub_tab_font_size: 15,
      sub_tab_bg: '#222',
      sub_tab_active_bg: '#ec2f55',
      sub_tab_active_color: '#fff',
      sub_tab_radius: 8,
      sub_tab_padding_x: 20,
      sub_tab_gap: 12,
    })
    expect(c.nav_bg).toBe('#0f1219')
    expect(c.nav_radius).toBe(12)
    expect(c.tab_gap).toBe(24)
    expect(c.sub_tab_font_size).toBe(15)
    expect(c.sub_tab_radius).toBe(8)
    expect(c.sub_tab_padding_x).toBe(20)
    expect(c.sub_tab_gap).toBe(12)
  })

  it('空串 = 主动关掉分割线（与「缺省」区分开）', () => {
    // 显式传 '' → 不画线
    expect(normalizeNoteFeedProps({ tab_divider_color: '' }).tab_divider_color).toBe('')
    // 不传→ 回落原硬编码色
    expect(normalizeNoteFeedProps({}).tab_divider_color).toBe('#f0f1f5')
    // null 也视为主动关掉
    expect(normalizeNoteFeedProps({ tab_divider_color: null }).tab_divider_color).toBe('')
  })

  it('🔴 0 是合法值，不能被吞成默认值', () => {
    const c = normalizeNoteFeedProps({
      nav_radius: 0,
      tab_gap: 0,
      sub_tab_gap: 0,
      sub_tab_padding_x: 4,
    })
    expect(c.nav_radius).toBe(0)
    expect(c.tab_gap).toBe(0) // 若用 `Number(x) || 18` 这里会变 18
    expect(c.sub_tab_gap).toBe(0)
    expect(c.sub_tab_padding_x).toBe(4)
  })

  it('越界夹紧', () => {
    const c = normalizeNoteFeedProps({
      nav_radius: 999,
      tab_gap: -5,
      sub_tab_font_size: 100,
      sub_tab_radius: 5000,
      sub_tab_padding_x: 1,
    })
    expect(c.nav_radius).toBe(40)
    expect(c.tab_gap).toBe(0)
    expect(c.sub_tab_font_size).toBe(20)
    expect(c.sub_tab_radius).toBe(999)
    expect(c.sub_tab_padding_x).toBe(4)
  })

  it('非法值回落默认（不产生 NaN）', () => {
    const c = normalizeNoteFeedProps({
      tab_gap: 'abc',
      sub_tab_font_size: null,
      nav_radius: undefined,
    })
    expect(c.tab_gap).toBe(18)
    expect(c.sub_tab_font_size).toBe(12)
    expect(c.nav_radius).toBe(0)
    expect(Number.isFinite(c.tab_gap)).toBe(true)
  })

  it('老页面其它字段不受影响', () => {
    const c = normalizeNoteFeedProps({ show_search: true, page_size: 20 })
    expect(c.show_search).toBe(true)
    expect(c.page_size).toBe(20)
    expect(c.tab_active_style).toBe('bar')
  })
})


/* ============================================================
 * 2026-10-06 第二批：指示器颜色 / 搜索图标 / 卡片阴影
 * ============================================================ */
describe('noteFeedSchema —— 解写死第二批（2026-10-06）', () => {
  it('🔴 老页面零变化：指示器缺省 = #ec2f55（改前写死的红条）', () => {
    const c = normalizeNoteFeedProps({})
    expect(c.tab_indicator_color).toBe('#ec2f55')
  })

  it('🔴 老页面零变化：搜索图标色缺省 = 空（跟随未选文字色）', () => {
    const c = normalizeNoteFeedProps({})
    expect(c.search_icon_color).toBe('')
  })

  it('🔴 关键：阴影缺省必须是 light 而不是 none（原渲染器本就写了微光）', () => {
    const c = normalizeNoteFeedProps({})
    // 若回落 none，所有老页面加载后会集体「丢失阴影」
    expect(c.card_shadow).toBe('light')
    // 且必须与改前的原值对应
    expect(NOTE_FEED_DEFAULT_PROPS.card_shadow).toBe('light')
  })

  it('阴影预设四档都能落库，非法值回落 light', () => {
    expect(normalizeNoteFeedProps({ card_shadow: 'none' }).card_shadow).toBe('none')
    expect(normalizeNoteFeedProps({ card_shadow: 'normal' }).card_shadow).toBe('normal')
    expect(normalizeNoteFeedProps({ card_shadow: 'custom' }).card_shadow).toBe('custom')
    expect(normalizeNoteFeedProps({ card_shadow: 'xxx' }).card_shadow).toBe('light')
  })

  it('自定义阴影 5 个键都有值（缺一会被 shadow:0 吞掉）', () => {
    const c = normalizeNoteFeedProps({ card_shadow: 'custom' })
    expect(c.card_shadow_custom).toBeDefined()
    for (const k of ['x', 'y', 'blur', 'spread', 'color']) {
      expect(c.card_shadow_custom).toHaveProperty(k)
    }
  })

  it('自定义阴影越界被夹紧，且不产生 NaN', () => {
    const c = normalizeNoteFeedProps({ card_shadow_custom: { x: 999, y: -999, blur: 'abc', spread: null } })
    const b = c.card_shadow_custom
    expect(Number.isFinite(b.x)).toBe(true)
    expect(Number.isFinite(b.y)).toBe(true)
    expect(Number.isFinite(b.blur)).toBe(true)
    expect(Number.isFinite(b.spread)).toBe(true)
    expect(b.x).toBeLessThanOrEqual(20)
    expect(b.y).toBeGreaterThanOrEqual(-20)
    //非法值回落缺省 blur=12
    expect(b.blur).toBe(12)
  })

  it('⚠️ 空串与缺省要区分：显式空串= 跟随激活色，不回落红条', () => {
    // 缺省 → 拿到红条（老页面不变）
    expect(normalizeNoteFeedProps({}).tab_indicator_color).toBe('#ec2f55')
    // 显式空串 → 保持空（渲染器据此回退激活主色）
    expect(normalizeNoteFeedProps({ tab_indicator_color: '' }).tab_indicator_color).toBe('')
  })

  it('部分传入的自定义阴影不丢键（浅合并陷阱）', () => {
    const c = normalizeNoteFeedProps({ card_shadow_custom: { x: 4 } })
    expect(c.card_shadow_custom.x).toBe(4)
    // 其余键必须有缺省，不能是 undefined
    expect(typeof c.card_shadow_custom.y).toBe('number')
    expect(typeof c.card_shadow_custom.blur).toBe('number')
    expect(typeof c.card_shadow_custom.spread).toBe('number')
    expect(typeof c.card_shadow_custom.color).toBe('string')
  })

  it('本批新增字段不影响其它字段（旧配置不变）', () => {
    const c = normalizeNoteFeedProps({})
    expect(c.tab_gap).toBe(18)
    expect(c.sub_tab_bg).toBe('#f5f6f9')
    // ⚠️ show_search **未传时缺省是 false**（Schema 原实现如此），
    // 面板开关必须用 `=== true` 判断，写成 `!== false` 会让未配置显示成「开」
    // 但渲染器不画图标 —— 面板与画布对不上。
    expect(c.show_search).toBe(false)
  })
})
