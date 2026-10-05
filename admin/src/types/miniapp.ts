/** 导航标签项 - 字段名与小程序端 custom-tab-bar 对齐 */
export interface NavTab {
  id: string
  /** 显示文本，小程序端读取 text 字段 */
  text: string
  icon: string
  /** 选中态图标，小程序端 custom-tabBar 读取；缺省时按 xxx.png → xxx-active.png 推断 */
  selectedIcon?: string
  /** 页面路径，小程序端读取 pagePath 字段 */
  pagePath: string
  /** Tab 壳路由（switchTab 目标），与 app.json tabBar 注册页面对应 */
  tabRoute?: string
  pageId?: number | string
  pageName?: string
  /**
   * 是否在小程序中显示；缺省视为 true。
   * 2026-10-05 新增：支持临时下掉某个入口而不删配置。
   * 注意 normalizeTabBarItems 会原样透传，判空时不要当成隐藏。
   */
  enabled?: boolean
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
  /** 点击前是否要求登录（undefined 视同 false） */
  needLogin?: boolean
  /**
   * 条件显示（小程序端 1.30 起消费）：
   * - always（默认/缺省）：始终显示 —— 等同于旧行为，老数据无此字段时按此处理
   * - login：仅已登录时显示
   * - member：仅会员态显示
   *
   * 🔴 这是**界面隐藏**，不是权限控制：needLogin 仍必须在端上 onMenuRowTap 判定，
   * 两者是独立字段，不要因为配了 visibleOn 就把 needLogin 删掉。
   */
  visibleOn?: MineMenuVisibleOn
}

/** 菜单/模块的条件显示口径 */
export type MineMenuVisibleOn = 'always' | 'login' | 'member'

/** 菜单条件显示的中文标签（后台下拉 + 端上提示共用一份口径） */
export const MINE_VISIBLE_ON_LABELS: Record<MineMenuVisibleOn, string> = {
  always: '始终显示',
  login: '登录后显示',
  member: '会员可见',
}

/** 归一化条件显示取值；非法/缺省一律回退 always（= 旧行为，不破坏线上） */
export function normalizeMineVisibleOn(raw?: unknown): MineMenuVisibleOn {
  const s = String(raw ?? '').trim().toLowerCase()
  if (s === 'login' || s === 'loggedin' || s === 'logged_in') return 'login'
  if (s === 'member' || s === 'vip') return 'member'
  return 'always'
}

/**
 * 「我的」页模块显隐开关的 key 清单。
 *
 * 🔴 默认值口径（铁律）：**新增开关默认必须等于当前线上表现**。
 * 线上 `mine.wxml` 里这 6 个模块全部无条件渲染，所以默认一律 true；
 * 任何一项改成 false 都会让老页面升级后外观突变。
 */
export const MINE_MODULE_KEYS = [
  'userHeader',
  'stats',
  'memberCard',
  'quickAccess',
  'continueLearn',
  'myPlanet',
] as const

export type MineModuleKey = (typeof MINE_MODULE_KEYS)[number]

/** 模块 key → 后台中文名 */
export const MINE_MODULE_LABELS: Record<MineModuleKey, string> = {
  userHeader: '用户头部',
  stats: '收藏/笔记/关注/暖豆 统计',
  memberCard: '会员卡',
  quickAccess: '快捷入口',
  continueLearn: '继续学习',
  myPlanet: '我的星球',
}

/**
 * 模块显隐分组配置。
 *
 * 存成扁平对象（而不是嵌套），端上 `mineToggles.showXxx` 一行就能取，
 * 也避免 `updateComponentProps` 浅合并把同级字段冲掉的老问题。
 * 缺字段时一律按 true 处理（见 `resolveMineModules`）。
 */
export type MineModulesConfig = Record<MineModuleKey, boolean>

/** 默认模块显隐：全部显示（= 线上现状） */
export const DEFAULT_MINE_MODULES: MineModulesConfig = {
  userHeader: true,
  stats: true,
  memberCard: true,
  quickAccess: true,
  continueLearn: true,
  myPlanet: true,
}

/**
 * 把已保存的 modules 归一化成完整 6 项。
 * 缺字段 → true（保持线上表现）；非布尔 → 走默认值。
 */
export function resolveMineModules(raw?: Partial<MineModulesConfig> | null): MineModulesConfig {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<MineModuleKey, unknown>>
  const out = {} as MineModulesConfig
  for (const key of MINE_MODULE_KEYS) {
    out[key] = src[key] === undefined || src[key] === null
      ? DEFAULT_MINE_MODULES[key]
      : src[key] !== false
  }
  return out
}

/**
 * 主题色来源：
 * - inherit（默认）：继承全局品牌色 form.theme.primaryColor/secondaryColor
 * - page：启用页面独立主题色 mineConfig.themeColor / themeColorSecondary
 *
 * 🔴 缺省必须是 inherit —— 线上从没配过 themeColor 的语义就是「跟全局走」。
 * 注意：老数据里 themeColor 一定有值（历史模板写死的暖橘），
 * 所以判定「是否页面覆盖」不能只看 themeColor 有没有值，必须看这个显式开关。
 */
export type MineThemeSource = 'inherit' | 'page'

/** 归一化主题来源；缺省/非法 → inherit */
export function normalizeMineThemeSource(raw?: unknown): MineThemeSource {
  return String(raw ?? '').trim().toLowerCase() === 'page' ? 'page' : 'inherit'
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

/** 「我的」页模板风格：暖阁纸感 / 基础版 / 会员版（兼容旧 standard/premium） */
export type MineStyleKey = 'warm' | 'basic' | 'member'

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
  /** 模板风格 key：warm | basic | member（旧值 standard/premium/minimal/dark 会归一化） */
  templateStyle?: string
  /** 卡片样式：gradient | outline（outline 为已删除的简约版，加载时回退） */
  style?: string
  themeColor?: string
  themeColorSecondary?: string
  /**
   * 主题色来源：inherit（默认，跟随全局品牌色）| page（页面独立覆盖）。
   * 见 `normalizeMineThemeSource`。
   */
  themeSource?: MineThemeSource
  /**
   * 内容模块显隐（1.30 新增）。缺字段按 true 处理，保持线上「全显示」表现。
   * 见 `resolveMineModules` / `DEFAULT_MINE_MODULES`。
   */
  modules?: Partial<MineModulesConfig>
  /**
   * 页面级背景色（1.30 新增）。空串 = 跟随全局 pageBackgroundColor。
   * 与 themeSource 独立：背景不参与品牌色继承。
   */
  pageBackgroundColor?: string
  /** 头部配色模式：gradient（默认，线上现状）| solid（纯色铺满） */
  headerStyle?: MineHeaderStyle
  /**
   * 卡片样式：shadow（默认，线上现状）| flat（无阴影）| outline（描边）
   * 与历史字段 `style`（gradient/outline，会被归一化）刻意分开，避免老数据串味。
   */
  cardStyle?: MineCardStyle
}

/** 头部配色模式 */
export type MineHeaderStyle = 'gradient' | 'solid'

/** 卡片样式 */
export type MineCardStyle = 'shadow' | 'flat' | 'outline'

/** 归一化头部模式；缺省/非法 → gradient（= 线上现状） */
export function normalizeMineHeaderStyle(raw?: unknown): MineHeaderStyle {
  return String(raw ?? '').trim().toLowerCase() === 'solid' ? 'solid' : 'gradient'
}

/** 归一化卡片样式；缺省/非法 → shadow（= 线上现状） */
export function normalizeMineCardStyle(raw?: unknown): MineCardStyle {
  const s = String(raw ?? '').trim().toLowerCase()
  if (s === 'flat' || s === 'outline') return s
  return 'shadow'
}

/** 「我的」页风格模板卡片 */
export const MINE_STYLE_TEMPLATES: Array<{
  key: MineStyleKey
  name: string
  icon: string
  desc: string
  gradient: string
  border?: string
}> = [
  {
    key: 'warm',
    name: '暖阁纸感',
    icon: '📙',
    desc: '内容社群 · 砖橘渐变',
    gradient: 'linear-gradient(145deg, #f6ddbf 0%, #d97706 48%, #7c2d12 100%)',
  },
  {
    key: 'basic',
    name: '经典蓝',
    icon: '👤',
    desc: '通用商务 · 清爽蓝',
    gradient: 'linear-gradient(145deg, #7BA3F7 0%, #5B7FEA 55%, #6B6FE8 100%)',
  },
  {
    key: 'member',
    name: '会员铂金',
    icon: '👑',
    desc: '会员运营 · 冷蓝铂金',
    gradient: 'linear-gradient(145deg, #E8EEF8 0%, #C5D8F0 55%, #9BBFE8 100%)',
  },
]

export const MINE_STYLE_PRESETS: Record<MineStyleKey, {
  style: 'gradient'
  themeColor: string
  themeColorSecondary: string
  showMemberCard: boolean
}> = {
  warm: {
    style: 'gradient',
    themeColor: '#C2410C',
    themeColorSecondary: '#EA580C',
    showMemberCard: true,
  },
  basic: {
    style: 'gradient',
    themeColor: '#5B7FEA',
    themeColorSecondary: '#7BA3F7',
    showMemberCard: true,
  },
  member: {
    style: 'gradient',
    themeColor: '#6B9FD9',
    themeColorSecondary: '#E8EEF8',
    showMemberCard: true,
  },
}

/** 旧 key → 新 key；已删除的简约/暗黑 → basic */
export function normalizeMineStyleKey(key?: string | null): MineStyleKey {
  const raw = String(key || '').trim().toLowerCase()
  if (raw === 'warm' || raw === 'nuange' || raw === 'content') return 'warm'
  if (raw === 'member' || raw === 'premium') return 'member'
  if (raw === 'basic' || raw === 'standard') return 'basic'
  return 'warm'
}

/** 从已保存配置推断风格（outline / 暗黑色 → basic） */
export function resolveMineStyleKey(mine?: {
  templateStyle?: string
  style?: string
  themeColor?: string
} | null): MineStyleKey {
  if (!mine) return 'warm'
  if (mine.templateStyle) {
    const raw = String(mine.templateStyle)
    if (raw === 'minimal' || raw === 'dark' || raw === 'simple') return 'basic'
    return normalizeMineStyleKey(raw)
  }
  if (mine.style === 'outline') return 'basic'
  const tc = String(mine.themeColor || '').toLowerCase()
  if (tc === '#1e293b' || tc === '#334155' || tc === '#475569') return 'basic'
  if (
    tc === '#c2410c' || tc === '#ea580c' || tc === '#7c2d12' || tc === '#d97706'
    || tc === '#b45309' || tc === '#9a3412'
  ) return 'warm'
  if (
    tc === '#b8860b' || tc === '#9a7b1c' || tc === '#d4af37' || tc === '#f0d060'
    || tc === '#d4a017' || tc === '#e8c547' || tc === '#f5e08a' || tc === '#c9a227'
    || tc === '#f5a24a' || tc === '#ffc56a' || tc === '#f08a38'
    || tc === '#f0a020' || tc === '#fde389' || tc === '#fcbc29' || tc === '#e78507'
    || tc === '#fecd41' || tc === '#fff6e8' || tc === '#e8b923' || tc === '#fff6df'
    || tc === '#6b9fd9' || tc === '#9bbfe8' || tc === '#e8eef8'
  ) return 'member'
  if (tc === '#5b7fea' || tc === '#7ba3f7' || tc === '#002fa7' || tc === '#315efb') return 'basic'
  return 'warm'
}

/** 写入风格预设；对已删除风格强制回退到 basic/warm */
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

/**
 * 「我的」页最终生效的主题色 —— **后台预览与小程序端必须走同一个函数**，
 * 否则后台显示继承全局、真机还在用页面覆盖色，两端永远对不齐。
 *
 * 规则：
 * - themeSource=page 且配了 themeColor → 用页面色（覆盖）
 * - themeSource=page 但 themeColor 为空 → 回落全局（避免配了个空值变白板）
 * - themeSource=inherit（缺省）→ 一律用全局品牌色，忽略 mineConfig.themeColor
 */
export function resolveMineEffectiveTheme(
  mine?: {
    themeSource?: unknown
    themeColor?: string
    themeColorSecondary?: string
  } | null,
  globalTheme?: { primaryColor?: string; secondaryColor?: string } | null,
): { primary: string; secondary: string; source: MineThemeSource } {
  const gPrimary = String(globalTheme?.primaryColor || '').trim()
  const gSecondary = String(globalTheme?.secondaryColor || '').trim()
  const source = normalizeMineThemeSource(mine?.themeSource)
  if (source === 'page') {
    const p = String(mine?.themeColor || '').trim()
    const s = String(mine?.themeColorSecondary || '').trim()
    if (p) return { primary: p, secondary: s || gSecondary || p, source }
    return { primary: gPrimary, secondary: gSecondary, source: 'inherit' }
  }
  return { primary: gPrimary, secondary: gSecondary, source: 'inherit' }
}

/* ============================================================ *
 * 登录页模板（仿「我的」页模板库）
 *
 * 与 mine 的分工对照：
 * - mine 的「模板」= 皮肤 + 菜单组合（warm/basic/member）
 * - login 的「模板」= 皮肤 + 布局变体（warm 暖阁 / brand 品牌焦点 /
 *   minimal 极简 / wechat 微信原生风），布局变体只切外观不改授权流程
 * - 登录页本身是原生页 /pages/login/login，不进装修器，模板仅切皮肤
 * ============================================================ */

/** 登录页模板风格 key：4 套预设 */
export type LoginPageStyleKey = 'warm' | 'brand' | 'minimal' | 'wechat'

/** 登录页配置 —— 后台存到 system_config 的 loginPageConfig */
export interface LoginPageConfig {
  /** 顶部品牌区主标（默认「欢迎回来」） */
  heroTitle: string
  /** 主标下副文案（默认「登录后同步收藏、预约与阅读记录」） */
  heroSubtitle: string
  /** 登录按钮文案（默认「手机号快捷登录」） */
  loginButtonText: string
  /** 暂不登录按钮文案（默认「暂不登录」） */
  skipButtonText: string
  /** 安全徽标文案（默认「安全登录」，空字符串则不显示） */
  securityBadgeText: string
  /** 表单标题（默认「手机号快捷登录」） */
  sheetTitle: string
  /** 表单副文案（默认「使用授权信息快速登录」） */
  sheetSubtitle: string
  /** 底部隐私提示文案（默认「未登录也可浏览资讯；手机号仅用于登录，不会公开展示」） */
  privacyNoteText: string
  /** 是否显示顶部装饰光斑（warm/brand 有，minimal/wechat 无） */
  showDecorOrbs: boolean
  /** 是否显示安全徽标 */
  showSecurityBadge: boolean
  /** 是否显示返回按钮（默认 true；wechat 风可关） */
  showBackButton: boolean
  /** 模板风格 key：warm | brand | minimal | wechat */
  templateStyle?: string
  /** 主色（每套皮肤自带默认，可被覆盖） */
  themeColor?: string
  /** 辅色 */
  themeColorSecondary?: string
  /**
   * 主题色来源：inherit（默认，跟随全局品牌色）| page（页面独立覆盖）。
   * 见 `normalizeLoginThemeSource` / `resolveLoginEffectiveTheme`。
   */
  themeSource?: LoginThemeSource
  /**
   * 内容模块显隐。缺字段按 true 处理 = 线上现状（login.wxml 里这些块全部无条件渲染）。
   * 见 `resolveLoginModules` / `DEFAULT_LOGIN_MODULES`。
   */
  modules?: Partial<LoginModulesConfig>
  /**
   * 页面级背景色。空串 = 跟随 login.wxss 的默认底色。
   * 与 themeSource 独立：背景不参与品牌色继承。
   */
  pageBackgroundColor?: string
  /** 顶部品牌区样式：gradient（默认，线上现状）| solid（纯色铺满） */
  headerStyle?: LoginHeaderStyle
  /** 登录卡片样式：shadow（默认，线上现状）| flat（无阴影）| outline（描边） */
  cardStyle?: LoginCardStyle
}

/**
 * 登录页模块显隐 key 清单。
 *
 * 🔴 取值以 miniapp/pages/login/login.wxml 的**真实结构**为准，先读 wxml 再定，
 * 不凭空列。每一项都对应 wxml 里一整块可以 `block wx:if` 包住的区域：
 * - brandIdentity：顶部品牌 Logo + 名称 + 英文副标
 * - heroTitle：主标 + 副文案
 * - interceptTip：「登录后即可 xxx」拦截提示
 * - sheetHeading：表单标题 + 副文案（含安全徽标所在的整行）
 * - formHint：协议下方的提示文案
 * - skipButton：「暂不登录」按钮
 * - privacyNote：底部隐私提示
 *
 * 🔴 默认值口径（铁律）：**全部 true**。线上 login.wxml 里这 7 块都是无条件渲染的，
 * 任何一项默认 false 都会让老页面升级后外观突变。
 *
 * 🔴 注意「用户协议 / 隐私政策」**不在**这个清单里，而且是刻意不放在：
 * 合规勾选与 open-type="agreePrivacyAuthorization" 按钮不允许被界面开关摘掉
 * （详见 login.wxml 里的注释）。要改的是它的**文案排版**，不是它本身。
 */
export const LOGIN_MODULE_KEYS = [
  'brandIdentity',
  'heroTitle',
  'interceptTip',
  'sheetHeading',
  'formHint',
  'skipButton',
  'privacyNote',
] as const

export type LoginModuleKey = (typeof LOGIN_MODULE_KEYS)[number]

/** 模块 key → 后台中文名 */
export const LOGIN_MODULE_LABELS: Record<LoginModuleKey, string> = {
  brandIdentity: '品牌标识区（Logo/名称）',
  heroTitle: '主标与副文案',
  interceptTip: '登录后即可 xxx 提示',
  sheetHeading: '表单标题与副文案',
  formHint: '协议下方提示文案',
  skipButton: '暂不登录按钮',
  privacyNote: '底部隐私提示',
}

/**
 * 合规相关、**不提供界面开关**的模块。
 * 后台把它们展示成「不可关闭」的锁定行，只为解释为什么不给开关。
 */
export const LOGIN_COMPLIANCE_LOCKED_MODULES: Array<{ key: string; label: string; reason: string }> = [
  { key: 'agreement', label: '用户协议 / 隐私政策勾选', reason: '合规必需，勾选与授权校验不可隐藏' },
  { key: 'privacyPopup', label: '隐私保护提示弹窗', reason: '合规必需，未同意时不可登录' },
  { key: 'loginButton', label: '登录主按钮', reason: '页面唯一登录入口，隐藏后本页失去意义' },
]

/** 模块显隐分组配置（扁平对象，端上一行就能取） */
export type LoginModulesConfig = Record<LoginModuleKey, boolean>

/** 默认模块显隐：全部显示（= 线上现状） */
export const DEFAULT_LOGIN_MODULES: LoginModulesConfig = {
  brandIdentity: true,
  heroTitle: true,
  interceptTip: true,
  sheetHeading: true,
  formHint: true,
  skipButton: true,
  privacyNote: true,
}

/** 把已保存的 modules 归一化成完整 7 项；缺字段 → true（保持线上表现） */
export function resolveLoginModules(raw?: Partial<LoginModulesConfig> | null): LoginModulesConfig {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<LoginModuleKey, unknown>>
  const out = {} as LoginModulesConfig
  for (const key of LOGIN_MODULE_KEYS) {
    out[key] = src[key] === undefined || src[key] === null
      ? DEFAULT_LOGIN_MODULES[key]
      : src[key] !== false
  }
  return out
}

/**
 * 登录页主题色来源：
 * - inherit（默认）：继承全局品牌色 form.theme.primaryColor/secondaryColor
 * - page：启用页面独立主题色 loginPageConfig.themeColor / themeColorSecondary
 *
 * 🔴 缺省必须是 inherit。线上 login.wxml 的按钮/链接用的是 app.wxss 的
 * --brand/--brand-dark/--accent（即全局品牌色），从来不是 loginPageConfig.themeColor。
 */
export type LoginThemeSource = 'inherit' | 'page'

/** 归一化主题来源；缺省/非法 → inherit */
export function normalizeLoginThemeSource(raw?: unknown): LoginThemeSource {
  return String(raw ?? '').trim().toLowerCase() === 'page' ? 'page' : 'inherit'
}

/** 顶部品牌区样式：gradient（默认，线上现状）| solid */
export type LoginHeaderStyle = 'gradient' | 'solid'

/** 登录卡片样式：shadow（默认，线上现状）| flat | outline */
export type LoginCardStyle = 'shadow' | 'flat' | 'outline'

/** 归一化顶部样式；缺省/非法 → gradient（= 线上现状） */
export function normalizeLoginHeaderStyle(raw?: unknown): LoginHeaderStyle {
  return String(raw ?? '').trim().toLowerCase() === 'solid' ? 'solid' : 'gradient'
}

/** 归一化卡片样式；缺省/非法 → shadow（= 线上现状） */
export function normalizeLoginCardStyle(raw?: unknown): LoginCardStyle {
  const s = String(raw ?? '').trim().toLowerCase()
  if (s === 'flat' || s === 'outline') return s
  return 'shadow'
}

/**
 * 登录页最终生效的主题色 —— **后台预览与小程序端必须走同一个口径**，
 * 否则后台显示继承全局、真机还是页面覆盖色，两端永远对不齐。
 *
 * 规则与 `resolveMineEffectiveTheme` 完全一致：
 * - themeSource=page 且配了 themeColor → 用页面色（覆盖）
 * - themeSource=page 但 themeColor 为空 → 回落全局（避免配了个空值变白板）
 * - themeSource=inherit（缺省）→ 一律用全局品牌色，忽略 loginPageConfig.themeColor
 */
export function resolveLoginEffectiveTheme(
  login?: {
    themeSource?: unknown
    themeColor?: string
    themeColorSecondary?: string
  } | null,
  globalTheme?: { primaryColor?: string; secondaryColor?: string } | null,
): { primary: string; secondary: string; source: LoginThemeSource } {
  const gPrimary = String(globalTheme?.primaryColor || '').trim()
  const gSecondary = String(globalTheme?.secondaryColor || '').trim()
  const source = normalizeLoginThemeSource(login?.themeSource)
  if (source === 'page') {
    const p = String(login?.themeColor || '').trim()
    const s = String(login?.themeColorSecondary || '').trim()
    if (p) return { primary: p, secondary: s || gSecondary || p, source }
    return { primary: gPrimary, secondary: gSecondary, source: 'inherit' }
  }
  return { primary: gPrimary, secondary: gSecondary, source: 'inherit' }
}

/** 登录页风格卡片（配置页模板画廊用） */
export const LOGIN_PAGE_STYLE_TEMPLATES: Array<{
  key: LoginPageStyleKey
  name: string
  icon: string
  desc: string
  gradient: string
  border?: string
}> = [
  {
    key: 'warm',
    name: '暖阁纸感',
    icon: '📙',
    desc: '默认款 · 砖橘渐变 + 装饰光斑',
    gradient: 'linear-gradient(145deg, #f6ddbf 0%, #d97706 48%, #7c2d12 100%)',
  },
  {
    key: 'brand',
    name: '品牌焦点',
    icon: '🏷️',
    desc: '品牌色渐变 + Logo 居中',
    gradient: 'linear-gradient(145deg, #5B7FEA 0%, #6B6FE8 55%, #4338CA 100%)',
  },
  {
    key: 'minimal',
    name: '极简卡片',
    icon: '⚪',
    desc: '纯白卡片 + 主色按钮',
    gradient: 'linear-gradient(145deg, #fafaf9 0%, #f5f5f4 55%, #e7e5e4 100%)',
    border: '1px solid #e7e5e4',
  },
  {
    key: 'wechat',
    name: '微信原生',
    icon: '💬',
    desc: '微信绿主按钮 + 极简背景',
    gradient: 'linear-gradient(145deg, #07C160 0%, #06AD56 55%, #04924A 100%)',
  },
]

export const LOGIN_PAGE_STYLE_PRESETS: Record<LoginPageStyleKey, {
  themeColor: string
  themeColorSecondary: string
  showDecorOrbs: boolean
  showSecurityBadge: boolean
  showBackButton: boolean
}> = {
  warm: {
    themeColor: '#C2410C',
    themeColorSecondary: '#EA580C',
    showDecorOrbs: true,
    showSecurityBadge: true,
    showBackButton: true,
  },
  brand: {
    themeColor: '#5B7FEA',
    themeColorSecondary: '#6B6FE8',
    showDecorOrbs: true,
    showSecurityBadge: true,
    showBackButton: true,
  },
  minimal: {
    themeColor: '#1F2937',
    themeColorSecondary: '#6B7280',
    showDecorOrbs: false,
    showSecurityBadge: false,
    showBackButton: true,
  },
  wechat: {
    themeColor: '#07C160',
    themeColorSecondary: '#06AD56',
    showDecorOrbs: false,
    showSecurityBadge: true,
    showBackButton: false,
  },
}

export const DEFAULT_LOGIN_PAGE_CONFIG: LoginPageConfig = {
  heroTitle: '欢迎回来',
  heroSubtitle: '登录后同步收藏、预约与阅读记录',
  loginButtonText: '手机号快捷登录',
  skipButtonText: '暂不登录',
  securityBadgeText: '安全登录',
  sheetTitle: '手机号快捷登录',
  sheetSubtitle: '使用授权信息快速登录',
  privacyNoteText: '未登录也可浏览资讯；手机号仅用于登录，不会公开展示',
  showDecorOrbs: true,
  showSecurityBadge: true,
  showBackButton: true,
  templateStyle: 'warm',
  themeColor: '#C2410C',
  themeColorSecondary: '#EA580C',
  // ↓ 新增字段的初值：一律等于**线上现状**（继承全局品牌色 / 模块全显示 / 渐变顶部 / 阴影卡片）
  themeSource: 'inherit',
  modules: { ...DEFAULT_LOGIN_MODULES },
  pageBackgroundColor: '',
  headerStyle: 'gradient',
  cardStyle: 'shadow',
}

/** 旧 key / 别名归一化 */
export function normalizeLoginPageStyleKey(key?: string | null): LoginPageStyleKey {
  const raw = String(key || '').trim().toLowerCase()
  if (raw === 'warm' || raw === 'nuange' || raw === 'default') return 'warm'
  if (raw === 'brand' || raw === 'focus') return 'brand'
  if (raw === 'minimal' || raw === 'plain' || raw === 'simple') return 'minimal'
  if (raw === 'wechat' || raw === 'native') return 'wechat'
  return 'warm'
}

/** 从已保存配置推断风格 */
export function resolveLoginPageStyleKey(login?: {
  templateStyle?: string
  themeColor?: string
} | null): LoginPageStyleKey {
  if (!login) return 'warm'
  if (login.templateStyle) return normalizeLoginPageStyleKey(login.templateStyle)
  const tc = String(login.themeColor || '').toLowerCase()
  if (tc === '#07c160' || tc === '#06ad56') return 'wechat'
  if (tc === '#1f2937' || tc === '#374151') return 'minimal'
  if (tc === '#5b7fea' || tc === '#6b6fe8' || tc === '#4338ca') return 'brand'
  return 'warm'
}

/** 写入风格预设 */
export function applyLoginPageStylePreset(
  cfg: Record<string, unknown>,
  key?: string | null,
): LoginPageStyleKey {
  const resolved = normalizeLoginPageStyleKey(key ?? resolveLoginPageStyleKey(cfg as {
    templateStyle?: string
    themeColor?: string
  }))
  const preset = LOGIN_PAGE_STYLE_PRESETS[resolved]
  Object.assign(cfg, { templateStyle: resolved, ...preset })
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
  /**
   * 登录页配置（固定页 /pages/login/login）。
   * 与 mineConfig 平行：登录页有自己的配置台 /page-builder/login，
   * 但草稿键是同一个 site_builder_draft，所以必须挂在同一个 form 上一起存。
   */
  loginPageConfig: LoginPageConfig
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
  LOGIN_PAGE_CONFIG: 'loginPageConfig',
  THEME_CONFIG: 'miniappThemeConfig',
  SHARE_TITLE: 'miniappShareTitle',
  SHARE_IMAGE: 'miniappShareImage',
  BRAND_CONFIG: 'miniappBrandConfig',
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
      { text: '内容', icon: '/images/nav-icons/g-content.png', pagePath: '/pkg-content/content-list/content-list' },
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
      { text: '购物车', icon: '/images/nav-icons/g-bag.png', pagePath: '/pkg-content/cart/cart' },
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
      { text: '发现', icon: '/images/nav-icons/g-news.png', pagePath: '/pkg-content/content-list/content-list' },
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
      { text: '商城', icon: '/images/nav-icons/g-bag.png', pagePath: '/pkg-content/knowledge-mall/knowledge-mall' },
      { text: 'AI', icon: '/images/nav-icons/g-insight.png', pagePath: '/pages/ai-chat/ai-chat' },
      { text: '我的', icon: '/images/nav-icons/g-user.png', pagePath: '/pages/mine/mine' },
    ],
  },
]

/** 默认我的页面菜单 - 字段名与小程序端对齐（图标为 line:* 线条标） */
/**
 * 默认我的页面菜单 —— 字段名与小程序端 mine.js 对齐（图标为 line:* 线条标）。
 *
 * 变更说明：自 1.29.8 起「我的」菜单已由小程序端动态渲染（读 minePageConfig.menuItems），
 * 这份列表不再是「预览照抄」，而是**真实下发到小程序**的默认值：
 * 后端无配置或配置为空项时，小程序端回退渲染这份菜单。
 * 因此每项的 url 必须是小程序里真实存在的路由，needLogin 决定点击前是否要求登录。
 */
export const DEFAULT_MINE_MENU: Omit<MineMenuItem, 'id'>[] = [
  { icon: 'line:check', title: '我的提问与打卡', url: '/pkg-content/question-ask/question-ask', needLogin: true, enabled: true, group: '内容与订单' },
  { icon: 'line:pencil', title: '成为创作者', url: '/pkg-content/contribute/contribute', needLogin: false, enabled: true, group: '内容与订单' },
  { icon: 'line:document', title: '我的订单', url: '/pkg-trade/order-list/order-list', needLogin: true, enabled: true, group: '内容与订单' },
  // 资料库入口暂不开放（后续再放出），与生产 minePageConfig.menuItems 一致
  { icon: 'line:books', title: '我的资料库', url: '/pkg-content/resources/resources', needLogin: false, enabled: false, group: '内容与订单' },
  { icon: 'line:clipboard', title: '发票管理', url: '/pkg-trade/order-list/order-list', needLogin: true, enabled: true, group: '内容与订单' },
  { icon: 'line:coupon', title: '优惠券', url: '/pkg-user/coupon-list/coupon-list', needLogin: true, enabled: true, group: '内容与订单' },
  { icon: 'line:share', title: '邀请好友', url: '/pkg-content/share/share', needLogin: false, enabled: true, group: '内容与订单' },
  { icon: 'line:grid', title: '整店模版', url: '/pkg-templates/list/list', needLogin: false, enabled: true, group: '会员与服务' },
  { icon: 'line:user', title: '加入读者群', url: '/pkg-content/join/join', needLogin: false, enabled: true, group: '会员与服务' },
  { icon: 'line:mail', title: '意见反馈', url: '/pkg-user/feedback/feedback', needLogin: false, enabled: true, group: '会员与服务' },
  { icon: 'line:gear', title: '设置', url: '/pkg-user/settings/settings', needLogin: false, enabled: true, group: '会员与服务' },
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

/** 小程序品牌基础信息（登录半屏、分享、导航同步） */
export interface MiniappBrandConfig {
  appName: string
  logoUrl: string
  /** 无 Logo 图片时显示的单字/短字标识 */
  logoMark: string
  /** 登录半屏默认副标题 */
  loginTagline: string
  /** 登录页/品牌区英文副标（可选） */
  brandEyebrow: string
  /** 品牌一句话介绍（可选）：用于个人中心「关于」与分享描述兜底 */
  intro?: string
  /** 登录半屏风格模板 */
  loginStyleKey?: LoginStyleKey
}

export type LoginStyleKey = 'classic' | 'warm' | 'ink'

export const LOGIN_STYLE_TEMPLATES: Array<{
  key: LoginStyleKey
  name: string
  icon: string
  desc: string
  gradient: string
}> = [
  {
    key: 'classic',
    name: '经典蓝',
    icon: '🔵',
    desc: '通用商务，默认风格',
    gradient: 'linear-gradient(145deg, #5980ff 0%, #315efb 55%, #2446c7 100%)',
  },
  {
    key: 'warm',
    name: '暖阁纸感',
    icon: '📙',
    desc: '内容社群，砖橘纸感',
    gradient: 'linear-gradient(145deg, #f6ddbf 0%, #ea580c 55%, #c2410c 100%)',
  },
  {
    key: 'ink',
    name: '墨色极简',
    icon: '⬛',
    desc: '低调克制，深色强调',
    gradient: 'linear-gradient(145deg, #9ca3af 0%, #374151 55%, #111827 100%)',
  },
]

export const LOGIN_STYLE_PRESETS: Record<LoginStyleKey, {
  brand: string
  brandDeep: string
  panelBg: string
  brandShadow: string
  defaultTagline: string
}> = {
  classic: {
    brand: '#315efb',
    brandDeep: '#2446c7',
    panelBg: '#f6f3ee',
    brandShadow: 'rgba(49, 94, 251, 0.28)',
    defaultTagline: '想认识一下你，可以吗？',
  },
  warm: {
    brand: '#C2410C',
    brandDeep: '#9A3412',
    panelBg: '#f8f1e7',
    brandShadow: 'rgba(194, 65, 12, 0.24)',
    defaultTagline: '登录后继续 · 收藏 / 星球 / 已购',
  },
  ink: {
    brand: '#1f2937',
    brandDeep: '#111827',
    panelBg: '#f3f4f6',
    brandShadow: 'rgba(17, 24, 39, 0.22)',
    defaultTagline: '登录后同步你的阅读与收藏',
  },
}

export function normalizeLoginStyleKey(key?: string | null): LoginStyleKey {
  const raw = String(key || '').trim().toLowerCase()
  if (raw === 'warm' || raw === 'nuange' || raw === 'content') return 'warm'
  if (raw === 'ink' || raw === 'minimal' || raw === 'dark' || raw === 'mono') return 'ink'
  return 'classic'
}

export function resolveLoginStylePreset(key?: string | null) {
  return LOGIN_STYLE_PRESETS[normalizeLoginStyleKey(key)]
}

/** 选用登录模板；若副标题仍是其他模板默认文案，则一并换成新模板默认 */
export function applyLoginStylePreset(
  brand: Partial<MiniappBrandConfig>,
  key?: string | null,
): LoginStyleKey {
  const resolved = normalizeLoginStyleKey(key)
  const preset = LOGIN_STYLE_PRESETS[resolved]
  const currentTagline = String(brand.loginTagline || '').trim()
  const isPresetTagline = Object.values(LOGIN_STYLE_PRESETS).some(
    (item) => item.defaultTagline === currentTagline,
  )
  brand.loginStyleKey = resolved
  if (!currentTagline || isPresetTagline) {
    brand.loginTagline = preset.defaultTagline
  }
  return resolved
}

export const DEFAULT_MINIAPP_BRAND_CONFIG: MiniappBrandConfig = {
  appName: '跨境墨太白',
  logoUrl: '',
  logoMark: '墨',
  loginTagline: '登录后继续 · 收藏 / 星球 / 已购',
  brandEyebrow: 'CROSS-BORDER INK',
  intro: '',
  loginStyleKey: 'warm',
}
