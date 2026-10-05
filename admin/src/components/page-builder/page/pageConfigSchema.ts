/**
 * 页面级配置 Schema —— 「页面属性」面板的唯一真相源。
 *
 * 🔴 为什么必须集中：页面级字段（导航栏 / 背景 / 分享 / 高级）
 * 会被三处消费 —— 后台面板、小程序端页面容器、预览画布。
 * 以前这些字段散落在 `PropsPanel.vue` 的模板里（各写一份默认值），
 * 结果是「面板改了、真机没变」或「老页面升级后外观突变」。
 * 现在默认值 + 归一化全部收在这里，三处只读同一份。
 *
 * ⚠️ 兼容铁律：所有新增字段的默认值必须让**线上已有页面零视觉变化**。
 * 判据 = 归一化后的结果与「字段缺失」时的旧行为逐字相等。
 */

/* ============ 1. 顶部导航栏 ============ */

/**
 * 导航模式。
 * ⚠️ 默认 `standard`：与现状一致（端上 `custom-nav` 走标准布局 + brand_header）。
 * 若默认改成 immersive，所有页面会立刻变成透明顶栏 —— 属破坏性变更。
 */
export const PAGE_NAV_MODES = [
  { value: 'standard', label: '默认标准', desc: '不透明底色，标题居中，与现状一致' },
  { value: 'immersive', label: '沉浸式透明', desc: '顶栏透明，内容延伸到状态栏下方' },
  { value: 'gradient', label: '滚动渐变显示', desc: '初始透明，页面下滚后渐显底色' },
  { value: 'hidden', label: '隐藏导航栏', desc: '完全隐藏，只留状态栏占位' },
] as const

export type PageNavMode = (typeof PAGE_NAV_MODES)[number]['value']

export function isKnownPageNavMode(v: unknown): v is PageNavMode {
  return PAGE_NAV_MODES.some((it) => it.value === v)
}

/** 状态栏文字色：dark=深色文字（适合浅底）/ light=浅色文字（适合深底） */
export type PageStatusBarTextTone = 'dark' | 'light'

export type PageNavConfig = {
  mode: PageNavMode
  /** 标题是否跟随页面名称 */
  syncTitle: boolean
  /** syncTitle=false 时生效的独立标题 */
  title: string
  /** 导航栏底色；空串 = 用页面背景主色 */
  bgColor: string
  /** 状态栏文字色 */
  statusTextTone: PageStatusBarTextTone
  /** 沉浸式/渐变模式下的渐变终点色（为空则用 bgColor） */
  gradientTo: string
}

export const DEFAULT_PAGE_NAV: PageNavConfig = {
  mode: 'standard',
  syncTitle: true,
  title: '',
  bgColor: '',
  statusTextTone: 'dark',
  gradientTo: '',
}

export function normalizePageNav(raw: unknown): PageNavConfig {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>
  return {
    mode: isKnownPageNavMode(o.mode) ? o.mode : DEFAULT_PAGE_NAV.mode,
    // 默认跟随页面名称：老页面没有这个字段，行为与现在一致
    syncTitle: o.sync_title !== false,
    title: String(o.title || '').slice(0, 30),
    bgColor: String(o.bg_color || ''),
    // 默认深色文字：绝大多数页面是浅底，深色文字才看得清
    statusTextTone: o.status_text_tone === 'light' ? 'light' : 'dark',
    gradientTo: String(o.gradient_to || ''),
  }
}

/* ============ 2. 页面背景（扩充 image 类型） ============ */

export const PAGE_BG_IMAGE_MODES = [
  { value: 'cover', label: '全屏覆盖', desc: '铺满整屏，超出部分裁切（不拉伸）' },
  { value: 'tile-top', label: '顶部平铺', desc: '从顶部开始平铺，不随滚动' },
  { value: 'center', label: '居中不拉伸', desc: '原尺寸居中显示，四周留白' },
] as const

export type PageBgImageMode = (typeof PAGE_BG_IMAGE_MODES)[number]['value']

export function isKnownPageBgImageMode(v: unknown): v is PageBgImageMode {
  return PAGE_BG_IMAGE_MODES.some((it) => it.value === v)
}

export type PageBgImageConfig = {
  url: string
  mode: PageBgImageMode
  /** true=固定在视口（不随内容滚动） */
  fixed: boolean
}

export const DEFAULT_PAGE_BG_IMAGE: PageBgImageConfig = {
  url: '',
  mode: 'cover',
  fixed: true,
}

export function normalizePageBgImage(raw: unknown): PageBgImageConfig {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>
  return {
    url: String(o.url || ''),
    mode: isKnownPageBgImageMode(o.mode) ? o.mode : DEFAULT_PAGE_BG_IMAGE.mode,
    fixed: o.fixed !== false,
  }
}

/** 背景图平铺模式 → CSS background 片段 */
export function pageBgImageCss(cfg: PageBgImageConfig): string {
  if (!cfg.url) return ''
  const fixed = cfg.fixed ? 'fixed' : 'scroll'
  if (cfg.mode === 'cover') return `center / cover no-repeat ${fixed}`
  if (cfg.mode === 'tile-top') return 'center top / auto repeat-x scroll'
  return `center / auto no-repeat ${fixed}`
}

/* ============ 3. 分享配置 ============ */

export const SHARE_TITLE_MAX = 30
export const SHARE_DESC_MAX = 50
/** 微信分享卡片封面推荐比例 */
export const SHARE_IMAGE_RATIO = { w: 5, h: 4, label: '5:4' }

export type PageShareConfig = {
  title: string
  desc: string
  image: string
}

export function normalizePageShare(raw: any): PageShareConfig {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>
  return {
    // 标题留空 = 继承页面名称（分享时回落），不是空标题
    title: String(o.title || '').trim().slice(0, SHARE_TITLE_MAX),
    desc: String(o.desc || '').slice(0, SHARE_DESC_MAX),
    image: String(o.image || ''),
  }
}

/* ============ 4. 高级设置 ============ */

export const PAGE_ACCESS_MODES = [
  { value: 'public', label: '全部公开', desc: '任何人可访问' },
  { value: 'login', label: '需登录', desc: '未登录时跳转登录页' },
  { value: 'vip', label: '仅会员可见', desc: '按会员等级校验，等级在下方指定' },
] as const

export type PageAccessMode = (typeof PAGE_ACCESS_MODES)[number]['value']

export function isKnownPageAccessMode(v: unknown): v is PageAccessMode {
  return PAGE_ACCESS_MODES.some((it) => it.value === v)
}

export const OFFLINE_PRESETS = [
  { value: 15, label: '15 分钟后' },
  { value: 60, label: '1 小时后' },
  { value: 1440, label: '1 天后' },
  { value: 10080, label: '7 天后' },
] as const

export type PageScheduleConfig = {
  enabled: boolean
  /** 上线时间戳（毫秒）；0 = 立即上线 */
  onlineAt: number
  /** 下线时间戳（毫秒）；0 = 永不下线 */
  offlineAt: number
  /** 下线后跳转的页面路径；空 = 回首页 */
  redirectPath: string
}

export const DEFAULT_PAGE_SCHEDULE: PageScheduleConfig = {
  enabled: false,
  onlineAt: 0,
  offlineAt: 0,
  redirectPath: '',
}

export function normalizePageSchedule(raw: unknown): PageScheduleConfig {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>
  const num = (v: unknown) => {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0
  }
  return {
    enabled: o.enabled === true,
    onlineAt: num(o.online_at),
    offlineAt: num(o.offline_at),
    redirectPath: String(o.redirect_path || ''),
  }
}

/* ============ 5. 访问路径校验 ============ */

/**
 * 访问路径只允许小写英文、数字、连字符与 `/`。
 * 🔴 这条不是洁癖：路径会拼进小程序 `switchTab`/`navigateTo` 的 url，
 * 大写与空格在微信端会直接报「路径不存在」或跳到错误页；
 * 中文/斜杠混用还会与 `pkg-xxx` 分包路由撞车。
 */
export const PAGE_PATH_PATTERN = /^[a-z0-9/-]+$/
export const PAGE_PATH_REGEX_HINT = '仅小写英文、数字、连字符 - 与 /'

/** 逐字符过滤：直接掐掉非法字符，运营边打边看到哪些被拒 */
export function sanitizePagePath(input: string): string {
  return String(input || '')
    .toLowerCase()
    .split('')
    .filter((ch) => PAGE_PATH_PATTERN.test(ch))
    .join('')
}

export function isValidPagePath(input: string): boolean {
  const v = String(input || '')
  return v.length > 0 && PAGE_PATH_PATTERN.test(v)
}

/* ============ 6. 底部渐隐（遮罩高度滑块范围） ============ */

/** 遮罩高度范围（px）：与旧滑块 marks 保持一致，避免老配置落库后被夹到边界 */
export const OVERLAY_HEIGHT_MIN = 60
export const OVERLAY_HEIGHT_MAX = 160
export const OVERLAY_HEIGHT_DEFAULT = 96
