/** 导航标签项 - 字段名与小程序端 custom-tab-bar 对齐 */
export interface NavTab {
  id: string
  /** 显示文本，小程序端读取 text 字段 */
  text: string
  icon: string
  /** 页面路径，小程序端读取 pagePath 字段 */
  pagePath: string
  pageId?: number | string
  pageName?: string
}

/** 导航模板 */
export interface NavTemplate {
  key: string
  name: string
  desc: string
  icon: string
  tabs: Omit<NavTab, 'id' | 'pageId' | 'pageName'>[]
}

/** 我的页面菜单项 - 字段名与小程序端 mine.js 对齐 */
export interface MineMenuItem {
  id: string
  icon: string
  title: string
  /** 导航地址，小程序端读取 url 字段 */
  url: string
  /** 是否启用，小程序端读取 enabled 字段 */
  enabled: boolean
  /** 分组标签，用于将菜单项分组显示 */
  group?: string
}

/** 订单快捷入口配置 */
export interface OrderQuickAccess {
  showOrderTabs: boolean
  showAllOrdersBtn: boolean
  tabLabels: {
    pending: string
    paid: string
    shipped: string
    completed: string
  }
}

/** 订单快捷入口固定顺序与图标（预览用） */
export const ORDER_TAB_KEYS = ['pending', 'paid', 'shipped', 'completed'] as const
export type OrderTabKey = (typeof ORDER_TAB_KEYS)[number]
export const ORDER_TAB_ICONS: Record<OrderTabKey, string> = {
  pending: 'line:wallet',
  paid: 'line:package',
  shipped: 'line:truck',
  completed: 'line:check',
}

/** 用户信息区配置 */
export interface UserProfileConfig {
  showAvatar: boolean
  showNickname: boolean
  showMemberLevel: boolean
  allowEditProfile: boolean
  memberLevelLabel: string
}

/** 「我的」页模板风格：基础版 / 会员版（兼容旧 standard/premium） */
export type MineStyleKey = 'basic' | 'member'

/** 我的页面配置 - 完整版 */
export interface MinePageConfig {
  loginTitle: string
  loginSubtitle: string
  loginButtonText: string
  memberCardTitle: string
  /** 预览已登录态昵称（仅管理端预览用），默认「微信用户」 */
  previewNickname?: string
  /** 预览头像（data URL / 远程 URL，仅管理端预览用） */
  previewAvatar?: string
  /** 预览手机号（仅管理端预览用） */
  previewPhone?: string
  /** 预览邮箱（仅管理端预览用） */
  previewEmail?: string
  /** 功能菜单是否显示图标，默认 false（仅文字 + ›） */
  showMenuIcons?: boolean
  /** 顶部装饰背景区，默认 true */
  showDecorBackground?: boolean
  /** 是否显示会员中心卡片，默认 true；关闭后订单区上移补位 */
  showMemberCard?: boolean
  menuItems: MineMenuItem[]
  orderQuickAccess: OrderQuickAccess
  userProfile: UserProfileConfig
  /** 模板风格 key：basic | member（旧值 standard/premium/minimal/dark 会归一化） */
  templateStyle?: string
  /** 卡片样式：gradient | outline（outline 为已删除的简约版，加载时回退） */
  style?: string
  themeColor?: string
  themeColorSecondary?: string
}

/** 「我的」页风格模板卡片（仅保留基础版 / 会员版） */
export const MINE_STYLE_TEMPLATES: Array<{
  key: MineStyleKey
  name: string
  icon: string
  gradient: string
  border?: string
}> = [
  {
    key: 'basic',
    name: '基础版',
    icon: '👤',
    gradient: 'linear-gradient(145deg, #7BA3F7 0%, #5B7FEA 55%, #6B6FE8 100%)',
  },
  {
    key: 'member',
    name: '会员版',
    icon: '👑',
    // 铂金冷蓝：浅紫蓝 → 冰蓝 → 天空蓝
    gradient: 'linear-gradient(145deg, #E8EEF8 0%, #C5D8F0 55%, #9BBFE8 100%)',
  },
]

export const MINE_STYLE_PRESETS: Record<MineStyleKey, {
  style: 'gradient'
  themeColor: string
  themeColorSecondary: string
}> = {
  basic: { style: 'gradient', themeColor: '#5B7FEA', themeColorSecondary: '#7BA3F7' },
  member: { style: 'gradient', themeColor: '#6B9FD9', themeColorSecondary: '#E8EEF8' },
}

/** 旧 key → 新 key；已删除的简约/暗黑 → basic */
export function normalizeMineStyleKey(key?: string | null): MineStyleKey {
  if (key === 'member' || key === 'premium') return 'member'
  return 'basic'
}

/** 从已保存配置推断风格（outline / 暗黑色 → basic） */
export function resolveMineStyleKey(mine?: {
  templateStyle?: string
  style?: string
  themeColor?: string
} | null): MineStyleKey {
  if (!mine) return 'basic'
  if (mine.templateStyle) {
    const raw = String(mine.templateStyle)
    if (raw === 'minimal' || raw === 'dark' || raw === 'simple') return 'basic'
    return normalizeMineStyleKey(raw)
  }
  if (mine.style === 'outline') return 'basic'
  const tc = String(mine.themeColor || '').toLowerCase()
  if (tc === '#1e293b' || tc === '#334155' || tc === '#475569') return 'basic'
  if (
    tc === '#b8860b' || tc === '#9a7b1c' || tc === '#d4af37' || tc === '#f0d060'
    || tc === '#d4a017' || tc === '#e8c547' || tc === '#f5e08a' || tc === '#c9a227'
    || tc === '#f5a24a' || tc === '#ffc56a' || tc === '#f08a38'
    || tc === '#f0a020' || tc === '#fde389' || tc === '#fcbc29' || tc === '#e78507'
    || tc === '#fecd41' || tc === '#fff6e8' || tc === '#e8b923' || tc === '#fff6df'
  ) return 'member'
  return 'basic'
}

/** 写入风格预设；对已删除风格强制回退到 basic */
export function applyMineStylePreset(
  mine: Record<string, unknown>,
  key?: string | null,
): MineStyleKey {
  const resolved = normalizeMineStyleKey(key ?? resolveMineStyleKey(mine as {
    templateStyle?: string
    style?: string
    themeColor?: string
  }))
  const preset = MINE_STYLE_PRESETS[resolved]
  Object.assign(mine, { templateStyle: resolved, ...preset })
  return resolved
}

/** 主题配色 */
export interface ThemeConfig {
  primaryColor: string
  secondaryColor: string
  navBarColor: string
  tabBarActiveColor: string
  tabBarInactiveColor: string
  tabBarBackgroundColor: string
  pageBackgroundColor: string
}

/** 小程序搭建表单 */
export interface MiniappForm {
  templateKey: string
  homePageId: number | string
  minePageId: number | string
  tabs: NavTab[]
  mineConfig: MinePageConfig
  theme: ThemeConfig
  shareTitle: string
  shareImage: string
}

/** 配置键名常量 */
export const CONFIG_KEYS = {
  TEMPLATE_KEY: 'miniappTemplateKey',
  HOME_PAGE_ID: 'miniappHomePageId',
  MINE_PAGE_ID: 'miniappMinePageId',
  TABBAR_ITEMS: 'tabbarItems',
  MINE_PAGE_CONFIG: 'minePageConfig',
  THEME_CONFIG: 'miniappThemeConfig',
  SHARE_TITLE: 'miniappShareTitle',
  SHARE_IMAGE: 'miniappShareImage',
} as const

/** 导航模板预设 */
export const NAV_TEMPLATES: NavTemplate[] = [
  {
    key: 'standard',
    name: '标准运营',
    desc: '首页+内容+会员+我的，适合内容运营和品牌展示',
    icon: '📱',
    tabs: [
      { text: '首页', icon: '/images/nav-icons/g-platform.png', pagePath: '/pages/index/index' },
      { text: '内容', icon: '/images/nav-icons/g-content.png', pagePath: '/pages/content-list/content-list' },
      { text: '会员', icon: '/images/nav-icons/g-crown.png', pagePath: '/pages/member-center/member-center' },
      { text: '我的', icon: '/images/nav-icons/g-user.png', pagePath: '/pages/mine/mine' },
    ],
  },
  {
    key: 'commerce',
    name: '商城转化',
    desc: '首页+分类+购物车+我的，适合电商销售场景',
    icon: '🛒',
    tabs: [
      { text: '首页', icon: '/images/nav-icons/g-platform.png', pagePath: '/pages/index/index' },
      { text: '分类', icon: '/images/nav-icons/g-folder.png', pagePath: '/pages/category/category' },
      { text: '购物车', icon: '/images/nav-icons/g-bag.png', pagePath: '/pages/cart/cart' },
      { text: '我的', icon: '/images/nav-icons/g-user.png', pagePath: '/pages/mine/mine' },
    ],
  },
  {
    key: 'content',
    name: '内容服务',
    desc: '首页+发现+服务+我的，适合预约和服务场景',
    icon: '📋',
    tabs: [
      { text: '首页', icon: '/images/nav-icons/g-platform.png', pagePath: '/pages/index/index' },
      { text: '发现', icon: '/images/nav-icons/g-news.png', pagePath: '/pages/content-list/content-list' },
      { text: '服务', icon: '/images/nav-icons/g-consult.png', pagePath: '/pages/booking/booking' },
      { text: '我的', icon: '/images/nav-icons/g-user.png', pagePath: '/pages/mine/mine' },
    ],
  },
  {
    key: 'ai',
    name: '智能助手',
    desc: '首页+商城+AI助手+我的，适合AI驱动的推荐场景',
    icon: '🤖',
    tabs: [
      { text: '首页', icon: '/images/nav-icons/g-platform.png', pagePath: '/pages/index/index' },
      { text: '商城', icon: '/images/nav-icons/g-bag.png', pagePath: '/pages/knowledge-mall/knowledge-mall' },
      { text: 'AI', icon: '/images/nav-icons/g-insight.png', pagePath: '/pages/ai-chat/ai-chat' },
      { text: '我的', icon: '/images/nav-icons/g-user.png', pagePath: '/pages/mine/mine' },
    ],
  },
]

/** 默认我的页面菜单 - 字段名与小程序端对齐（图标为 line:* 线条标） */
export const DEFAULT_MINE_MENU: Omit<MineMenuItem, 'id'>[] = [
  { icon: 'line:document', title: '我的订单', url: '/pages/order-list/order-list', enabled: true, group: '订单服务' },
  { icon: 'line:wallet', title: '我的资产', url: '/pages/member-center/member-center', enabled: true, group: '订单服务' },
  { icon: 'line:coupon', title: '优惠券', url: '/pages/coupon-list/coupon-list', enabled: true, group: '订单服务' },
  { icon: 'line:star', title: '我的收藏', url: '/pages/favorites/favorites', enabled: true, group: '订单服务' },
  { icon: 'line:pin', title: '收货地址', url: '/pages/address-list/address-list', enabled: true, group: '常用工具' },
  { icon: 'line:chat', title: '联系客服', url: 'contact', enabled: true, group: '常用工具' },
  { icon: 'line:gear', title: '设置', url: '/pages/settings/settings', enabled: true, group: '常用工具' },
  { icon: 'line:mail', title: '意见反馈', url: '/pages/feedback/feedback', enabled: true, group: '常用工具' },
]

/** 默认订单快捷入口配置 */
export const DEFAULT_ORDER_QUICK_ACCESS: OrderQuickAccess = {
  showOrderTabs: true,
  showAllOrdersBtn: true,
  tabLabels: {
    pending: '待付款',
    paid: '待发货',
    shipped: '待收货',
    completed: '已完成',
  },
}

/** 归一化订单标签（兼容旧 key refund → completed） */
export function normalizeOrderTabLabels(
  raw?: Partial<OrderQuickAccess['tabLabels']> & { refund?: string } | null,
): OrderQuickAccess['tabLabels'] {
  const src = raw || {}
  return {
    pending: src.pending || DEFAULT_ORDER_QUICK_ACCESS.tabLabels.pending,
    paid: src.paid || DEFAULT_ORDER_QUICK_ACCESS.tabLabels.paid,
    shipped: src.shipped || DEFAULT_ORDER_QUICK_ACCESS.tabLabels.shipped,
    completed:
      src.completed
      || (src.refund === '退换/售后' ? DEFAULT_ORDER_QUICK_ACCESS.tabLabels.completed : src.refund)
      || DEFAULT_ORDER_QUICK_ACCESS.tabLabels.completed,
  }
}

/** 默认用户信息区配置 */
export const DEFAULT_USER_PROFILE: UserProfileConfig = {
  showAvatar: true,
  showNickname: true,
  showMemberLevel: true,
  allowEditProfile: true,
  memberLevelLabel: '会员等级',
}

/** 默认主题配色 — 克莱因蓝 + 渐变辅色 */
export const DEFAULT_THEME: ThemeConfig = {
  primaryColor: '#002FA7',
  secondaryColor: '#1A4BBF',
  navBarColor: '#002FA7',
  tabBarActiveColor: '#002FA7',
  tabBarInactiveColor: '#8B93A7',
  tabBarBackgroundColor: '#ffffff',
  pageBackgroundColor: '#F2F4FA',
}
