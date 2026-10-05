import { describe, it, expect } from 'vitest'
import {
  normalizeArticleFeedProps,
  resolveLayoutPreset,
  hidesCoverInLayout,
  usesHeroFirst,
  resolveHeroArticle,
  FEED_LAYOUT_GROUPS,
  FEED_PRESET_TO_LAYOUT,
  FEED_BADGE_TEXT,
  PIN_MAX_LIMIT,
} from '@/components/page-builder/articleFeed/articleFeedSchema'

/**
 * 覆盖本轮（2026-10-06）新增的布局体系与卡片要素：
 *  ① 6 大版式 preset ↔ 既有 layout 双向映射（不新增未在端上注册的布局）
 *  ② show_badge（布尔）→ show_badges（数组）的 Schema Migration
 *  ③ 新字段默认值必须「不改变老页面观感」
 */
describe('articleFeed · 6 大版式映射', () => {
  it('6 大版式各自映射到端上已实现的 layout（不新增未注册 key）', () => {
    expect(FEED_LAYOUT_GROUPS).toHaveLength(6)
    for (const g of FEED_LAYOUT_GROUPS) {
      expect(FEED_PRESET_TO_LAYOUT[g.key]).toBe(g.layout)
    }
  })

  it('preset → layout → preset 往返一致', () => {
    for (const g of FEED_LAYOUT_GROUPS) {
      expect(resolveLayoutPreset(g.layout)).toBe(g.key)
    }
  })

  it('未匹配的 layout 落到 classic（单列列表）', () => {
    expect(resolveLayoutPreset('editorial' as never)).toBe('classic')
  })

  it('纯文字版式强制隐藏封面；其它版式不隐藏', () => {
    expect(hidesCoverInLayout('compact')).toBe(true)
    expect(hidesCoverInLayout('list')).toBe(false)
    expect(hidesCoverInLayout('grid')).toBe(false)
  })
})

describe('articleFeed · 首篇焦点', () => {
  const base = normalizeArticleFeedProps({ layout: 'magazine' })

  it('hero_first 关闭后首篇不再走大图形态', () => {
    expect(usesHeroFirst(base, 0)).toBe(true)
    expect(usesHeroFirst({ ...base, hero_first: false }, 0)).toBe(false)
  })

  it('非 magazine 版式不启用首篇大图', () => {
    expect(usesHeroFirst({ ...base, layout: 'list' }, 0)).toBe(false)
  })

  it('焦点来源：auto 取第一篇 / pinned 取置顶首篇 / fixed 取指定', () => {
    const ordered = [{ id: 7 }, { id: 8 }]
    expect(resolveHeroArticle({ ...base, hero_source: 'auto' }, ordered)?.id).toBe(7)
    expect(
      resolveHeroArticle({ ...base, hero_source: 'pinned', pinned: [{ id: 99, title: '头条' }] }, ordered)?.id,
    ).toBe(99)
    expect(resolveHeroArticle({ ...base, hero_source: 'fixed', hero_article_id: 42 }, ordered)?.id).toBe(42)
  })

  it('fixed 未填 id 时返回 null（调用方回落到 index 0，不报错）', () => {
    expect(resolveHeroArticle({ ...base, hero_source: 'fixed', hero_article_id: '' }, [{ id: 1 }])).toBeNull()
  })
})

describe('articleFeed · 卡片要素与兼容迁移', () => {
  it('🔴 show_badge 布尔 → show_badges 数组（老配置观感不变）', () => {
    // 老配置：只有 show_badge=true（原本只管「原创」角标）
    expect(normalizeArticleFeedProps({ show_badge: true }).show_badges).toEqual(['original'])
    // 老配置关掉角标 → 不显示任何角标
    expect(normalizeArticleFeedProps({ show_badge: false }).show_badges).toEqual([])
    // 显式给了数组就以数组为准
    expect(normalizeArticleFeedProps({ show_badge: true, show_badges: ['pinned', 'audio'] }).show_badges)
      .toEqual(['pinned', 'audio'])
  })

  it('show_badges 剔除非法项并去重', () => {
    const cfg = normalizeArticleFeedProps({ show_badges: ['original', '不存在的', 'original', 'video'] })
    expect(cfg.show_badges).toEqual(['original', 'video'])
  })

  it('show_metrics 非数组时回落空数组（面板不渲染出空 checkbox 组）', () => {
    expect(normalizeArticleFeedProps({}).show_metrics).toEqual([])
    expect(normalizeArticleFeedProps({ show_metrics: 'views' }).show_metrics).toEqual([])
    expect(normalizeArticleFeedProps({ show_metrics: ['views', '坏值'] }).show_metrics).toEqual(['views'])
  })

  it('角标文案齐全（端上与画布共用同一份，不各写一套）', () => {
    for (const key of ['pinned', 'featured', 'latest', 'original', 'deep_report',
      'audio', 'video', 'member_only', 'free_limited'] as const) {
      expect(FEED_BADGE_TEXT[key]).toBeTruthy()
    }
  })

  it('🔴 新字段默认值不改变老页面观感', () => {
    const old = normalizeArticleFeedProps({ layout: 'list', show_cover: true, show_date: true })
    expect(old.hero_first).toBe(true)          // magazine 一直以来的行为
    expect(old.divider_style).toBe('line')     // 对应老 list 的细线观感
    expect(old.cover_position).toBe('right')   // 端上原本就是右图
    expect(old.show_column_tag).toBe(false)
    expect(old.show_cta).toBe(false)
    expect(old.show_metrics).toEqual([])
    expect(old.excerpt_color).toBe('#666666')
  })

  it('归一化不修改传入对象', () => {
    const raw = { show_badges: ['original'], hero_source: '' }
    const snap = JSON.stringify(raw)
    normalizeArticleFeedProps(raw)
    expect(JSON.stringify(raw)).toBe(snap)
  })

  it('置顶上限仍生效（回归保护）', () => {
    const many = { pinned: [1, 2, 3, 4, 5].map((id) => ({ id, title: `t${id}` })) }
    expect(normalizeArticleFeedProps(many).pinned.length).toBeLessThanOrEqual(PIN_MAX_LIMIT)
  })
})
