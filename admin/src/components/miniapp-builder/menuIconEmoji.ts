/**
 * 菜单图标降级映射（后台预览侧专用）——与小程序端**逐字对齐**。
 *
 * ## 为什么存在
 * 小程序里 `line:*`（矢量线条图标）**没有对应实现**，`pages/mine/mine.js` 的
 * `resolveMenuIconText()` 会把它们统一降级成 emoji：
 *
 * ```
 * line:check → ✅    line:pencil → ✍️    line:document → 🧾    line:crown → 👑
 * ```
 *
 * 而后台预览原本走 `menuLineIcons.ts` 渲染**矢量线条 SVG**。同一份配置，
 * 两端画出来完全不是一回事——运营看到的「预览效果」在真机上根本不存在。
 *
 * ## 规则（与 tabBar 图标同源思路）
 * **后台预览的唯一真源是小程序**。预览不该展示小程序渲染不出来的图形，
 * 所以这里统一按小程序的降级规则出 emoji，保证「预览 = 真机」。
 *
 * ## 维护纪律
 * 本表必须与 `miniapp/pages/mine/mine.js` 的 `MENU_ICON_EMOJI` **保持一字不差**。
 * 改任何一边都要同步另一边，否则预览又会漂回。真源永远是小程序端。
 *
 * 若将来给小程序补了真·SVG 图标实现（方案 A），应改为「admin 复用小程序那份 SVG」，
 * 而不是继续维持 emoji 降级。
 */

/** 小程序端 MENU_ICON_EMOJI 的镜像（37 条，顺序与源文件一致） */
export const MENU_ICON_EMOJI: Record<string, string> = {
  'line:package': '📦',
  'line:wallet': '💰',
  'line:coupon': '🎫',
  'line:heart': '❤️',
  'line:star': '⭐️',
  'line:pin': '📍',
  'line:chat': '💬',
  'line:check': '✅',
  'line:share': '🤝',
  'line:bookmark': '🔖',
  'line:link': '🔗',
  'line:camera': '📷',
  'line:chart': '📊',
  'line:phone': '📞',
  'line:sun': '🪐',
  'line:gear': '⚙️',
  'line:feedback': '📮',
  'line:crown': '👑',
  'line:calendar': '📅',
  'line:pencil': '✍️',
  'line:idcard': '🪪',
  'line:document': '🧾',
  'line:list': '🕘',
  'line:bag': '🛍',
  'line:gift': '🎁',
  'line:bell': '🔔',
  'line:search': '🔍',
  'line:user': '👥',
  'line:clipboard': '🧾',
  'line:truck': '🚚',
  'line:home': '🏠',
  'line:tag': '🏷',
  'line:shield': '🛡',
  'line:grid': '🧩',
  'line:books': '🗂',
  'line:mail': '📮',
  'line:ticket': '🎟',
}

/** 小程序端 MENU_ICON_FALLBACK */
export const MENU_ICON_FALLBACK = '📄'

/** 是否是后台配置层的线条图标标识 */
export function isMenuLineIconKey(icon?: string): boolean {
  return /^line:[a-z0-9-]+$/i.test(String(icon || '').trim())
}

/**
 * 按小程序规则解析菜单图标 → emoji。
 * - `line:*`：查映射表，命中即返回；未命中用 fallback（与小程序一致）
 * - 已是 emoji / 图片路径：原样返回
 * - 空：返回 fallback
 */
export function resolveMenuIconEmoji(icon?: string): string {
  const raw = String(icon || '').trim()
  if (!raw) return MENU_ICON_FALLBACK
  if (MENU_ICON_EMOJI[raw]) return MENU_ICON_EMOJI[raw]
  if (isMenuLineIconKey(raw)) return MENU_ICON_FALLBACK
  return raw
}
