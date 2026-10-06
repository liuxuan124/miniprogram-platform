/**
 * 小程序页面统一展示状态（与后端 PageStatusCalculator 对齐）
 * draft / pending / live / offline / archived
 */

export type MiniPageStatus = 'draft' | 'pending' | 'live' | 'offline' | 'archived'

export const MINI_PAGE_STATUS_LABELS: Record<MiniPageStatus, string> = {
  draft: '草稿',
  pending: '待同步',
  live: '已上线',
  offline: '已下线',
  archived: '归档',
}

/** 陶土暖色体系标签色（非 Element 默认紫） */
export const MINI_PAGE_STATUS_COLORS: Record<MiniPageStatus, { bg: string; text: string; border: string }> = {
  draft: { bg: '#F0EBE3', text: '#6B5E52', border: '#D9CFC3' },
  pending: {
    bg: 'var(--el-color-primary-light-9)',
    text: 'var(--el-color-primary)',
    border: 'var(--el-color-primary-light-7)',
  },
  live: { bg: '#E8F2E9', text: '#2F6B3A', border: '#B7D4BC' },
  offline: { bg: '#F5F0EA', text: '#8A7A6C', border: '#D4C8BC' },
  archived: { bg: '#EEEAE4', text: '#7A6E64', border: '#CDC4BA' },
}

export type PageStatusInput = {
  status?: string | number | null
  currentVersion?: number | null
  latestVersion?: number | null
  version?: number | null
  hasUnpublishedChanges?: boolean | null
  archived?: boolean | number | null
  displayStatus?: string | null
}

/**
 * 从未发布过 = draft；已发布且有未上线改动 = pending；
 * 已上线一致 = live；下架 = offline；归档 = archived
 */
export function resolvePageStatus(row: PageStatusInput): MiniPageStatus {
  if (row.displayStatus && isMiniPageStatus(row.displayStatus)) {
    return row.displayStatus
  }
  if (row.archived === true || row.archived === 1) return 'archived'

  const status = normalizeLegacyStatus(row.status)
  const current = Number(row.currentVersion ?? row.version ?? 0)
  const latest = Number(row.latestVersion ?? row.version ?? 0)
  const dirty =
    row.hasUnpublishedChanges === true
    || (status === 'published' && latest > current)

  if (status === 'unpublished' || status === 'offline') return 'offline'
  if (status === 'published' || status === 'live') {
    return dirty ? 'pending' : 'live'
  }
  return 'draft'
}

export function isMiniPageStatus(v: string): v is MiniPageStatus {
  return v === 'draft' || v === 'pending' || v === 'live' || v === 'offline' || v === 'archived'
}

function normalizeLegacyStatus(raw: string | number | null | undefined): string {
  if (raw == null || raw === '') return 'draft'
  if (typeof raw === 'number') {
    if (raw === 1) return 'published'
    if (raw === 2) return 'unpublished'
    return 'draft'
  }
  const s = String(raw).toLowerCase()
  if (s === '1' || s === 'published' || s === 'live') return 'published'
  if (s === '2' || s === 'unpublished' || s === 'offline') return 'unpublished'
  return 'draft'
}

/**
 * 页面分组：按「页面从哪来」分，而不是按「绑在哪」分。
 * 旧口径把底部导航当成一个分类，槽位（导航1~导航5）和页面混在一组里，
 * 既看不出页面类型，计数也没有信息量。
 *
 * 除 5 套标准分组外，用户可在「设置分组」里输入自定义分组名，
 * 自定义分组按字符串值存入 mp_page.page_group（VARCHAR(32)），
 * 列表渲染时排在活动与专题之后、归档之前。
 */
export type StandardPageGroup = 'system' | 'decorate' | 'ai' | 'activity' | 'archived'
export type PageGroup = string

/** 标准分组顺序（归档恒为最后一组，自定义组排在 activity 之后、archived 之前） */
export const STANDARD_PAGE_GROUPS: StandardPageGroup[] = ['system', 'decorate', 'ai', 'activity']
export const ALL_STANDARD_GROUPS: StandardPageGroup[] = [...STANDARD_PAGE_GROUPS, 'archived']

export const PAGE_GROUP_LABELS: Record<StandardPageGroup, string> = {
  system: '系统页',
  decorate: '装修页',
  ai: 'AI 页面',
  activity: '活动与专题',
  archived: '归档',
}

export const PAGE_GROUP_SUB: Record<StandardPageGroup, string> = {
  system: '小程序内置原生页 · 不可装修，只能改配置或换绑导航位',
  decorate: '装修器搭出的页面 · 可自由编排',
  ai: 'AI 生成器产出 · 可继续在装修器里改',
  activity: '专题 / 会场页 · 可设入口到期时间',
  archived: '被替换或不再使用的页面，可随时恢复',
}

/** 某个分组是否是标准分组（非自定义） */
export function isStandardPageGroup(key: string): key is StandardPageGroup {
  return (ALL_STANDARD_GROUPS as string[]).includes(key)
}

/** 分组显示名：标准分组取预设，自定义分组直接用 key */
export function resolveGroupLabel(key: string): string {
  if (isStandardPageGroup(key)) return PAGE_GROUP_LABELS[key]
  return key
}

/** 分组副标题：标准分组取预设，自定义分组无副标题 */
export function resolveGroupSub(key: string): string {
  if (isStandardPageGroup(key)) return PAGE_GROUP_SUB[key]
  return '自定义分组'
}

/** AI 生成器建页的路径前缀（历史数据兜底用） */
export const AI_PAGE_PATH_PREFIX = 'pages/custom/ai-'

export function isAiPagePath(path?: string | null): boolean {
  return String(path || '').replace(/^\//, '').startsWith(AI_PAGE_PATH_PREFIX)
}

/**
 * 小程序内置原生页（不在 mp_page 表里，装修器改不了）。
 * 与 miniapp/app.json 主包注册页保持一致；容器页（pages/custom/custom、
 * render-parity 等纯技术页）不计入，避免列表里出现看不懂的条目。
 */
export type MiniSystemPage = {
  /** tabBar 绑定用的标准路径（带前导 /） */
  route: string
  /** 与库表 path 同口径（无前导 /） */
  path: string
  name: string
  /** 一句话说明它是什么、能改什么 */
  desc: string
  /**
   * 点「配置」该去哪。默认是「外观」（底部导航/主色都在这儿），
   * 但系统页各有各的配置台——「我的」的模板与菜单在 /page-builder/mine，
   * 只会跳「外观」的话等于把人送到一个改不了它的地方。
   */
  configRoute?: string
  /** 「配置」按钮的文案，缺省为「配置」 */
  configLabel?: string
  /**
   * 不在页面管理的「系统页」组里列出。
   * 四个 Tab 壳页（首页/发现/星球/商城）本身只是 DSL 薄壳，真实内容由
   * 绑定的装修页承载（装修页组里已有同名行），再列一行重复且无自身内容；
   * 但路径匹配（navBoundIsSystem / tabSlotByPath）仍需它们，故只藏不删。
   */
  hideInList?: boolean
}

export const MINI_SYSTEM_PAGES: MiniSystemPage[] = [
  { route: '/pages/index/index', path: 'pages/index/index', name: '首页', desc: '未绑装修页时渲染内置首页', hideInList: true },
  { route: '/pages/discover/discover', path: 'pages/discover/discover', name: '发现', desc: '内容发现流（内置壳）', hideInList: true },
  { route: '/pages/planet/planet', path: 'pages/planet/planet', name: '星球', desc: '星球社区（内置壳）', hideInList: true },
  { route: '/pages/shop/shop', path: 'pages/shop/shop', name: '商城', desc: '商品商城（内置壳）', hideInList: true },
  {
    route: '/pages/mine/mine',
    path: 'pages/mine/mine',
    name: '我的',
    desc: '个人中心 · 登录 / 订单 / 优惠券 / 地址',
    configRoute: '/page-builder/mine',
    configLabel: '配置模板',
  },
  { route: '/pages/login/login', path: 'pages/login/login', name: '登录', desc: '微信授权登录', configRoute: '/page-builder/login', configLabel: '配置模板' },
  { route: '/pages/search/search', path: 'pages/search/search', name: '搜索', desc: '全局搜索', hideInList: true },
]

/** 页面管理列表里展示的系统页（Tab 壳页 hideInList 不列，路径匹配仍用全量清单） */
export function listableSystemPages(): MiniSystemPage[] {
  return MINI_SYSTEM_PAGES.filter((s) => !s.hideInList)
}

/**
 * 系统页「配置」的目标路由；未指定时统一回落到品牌信息页
 * （2026-10-05：品牌与导航已从原「外观」页拆出，/mini/appearance 变成 redirect，
 *  这里跟着改，否则会跳到被重定向的地址）
 */
export function systemPageConfigRoute(sp: MiniSystemPage): string {
  return sp.configRoute || '/mini/workbench?tab=brand'
}

/** 该路径是否是「我的」系统页（唯一带模板库/菜单编排能力的系统页） */
export function isMineSystemPage(sp: MiniSystemPage): boolean {
  return String(sp.path || '').replace(/^\/+/, '') === 'pages/mine/mine'
}

/** 该路径是否是「登录」系统页（带 4 套登录模板库，配置在 /page-builder/login） */
export function isLoginSystemPage(sp: MiniSystemPage): boolean {
  return String(sp.path || '').replace(/^\/+/, '') === 'pages/login/login'
}

/** 无后端 pageGroup 时按来源推断分组（返回值可能是标准分组或自定义分组名） */
export function inferPageGroup(row: {
  pageGroup?: string | null
  page_group?: string | null
  archived?: boolean | number | null
  type?: string | number | null
  path?: string | null
  name?: string | null
}): string {
  // 归档优先：归档态压过来源类型，否则归档页会散落到各类型组里
  if (row.archived === true || row.archived === 1) return 'archived'
  const explicit = String(row.pageGroup || row.page_group || '').trim()
  if (!explicit) {
    // 无显式值时按来源兜底推断
    const path = String(row.path || '')
    if (isAiPagePath(path)) return 'ai'
    if (String(row.type ?? '') === '2' || path.includes('/activity')) return 'activity'
    return 'decorate'
  }
  if (explicit.toLowerCase() === 'archived') return 'archived'
  // AI 路径兜底：历史数据没有 pageGroup='ai'，用路径识别
  if (explicit.toLowerCase() === 'ai') return 'ai'
  if (isStandardPageGroup(explicit.toLowerCase())) return explicit.toLowerCase()
  // 非标准值 → 自定义分组，原样返回（保留大小写）
  return explicit
}
