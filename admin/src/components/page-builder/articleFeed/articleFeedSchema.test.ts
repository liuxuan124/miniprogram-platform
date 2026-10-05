import { describe, expect, it } from 'vitest'
import {
  SOURCE_COLOR_PRESETS,
  normalizeArticleFeedProps,
  normalizeSourceTagMap,
} from './articleFeedSchema'

/**
 * 文章流「不限篇数」解耦 + 来源标签动态映射表 的契约测试。
 * 2026-10-06 新增 —— 对应需求「最大条数与『不限』逻辑解耦」「动态 Tag 映射表」。
 */

describe('不限篇数与 max_count 解耦', () => {
  it('老页面 max_count=0 → unlimited=true（无需迁移）', () => {
    expect(normalizeArticleFeedProps({ max_count: 0 }).max_unlimited).toBe(true)
  })

  it('老页面 max_count=20 → unlimited=false', () => {
    expect(normalizeArticleFeedProps({ max_count: 20 }).max_unlimited).toBe(false)
  })

  it('完全缺省的 props → unlimited=true（沿用旧语义「0 = 不限」）', () => {
    expect(normalizeArticleFeedProps({}).max_unlimited).toBe(true)
  })

  it('显式 max_unlimited=true 时优先于 max_count', () => {
    expect(normalizeArticleFeedProps({ max_count: 20, max_unlimited: true }).max_unlimited).toBe(true)
  })

  it('显式 max_unlimited=false + max_count=0 仍为 false（勾选态是唯一真相）', () => {
    expect(normalizeArticleFeedProps({ max_count: 0, max_unlimited: false }).max_unlimited).toBe(false)
  })

  it('max_count 本身不被 unlimited 污染（老页面数据零变化）', () => {
    expect(normalizeArticleFeedProps({ max_count: 20 }).max_count).toBe(20)
  })
})

describe('来源标签动态映射表', () => {
  it('缺省时给出四个固定渠道（线上现状）', () => {
    const rows = normalizeArticleFeedProps({}).source_tag_map || []
    expect(rows.map((r) => r.key)).toEqual(['wechat_mp', 'xiaohongshu', 'qa', 'original'])
    expect(rows.map((r) => r.label)).toEqual(['公众号', '小红书', '问答', '原创'])
  })

  it('历史 source_labels 覆盖默认文案', () => {
    const rows = normalizeArticleFeedProps({ source_labels: { qa: '问答精选' } }).source_tag_map || []
    expect(rows.find((r) => r.key === 'qa')?.label).toBe('问答精选')
  })

  it('历史 source_labels 里多出的 key 不会被丢掉', () => {
    const rows = normalizeArticleFeedProps({ source_labels: { douyin: '抖音' } }).source_tag_map || []
    expect(rows.some((r) => r.key === 'douyin')).toBe(true)
  })

  it('有 map 时按 map 走（支持增删改）', () => {
    const rows = normalizeArticleFeedProps({
      source_tag_map: [{ key: 'a', label: '甲' }],
    }).source_tag_map || []
    expect(rows.map((r) => r.key)).toEqual(['a'])
  })

  it('map 项可带预设配色 key', () => {
    const rows = normalizeArticleFeedProps({
      source_tag_map: [{ key: 'a', label: '甲', color: 'green' }],
    }).source_tag_map || []
    expect(rows[0].color).toBe('green')
  })

  it('map 为空数组时回落四渠道（不留空面板）', () => {
    expect(normalizeArticleFeedProps({ source_tag_map: [] }).source_tag_map?.length).toBe(4)
  })

  it('normalizeSourceTagMap 丢弃空 key 行', () => {
    const rows = normalizeSourceTagMap([{ key: '  ', label: '无效' }, { key: 'ok', label: '有效' }], {})
    expect(rows.map((r) => r.key)).toEqual(['ok'])
  })

  it('老页面的 source_labels 原样保留（端上只读这个字段）', () => {
    const out = normalizeArticleFeedProps({ source_labels: { qa: '问答' } })
    expect(out.source_labels.qa).toBe('问答')
  })
})

describe('来源标签预设配色', () => {
  it('提供 6 套柔和配色', () => {
    expect(SOURCE_COLOR_PRESETS.length).toBe(6)
  })

  it('每套配色都有背景与前景色（面��预览色样用）', () => {
    SOURCE_COLOR_PRESETS.forEach((c) => {
      expect(c.bg).toMatch(/^#/)
      expect(c.fg).toMatch(/^#/)
    })
  })
})