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
  return p.includes('warm-home')
    || p.includes('motai-home')
    || p.endsWith('/pages/index/index')
}

export function useWarmHomePreview(
  components: Ref<ComponentInstance[]>,
  pagePath: Ref<string | undefined>,
) {
  const warmView = ref<WarmPreviewView>(buildWarmPreviewView(null, { loading: true }))
  const enabled = ref(false)
  let reqSeq = 0
  /** 首次拉取完成后置 true：后续刷新保留旧数据静默更新，loading 仅表达「初始加载中」 */
  let readyOnce = false

  async function reload() {
    const useWarm = pageUsesWarmNativeBlocks(components.value)
      || pageIsWarmHomePath(pagePath.value)
    enabled.value = useWarm
    if (!useWarm) return
    const seq = ++reqSeq
    const prev = warmView.value
    if (!readyOnce) {
      warmView.value = { ...prev, loading: true }
    }
    try {
      const res = await fetchWarmHomeAggregate()
      if (seq !== reqSeq) return
      const raw = (res as { data?: unknown })?.data ?? res
      let view = buildWarmPreviewView(raw as any, { loading: false, loadError: false })
      view = mergeGreetFromBlocks(view, components.value)
      warmView.value = view
      readyOnce = true
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
      readyOnce = true
    }
  }

  let debounceTimer: ReturnType<typeof setTimeout> | undefined
  /** 首次有效加载（组件已就位）立即拉取，避免预览先闪现默认问候/「快捷入口未配置」再跳变 */
  let loadedOnce = false
  watch(
    () => [components.value, pagePath.value] as const,
    () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      if (!loadedOnce && (components.value || []).length > 0) {
        loadedOnce = true
        void reload()
        return
      }
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
