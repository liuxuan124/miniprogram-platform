import { describe, it, expect } from 'vitest'
import {
  storeTemplateThumbUrl,
  extractTemplateSkeleton,
  skeletonAccentFor,
  SKELETON_ACCENTS,
} from '@/utils/template-thumb'

/**
 * ============================================================================
 * 模板封面映射（2026-10-06 回归）
 * ============================================================================
 *
 * 线上真实故障：
 *   · 「暖阁整店」封面 = 一整块深蓝矩形
 *   · 「内容社群整店」与「轻量三栏整店」**共用同一张九宫格拼贴图**
 *
 * 完整成因（三环相扣，缺一不可）：
 *   ① `STORE_THUMB_BY_CODE` 的 key 写的是 `content_ip`，
 *      而库里真实的 `template_code` 是 **`content`** → 永远匹配不上；
 *   ② 于是落到 `DEFAULT_STORE_THUMB`；
 *   ③ 而那个默认值**恰好等于 `lite` 的图**（同一张拼贴图）。
 *
 * 🔴 最阴的地方：这不是"图选得不好"，是**两个不同模板指向同一张图**，
 *    纯看界面只会觉得"图丑"，不会意识到映射逻辑错了。
 *    所以下面专门断言「不同 code 不许指向同一张图」。
 */

const asItem = (code: string, extra: Record<string, unknown> = {}) =>
  ({ templateCode: code, ...extra }) as any

describe('storeTemplateThumbUrl —— 映射不应张冠李戴', () => {
  it('🔴 不同 code 必须给不同图（这条直接对应线上故障）', () => {
    const codes = ['warm', 'retail', 'content', 'lite', 'edu']
    const map = new Map<string, string>()
    for (const c of codes) {
      const url = storeTemplateThumbUrl(asItem(c))
      if (url) map.set(c, url)
    }
    // 逐对比较：不允许任意两个 code 指向同一张
    const entries = [...map.entries()]
    for (let i = 0; i < entries.length; i += 1) {
      for (let j = i + 1; j < entries.length; j += 1) {
        expect(
          entries[i][1],
          `code "${entries[i][0]}" 与 "${entries[j][0]}" 指向同一张图：${entries[i][1]}`,
        ).not.toBe(entries[j][1])
      }
    }
  })

  it('🔴 内容社群（code=content）必须命中自己的图，不能落默认', () => {
    // 回归：`content_ip` 是错key，库里的真实值是 `content`
    const url = storeTemplateThumbUrl(asItem('content'))
    expect(url).toBeTruthy()
    expect(url).not.toBe(storeTemplateThumbUrl(asItem('lite')))
  })

  it('取不到骨架时返回空串（而不是随便挑一张素材图）', () => {
    // 之前会返回 DEFAULT_STORE_THUMB，而那张又等于 lite 的图 → 张冠李戴
    expect(storeTemplateThumbUrl(asItem('unknown_code_xxx'))).toBe('')
  })

  it('code 大小写不敏感', () => {
    expect(storeTemplateThumbUrl(asItem('CONTENT'))).toBe(
      storeTemplateThumbUrl(asItem('content')),
    )
  })
})

describe('extractTemplateSkeleton —— 从快照提取真实结构', () => {
  const snap = JSON.stringify({
    pages: [
      {
        name: '首页',
        dslContent: JSON.stringify({
          components: [
            { type: 'banner', props: { images: [{ url: '/x.jpg' }] } },
            { type: 'nav_grid', props: {} },
            { type: 'note_feed', props: {} },
          ],
        }),
      },
      { name: '知识库', dslContent: JSON.stringify({ components: [{ type: 'column', props: {} }] }) },
    ],
  })

  it('提取出页面数与组件类型', () => {
    const sk = extractTemplateSkeleton(asItem('warm', { snapshot: snap }))
    expect(sk).toHaveLength(2)
    expect(sk[0].label).toBe('首页')
    expect(sk[0].blocks.map((b) => b.kind)).toEqual(['banner', 'nav_grid', 'note_feed'])
  })

  it('🔴 snapshot 是字符串 / 对象两种形态都能解析', () => {
    expect(extractTemplateSkeleton(asItem('warm', { snapshot: snap })).length).toBe(2)
    // 有些接口已经反序列化成对象
    expect(
      extractTemplateSkeleton(asItem('warm', { snapshot: JSON.parse(snap) })).length,
    ).toBe(2)
  })

  it('🔴 坏数据不抛异常，返回空数组（封面画不出就退空态，不该整页报错）', () => {
    for (const bad of [null, undefined, '', 'not-json', '{"pages":', 123, []]) {
      expect(() => extractTemplateSkeleton(asItem('warm', { snapshot: bad }))).not.toThrow()
      expect(extractTemplateSkeleton(asItem('warm', { snapshot: bad }))).toEqual([])
    }
  })

  it('页面超过 5 个时截断（避免封面画出一长条）', () => {
    const many = JSON.stringify({
      pages: Array.from({ length: 9 }, (_, i) => ({
        name: `页${i}`,
        dslContent: JSON.stringify({ components: [{ type: 'banner' }] }),
      })),
    })
    expect(extractTemplateSkeleton(asItem('warm', { snapshot: many })).length).toBe(5)
  })

  it('未登记的组件类型也返回内容（不能退化成空）', () => {
    const s = JSON.stringify({
      pages: [
        { name: 'x', dslContent: JSON.stringify({ components: [{ type: '某新组件' }] }) },
      ],
    })
    const sk = extractTemplateSkeleton(asItem('warm', { snapshot: s }))
    expect(sk[0].blocks[0].kind).toBe('某新组件')
    expect(sk[0].blocks[0].weight).toBeGreaterThan(0)
  })

  it('组件数超上限时截断到 6（封面不需要还原全部）', () => {
    const s = JSON.stringify({
      pages: [
        {
          name: 'x',
          dslContent: JSON.stringify({
            components: Array.from({ length: 20 }, () => ({ type: 'banner' })),
          }),
        },
      ],
    })
    expect(extractTemplateSkeleton(asItem('warm', { snapshot: s }))[0].blocks.length).toBe(6)
  })
})

describe('skeletonAccentFor —— 取色必须稳定', () => {
  it('同 code 多次取色一致（否则封面会"闪"）', () => {
    const a = skeletonAccentFor('warm', 0)
    const b = skeletonAccentFor('warm', 0)
    expect(a).toBe(b)
  })

  it('取色落在调色板内', () => {
    expect(SKELETON_ACCENTS).toContain(skeletonAccentFor('whatever', 0))
  })

  it('不同 code 大概率取到不同色（不强制，但避免全屏同色）', () => {
    const colors = new Set(
      ['warm', 'retail', 'content', 'lite', 'edu'].map((c) => skeletonAccentFor(c, 0)),
    )
    expect(colors.size).toBeGreaterThan(1)
  })

  it('空 code 也不崩', () => {
    expect(SKELETON_ACCENTS).toContain(skeletonAccentFor('', 0))
  })
})