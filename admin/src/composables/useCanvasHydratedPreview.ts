import { ref, watch, type Ref } from 'vue'
import type { ComponentInstance, PageDSL } from '@/types/page'
import { hydratePreviewDsl } from '@/utils/preview-datasource'
import { pageUsesWarmNativeBlocks } from '@/composables/useWarmHomePreview'

/**
 * 🔴 hydrate 真正读取的 props 字段（2026-10-06 从 `utils/preview-datasource.ts`
 * 里逐处 grep 出来的那份清单，**不是拍脑袋列的**）。
 *
 * 为什么要它：hydrate 后的 `items` 会**整包替换**组件的展示数据，
 * 一旦触发，画布就是「刷新」态 —— 顶部闪「同步预览数据…」、
 * 列表重排、刚改的样式被中途态盖掉。
 *
 * ⚠️ 之前这里 watch 的是 `deep: true` 的**整个 dsl**，
 * 于是拖「字间距」「圆角」这类**纯样式**字段也会触发全页重拉数据。
 * 而 hydrate 一个样式字段都不读 → 那次重拉 100% 是白做，
 * 只会把「改样式看不到过程」变成「改样式看不到结果」。
 *
 * 🔴 判据：**触发条件必须精确到「hydrate 会读的字段」**，
 * 不能用「整个对象变了」这种粗粒度 —— 后者等于把「改样式」变成「刷新页面」。
 */
const HYDRATE_RELEVANT_PROPS = [
  'limit',
  'page_size',
  'show_category_tabs',
  'type_tabs',
  'source_mode',
  'display_mode',
  'data_source',
  'product_ids',
  'manual_ids',
  'sort',
  'sort_by',
  'recommend_plan_id',
] as const

/**
 * hydrate 会**写回**组件的字段（2026-10-06 从 preview-datasource 实查）。
 * 只有这些字段允许被 hydrate 结果覆盖，其余一律以实时 props 为准。
 *
 * ⚠️ 少了这个白名单就会把 hydrate 的整份props 灌回画布，
 * 于是「改完样式，下一次 hydrate 生效时样式被还原成旧值」
 * —— 表现为「我明明改了，一保存就变回去」。
 */
const HYDRATE_OUTPUT_KEYS = [
  'items',
  '_previewDataFailed',
  '_previewDataDemo',
  'footer_text',
  'segs',
] as const

/** 组件级数据签名：只有 hydrate 会读的字段参与，用于判断「是否需要重拉」 */
function dataSignatureOf(component: ComponentInstance): string {
  const props = (component.props || {}) as Record<string, unknown>
  const parts = HYDRATE_RELEVANT_PROPS.map((key) => {
    const v = props[key]
    // 对象/数组要稳定序列化，避免每次 stringify 顺序不同导致误判为「变了」
    return `${key}=${stableStringify(v)}`
  })
  return `${component.id}|${component.type}|${parts.join(',')}`
}

/**
 * 稳定序列化：对象 key 排序后再 stringify。
 * ⚠️ 不排序的话 `{a:1,b:2}` 与 `{b:2,a:1}` 会算出两个不同签名，
 * 而它们其实是同一份配置 —— 会导致「无意义的重拉」，
 * 表现就是用户明明没改数据却看到刷新。
 */
function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value !== 'object') return String(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return `{${keys.map((k) => `${k}:${stableStringify(obj[k])}`).join(',')}}`
}

/** 整页的数据签名（组件增删也算变化 —— 增删组件必须重拉） */
function pageDataSignature(components: ComponentInstance[]): string {
  return (components || []).map(dataSignatureOf).join('||')
}

/** 画布展示用 DSL：暖阁 native 块走 warm API；其余组件 hydrate 与小程序同源列表数据 */
export function useCanvasHydratedPreview(
  dsl: Ref<PageDSL>,
  components: Ref<ComponentInstance[]>,
) {
  const displayComponents = ref<ComponentInstance[]>([])
  const hydrateWarnings = ref<string[]>([])
  const hydrating = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  let seq = 0

  /**
   * 🔴 hydrate 的产物（`items` 等真实数据）按组件 id 缓存，
   * **不随样式改动而丢弃**。
   *
   * 为什么必须有这层缓存：以前 `displayComponents` 直接存 hydrate 结果，
   * 任何改动都会重跑 hydrate 把整个数组换掉；改成签名触发后，
   * 改样式时 hydrate 不再跑，如果不缓存已取到的数据，
   * 画布就会退回到「只有配置、没有 items」的白板。
   *
   * ⚠️ 合并口径：**数据取hydrate 缓存，样式取实时 props**。
   * 样式改动必须立刻可见（这是本轮修复的目标），
   * 数据只在签名变化时才更新（这是性能与体验的保障）。
   */
  const hydratedDataCache = new Map<string, Record<string, unknown>>()

  function mergeHydrated(list: ComponentInstance[]): ComponentInstance[] {
    if (!hydratedDataCache.size) return list
    return list.map((comp) => {
      const cached = hydratedDataCache.get(comp.id)
      if (!cached) return comp
      // hydrate 只改数据字段（items 等），其余字段一律以实时 props 为准
      return { ...comp, props: { ...comp.props, ...cached } }
    })
  }

  async function runHydrate() {
    const currentSeq = ++seq
    const list = components.value || []
    if (pageUsesWarmNativeBlocks(list)) {
      displayComponents.value = list
      hydrateWarnings.value = []
      hydrating.value = false
      return
    }
    if (!list.length) {
      displayComponents.value = []
      return
    }
    hydrating.value = true
    try {
      const snapshot = JSON.parse(JSON.stringify(dsl.value)) as PageDSL
      const { dsl: hydrated, warnings } = await hydratePreviewDsl(snapshot)
      if (currentSeq !== seq) return
      const hydratedList = hydrated.components || []
      // 只缓存 hydrate 真正写回的数据字段，供后续「样式实时 / 数据缓存」合并使用
      hydratedDataCache.clear()
      for (const comp of hydratedList) {
        const src = (comp.props || {}) as Record<string, unknown>
        const data: Record<string, unknown> = {}
        for (const key of HYDRATE_OUTPUT_KEYS) {
          if (key in src) data[key] = src[key]
        }
        hydratedDataCache.set(comp.id, data)
      }
      displayComponents.value = mergeHydrated(list)
      hydrateWarnings.value = warnings || []
    } catch {
      if (currentSeq !== seq) return
      hydratedDataCache.clear()
      displayComponents.value = list
      hydrateWarnings.value = []
    } finally {
      if (currentSeq === seq) hydrating.value = false
    }
  }

  /**
   * 🔴 2026-10-06 修「调属性时画布自动刷新，看不到效果」。
   *
   * 原实现：`watch(() => [dsl.value, components.value], ..., { deep: true })`
   *   → 改**任何**字段（含纯样式）都会重拉整页数据，
   *     画布进入 hydrating 态、列表重排，用户刚拖的滑块看不到连续效果。
   *
   * 现在：watch 的是**数据签名**（只有 hydrate 读的 12 个字段 + 组件增删）。
   *   · 改样式（颜色/间距/圆角/字号…）→ 签名不变 → **不重拉、零闪烁**
   *   · 改数据（limit / 分类 / 排序 / 数据源…）→ 签名变 → 照旧重拉
   *
   * ⚠️ 数据字段的防抖仍保留 600ms —— 拖「展示条数」这类滑块时
   * 也不该每移动 1px 就打一次接口。
   */
  watch(
    () => pageDataSignature(components.value),
    () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => { void runHydrate() }, 600)
    },
    { immediate: true },
  )

  /**
   * 🔴 样式 / 内容字段变化 → **只做本地合并，不重拉数据**。
   *
   * 这是本轮修复的另一半：上一个 watch 只在数据签名变时才跑 hydrate，
   * 但样式改动（拖滑块、取色器）必须**立刻**反映到画布，
   * 否则会退化成「改了不生效」—— 那比刷新更糟。
   *
   * `flush: 'sync'` 让合并与 store 写入同拍生效，
   * 拖滑块时才能看到连续变化而不是滞后一拍。
   *
   * ⚠️ 暖阁 native 块走 warm 通道，本来就直接用 components.value，
   * 这里合并不会影响它（缓存里没有它们的 id）。
   */
  watch(
    () => components.value,
    (list) => {
      if (!hydratedDataCache.size) return
      displayComponents.value = mergeHydrated(list || [])
    },
    { deep: true, flush: 'sync' },
  )

  return { displayComponents, hydrateWarnings, hydrating }
}