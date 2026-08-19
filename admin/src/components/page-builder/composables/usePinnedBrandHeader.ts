import { computed, type Ref } from 'vue'
import { ComponentType, type ComponentInstance } from '@/types/page'

/** 估算品牌顶栏占位高度（实测完成前的兜底） */
export function estimateBrandHeaderHeight(props?: Record<string, unknown>) {
  // safe 22 + bar min-height 44（border-box，含内边距）
  let height = 22 + 44
  if (String(props?.subtitle || '').trim()) height += 16
  return height
}

export function usePinnedBrandHeader(components: Ref<ComponentInstance[]>) {
  const pinnedBrandHeaderIndex = computed(() => {
    const idx = components.value.findIndex(
      (c) => c.type !== ComponentType.FloatButton && c.type === ComponentType.BrandHeader,
    )
    if (idx < 0) return -1
    const comp = components.value[idx]
    if (comp.props?.fixed_top === false) return -1
    return idx
  })

  const pinnedBrandHeader = computed(() => {
    const idx = pinnedBrandHeaderIndex.value
    return idx >= 0 ? components.value[idx] : null
  })

  const pinnedBrandHeaderHeight = computed(() =>
    estimateBrandHeaderHeight(pinnedBrandHeader.value?.props),
  )

  const hasBrandHeader = computed(() =>
    components.value.some((c) => c.type === ComponentType.BrandHeader),
  )

  function isPinnedBrandHeader(comp: ComponentInstance, index: number) {
    return index === pinnedBrandHeaderIndex.value && comp.type === ComponentType.BrandHeader
  }

  return {
    pinnedBrandHeader,
    pinnedBrandHeaderIndex,
    pinnedBrandHeaderHeight,
    hasBrandHeader,
    isPinnedBrandHeader,
  }
}
