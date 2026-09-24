import { describe, expect, it } from 'vitest'
import { filterBySourceKeys, resolveSourceLabel, resolveSourceTagKey } from './dsl-source-tag'

describe('dsl-source-tag', () => {
  it('resolves keys from sourceTag', () => {
    expect(resolveSourceTagKey({ sourceTag: 'wechat_mp' })).toBe('wechat_mp')
    expect(resolveSourceTagKey({ source: '小红书笔记' })).toBe('xiaohongshu')
  })

  it('label with override', () => {
    expect(resolveSourceLabel({ sourceTag: 'qa' }, { qa: '星球问答' })).toBe('星球问答')
  })

  it('filters items', () => {
    const items = [{ sourceTag: 'qa' }, { sourceTag: 'original' }]
    expect(filterBySourceKeys(items, ['qa']).length).toBe(1)
  })
})
