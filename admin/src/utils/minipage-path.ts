/**
 * 小程序页面路径校验（无依赖的纯函数模块）
 *
 * 抽出独立模块的原因：tabBar 绑定校验（useMiniappConfig）与「我的」菜单编排校验
 * （MinePageConfig 保存前）需要同一套口径，但又不想让纯逻辑依赖整个应用运行时。
 *
 * 内置页清单与 useMiniappConfig 的 SYSTEM_PAGES 保持一致；
 * 两处若要增删系统页，请同步修改。
 */

/** 系统内置页（tabBar 可绑定目标），path 为不带前导斜杠的相对路径 */
export const BUILTIN_MINI_PAGES: ReadonlyArray<{ path: string; name: string }> = [
  { path: 'pages/mine/mine', name: '我的' },
  { path: 'pages/ai-chat/ai-chat', name: 'AI对话' },
  { path: 'pages/login/login', name: '登录' },
  { path: 'pages/index/index', name: '首页' },
  { path: 'pkg-content/content-list/content-list', name: '内容列表' },
  { path: 'pkg-content/tab-hub/tab-hub', name: '扩展 Tab' },
  { path: 'pkg-content/product-list/product-list', name: '商品列表' },
  { path: 'pages/category/category', name: '分类' },
  { path: 'pkg-content/cart/cart', name: '购物车' },
]

/** 去掉首尾空白与前导斜杠，得到可比较的相对路径；空值返回 '' */
export function normalizeMinipagePath(path?: string | null): string {
  if (!path) return ''
  return String(path).trim().replace(/^\/+/, '')
}

/** 是否是系统内置页（tabBar / 菜单可直接指向，无需库表里有这条页面） */
export function isBuiltinMinipagePath(path?: string | null): boolean {
  const p = normalizeMinipagePath(path)
  if (!p) return false
  return BUILTIN_MINI_PAGES.some((page) => page.path === p)
}

/** 是否首页路径（首页允许不绑页面，靠 path 兜底） */
export function isMinipageIndexPath(path?: string | null): boolean {
  return normalizeMinipagePath(path) === 'pages/index/index'
}

/**
 * 跳转目标格式是否合法。
 * 规则：形如 `/pkg-xxx/yyy/yyy` 的绝对路径；不含空格、不含协议头、至少两段。
 * 这里只判「格式」，不判「页面是否已发布」——后者需要页面列表，由调用方补。
 */
export function isValidMinipageTarget(url?: string | null): boolean {
  const p = normalizeMinipagePath(url)
  if (!p) return false
  if (/\s/.test(p)) return false
  if (/^[a-z][a-z0-9+.-]*:/i.test(p)) return false
  if (!p.includes('/')) return false
  return /^[A-Za-z0-9_\-/]+$/.test(p)
}
