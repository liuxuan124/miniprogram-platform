import { ref, watch, type Ref } from 'vue'
import type { ComponentInstance, PageDSL } from '@/types/page'
import { hydratePreviewDsl } from '@/utils/preview-datasource'
import { pageUsesWarmNativeBlocks } from '@/composables/useWarmHomePreview'

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
      displayComponents.value = hydrated.components || []
      hydrateWarnings.value = warnings || []
    } catch {
      if (currentSeq !== seq) return
      displayComponents.value = list
      hydrateWarnings.value = []
    } finally {
      if (currentSeq === seq) hydrating.value = false
    }
  }

  watch(
    () => [dsl.value, components.value] as const,
    () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => { void runHydrate() }, 600)
    },
    { deep: true, immediate: true },
  )

  return { displayComponents, hydrateWarnings, hydrating }
}
