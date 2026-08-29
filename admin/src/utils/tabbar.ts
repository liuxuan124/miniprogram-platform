import type { NavTab } from '@/types/miniapp'

/** 与小程序 app.json tabBar 注册的壳页面一一对应（最多 4 个，微信上限 5） */
export const TAB_SHELL_ROUTES = [
  '/pages/index/index',
  '/pages/content-list/content-list',
  '/pages/knowledge-mall/knowledge-mall',
  '/pages/mine/mine',
  '/pages/tab-hub/tab-hub',
] as const

export const TABBAR_MIN = 2
export const TABBAR_MAX = TAB_SHELL_ROUTES.length

function normalizeShellRoute(route?: string) {
  if (!route) return ''
  return '/' + String(route).trim().replace(/^\/+/, '')
}

export function resolveTabShellRoute(tab: NavTab, index: number): string {
  const raw = (tab as NavTab & { tabRoute?: string; slotRoute?: string }).tabRoute
    || (tab as NavTab & { slotRoute?: string }).slotRoute
  const route = normalizeShellRoute(raw)
  if (route && TAB_SHELL_ROUTES.includes(route as typeof TAB_SHELL_ROUTES[number])) {
    return route
  }
  return TAB_SHELL_ROUTES[index] || TAB_SHELL_ROUTES[0]
}

export function pickNextShellRoute(tabs: NavTab[]): string {
  const used = new Set(tabs.map((tab, index) => resolveTabShellRoute(tab, index)))
  const free = TAB_SHELL_ROUTES.find((route) => !used.has(route))
  return free || TAB_SHELL_ROUTES[TAB_SHELL_ROUTES.length - 1]
}

/** 规范化：2~5 个，不强制凑满；补齐 tabRoute */
export function normalizeTabBarItems(tabs: NavTab[]): NavTab[] {
  const source = Array.isArray(tabs) ? tabs : []
  const sliced = source.slice(0, TABBAR_MAX).map((tab, index) => {
    const tabRoute = resolveTabShellRoute(tab, index)
    const defaultPath = tabRoute.replace(/^\//, '')
    return {
      ...tab,
      id: tab.id || `tab-${index}`,
      tabRoute,
      pagePath: tab.pagePath || defaultPath,
    } as NavTab & { tabRoute: string }
  })
  while (sliced.length < TABBAR_MIN) {
    const index = sliced.length
    const tabRoute = TAB_SHELL_ROUTES[index]
    sliced.push({
      id: `tab-${index}-${Date.now()}`,
      text: `导航${index + 1}`,
      icon: '/images/nav-icons/g-bag.png',
      pagePath: tabRoute.replace(/^\//, ''),
      pageId: '',
      pageName: '',
      tabRoute,
    } as NavTab & { tabRoute: string })
  }
  return sliced
}

export function createEmptyTab(tabs: NavTab[]): NavTab & { tabRoute: string } {
  const tabRoute = pickNextShellRoute(tabs)
  return {
    id: `tab-${Date.now()}`,
    text: '新导航',
    icon: '/images/nav-icons/g-bag.png',
    pagePath: tabRoute.replace(/^\//, ''),
    pageId: '',
    pageName: '',
    tabRoute,
  }
}
