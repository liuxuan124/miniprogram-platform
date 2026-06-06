/**
 * 路由守卫
 * - 登录验证
 * - 权限校验
 * - 动态路由注入
 * - NProgress 进度条
 */
import type { Router } from 'vue-router'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { isAuthenticated } from '@/utils/auth'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'

NProgress.configure({ showSpinner: false })

/** 白名单路由（无需登录） */
const whiteList = ['/login']

/** 注册路由守卫 */
export function setupRouterGuards(router: Router) {
  router.beforeEach(async (to, _from, next) => {
    NProgress.start()

    // 设置页面标题
    const appTitle = import.meta.env.VITE_APP_TITLE || '管理后台'
    document.title = to.meta.title ? `${to.meta.title} - ${appTitle}` : appTitle

    const authenticated = isAuthenticated()

    if (authenticated) {
      // 已登录访问登录页，重定向到首页
      if (to.path === '/login') {
        next({ path: '/' })
        NProgress.done()
        return
      }

      // 检查是否已获取用户信息
      const userStore = useUserStore()
      if (userStore.userInfo) {
        next()
        return
      }

      try {
        // 获取用户信息
        const userInfo = await userStore.fetchUserInfo()

        // 根据角色生成动态路由
        const permissionStore = usePermissionStore()
        permissionStore.setRolesAndPermissions(userInfo.roles, userInfo.permissions)
        const accessRoutes = permissionStore.generateRoutes(userInfo.roles)

        // 动态添加路由
        accessRoutes.forEach((route) => {
          if (!route.name || !router.hasRoute(route.name)) {
            router.addRoute(route)
          }
        })

        // 重新导航到目标路由（确保动态路由已注册）
        next({ ...to, replace: true })
      } catch (error) {
        // 获取用户信息失败，清除 Token 并跳转登录
        userStore.resetState()
        next(`/login?redirect=${to.path}`)
        NProgress.done()
      }
    } else {
      // 未登录
      if (whiteList.includes(to.path)) {
        next()
      } else {
        next(`/login?redirect=${to.path}`)
        NProgress.done()
      }
    }
  })

  router.afterEach(() => {
    NProgress.done()
  })
}
