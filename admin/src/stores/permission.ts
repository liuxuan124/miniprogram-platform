/**
 * 权限状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { asyncRoutes } from '@/router'

/** 判断路由是否有权限 */
function hasPermission(route: RouteRecordRaw, roles: string[]): boolean {
  if (route.meta?.roles) {
    return roles.some((role) => (route.meta!.roles as string[]).includes(role))
  }
  return true
}

/** 递归过滤有权限的路由（P2：非 super_admin 按 meta.roles 显隐） */
function filterAsyncRoutes(routes: RouteRecordRaw[], roles: string[]): RouteRecordRaw[] {
  const filtered: RouteRecordRaw[] = []
  routes.forEach((route) => {
    const tmp = { ...route }
    if (tmp.children) {
      tmp.children = filterAsyncRoutes(tmp.children, roles)
    }
    const selfAllowed = hasPermission(tmp, roles)
    const hasVisibleChildren = !!(tmp.children && tmp.children.length > 0)
    if (route.meta?.roles) {
      if (selfAllowed) filtered.push(tmp)
    } else if (hasVisibleChildren || !route.children?.length) {
      if (selfAllowed) filtered.push(tmp)
    } else if (hasVisibleChildren) {
      filtered.push(tmp)
    }
  })
  return filtered
}

export const usePermissionStore = defineStore('permission', () => {
  /** 用户角色列表 */
  const roles = ref<string[]>([])
  /** 权限标识列表 */
  const permissions = ref<string[]>([])
  /** 动态路由（根据权限过滤后） */
  const dynamicRoutes = ref<RouteRecordRaw[]>([])

  /** 设置角色和权限 */
  function setRolesAndPermissions(userRoles: string[], userPermissions: string[]) {
    roles.value = userRoles
    permissions.value = userPermissions
  }

  /** 生成动态路由 */
  function generateRoutes(userRoles: string[]) {
    let accessedRoutes: RouteRecordRaw[]
    // 仅 super_admin 拥有全部菜单；其他角色按 meta.roles 过滤（P2）
    if (userRoles.includes('super_admin')) {
      accessedRoutes = asyncRoutes
    } else {
      accessedRoutes = filterAsyncRoutes(asyncRoutes, userRoles)
    }
    dynamicRoutes.value = accessedRoutes
    return accessedRoutes
  }

  /** 重置权限状态 */
  function resetPermission() {
    roles.value = []
    permissions.value = []
    dynamicRoutes.value = []
  }

  /** 判断是否有指定权限 */
  function hasPerm(perm: string): boolean {
    if (roles.value.includes('super_admin')) return true
    return permissions.value.includes(perm)
  }

  return {
    roles,
    permissions,
    dynamicRoutes,
    setRolesAndPermissions,
    generateRoutes,
    resetPermission,
    hasPerm,
  }
})
