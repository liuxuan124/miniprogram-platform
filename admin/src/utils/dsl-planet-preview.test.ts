import { describe, expect, it } from 'vitest'
import {
  mapPlanetFeedItem,
  filterPlanetFeedBySeg,
  isKnownPlanetSegKey,
  normalizePlanetSegs,
  PLANET_DEFAULT_FEED,
  PLANET_DEFAULT_KPIS,
  PLANET_DEFAULT_SEGS,
  PLANET_SEG_KEYS,
} from './preview-planet'

describe('preview planet parity mapping', () => {
  it('keeps the same complete default shell as the miniapp', () => {
    expect(PLANET_DEFAULT_KPIS.map((item) => item.label)).toEqual(['球友', '沉淀内容', '今日新增'])
    expect(PLANET_DEFAULT_SEGS.map((item) => item.key)).toEqual(['all', 'official', 'essence', 'ask', 'checkin', 'resources'])
    expect(PLANET_DEFAULT_FEED).toHaveLength(4)
  })

  it('maps live feed fields used by the miniapp card', () => {
    const item = mapPlanetFeedItem({
      id: 7,
      author: '墨白',
      pinned: true,
      tags: ['星主', '话题'],
      content: '正文\n---ANSWER---\n回答',
      attachments: [{ name: '清单.pdf', size: 1048576, fileId: 'f1' }],
      likeCount: 9,
      commentCount: 3,
    })
    expect(item).toMatchObject({
      id: 7,
      top: true,
      author: '墨白',
      tagGold: '置顶',
      tag: '星主',
      content: '正文',
      answer: '回答',
      topics: '#话题',
      likes: '9',
      comments: '3',
      file: { name: '清单.pdf', meta: '1.0 MB · 星球会员可看', fileId: 'f1' },
    })
  })

  it('derives isHost / isHomework so 只看星主 and 作业 work in preview', () => {
    const host = mapPlanetFeedItem({ id: 1, author: '墨白', tags: ['星主'] })
    const homework = mapPlanetFeedItem({ id: 2, author: '阿柚', tags: ['打卡 Day 42'] })
    const normal = mapPlanetFeedItem({ id: 3, author: '路人', tags: ['闲聊'] })
    expect(host.isHost).toBe(true)
    expect(normal.isHost).toBe(false)
    expect(homework.isHomework).toBe(true)
    expect(host.isHomework).toBe(false)
  })

  it('exposes every key the miniapp actually filters on', () => {
    expect(PLANET_SEG_KEYS.map((it) => it.value)).toEqual([
      'all', 'official', 'essence', 'host', 'ask', 'checkin', 'homework', 'resources',
    ])
    expect(isKnownPlanetSegKey('homework')).toBe(true)
    expect(isKnownPlanetSegKey('seg')).toBe(false)
  })

  it('filters with the same rules as the miniapp, unknown keys pass through', () => {
    const list = PLANET_DEFAULT_FEED.map(mapPlanetFeedItem)
    expect(filterPlanetFeedBySeg(list, 'all')).toHaveLength(list.length)
    expect(filterPlanetFeedBySeg(list, 'official').map((i) => i.id)).toEqual(['demo-p1'])
    expect(filterPlanetFeedBySeg(list, 'essence').map((i) => i.id)).toEqual(['demo-p3'])
    expect(filterPlanetFeedBySeg(list, 'ask').map((i) => i.id)).toEqual(['demo-p2'])
    expect(filterPlanetFeedBySeg(list, 'checkin').map((i) => i.id)).toEqual(['demo-p4'])
    expect(filterPlanetFeedBySeg(list, 'host').map((i) => i.id)).toEqual(['demo-p1'])
    expect(filterPlanetFeedBySeg(list, 'homework').map((i) => i.id)).toEqual(['demo-p4'])
    // resources 是跳转特例；未知 key 静默不过滤
    expect(filterPlanetFeedBySeg(list, 'resources')).toHaveLength(list.length)
    expect(filterPlanetFeedBySeg(list, 'seg')).toHaveLength(list.length)
  })

  it('drops blank / duplicate segments so wx:key stays unique', () => {
    expect(normalizePlanetSegs([
      { key: 'all', label: '最新' },
      { key: 'all', label: '重复的 all' },
      { key: 'essence', label: '' },
      { key: '', label: '空 key' },
      { key: ' host ', label: ' 只看星主 ' },
    ])).toEqual([
      { key: 'all', label: '最新' },
      { key: 'host', label: '只看星主' },
    ])
    expect(normalizePlanetSegs(undefined)).toEqual([])
  })
})
