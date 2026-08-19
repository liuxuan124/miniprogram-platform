import { ref, watch, onBeforeUnmount, nextTick, type Ref } from 'vue'

/** 监听元素实际渲染高度（用于吸顶占位与真实顶栏对齐） */
export function useMeasuredElementHeight(
  target: Ref<HTMLElement | null | undefined>,
  active: Ref<boolean>,
) {
  const height = ref(0)
  let observer: ResizeObserver | null = null

  function cleanup() {
    observer?.disconnect()
    observer = null
  }

  function measure() {
    if (!active.value || !target.value) {
      height.value = 0
      return
    }
    height.value = Math.ceil(target.value.getBoundingClientRect().height)
  }

  watch(
    [target, active],
    async () => {
      cleanup()
      if (!active.value || !target.value) {
        height.value = 0
        return
      }
      await nextTick()
      measure()
      observer = new ResizeObserver(measure)
      observer.observe(target.value)
    },
    { immediate: true, flush: 'post' },
  )

  onBeforeUnmount(cleanup)

  return height
}
