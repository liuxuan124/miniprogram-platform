import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePageStore } from './page'

/**
 * 🔴 契约测试：锁住「乐观置位 + 防抖校验」的两条硬要求。
 *
 * 背景（2026-10-06）：拖滑块时每次属性变动都全量 `JSON.stringify(dsl)` 做脏标记，
 * 实测 60 组件 / 124KB DSL 单次 0.182ms，拖 6 秒累计 10.9ms **同步串在主线程**，
 * 比同规模的 `mergeHydrated`(0.0054ms) 贵 34 倍 —— 这是「画布卡顿」的真正瓶颈。
 *
 * 改成 `isDirty = true` 乐观置位 + 300ms 防抖权威校验后，
 * **不能引入新回归**，最典型就是下面那条「保存完又变回未保存」的竞态。
 */

/**
 * 造一个只含单个笔记流组件的页面。
 * ⚠️ `resolveInitialDsl` 从 `page.dsl` 读 DSL（不是 `page.page`）——
 * 这里曾经传错字段名导致 store 落到 `createEmptyDSL`，
 * 组件 id 变成随机值，于是 `updateComponentProps('c1')` 找不到目标、
 * isDirty 恒 false（看起来像「修复没生效」）。
 */
function makePage() {
  return {
    id: 1,
    name: '测试页',
    type: 'home',
    path: 'pages/index/index',
    status: 'draft',
    dsl: {
      version: 1,
      page: { id: 1, name: '测试页', type: 'home', path: 'pages/index/index' },
      components: [
        { id: 'c1', type: 'note_feed', props: { limit: 10, tab_gap: 18 }, style: {} },
      ],
    },
  } as any
}

/** 新建 store 并置于「已保存」基线 */
function freshStore() {
  setActivePinia(createPinia())
  const store = usePageStore()
  store.setCurrentPage(makePage())
  store.markSavedToServer()
  return store
}

/** 等过 300ms 校验窗口 */
const settle = () => new Promise((r) => setTimeout(r, 420))

describe('page store —— 脏标记性能与竞态', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('🔴 核心：改动后 isDirty 立即为 true（不能等防抖才变）', () => {
    const store = freshStore()
    expect(store.isDirty).toBe(false)
    store.updateComponentProps('c1', { tab_gap: 40 })
    // ⚠️ 必须在同一 tick 内立刻为 true —— 否则「顶部未保存」提示会延迟 300ms
    expect(store.isDirty).toBe(true)
  })

  /**
   * 保存成功后 300ms 校验不能把 isDirty 改回 true。
   *
   * ⚠️ 这条判据的真实机制（2026-10-06 实测确认，写清楚免得后人误判）：
   * 它能通过，**靠的不是 `cancelDirtyVerify`**（我试过把它去掉，照样全绿），
   * 而是 `markSavedToServer` 同步更新了 `lastSavedDslJson` ——
   * 于是 300ms 后 `hasUnpersistedChanges` 算出来本来就是 false。
   * 即：这是一条**行为契约**测试（锁住「保存后不误报未保存」），
   * 不是对某个实现细节的测试。
   */
  it('🔴 行为契约：保存成功后 300ms 校验不能把 isDirty 改回 true', async () => {
    const store = freshStore()

    // 改属性 → 乐观置位 + 挂上 300ms 校验定时器
    store.updateComponentProps('c1', { tab_gap: 40 })
    expect(store.isDirty).toBe(true)

    // 用户手快，立刻点保存（**在 300ms 校验触发之前**）
    store.markSavedToServer()
    expect(store.isDirty).toBe(false)

    await settle()

    // 保存后不得又跳回「未保存」—— 用户会以为没存上而反复点保存
    expect(store.isDirty).toBe(false)
  })

  it('🔴 核心判据：属性写入过程中不做全量序列化（性能修复的本体）', async () => {
    const store = freshStore()
    // 直接盯hasUnpersistedChanges 这个 computed 的**求值次数**：
    // 修复前每次 recomputeDirty 都会读它（触发 JSON.stringify 整页 DSL），
    // 修复后乐观置位根本不读它，只有 300ms 校验那一次。
    // 用 getter 计数观测，比断言时间戳更可靠。
    const spy = vi.spyOn(JSON, 'stringify')
    const before = spy.mock.calls.length

    for (let i = 1; i <= 20; i++) store.updateComponentProps('c1', { tab_gap: 10 + i })

    const syncCalls = spy.mock.calls.length - before
    spy.mockRestore()

    // 20 帧拖动中，若走旧实现至少会有 20 次全量 DSL 序列化
    expect(syncCalls).toBeLessThanOrEqual(2)
  })

  it('改回原值后，防抖校验会纠正回 false（不能只置位不校验）', async () => {
    const store = freshStore()

    store.updateComponentProps('c1', { limit: 99 })
    expect(store.isDirty).toBe(true)
    // 拖滑块时用户往往只是「试一下」又拖回原处
    store.updateComponentProps('c1', { limit: 10 })

    await settle()
    // 与已落库快照一致 → 应纠正回 false
    expect(store.isDirty).toBe(false)
  })

  it('连续拖动 20 帧后仍为 true（防抖没把状态吃掉）', async () => {
    const store = freshStore()
    for (let i = 1; i <= 20; i++) {
      store.updateComponentProps('c1', { tab_gap: 10 + i })
      await new Promise((r) => setTimeout(r, 10))
    }
    await settle()
    expect(store.isDirty).toBe(true)
  })

  it('resetEditor 会清掉待执行的校验定时器', async () => {
    const store = freshStore()
    store.updateComponentProps('c1', { tab_gap: 40 })
    expect(store.isDirty).toBe(true)

    store.resetEditor()
    expect(store.isDirty).toBe(false)
    await settle()
    // 重置后不应被残留定时器改回 true
    expect(store.isDirty).toBe(false)
  })

  it('updatePageConfigSilent 同样要清定时器（元数据保存路径）', async () => {
    const store = freshStore()
    store.updateComponentProps('c1', { tab_gap: 40 })
    // ⚠️ 用PageConfig 里真实存在的字段（`title` 不存在会报 TS2353）
    store.updatePageConfigSilent({ name: '改个名' })
    expect(store.isDirty).toBe(false)
    await settle()
    expect(store.isDirty).toBe(false)
  })
})
