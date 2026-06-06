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
    refund: string
  }
}

/** 用户信息区配置 */
export interface UserProfileConfig {
  showAvatar: boolean
  showNickname: boolean
  showMemberLevel: boolean
  allowEditProfile: boolean
  memberLevelLabel: string
}

/** 我的页面配置 - 完整版 */
export interface MinePageConfig {
  loginTitle: string
  loginSubtitle: string
  loginButtonText: string
  memberCardTitle: string
  menuItems: MineMenuItem[]
  orderQuickAccess: OrderQuickAccess
  userProfile: UserProfileConfig
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
      { text: '首页', icon: '🏠', pagePath: '/pages/index/index' },
      { text: '内容', icon: '📝', pagePath: '/pages/content-list/content-list' },
      { text: '会员', icon: '👑', pagePath: '/pages/member-center/member-center' },
      { text: '我的', icon: '👤', pagePath: '/pages/mine/mine' },
    ],
  },
  {
    key: 'commerce',
    name: '商城转化',
    desc: '首页+分类+购物车+我的，适合电商销售场景',
    icon: '🛒',
    tabs: [
      { text: '首页', icon: '🏠', pagePath: '/pages/index/index' },
      { text: '分类', icon: '📋', pagePath: '/pages/category/category' },
      { text: '购物车', icon: '🛒', pagePath: '/pages/cart/cart' },
      { text: '我的', icon: '👤', pagePath: '/pages/mine/mine' },
    ],
  },
  {
    key: 'content',
    name: '内容服务',
    desc: '首页+发现+服务+我的，适合预约和服务场景',
    icon: '📋',
    tabs: [
      { text: '首页', icon: '🏠', pagePath: '/pages/index/index' },
      { text: '发现', icon: '🔍', pagePath: '/pages/content-list/content-list' },
      { text: '服务', icon: '📅', pagePath: '/pages/booking/booking' },
      { text: '我的', icon: '👤', pagePath: '/pages/mine/mine' },
    ],
  },
  {
    key: 'ai',
    name: '智能助手',
    desc: '首页+商城+AI助手+我的，适合AI驱动的推荐场景',
    icon: '🤖',
    tabs: [
      { text: '首页', icon: '🏠', pagePath: '/pages/index/index' },
      { text: '商城', icon: '🛍️', pagePath: '/pages/product-list/product-list' },
      { text: 'AI', icon: '🤖', pagePath: '/pages/ai-chat/ai-chat' },
      { text: '我的', icon: '👤', pagePath: '/pages/mine/mine' },
    ],
  },
]

/** 默认我的页面菜单 - 字段名与小程序端对齐 */
export const DEFAULT_MINE_MENU: Omit<MineMenuItem, 'id'>[] = [
  { icon: '📦', title: '我的订单', url: '/pages/order-list/order-list', enabled: true, group: '订单服务' },
  { icon: '💰', title: '我的资产', url: '/pages/member-center/member-center', enabled: true, group: '订单服务' },
  { icon: '🎫', title: '优惠券', url: '/pages/coupon-list/coupon-list', enabled: true, group: '订单服务' },
  { icon: '❤️', title: '我的收藏', url: '/pages/favorites/favorites', enabled: true, group: '订单服务' },
  { icon: '📍', title: '收货地址', url: '/pages/address-list/address-list', enabled: true, group: '常用工具' },
  { icon: '📞', title: '联系客服', url: 'contact', enabled: true, group: '常用工具' },
  { icon: '⚙️', title: '设置', url: '/pages/settings/settings', enabled: true, group: '常用工具' },
  { icon: '💬', title: '意见反馈', url: '/pages/feedback/feedback', enabled: true, group: '常用工具' },
]

/** 默认订单快捷入口配置 */
export const DEFAULT_ORDER_QUICK_ACCESS: OrderQuickAccess = {
  showOrderTabs: true,
  showAllOrdersBtn: true,
  tabLabels: {
    pending: '待付款',
    paid: '待发货',
    shipped: '待收货',
    refund: '退换/售后',
  },
}

/** 默认用户信息区配置 */
export const DEFAULT_USER_PROFILE: UserProfileConfig = {
  showAvatar: true,
  showNickname: true,
  showMemberLevel: true,
  allowEditProfile: true,
  memberLevelLabel: '会员等级',
}

/** 默认主题配色 */
export const DEFAULT_THEME: ThemeConfig = {
  primaryColor: '#1769ff',
  secondaryColor: '#20b7ff',
  navBarColor: '#1769ff',
  tabBarActiveColor: '#1769ff',
  tabBarInactiveColor: '#999999',
  tabBarBackgroundColor: '#ffffff',
  pageBackgroundColor: '#f6f8fb',
}
