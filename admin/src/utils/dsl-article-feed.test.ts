import { describe, it, expect } from 'vitest'
import {
  normalizeArticleFeedProps,
  clampFeedNumber,
  coverAspectCss,
  PIN_MAX_LIMIT,
  PAGE_SIZE,
  ITEM_GAP,
  ARTICLE_FEED_DEFAULT_PROPS,
} from '@/components/page-builder/articleFeed/articleFeedSchema'

/**
 * 覆盖本轮点名的缺陷与向后兼容：
 *  ① style_type → layout 的 Schema Migration（技术债下沉的依据）
 *  ② page_size / item_gap 清空输入框不得被夹成区间最小值（Number('')===0 的坑）
 *  ③ 置顶强制不超过 3 篇（脏数据兜底）
 *  ④ 旧配置缺 visible 类字段时的默认值不得改变既有表现
 */
describe('articleFeedSchema · 归一化与边界保护', () => {
  it('style_type 历史别名自动并轨到 layout（UI 不再暴露兼容说明）', () => {
    expect(normalizeArticleFeedProps({ style_type: 'grid' }).layout).toBe('grid')
    expect(normalizeArticleFeedProps({ layout: 'card', style_type: 'grid' }).layout).toBe('card')
    // 非法值回落默认，不产生未知版式
    expect(normalizeArticleFeedProps({ style_type: 'nope' }).layout).toBe('list')
  })

  it('单页条数：非法值回落默认而不是被夹到区间最小值', () => {
    expect(normalizeArticleFeedProps({ page_size: '' }).page_size).toBe(PAGE_SIZE.fallback)
    expect(normalizeArticleFeedProps({ page_size: null }).page_size).toBe(PAGE_SIZE.fallback)
    expect(normalizeArticleFeedProps({ page_size: NaN }).page_size).toBe(PAGE_SIZE.fallback)
    // 越界仍然夹紧
    expect(normalizeArticleFeedProps({ page_size: 999 }).page_size).toBe(PAGE_SIZE.max)
    expect(normalizeArticleFeedProps({ page_size: 1 }).page_size).toBe(PAGE_SIZE.min)
  })

  it('卡片间距：清空回落默认 8 而不是 4', () => {
    expect(normalizeArticleFeedProps({ item_gap: '' }).item_gap).toBe(ITEM_GAP.fallback)
    expect(normalizeArticleFeedProps({ item_gap: 100 }).item_gap).toBe(ITEM_GAP.max)
  })

  it('置顶列表强制截断到上限 3 篇并剔除无效项', () => {
    const many = { pinned: [1, 2, 3, 4, 5].map((id) => ({ id, title: `t${id}` })) }
    expect(normalizeArticleFeedProps(many).pinned).toHaveLength(PIN_MAX_LIMIT)

    const mixed = { pinned: [{ id: 1 }, null, { noId: true }, 2] }
    const pinned = normalizeArticleFeedProps(mixed).pinned
    expect(pinned).toHaveLength(2)
    expect(pinned.map((p) => p.id)).toEqual([1, 2])
  })

  it('置顶兼容裸 id 写法（历史数据）', () => {
    expect(normalizeArticleFeedProps({ pinned: [7, 9] }).pinned.map((p) => p.id)).toEqual([7, 9])
  })

  it('摘要行数夹紧在 1~3', () => {
    expect(normalizeArticleFeedProps({ excerpt_lines: 0 }).excerpt_lines).toBe(1)
    expect(normalizeArticleFeedProps({ excerpt_lines: 9 }).excerpt_lines).toBe(3)
    expect(normalizeArticleFeedProps({ excerpt_lines: '' }).excerpt_lines).toBe(2)
  })

  it('旧配置（只有老字段）归一化后关键默认值不改变既有表现', () => {
    const cfg = normalizeArticleFeedProps({
      layout: 'card',
      page_size: 10,
      show_cover: true,
      show_date: true,
      item_gap: 8,
      title_font_size: 13,
      subtitle_font_size: 11,
    })
    expect(cfg.layout).toBe('card')
    expect(cfg.show_cover).toBe(true)
    expect(cfg.show_date).toBe(true)
    // 新字段走默认值
    expect(cfg.show_author).toBe(false)
    expect(cfg.show_meta).toBe(false)
    expect(cfg.load_mode).toBe('infinite')
    expect(cfg.tab_show_all).toBe(true)
    expect(cfg.pinned).toEqual([])
  })

  it('归一化不修改传入对象（避免 Vue 无限更新）', () => {
    const raw = { page_size: '', pinned: [{ id: 1 }] }
    const snap = JSON.stringify(raw)
    normalizeArticleFeedProps(raw)
    expect(JSON.stringify(raw)).toBe(snap)
  })

  it('clampFeedNumber 先判空再转数', () => {
    expect(clampFeedNumber('', 5, 30, 1, 10)).toBe(10)
    expect(clampFeedNumber([], 4, 24, 1, 8)).toBe(8)
    expect(clampFeedNumber(undefined, 4, 24, 1, 8)).toBe(8)
    expect(clampFeedNumber(12, 4, 24, 1, 8)).toBe(12)
  })

  it('封面比例 → CSS，auto 表示不定高', () => {
    expect(coverAspectCss('16:9')).toBe('16 / 9')
    expect(coverAspectCss('4:3')).toBe('4 / 3')
    expect(coverAspectCss('1:1')).toBe('1 / 1')
    expect(coverAspectCss('auto')).toBe('')
  })

  it('默认配置自身通过归一化且数值合法', () => {
    const cfg = normalizeArticleFeedProps(ARTICLE_FEED_DEFAULT_PROPS as Record<string, unknown>)
    expect(cfg.page_size).toBeGreaterThanOrEqual(PAGE_SIZE.min)
    expect(cfg.page_size).toBeLessThanOrEqual(PAGE_SIZE.max)
    expect(cfg.pinned.length).toBeLessThanOrEqual(PIN_MAX_LIMIT)
  })
})
