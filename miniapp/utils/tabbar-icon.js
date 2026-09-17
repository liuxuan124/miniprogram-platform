const { resolveNavIconUrl } = require('./nav-icon-url')

/** TabBar emoji → 扁平图标路径（与 admin navIconSet 保持一致） */
const TAB_EMOJI_ICON_MAP = {
  '🏠': '/images/nav-icons/g-platform.png',
  '📝': '/images/nav-icons/g-content.png',
  '📋': '/images/nav-icons/g-content.png',
  '👑': '/images/nav-icons/g-crown.png',
  '🛒': '/images/nav-icons/g-bag.png',
  '🛍️': '/images/nav-icons/g-bag.png',
  '👤': '/images/nav-icons/g-user.png',
  '🔍': '/images/nav-icons/g-news.png',
  '📅': '/images/nav-icons/g-consult.png',
  '🤖': '/images/nav-icons/g-insight.png',
  '📦': '/images/nav-icons/g-folder.png',
}

/** 旧版 /images/tab/*.png 保留本地暖阁图标，不再映射到旧 nav-icons */
const TAB_PATH_ICON_MAP = {
  '/images/tab-v2/home.svg': '/images/tab/home.png',
  '/images/tab-v2/home-active.svg': '/images/tab/home-active.png',
  '/images/tab-v2/content.svg': '/images/tab/content.png',
  '/images/tab-v2/content-active.svg': '/images/tab/content-active.png',
  '/images/tab-v2/hub.svg': '/images/tab/member.png',
  '/images/tab-v2/hub-active.svg': '/images/tab/member-active.png',
  '/images/tab-v2/mine.svg': '/images/tab/mine.png',
  '/images/tab-v2/mine-active.svg': '/images/tab/mine-active.png',
  '/images/tab-v2/shop.svg': '/images/tab/shop.png',
  '/images/tab-v2/shop-active.svg': '/images/tab/shop-active.png',
}

function isImageIcon(icon) {
  if (!icon) return false
  const s = String(icon).trim()
  return /^(https?:\/\/|\/)/i.test(s)
}

function migrateTabBarIcon(icon) {
  const raw = String(icon || '').trim()
  if (!raw) return ''
  const pathOnly = raw.split('?')[0]
  if (TAB_PATH_ICON_MAP[pathOnly]) {
    return resolveNavIconUrl(TAB_PATH_ICON_MAP[pathOnly])
  }
  if (isImageIcon(raw)) return resolveNavIconUrl(raw)
  return resolveNavIconUrl(TAB_EMOJI_ICON_MAP[raw] || raw)
}

module.exports = {
  migrateTabBarIcon,
  isImageIcon,
}
