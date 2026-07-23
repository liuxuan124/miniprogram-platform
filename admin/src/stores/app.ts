/**
 * 应用全局状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  /** 侧边栏是否折叠 */
  const sidebarCollapsed = ref(false)
  /** 设备类型 */
  const device = ref<'desktop' | 'mobile'>('desktop')
  /** TagsView 标签列表 */
  const visitedViews = ref<Array<{ path: string; name: string; title: string; affix?: boolean }>>([])
  /** 页面强制刷新计数器：配合 layout/index.vue 的 router-view :key 实现"刷新当前标签" */
  const reloadKey = ref(0)

  /** 触发一次当前页面的强制刷新（重新挂载组件，绕过 keep-alive 缓存） */
  function triggerReload() {
    reloadKey.value += 1
  }

  /** 切换侧边栏折叠状态 */
  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
    if (sidebarCollapsed.value) {
      document.body.classList.add('sidebar-collapsed')
    } else {
      document.body.classList.remove('sidebar-collapsed')
    }
  }

  /** 设置设备类型 */
  function setDevice(val: 'desktop' | 'mobile') {
    device.value = val
    if (val === 'mobile') {
      sidebarCollapsed.value = true
    }
  }

  /** 添加已访问视图标签 */
  function addVisitedView(view: { path: string; name: string; title: string; affix?: boolean }) {
    const existingIndex = visitedViews.value.findIndex(
      (v) => v.path === view.path || v.name === view.name
    )
    if (existingIndex !== -1) {
      visitedViews.value[existingIndex] = {
        ...visitedViews.value[existingIndex],
        ...view,
      }
      return
    }
    visitedViews.value.push(view)
  }

  /** 移除已访问视图标签 */
  function removeVisitedView(path: string) {
    visitedViews.value = visitedViews.value.filter((v) => v.path !== path)
  }

  /** 关闭其他标签 */
  function closeOtherVisitedViews(path: string) {
    visitedViews.value = visitedViews.value.filter(
      (v) => v.path === path || v.affix
    )
  }

  /** 关闭所有标签 */
  function closeAllVisitedViews() {
    visitedViews.value = visitedViews.value.filter((v) => v.affix)
  }

  /** 关闭右侧标签（A6：TagsView 右键菜单） */
  function closeRightVisitedViews(path: string) {
    const idx = visitedViews.value.findIndex((v) => v.path === path)
    if (idx === -1) return
    visitedViews.value = visitedViews.value.filter(
      (v, i) => i <= idx || v.affix
    )
  }

  return {
    sidebarCollapsed,
    device,
    visitedViews,
    reloadKey,
    toggleSidebar,
    setDevice,
    addVisitedView,
    removeVisitedView,
    closeOtherVisitedViews,
    closeAllVisitedViews,
    closeRightVisitedViews,
    triggerReload,
  }
})
