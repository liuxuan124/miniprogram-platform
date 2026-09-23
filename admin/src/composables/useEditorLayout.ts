import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

/** 装修器响应式断点（与需求 #4 对齐） */
export function useEditorLayout(onNarrowSelect?: () => void) {
  const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1440)

  const isDesktop = computed(() => viewportWidth.value >= 1280)
  const isTablet = computed(() => viewportWidth.value >= 1024 && viewportWidth.value < 1280)
  const isMobile = computed(() => viewportWidth.value < 1024)

  const leftDrawerOpen = ref(false)
  const rightDrawerOpen = ref(false)
  const leftRailCollapsed = ref(false)

  function sync() {
    viewportWidth.value = window.innerWidth
    if (isDesktop.value) {
      leftDrawerOpen.value = false
      rightDrawerOpen.value = false
      leftRailCollapsed.value = false
    } else if (isTablet.value) {
      leftDrawerOpen.value = false
      leftRailCollapsed.value = true
    }
  }

  onMounted(() => {
    sync()
    window.addEventListener('resize', sync)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('resize', sync)
  })

  watch(isMobile, (narrow) => {
    if (narrow) {
      leftRailCollapsed.value = false
    }
  })

  function openRightPanel() {
    if (isMobile.value) rightDrawerOpen.value = true
  }

  function onComponentSelected() {
    if (isMobile.value) {
      onNarrowSelect?.()
      rightDrawerOpen.value = true
    }
  }

  return {
    viewportWidth,
    isDesktop,
    isTablet,
    isMobile,
    leftDrawerOpen,
    rightDrawerOpen,
    leftRailCollapsed,
    openRightPanel,
    onComponentSelected,
    sync,
  }
}
