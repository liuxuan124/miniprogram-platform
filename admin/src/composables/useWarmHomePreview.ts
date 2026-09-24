import { ref, watch, type Ref } from 'vue'
import { fetchWarmHomeAggregate } from '@/api/warmHome'
import {
  buildWarmPreviewView,
  mergeGreetFromBlocks,
  type WarmPreviewView,
} from '@/utils/warmHomePreviewMap'
import type { ComponentInstance } from '@/types/page'
import { WARM_HOME_BLOCK_TYPES } from '@/utils/warmHomeBlocks'
import { ComponentType } from '@/types/page'

const DEMO_TODAY_COUNT = 0

export const WARM_PREVIEW_VIEW_KEY = Symbol('warmPreviewView')
export const WARM_PREVIEW_ENABLED_KEY = Symbol('warmPreviewEnabled')
export const WARM_PREVIEW_ON_SEG_KEY = Symbol('warmPreviewOnSeg')

export type WarmPreviewContext = {
  warmView: Ref<WarmPreviewView>
  enabled: Ref<boolean>
  onSeg: (key: string) => void
}

const NATIVE_WARM_TYPES = new Set<string>(WARM_HOME_BLOCK_TYPES)

export function pageUsesWarmNativeBlocks(components: ComponentInstance[]): boolean {
  return (components || []).some((c) => NATIVE_WARM_TYPES.has(String(c.type)))
}

export function pageIsWarmHomePath(path?: string): boolean {
  const p = String(path || '')
  return p.includes('warm-home') || p.endsWith('/pages/index/index')
}

export type WarmPreviewDataMode = 'demo' | 'live'

export function useWarmHomePreview(
  components: Ref<ComponentInstance[]>,
  pagePath: Ref<string | undefined>,
  dataMode?: Ref<WarmPreviewDataMode>,
) {
  const warmView = ref<WarmPreviewView>(buildWarmPreviewView(null, { loading: true }))
  const enabled = ref(false)
  let reqSeq = 0

  async function reload() {
    const useWarm = pageUsesWarmNativeBlocks(components.value)
      || pageIsWarmHomePath(pagePath.value)
    enabled.value = useWarm
    if (!useWarm) return
    if (dataMode?.value === 'demo') {
      let view = buildWarmPreviewView(null, { loading: false, loadError: false })
      view = mergeGreetFromBlocks(view, components.value)
      view = {
        ...view,
        todayCount: DEMO_TODAY_COUNT,
        streakDays: 0,
      }
      warmView.value = view
      return
    }
    const seq = ++reqSeq
    const prev = warmView.value
    warmView.value = { ...prev, loading: true }
    try {
      const res = await fetchWarmHomeAggregate()
      if (seq !== reqSeq) return
      const raw = (res as { data?: unknown })?.data ?? res
      let view = buildWarmPreviewView(raw as any, { loading: false, loadError: false })
      view = mergeGreetFromBlocks(view, components.value)
      warmView.value = view
    } catch {
      if (seq !== reqSeq) return
      let view = buildWarmPreviewView(null, { loading: false, loadError: true })
      view = {
        ...view,
        todayCount: prev.todayCount ?? 0,
        streakDays: prev.streakDays ?? 0,
      }
      view = mergeGreetFromBlocks(view, components.value)
      warmView.value = view
    }
  }

  let debounceTimer: ReturnType<typeof setTimeout> | undefined
  watch(
    () => [components.value, pagePath.value, dataMode?.value] as const,
    () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => { void reload() }, 700)
    },
    { deep: true, immediate: true },
  )

  function onSeg(key: string) {
    const all = warmView.value.feedAll || []
    const segs = (warmView.value.segs || []).map((s) => ({
      ...s,
      on: String(s.key) === key,
    }))
    warmView.value = {
      ...warmView.value,
      segs,
      activeSeg: key,
      feed: key === 'rec' || !key
        ? all
        : all.filter((i) => i.seg === key),
    }
  }

  return { warmView, enabled, reload, onSeg }
}

export function isWarmNativeRendererType(type: string): boolean {
  return NATIVE_WARM_TYPES.has(type) || type === ComponentType.WarmHome
}
