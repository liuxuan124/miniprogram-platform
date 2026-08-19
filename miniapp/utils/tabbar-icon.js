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

function isImageIcon(icon) {
  if (!icon) return false
  const s = String(icon).trim()
  return /^(https?:\/\/|\/)/i.test(s)
}

function migrateTabBarIcon(icon) {
  const raw = String(icon || '').trim()
  if (!raw) return ''
  if (isImageIcon(raw)) return resolveNavIconUrl(raw)
  return resolveNavIconUrl(TAB_EMOJI_ICON_MAP[raw] || raw)
}

module.exports = {
  migrateTabBarIcon,
  isImageIcon,
}
