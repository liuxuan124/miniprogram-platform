import { describe, it, expect } from 'vitest'
import {
  normalizeNoteFeedProps,
  normalizeTypeTab,
  deriveLegacyFields,
  resolvePageLayout,
  tabSummary,
  noteContainerStyle,
  clampNoteNumber,
  PAGE_SIZE,
  TITLE_SIZE,
  ITEM_GAP,
  NOTE_FEED_DEFAULT_PROPS,
} from '@/components/page-builder/noteFeed/noteFeedSchema'

/**
 * 覆盖本轮点名的缺陷：
 *  ① 旧页签结构 filter_type='type' / category_id 单值 → 新结构，历史草稿零改动可用
 *  ② 标题字号 32 旧口径 → 折回新范围（不照搬，否则真机只有 8px）
 *  ③ Number('')===0 会把清空输入框变成区间最小值
 */
describe('noteFeedSchema · 页签归一化与兼容', () => {
  it('旧 filter_type=type 迁移为 all + content_types', () => {
    const tab = normalizeTypeTab({ filter_type: 'type', content_type: 'article' })
    expect(tab.filter_type).toBe('all')
    expect(tab.content_types).toEqual(['article'])
  })

  it('旧 category_id 单值迁移为 category_ids 数组', () => {
    expect(normalizeTypeTab({ filter_type: 'category', category_id: '12' }).category_ids).toEqual(['12'])
    expect(normalizeTypeTab({ filter_type: 'category', category_ids: ['1', '2'] }).category_ids).toEqual(['1', '2'])
  })

  it('旧 title 迁移为 label', () => {
    expect(normalizeTypeTab({ title: '好物' }).label).toBe('好物')
  })

  it('非法值被剔除/回落，不产生脏枚举', () => {
    const tab = normalizeTypeTab({
      filter_type: 'weird',
      content_types: ['note', '不存在的类型'],
      sort: 'nope',
      layout: 'nope',
      content_ids: ['x', 3],
    })
    expect(tab.filter_type).toBe('all')
    expect(tab.content_types).toEqual(['note'])
    expect(tab.sort).toBe('new')
    expect(tab.layout).toBe('')
    expect(tab.content_ids).toEqual([3])
  })

  it('保存时补齐旧字段，保证未升级端可降级渲染', () => {
    const legacy = deriveLegacyFields(normalizeTypeTab({ content_types: ['moment'], category_ids: ['9'] }))
    expect(legacy.content_type).toBe('moment')
    expect(legacy.category_id).toBe('9')
  })
})

describe('noteFeedSchema · 归一化与字号口径', () => {
  it('🔴 标题字号收敛到 13~18px，旧口径值折半（32 → 16）', () => {
    // 旧值 32 表示「设计稿 2 倍口径」，折半后是 16px
    expect(normalizeNoteFeedProps({ title_size: 32 }).title_size).toBe(16)
    expect(normalizeNoteFeedProps({ title_size: 24 }).title_size).toBe(TITLE_SIZE.min)
    expect(normalizeNoteFeedProps({ title_size: 16 }).title_size).toBe(16)
    expect(normalizeNoteFeedProps({ title_size: 99 }).title_size).toBe(TITLE_SIZE.max)
    expect(normalizeNoteFeedProps({}).title_size).toBe(TITLE_SIZE.fallback)
  })

  it('清空输入框回落默认而不是夹到区间最小值', () => {
    expect(normalizeNoteFeedProps({ page_size: '' }).page_size).toBe(PAGE_SIZE.fallback)
    expect(normalizeNoteFeedProps({ item_gap: null }).item_gap).toBe(ITEM_GAP.fallback)
    expect(clampNoteNumber('', 13, 18, 1, 15)).toBe(15)
    expect(clampNoteNumber([], 4, 16, 1, 10)).toBe(10)
  })

  it('老配置只有 layout 时其余走默认值', () => {
    const cfg = normalizeNoteFeedProps({ layout: 'wechat' })
    expect(cfg.layout).toBe('wechat')
    expect(cfg.page_size).toBe(PAGE_SIZE.fallback)
    expect(cfg.text_card).toBe(true)
    expect(cfg.card_bg).toBe('#ffffff')
    expect(cfg.background_color).toBe('#f7f7f7')
  })

  it('type_tabs 为空时给一个默认页签（避免画布空数据）', () => {
    expect(normalizeNoteFeedProps({}).type_tabs).toHaveLength(1)
    expect(normalizeNoteFeedProps({ type_tabs: [] }).type_tabs).toHaveLength(1)
  })

  it('本页版式：优先页签覆盖，否则跟随全局', () => {
    const global = 'masonry' as const
    expect(resolvePageLayout(undefined, global)).toBe('masonry')
    expect(resolvePageLayout(normalizeTypeTab({ layout: '' }), global)).toBe('masonry')
    expect(resolvePageLayout(normalizeTypeTab({ layout: 'list' }), global)).toBe('list')
  })

  it('折叠摘要含内容形式/筛选/排序', () => {
    const s = tabSummary(normalizeTypeTab({ content_types: ['note', 'article'], sort: 'hot' }))
    expect(s).toContain('笔记/长文')
    expect(s).toContain('最热')
    expect(tabSummary(normalizeTypeTab({}))).toContain('全部形式')
  })

  it('容器样式：列表底色 + 左右边距', () => {
    const st = noteContainerStyle(normalizeNoteFeedProps({ background_color: '#eee', page_gutter: 12 }))
    expect(st.background).toBe('#eee')
    expect(st.paddingLeft).toBe('12px')
  })

  it('归一化不修改传入对象', () => {
    const raw = { title_size: '', type_tabs: [{ filter_type: 'type', content_type: 'note' }] }
    const snap = JSON.stringify(raw)
    normalizeNoteFeedProps(raw)
    expect(JSON.stringify(raw)).toBe(snap)
  })

  it('默认配置自身通过归一化', () => {
    const cfg = normalizeNoteFeedProps(NOTE_FEED_DEFAULT_PROPS as Record<string, unknown>)
    expect(cfg.title_size).toBeGreaterThanOrEqual(TITLE_SIZE.min)
    expect(cfg.title_size).toBeLessThanOrEqual(TITLE_SIZE.max)
  })
})
