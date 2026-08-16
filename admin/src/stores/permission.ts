/**
 * 权限状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { asyncRoutes } from '@/router'

/** 判断路由是否有权限（角色或权限码任一命中即可；均未配置则放行） */
function hasPermission(route: RouteRecordRaw, roles: string[], permissions: string[]): boolean {
  const needRoles = route.meta?.roles as string[] | undefined
  const needPerms = route.meta?.permissions as string[] | undefined
  if ((!needRoles || needRoles.length === 0) && (!needPerms || needPerms.length === 0)) {
    return true
  }
  if (roles.includes('super_admin')) return true
  const roleOk = needRoles?.length ? roles.some((r) => needRoles.includes(r)) : false
  const permOk = needPerms?.length ? needPerms.some((p) => permissions.includes(p)) : false
  if (needRoles?.length && needPerms?.length) return roleOk || permOk
  if (needRoles?.length) return roleOk
  return permOk
}

/** 递归过滤有权限的路由 */
function filterAsyncRoutes(
  routes: RouteRecordRaw[],
  roles: string[],
  permissions: string[],
): RouteRecordRaw[] {
  const filtered: RouteRecordRaw[] = []
  routes.forEach((route) => {
    const tmp = { ...route }
    if (tmp.children) {
      tmp.children = filterAsyncRoutes(tmp.children, roles, permissions)
    }
    const selfAllowed = hasPermission(tmp, roles, permissions)
    const hasVisibleChildren = !!(tmp.children && tmp.children.length > 0)
    const hasMetaGate = !!(route.meta?.roles || route.meta?.permissions)
    if (hasMetaGate) {
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
    // 仅 super_admin 拥有全部菜单；其他角色按 meta.roles / meta.permissions 过滤
    if (userRoles.includes('super_admin')) {
      accessedRoutes = asyncRoutes
    } else {
      accessedRoutes = filterAsyncRoutes(asyncRoutes, userRoles, permissions.value)
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

  /** 判断是否有任一权限 */
  function hasAnyPerm(perms: string[]): boolean {
    if (roles.value.includes('super_admin')) return true
    return perms.some((p) => permissions.value.includes(p))
  }

  /** 当前用户是否可访问路由 meta */
  function canAccessMeta(meta: Record<string, unknown> | undefined): boolean {
    if (!meta) return true
    if (roles.value.includes('super_admin')) return true
    const needRoles = meta.roles as string[] | undefined
    const needPerms = meta.permissions as string[] | undefined
    if ((!needRoles || !needRoles.length) && (!needPerms || !needPerms.length)) return true
    const roleOk = needRoles?.length ? roles.value.some((r) => needRoles.includes(r)) : false
    const permOk = needPerms?.length ? needPerms.some((p) => permissions.value.includes(p)) : false
    if (needRoles?.length && needPerms?.length) return roleOk || permOk
    if (needRoles?.length) return roleOk
    return permOk
  }

  return {
    roles,
    permissions,
    dynamicRoutes,
    setRolesAndPermissions,
    generateRoutes,
    resetPermission,
    hasPerm,
    hasAnyPerm,
    canAccessMeta,
  }
})
