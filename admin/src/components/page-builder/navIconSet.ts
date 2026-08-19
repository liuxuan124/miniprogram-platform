/**
 * 导航扁平图标库
 * - 旧版：柔和色底 SVG
 * - 新版：软质感 PNG（无外框色块）
 * 路径同时用于装修预览与小程序：/images/nav-icons/*
 */
export interface NavFlatIcon {
  id: string
  label: string
  /** 小程序 / 预览可用的相对路径 */
  src: string
  /** 色底（渲染时可选；PNG 软图标建议透明/白） */
  bg: string
  /** 主色（文档用） */
  color: string
}

/** 原有 SVG 扁平图标 */
const NAV_SVG_ICONS: NavFlatIcon[] = [
  { id: 'book', label: '内容/文稿', src: '/images/nav-icons/book.svg', bg: '#E8EEFF', color: '#4F6DFF' },
  { id: 'pack', label: '资料包/文件夹', src: '/images/nav-icons/pack.svg', bg: '#E6F7F0', color: '#1FA97A' },
  { id: 'chat', label: '咨询/聊天', src: '/images/nav-icons/chat.svg', bg: '#FFF0E8', color: '#F2762A' },
  { id: 'crown', label: '会员/徽章', src: '/images/nav-icons/crown.svg', bg: '#FFF6DF', color: '#D4A017' },
  { id: 'cart', label: '商城/购物袋', src: '/images/nav-icons/cart.svg', bg: '#FFECEE', color: '#E85D6C' },
  { id: 'search', label: '搜索', src: '/images/nav-icons/search.svg', bg: '#EEF2F7', color: '#5B6B82' },
  { id: 'chart', label: '选品/趋势', src: '/images/nav-icons/chart.svg', bg: '#E8EEFF', color: '#4F6DFF' },
  { id: 'factory', label: '供应链/工厂', src: '/images/nav-icons/factory.svg', bg: '#E8F6F1', color: '#2F9E6E' },
  { id: 'ship', label: '物流/货船', src: '/images/nav-icons/ship.svg', bg: '#E6F4FB', color: '#2B8CC4' },
  { id: 'globe', label: '独立站/全球', src: '/images/nav-icons/globe.svg', bg: '#EFEBFF', color: '#6B4FE0' },
  { id: 'scale', label: '合规/天平', src: '/images/nav-icons/scale.svg', bg: '#FDECF2', color: '#D94F78' },
  { id: 'gift', label: '福利/礼盒', src: '/images/nav-icons/gift.svg', bg: '#FFF0E8', color: '#F2762A' },
  { id: 'fire', label: '热门', src: '/images/nav-icons/fire.svg', bg: '#FFECEE', color: '#E85D6C' },
  { id: 'user', label: '我的', src: '/images/nav-icons/user.svg', bg: '#EEF2F7', color: '#5B6B82' },
  { id: 'phone', label: '客服/耳机', src: '/images/nav-icons/phone.svg', bg: '#E6F7F0', color: '#1FA97A' },
  { id: 'rocket', label: '增长', src: '/images/nav-icons/rocket.svg', bg: '#EFEBFF', color: '#6B4FE0' },
  { id: 'calendar', label: '活动/日历', src: '/images/nav-icons/calendar.svg', bg: '#E8EEFF', color: '#4F6DFF' },
]

/** 软质感 PNG（透明底、无外层色块） */
const NAV_SOFT_PNG_ICONS: NavFlatIcon[] = [
  { id: 'g-activity', label: '跨境活动', src: '/images/nav-icons/g-activity.png', bg: '#EEF3FF', color: '#5B8CFF' },
  { id: 'g-exhibit', label: '展会', src: '/images/nav-icons/g-exhibit.png', bg: '#F3EEFF', color: '#8B6CFF' },
  { id: 'g-member', label: '会员服务', src: '/images/nav-icons/g-member.png', bg: '#FFF6E8', color: '#F0A020' },
  { id: 'g-industry', label: '产业带', src: '/images/nav-icons/g-industry.png', bg: '#EAF7F2', color: '#2F9E6E' },
  { id: 'g-platform', label: '跨境平台', src: '/images/nav-icons/g-platform.png', bg: '#EEF3FF', color: '#5B8CFF' },
  { id: 'g-news', label: '跨境资讯', src: '/images/nav-icons/g-news.png', bg: '#FFF0E8', color: '#F2762A' },
  { id: 'g-report', label: '跨境报告', src: '/images/nav-icons/g-report.png', bg: '#EAF7F2', color: '#2F9E6E' },
  { id: 'g-video', label: '跨境视频', src: '/images/nav-icons/g-video.png', bg: '#FFECEE', color: '#E85D6C' },
  { id: 'g-park', label: '产业园', src: '/images/nav-icons/g-park.png', bg: '#EAF7F2', color: '#2F9E6E' },
  { id: 'g-recruit', label: '人才招聘', src: '/images/nav-icons/g-recruit.png', bg: '#FFF6E8', color: '#F0A020' },
  { id: 'g-logistics', label: '物流履约', src: '/images/nav-icons/g-logistics.png', bg: '#E6F4FB', color: '#2B8CC4' },
  { id: 'g-compliance', label: '合规税务', src: '/images/nav-icons/g-compliance.png', bg: '#FDECF2', color: '#D94F78' },
  { id: 'g-insight', label: '选品洞察', src: '/images/nav-icons/g-insight.png', bg: '#F3EEFF', color: '#8B6CFF' },
  { id: 'g-site', label: '独立站', src: '/images/nav-icons/g-site.png', bg: '#E6F4FB', color: '#2B8CC4' },
  { id: 'g-consult', label: '1v1咨询', src: '/images/nav-icons/g-consult.png', bg: '#FFF0E8', color: '#F2762A' },
  { id: 'g-gift', label: '福利礼包', src: '/images/nav-icons/g-gift.png', bg: '#FFECEE', color: '#E85D6C' },
  { id: 'g-bag', label: '购物袋', src: '/images/nav-icons/g-bag.png', bg: '#EAF7F2', color: '#2F9E6E' },
  { id: 'g-rocket', label: '增长火箭', src: '/images/nav-icons/g-rocket.png', bg: '#F3EEFF', color: '#8B6CFF' },
  { id: 'g-service', label: '客服耳机', src: '/images/nav-icons/g-service.png', bg: '#EAF7F2', color: '#2F9E6E' },
  { id: 'g-hot', label: '热门火焰', src: '/images/nav-icons/g-hot.png', bg: '#FFECEE', color: '#E85D6C' },
  { id: 'g-crown', label: 'VIP会员', src: '/images/nav-icons/g-crown.png', bg: '#FFF6E8', color: '#F0A020' },
  { id: 'g-folder', label: '资料包', src: '/images/nav-icons/g-folder.png', bg: '#FFF6E8', color: '#F0A020' },
  { id: 'g-truck', label: '物流服务', src: '/images/nav-icons/g-truck.png', bg: '#FFF6E8', color: '#F0A020' },
  { id: 'g-coupon', label: '优惠券', src: '/images/nav-icons/g-coupon.png', bg: '#FFECEE', color: '#E85D6C' },
  { id: 'g-content', label: '内容中心', src: '/images/nav-icons/g-content.png', bg: '#EEF3FF', color: '#5B8CFF' },
  { id: 'g-knowledge', label: '知识库', src: '/images/nav-icons/g-knowledge.png', bg: '#F3EEFF', color: '#8B6CFF' },
  { id: 'g-order', label: '订单', src: '/images/nav-icons/g-order.png', bg: '#FFF0E8', color: '#F2762A' },
  { id: 'g-wallet', label: '钱包支付', src: '/images/nav-icons/g-wallet.png', bg: '#FFF6E8', color: '#F0A020' },
  { id: 'g-favorite', label: '收藏', src: '/images/nav-icons/g-favorite.png', bg: '#FFECEE', color: '#E85D6C' },
  { id: 'g-user', label: '我的', src: '/images/nav-icons/g-user.png', bg: '#EAF7F2', color: '#2F9E6E' },
]

export const NAV_FLAT_ICONS: NavFlatIcon[] = [...NAV_SOFT_PNG_ICONS, ...NAV_SVG_ICONS]

export function isNavFlatIconSrc(icon?: string): boolean {
  if (!icon) return false
  const path = String(icon).trim().split('?')[0]
  return /\/images\/nav-icons\/[\w-]+\.(svg|png)$/i.test(path)
}

/** 导航 / TabBar 图标是否为图片路径（含扁平图标库） */
export function isNavImageIcon(icon?: string): boolean {
  if (!icon) return false
  const s = String(icon).trim()
  return /^(https?:\/\/|\/|data:image|\.\/|\.\.\/)/i.test(s) || isNavFlatIconSrc(s)
}

export function navIconDisplaySrc(icon?: string): string {
  const raw = String(icon || '').trim()
  if (!raw) return ''
  if (raw.includes('?')) return raw
  return isNavFlatIconSrc(raw) ? `${raw}?t=20260819e` : raw
}

export function findNavFlatIcon(icon?: string): NavFlatIcon | undefined {
  if (!icon) return undefined
  const raw = String(icon).trim()
  const path = raw.split('?')[0]
  return NAV_FLAT_ICONS.find(
    (i) =>
      i.src === raw ||
      i.src.split('?')[0] === path ||
      i.id === raw ||
      path.endsWith(`/nav-icons/${i.id}.svg`) ||
      path.endsWith(`/nav-icons/${i.id}.png`),
  )
}

/** 旧版 TabBar emoji 迁移到扁平图标路径 */
const TAB_EMOJI_ICON_MAP: Record<string, string> = {
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
  '💰': '/images/nav-icons/g-wallet.png',
  '🎫': '/images/nav-icons/g-coupon.png',
  '❤️': '/images/nav-icons/g-favorite.png',
  '⭐': '/images/nav-icons/g-hot.png',
  '🚀': '/images/nav-icons/g-rocket.png',
  '💡': '/images/nav-icons/g-insight.png',
}

export function migrateTabBarIcon(icon?: string): string {
  const raw = String(icon || '').trim()
  if (!raw) return '/images/nav-icons/g-bag.png'
  if (isNavImageIcon(raw)) return raw.split('?')[0]
  return TAB_EMOJI_ICON_MAP[raw] || raw
}
