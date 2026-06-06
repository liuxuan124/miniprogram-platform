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

  return {
    sidebarCollapsed,
    device,
    visitedViews,
    toggleSidebar,
    setDevice,
    addVisitedView,
    removeVisitedView,
    closeOtherVisitedViews,
    closeAllVisitedViews,
  }
})
