/**
 * 导航扁平图标库（无黑描边，柔和色底 + 单色填充图形）
 * 路径同时用于装修预览与小程序：/images/nav-icons/*.svg
 */
export interface NavFlatIcon {
  id: string
  label: string
  /** 小程序 / 预览可用的相对路径 */
  src: string
  /** 色底（渲染时可选） */
  bg: string
  /** 主色（文档用） */
  color: string
}

export const NAV_FLAT_ICONS: NavFlatIcon[] = [
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
]

export function isNavFlatIconSrc(icon?: string): boolean {
  if (!icon) return false
  return /\/images\/nav-icons\/[\w-]+\.svg$/i.test(String(icon).trim())
}

export function findNavFlatIcon(icon?: string): NavFlatIcon | undefined {
  if (!icon) return undefined
  const raw = String(icon).trim()
  return NAV_FLAT_ICONS.find((i) => i.src === raw || i.id === raw || raw.endsWith(`/nav-icons/${i.id}.svg`))
}
