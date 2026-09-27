import { describe, expect, it } from 'vitest'
import { mapPlanetFeedItem, PLANET_DEFAULT_FEED, PLANET_DEFAULT_KPIS, PLANET_DEFAULT_SEGS } from './preview-planet'

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
})
