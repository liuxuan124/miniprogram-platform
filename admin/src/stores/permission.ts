/**
 * 权限状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { asyncRoutes } from '@/router'

/** 递归过滤有权限的路由 */
function filterAsyncRoutes(routes: RouteRecordRaw[], roles: string[]): RouteRecordRaw[] {
  const filtered: RouteRecordRaw[] = []
  routes.forEach((route) => {
    const tmp = { ...route }
    if (hasPermission(tmp, roles)) {
      if (tmp.children) {
        tmp.children = filterAsyncRoutes(tmp.children, roles)
      }
      filtered.push(tmp)
    }
  })
  return filtered
}

/** 判断路由是否有权限 */
function hasPermission(route: RouteRecordRaw, roles: string[]): boolean {
  if (route.meta?.roles) {
    return roles.some((role) => (route.meta!.roles as string[]).includes(role))
  }
  return true
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
    // admin 角色拥有所有路由权限
    if (userRoles.includes('admin') || userRoles.includes('super_admin')) {
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
    if (roles.value.includes('admin') || roles.value.includes('super_admin')) return true
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
