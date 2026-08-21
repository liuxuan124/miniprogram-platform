/** 功能菜单专用线条图标库（与底部导航图标库分离） */

export interface MenuLineIcon {
  id: string
  name: string
  /** 内联 SVG（24×24，描边） */
  svg: string
}

const S =
  'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"'

function icon(id: string, name: string, paths: string): MenuLineIcon {
  return { id: `line:${id}`, name, svg: `<svg ${S}>${paths}</svg>` }
}

/** ~32 个细线描边图标，适合「我的」功能菜单 */
export const MENU_LINE_ICONS: MenuLineIcon[] = [
  icon('package', '包裹/订单', '<path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3.3 7.5L12 12l8.7-4.5"/><path d="M12 12v10"/>'),
  icon('wallet', '钱包', '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.2"/>'),
  icon('coupon', '优惠券', '<path d="M4 8a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 00-1.5 1.9 2 2 0 001.5 1.9V16a2 2 0 01-2 2H6a2 2 0 01-2-2v-2.2A2 2 0 005.5 12 2 2 0 004 10.1V8z"/><path d="M9 8v8"/>'),
  icon('heart', '爱心', '<path d="M12 20s-7-4.4-7-9.2A3.8 3.8 0 0112 8.2a3.8 3.8 0 017 2.6C19 15.6 12 20 12 20z"/>'),
  icon('star', '收藏', '<path d="M12 3.5l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.2 7.2 18.4l.9-5.4-3.9-3.8 5.4-.8L12 3.5z"/>'),
  icon('pin', '地址', '<path d="M12 21s-6-5.3-6-10a6 6 0 1112 0c0 4.7-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/>'),
  icon('chat', '客服/聊天', '<path d="M5 18l-1.5 3 4-1.5A8.5 8.5 0 1020.5 12 8.5 8.5 0 015 18z"/><path d="M8.5 11h7M8.5 14h4.5"/>'),
  icon('phone', '电话', '<path d="M8.5 4.5h2.2l1.1 2.8-1.4 1.4a11 11 0 005 5l1.4-1.4 2.8 1.1v2.2a2 2 0 01-2.2 2A14.5 14.5 0 016.5 6.7a2 2 0 012-2.2z"/>'),
  icon('sun', '太阳', '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M4.9 6.5l1.6 1.6M17.5 15.9l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.9 17.5l1.6-1.6M17.5 8.1l1.6-1.6"/>'),
  // 相对 24 画布略内缩，避免齿尖贴边显得比其它线图标更大
  icon('gear', '设置', '<g transform="translate(12 12) scale(0.82) translate(-12 -12)"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></g>'),
  icon('feedback', '反馈', '<path d="M5 5h14v10H9l-4 3.5V5z"/><path d="M8.5 9.5h7M8.5 12.5h4"/>'),
  icon('crown', '会员', '<path d="M4 16l2-8 4 4 2-6 2 6 4-4 2 8H4z"/><path d="M5 18h14"/>'),
  icon('calendar', '日历', '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3.5v3M16 3.5v3M4 10h16"/>'),
  icon('pencil', '编辑', '<path d="M14 4.5l5.5 5.5L8.5 21H3v-5.5L14 4.5z"/><path d="M12 6.5l5.5 5.5"/>'),
  icon('idcard', '证件', '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.2"/><path d="M14 10h4M14 13.5h4M5.5 16.5c.8-1.4 2-2.1 3.5-2.1s2.7.7 3.5 2.1"/>'),
  icon('document', '文档', '<path d="M7 3.5h7l4 4V20.5H7z"/><path d="M14 3.5v4h4M9.5 12h5M9.5 15.5h5"/>'),
  icon('check', '勾选', '<circle cx="12" cy="12" r="8.5"/><path d="M8 12.2l2.6 2.6L16.2 9"/>'),
  icon('list', '列表', '<path d="M9 7h11M9 12h11M9 17h11"/><circle cx="5" cy="7" r="1.1"/><circle cx="5" cy="12" r="1.1"/><circle cx="5" cy="17" r="1.1"/>'),
  icon('bag', '购物袋', '<path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8a3 3 0 016 0"/>'),
  icon('gift', '礼物', '<rect x="4" y="10" width="16" height="10" rx="1"/><path d="M12 10v10M4 14h16M12 10c-2.5-3.5-5.5-1.5-5.5 0S9.5 12 12 10zm0 0c2.5-3.5 5.5-1.5 5.5 0S14.5 12 12 10z"/>'),
  icon('bell', '通知', '<path d="M6.5 16.5h11"/><path d="M8 16.5V10a4 4 0 018 0v6.5"/><path d="M10.5 16.5a1.5 1.5 0 003 0"/><path d="M12 4.5v1.5"/>'),
  icon('search', '搜索', '<circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/>'),
  icon('user', '用户', '<circle cx="12" cy="8" r="3.2"/><path d="M5.5 19.5c1.2-3.2 3.4-4.8 6.5-4.8s5.3 1.6 6.5 4.8"/>'),
  icon('clipboard', '剪贴板', '<rect x="6" y="5" width="12" height="15" rx="2"/><path d="M9 5.5V4.5a1.5 1.5 0 011.5-1.5h3A1.5 1.5 0 0115 4.5v1"/><path d="M9.5 11h5M9.5 14.5h5"/>'),
  icon('truck', '物流', '<path d="M3 15.5V8.5h10v7"/><path d="M13 11h4.5l2.5 3v1.5H13"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="16.5" cy="17.5" r="1.6"/>'),
  icon('home', '首页', '<path d="M4 11.5L12 4.5l8 7"/><path d="M7 10.5V19.5h10V10.5"/>'),
  icon('tag', '标签', '<path d="M3.5 12.5V4.5h8l8 8-8 8-8-8z"/><circle cx="8" cy="9" r="1.2"/>'),
  icon('shield', '安全', '<path d="M12 3.5l7 3v5.5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6.5l7-3z"/><path d="M9.5 12l1.8 1.8L14.8 10"/>'),
  icon('grid', '功能', '<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/>'),
  icon('books', '资料/书本', '<path d="M5 5.5h5.5v13H5z"/><path d="M10.5 5.5H16a2 2 0 012 2v11.5H10.5z"/><path d="M5 18.5h13"/><path d="M7.5 8.5h1M7.5 11h1"/>'),
  icon('mail', '邮件', '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7.5l8 6 8-6"/>'),
  icon('ticket', '票券', '<path d="M4 9a2 2 0 012-2h12a2 2 0 012 2v1.2a1.8 1.8 0 000 3.6V15a2 2 0 01-2 2H6a2 2 0 01-2-2v-1.2a1.8 1.8 0 000-3.6V9z"/><path d="M12 7.5v9"/>'),
]

const LINE_MAP = new Map(MENU_LINE_ICONS.map((i) => [i.id, i]))

export const MENU_COLOR_ICONS = [
  '📦', '💰', '🎫', '❤️', '📍', '📞', '⚙️', '💬', '🎯', '📊',
  '🎪', '🎮', '🎵', '📸', '🔔', '🎁', '🚀', '💡', '🔑', '📱',
  '🛒', '📋', '👤', '👑', '📝', '🔍', '📅', '🛍️', '🤖', '⭐',
] as const

export function isMenuLineIcon(value: string | undefined | null): boolean {
  return !!value && value.startsWith('line:')
}

export function getMenuLineIcon(value: string): MenuLineIcon | undefined {
  return LINE_MAP.get(value)
}

export function getMenuLineIconSvg(value: string): string {
  return LINE_MAP.get(value)?.svg || ''
}

/** 默认新菜单使用第一个线条图标 */
export const DEFAULT_MENU_LINE_ICON = MENU_LINE_ICONS[0].id

/** 按菜单标题推荐线条图标（用于默认项 / 旧 emoji 迁移） */
const TITLE_LINE_ICON: Array<[RegExp, string]> = [
  [/订单|全部订单/, 'line:document'],
  [/已购|资料|书/, 'line:books'],
  [/预约/, 'line:calendar'],
  [/会员/, 'line:crown'],
  [/优惠券|券/, 'line:coupon'],
  [/收藏/, 'line:star'],
  [/地址/, 'line:pin'],
  [/客服/, 'line:chat'],
  [/设置/, 'line:gear'],
  [/反馈|意见/, 'line:mail'],
  [/资产|钱包/, 'line:wallet'],
]

export function suggestMenuLineIcon(title: string, current?: string): string {
  if (isMenuLineIcon(current) && LINE_MAP.has(current!)) return current!
  const t = (title || '').trim()
  for (const [re, id] of TITLE_LINE_ICON) {
    if (re.test(t)) return id
  }
  if (current && !isMenuLineIcon(current)) {
    // 常见 emoji → line
    const emojiMap: Record<string, string> = {
      '📦': 'line:package',
      '💰': 'line:wallet',
      '🎫': 'line:coupon',
      '❤️': 'line:heart',
      '⭐': 'line:star',
      '📍': 'line:pin',
      '📞': 'line:phone',
      '💬': 'line:chat',
      '⚙️': 'line:gear',
      '👑': 'line:crown',
      '📅': 'line:calendar',
      '📝': 'line:pencil',
    }
    if (emojiMap[current]) return emojiMap[current]
  }
  return current || DEFAULT_MENU_LINE_ICON
}
