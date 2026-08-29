import type { NavTab } from '@/types/miniapp'

/** 与小程序 app.json tabBar 注册的壳页面一一对应（微信上限 5） */
export const TAB_SHELL_ROUTES = [
  '/pages/index/index',
  '/pages/content-list/content-list',
  '/pages/knowledge-mall/knowledge-mall',
  '/pages/mine/mine',
  '/pages/tab-hub/tab-hub',
] as const

export type TabShellRoute = typeof TAB_SHELL_ROUTES[number]

export const TABBAR_MIN = 2
export const TABBAR_MAX = TAB_SHELL_ROUTES.length

function normalizeShellRoute(route?: string): string {
  if (!route) return ''
  return '/' + String(route).trim().replace(/^\/+/, '')
}

function isShellRoute(route: string): route is TabShellRoute {
  return (TAB_SHELL_ROUTES as readonly string[]).includes(route)
}

/** 从文案 / 绑定路径推断壳页，避免删中间项后按 index 错位 */
function inferShellRouteFromTab(tab: NavTab): TabShellRoute | '' {
  const path = normalizeShellRoute(tab.pagePath)
  const text = String(tab.text || tab.pageName || '')
  if (path.includes('/pages/mine/mine') || /我的|mine/i.test(text)) return '/pages/mine/mine'
  if (path.includes('/pages/tab-hub/tab-hub') || /更多|工具|扩展/.test(text)) return '/pages/tab-hub/tab-hub'
  if (path.includes('/pages/knowledge-mall') || path.includes('/pages/product-list') || /商品|商城/.test(text)) {
    return '/pages/knowledge-mall/knowledge-mall'
  }
  if (path.includes('/pages/content-list') || /内容|资讯|干货/.test(text)) {
    return '/pages/content-list/content-list'
  }
  if (path.includes('/pages/index/index') || /首页|home/i.test(text)) return '/pages/index/index'
  if (path.startsWith('/pages/custom/')) {
    if (/我的/.test(text)) return '/pages/mine/mine'
    if (/内容|资讯/.test(text)) return '/pages/content-list/content-list'
    if (/商品|商城/.test(text)) return '/pages/knowledge-mall/knowledge-mall'
    if (/首页/.test(text)) return '/pages/index/index'
  }
  return ''
}

export function resolveTabShellRoute(tab: NavTab, index: number): TabShellRoute {
  const raw = normalizeShellRoute(
    (tab as NavTab & { tabRoute?: string; slotRoute?: string }).tabRoute
      || (tab as NavTab & { slotRoute?: string }).slotRoute,
  )
  if (raw && isShellRoute(raw)) return raw

  const inferred = inferShellRouteFromTab(tab)
  if (inferred) return inferred

  return TAB_SHELL_ROUTES[index] || TAB_SHELL_ROUTES[0]
}

export function pickNextShellRoute(tabs: NavTab[]): TabShellRoute {
  const used = new Set(tabs.map((tab, index) => resolveTabShellRoute(tab, index)))
  const free = TAB_SHELL_ROUTES.find((route) => !used.has(route))
  return free || TAB_SHELL_ROUTES[TAB_SHELL_ROUTES.length - 1]
}

function stableTabId(tab: NavTab, index: number): string {
  if (tab.id) return String(tab.id)
  return `tab-${index}`
}

/** 规范化：2~5 个；补齐稳定 tabRoute；统一 pagePath 前缀 */
export function normalizeTabBarItems(tabs: NavTab[]): NavTab[] {
  const source = Array.isArray(tabs) ? tabs : []
  const usedRoutes = new Set<string>()
  const sliced: Array<NavTab & { tabRoute: string }> = []

  source.slice(0, TABBAR_MAX).forEach((tab, index) => {
    let tabRoute = resolveTabShellRoute(tab, index)
    // 同一壳页只能出现一次：冲突时改分空闲壳
    if (usedRoutes.has(tabRoute)) {
      const free = TAB_SHELL_ROUTES.find((route) => !usedRoutes.has(route))
      if (free) tabRoute = free
    }
    usedRoutes.add(tabRoute)

    let pagePath = String(tab.pagePath || '').trim()
    if (pagePath && !pagePath.startsWith('/')) pagePath = `/${pagePath}`
    if (!pagePath) pagePath = tabRoute

    sliced.push({
      ...tab,
      id: stableTabId(tab, index),
      tabRoute,
      pagePath,
      text: String(tab.text || '').trim() || `导航${index + 1}`,
      icon: tab.icon || '/images/nav-icons/g-bag.png',
      pageId: tab.pageId ?? '',
      pageName: tab.pageName || '',
    })
  })

  while (sliced.length < TABBAR_MIN) {
    const index = sliced.length
    const tabRoute = TAB_SHELL_ROUTES.find((route) => !usedRoutes.has(route)) || TAB_SHELL_ROUTES[index]
    usedRoutes.add(tabRoute)
    sliced.push({
      id: `tab-${index}`,
      text: `导航${index + 1}`,
      icon: '/images/nav-icons/g-bag.png',
      pagePath: tabRoute,
      pageId: '',
      pageName: '',
      tabRoute,
    })
  }
  return sliced
}

export function createEmptyTab(tabs: NavTab[]): NavTab & { tabRoute: string } {
  const tabRoute = pickNextShellRoute(tabs)
  return {
    id: `tab-${Date.now()}`,
    text: '新导航',
    icon: '/images/nav-icons/g-bag.png',
    pagePath: tabRoute,
    pageId: '',
    pageName: '',
    tabRoute,
  }
}

/** 用于脏检查：忽略无关字段波动，只比业务字段 */
export function tabBarSnapshot(tabs: NavTab[]): unknown {
  return normalizeTabBarItems(tabs).map((tab) => ({
    text: tab.text,
    icon: tab.icon,
    pagePath: tab.pagePath,
    pageId: tab.pageId == null || tab.pageId === '' ? '' : String(tab.pageId),
    pageName: tab.pageName || '',
    tabRoute: tab.tabRoute || '',
  }))
}
