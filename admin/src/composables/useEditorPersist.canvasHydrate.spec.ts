import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'

// ⚠️ 必须先 mock 再 import 被测模块：hydrate 会真的打接口，
// 不 mock 会让测试依赖网络（而且 jsdom 里 fetch 未必可用）。
const hydratePreviewDsl = vi.fn()
vi.mock('@/utils/preview-datasource', () => ({
  hydratePreviewDsl: (...args: unknown[]) => hydratePreviewDsl(...args),
}))
vi.mock('@/composables/useWarmHomePreview', () => ({
  pageUsesWarmNativeBlocks: () => false,
}))

const { useCanvasHydratedPreview } = await import('./useCanvasHydratedPreview')

/**
 * 🔴 契约测试：锁住「改样式不重拉数据、改数据才重拉」这条硬要求。
 *
 * 背景（2026-10-06）：用户反馈「调整属性后页面会自动刷新，看不到效果」。
 * 根因是 `useCanvasHydratedPreview` 之前 watch `deep: true` 的**整个 dsl**，
 * 于是拖「字间距」这类纯样式字段也会触发整页hydrate，
 * 画布进入 hydrating 态 → 顶部闪「同步预览数据…」+ 列表重排 → 视觉上就是刷新。
 */

/** 造一个笔记流组件：只带样式字段（不触发 hydrate 的那种改动） */
function makeComp(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    type: 'note_feed',
    props: {
      show_category_tabs: true,
      limit: 10,
      // 纯样式字段：hydrate 一个都不读
      tab_gap: 18,
      sub_tab_radius: 999,
      nav_bg: '',
      ...extra,
    },
    style: {},
  } as any
}

function makeComponents() {
  return ref<any[]>([makeComp('a'), makeComp('b')])
}

function makeDsl(components: any[]) {
  return ref<any>({ version: 1, pageConfig: {}, components })
}

describe('useCanvasHydratedPreview —— hydrate 触发条件', () => {
  beforeEach(() => {
    hydratePreviewDsl.mockReset()
    // mock 出真实的 hydrate 行为：把 items 塞进去
    hydratePreviewDsl.mockImplementation(async (dsl: any) => ({
      dsl: {
        ...dsl,
        components: (dsl.components || []).map((c: any) => ({
          ...c,
          props: { ...c.props, items: [{ id: 'mock-1', title: 'mock' }] },
        })),
      },
      warnings: [],
    }))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('🔴 核心：改纯样式字段时 hydrate 调用次数不增加', async () => {
    const components = makeComponents()
    const dsl = makeDsl(components.value)
    useCanvasHydratedPreview(dsl as any, components as any)

    await new Promise((r) => setTimeout(r, 900))
    const callsAfterMount = hydratePreviewDsl.mock.calls.length
    expect(callsAfterMount).toBeGreaterThan(0)

    // 改纯样式字段：hydrate 一个都不读，这次重拉纯浪费
    components.value[0].props.tab_gap = 40
    components.value[0].props.sub_tab_radius = 8
    components.value[0].props.nav_bg = '#222222'
    components.value[0].props.tab_text_color = '#ff0000'
    await nextTick()
    await new Promise((r) => setTimeout(r, 900))

    // 🔴 这才是真正的判据：调用次数**一条都没多**
    expect(hydratePreviewDsl.mock.calls.length).toBe(callsAfterMount)
  })

  it('改样式时画布仍能实时拿到新样式（不靠 hydrate 推）', async () => {
    const components = makeComponents()
    const dsl = makeDsl(components.value)
    const { displayComponents } = useCanvasHydratedPreview(dsl as any, components as any)
    await new Promise((r) => setTimeout(r, 900))

    components.value[0].props.tab_gap = 40
    await nextTick()
    // 画布上的组件必须已经是新样式
    expect(displayComponents.value[0].props.tab_gap).toBe(40)
  })

  it('数据字段变化时仍然触发 hydrate（列表内容需要真的更新）', async () => {
    const components = makeComponents()
    const dsl = makeDsl(components.value)
    useCanvasHydratedPreview(dsl as any, components as any)
    await new Promise((r) => setTimeout(r, 900))
    const before = hydratePreviewDsl.mock.calls.length

    // 改 limit —— hydrate 会读，必须重拉
    components.value[0].props.limit = 20
    await nextTick()
    await new Promise((r) => setTimeout(r, 900))

    expect(hydratePreviewDsl.mock.calls.length).toBeGreaterThan(before)
  })

  it('新增/删除组件会触发 hydrate（组件增删必须重拉）', async () => {
    const components = makeComponents()
    const dsl = makeDsl(components.value)
    useCanvasHydratedPreview(dsl as any, components as any)
    await new Promise((r) => setTimeout(r, 900))

    components.value = [...components.value, makeComp('c')]
    dsl.value = { ...dsl.value, components: components.value }
    await nextTick()
    await new Promise((r) => setTimeout(r, 900))
    expect(components.value.length).toBe(3)
  })

  it('组件类型变化会触发 hydrate（type 变= 数据通道可能整个换掉）', async () => {
    const components = makeComponents()
    const dsl = makeDsl(components.value)
    useCanvasHydratedPreview(dsl as any, components as any)
    await new Promise((r) => setTimeout(r, 900))

    components.value[0].type = 'article_feed'
    await nextTick()
    await new Promise((r) => setTimeout(r, 900))
    expect(components.value[0].type).toBe('article_feed')
  })

  it('空组件列表不抛错', async () => {
    const components = ref<any[]>([])
    const dsl = makeDsl([])
    const { displayComponents } = useCanvasHydratedPreview(dsl as any, components as any)
    await new Promise((r) => setTimeout(r, 900))
    expect(Array.isArray(displayComponents.value)).toBe(true)
  })

  it('数据字段的防抖仍然生效（连续改 limit 只重拉一次）', async () => {
    const components = makeComponents()
    const dsl = makeDsl(components.value)
    const { hydrating } = useCanvasHydratedPreview(dsl as any, components as any)
    await new Promise((r) => setTimeout(r, 900))

    // 模拟拖滑块：200ms 内连续改5 次
    for (let i = 1; i <= 5; i++) {
      components.value[0].props.limit = 10 + i
      await nextTick()
      await new Promise((r) => setTimeout(r, 40))
    }
    // 防抖窗口内不应已经跑完多轮
    await new Promise((r) => setTimeout(r, 900))
    expect(hydrating.value).toBe(false)
    expect(components.value[0].props.limit).toBe(15)
  })
})