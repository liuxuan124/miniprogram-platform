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
  sync_title: boolean
  /** sync_title=false 时生效的独立标题 */
  title: string
  /** 导航栏底色；空串 = 用页面背景主色 */
  bg_color: string
  /** 状态栏文字色 */
  status_text_tone: PageStatusBarTextTone
  /** 沉浸式/渐变模式下的渐变终点色（为空则用 bg_color） */
  gradient_to: string
}

export const DEFAULT_PAGE_NAV: PageNavConfig = {
  mode: 'standard',
  sync_title: true,
  title: '',
  bg_color: '',
  status_text_tone: 'dark',
  gradient_to: '',
}

export function normalizePageNav(raw: unknown): PageNavConfig {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>
  return {
    mode: isKnownPageNavMode(o.mode) ? o.mode : DEFAULT_PAGE_NAV.mode,
    // 默认跟随页面名称：老页面没有这个字段，行为与现在一致
    sync_title: o.sync_title !== false,
    title: String(o.title || '').slice(0, 30),
    bg_color: String(o.bg_color || ''),
    // 默认深色文字：绝大多数页面是浅底，深色文字才看得清
    status_text_tone: o.status_text_tone === 'light' ? 'light' : 'dark',
    gradient_to: String(o.gradient_to || ''),
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

/* ============ 5. 访问路径校验 ============ */

/**
 * 访问路径只允许小写英文、数字、连字符、下划线与 `/`。
 * 🔴 这条不是洁癖：路径会拼进小程序 `switchTab`/`navigateTo` 的 url，
 * 大写与空格在微信端会直接报「路径不存在」或跳到错误页；
 * 中文/斜杠混用还会与 `pkg-xxx` 分包路由撞车。
 *
 * ⚠️ 下划线 `_` 必须允许：微信小程序自定义页面路径本身允许下划线，
 * 且部分既有页面 slug 里就有（如 `custom_nav` 风格命名），拦掉会造成存量页面无法编辑。
 */
export const PAGE_PATH_PATTERN = /^[a-z0-9/_-]+$/
export const PAGE_PATH_REGEX_HINT = '仅小写英文、数字、连字符 -、下划线 _ 与 /'

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

/** 装修页的固定路径前缀（提示词要求显式暴露为「前缀标签 + 输入框」） */
export const PAGE_PATH_PREFIX = '/pages/custom/'

export function fullPagePath(slug: string): string {
  const s = String(slug || '').replace(/^\/+/, '')
  return s ? `${PAGE_PATH_PREFIX}${s}` : PAGE_PATH_PREFIX
}

/* ============ 6. 底部渐隐（遮罩高度滑块范围） ============ */

/** 遮罩高度范围（px）：与旧滑块 marks 保持一致，避免老配置落库后被夹到边界 */
export const OVERLAY_HEIGHT_MIN = 60
export const OVERLAY_HEIGHT_MAX = 160
export const OVERLAY_HEIGHT_DEFAULT = 96

/** 触底加载触发距离（px）—— 提示词要求可配，默认 100 */
export const REACH_BOTTOM_DISTANCE_MIN = 50
export const REACH_BOTTOM_DISTANCE_MAX = 300
export const REACH_BOTTOM_DISTANCE_DEFAULT = 100

/* ============ 7. 颜色明度（状态栏文字冲突检测） ============ */

/**
 * 计算颜色的 WCAG 相对亮度。
 * ⚠️ 公式用 0.2126R + 0.7152G + 0.0722B（Rec.709/sRGB），
 * **不是** 端上 `getNavigationFrontColor` 用的 0.299/0.587/0.114（Rec.601 亮度）。
 * 两者结论在中间调会分歧，而这里是给人看的「要不要告警」提示，
 * 必须用标准公式；真机前端色仍走端上那套，两边职责不同不要混用。
 *
 * @param hex 支持 #rgb / #rrggbb / #rrggbbaa（忽略 alpha）
 * @returns 0~1，无色可解析时返回 -1（调用方据此跳过检测）
 */
export function relativeLuminance(hex: string): number {
  const raw = String(hex || '').trim()
  if (!raw) return -1
  let s = raw
  const m = raw.match(/^#([0-9a-fA-F]{3,8})$/)
  if (m) {
    let body = m[1]
    if (body.length === 3 || body.length === 4) {
      body = body.split('').map((c) => c + c).join('')
    }
    if (body.length !== 6 && body.length !== 8) return -1
    s = `#${body.slice(0, 6)}`
  } else if (!/^rgba?\(/i.test(s)) {
    return -1
  }
  // rgba() 交给 rgb 分支解析
  const rgbMatch = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i)
  let r: number, g: number, b: number
  if (rgbMatch) {
    r = Number(rgbMatch[1])
    g = Number(rgbMatch[2])
    b = Number(rgbMatch[3])
  } else {
    const h = s.replace('#', '')
    r = parseInt(h.slice(0, 2), 16)
    g = parseInt(h.slice(2, 4), 16)
    b = parseInt(h.slice(4, 6), 16)
  }
  if (![r, g, b].every((n) => Number.isFinite(n))) return -1
  // sRGB → linear RGB
  const lin = (c: number) => {
    const v = Math.min(255, Math.max(0, c)) / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/**
 * 状态栏文字与顶栏底色是否冲突。
 * ⚠️ 阈值 0.35 是提示词给的经验值，实测在「深色底 + 深色文字」时清晰度最差。
 * 返回 `null` 表示无法判定（顶栏色是渐变/未设置），此时**不告警** ——
 * 拿不到颜色就报警会让运营学会忽略告警，真告警时反而不看。
 */
export function statusBarContrastRisk(
  navBgColor: string,
  statusTone: PageStatusBarTextTone,
): 'dark-on-dark' | 'light-on-light' | null {
  const lum = relativeLuminance(navBgColor)
  if (lum < 0) return null
  if (lum < 0.35 && statusTone === 'dark') return 'dark-on-dark'
  if (lum >= 0.35 && statusTone === 'light') return 'light-on-light'
  return null
}

/* ============ 8. 访问权限（含密码与会员多选） ============ */

/** 下线时间的快捷预设（分钟） */
export const OFFLINE_PRESETS = [
  { value: 15, label: '15 分钟后' },
  { value: 60, label: '1 小时后' },
  { value: 1440, label: '1 天后' },
  { value: 10080, label: '7 天后' },
] as const

export const PAGE_ACCESS_MODES = [
  { value: 'public', label: '公开访问', desc: '任何人可访问' },
  { value: 'login', label: '需登录后查看', desc: '未登录时跳转登录页' },
  { value: 'vip', label: '仅特定会员可见', desc: '勾选允许的会员身份，可多选' },
  { value: 'password', label: '密码验证访问', desc: '需输入 6 位访问密码' },
] as const

export type PageAccessMode = (typeof PAGE_ACCESS_MODES)[number]['value']

/** 面板下拉用的短别名（组件里读这个，避免每次写长常量名） */
export const ACCESS_OPTIONS = PAGE_ACCESS_MODES

export function isKnownPageAccessMode(v: unknown): v is PageAccessMode {
  return PAGE_ACCESS_MODES.some((it) => it.value === v)
}

/** 可勾选的会员身份（提示词要求的业务口径，与星球/专栏体系对齐） */
export const PAGE_VIP_TIERS = [
  { value: 'vip_annual', label: '年度会员' },
  { value: 'vip_column', label: '专栏合伙人' },
  { value: 'vip_planet', label: '星球合伙人' },
] as const

/** 访问密码：固定 6 位数字 */
export const PAGE_PASSWORD_LENGTH = 6
export const PAGE_PASSWORD_PATTERN = /^\d{6}$/

/** 下线后兜底行为 */
export const PAGE_EXPIRE_FALLBACKS = [
  { value: 'home', label: '重定向至首页' },
  { value: 'notice', label: '展示停用公告' },
  { value: 'stay', label: '停留在当前页' },
] as const

export type PageExpireFallback = (typeof PAGE_EXPIRE_FALLBACKS)[number]['value']

export function isKnownExpireFallback(v: unknown): v is PageExpireFallback {
  return PAGE_EXPIRE_FALLBACKS.some((it) => it.value === v)
}

export type PageScheduleConfig = {
  enabled: boolean
  /** 上线时间戳（毫秒）；0 = 立即上线 */
  onlineAt: number
  /** 下线时间戳（毫秒）；0 = 永不下线 */
  offlineAt: number
  /** 下线后跳转的页面路径；空 = 按 fallback 决定 */
  redirectPath: string
  /** 下线兜底行为 */
  fallback: PageExpireFallback
}

export const DEFAULT_PAGE_SCHEDULE: PageScheduleConfig = {
  enabled: false,
  onlineAt: 0,
  offlineAt: 0,
  redirectPath: '',
  fallback: 'home',
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
    fallback: isKnownExpireFallback(o.fallback) ? o.fallback : DEFAULT_PAGE_SCHEDULE.fallback,
  }
}

/* ============ 9. 高级设置（组合视图） ============ */

/**
 * 高级设置的**面板视图模型**：把散在 PageConfig 顶层的字段收成一个对象，
 * 让 `AdvancedSettings.vue` 只接一个 prop、只 emit 一个 patch。
 *
 * ⚠️ 落库字段名是 snake_case（`access_mode`/`vip_tiers`/`access_password`/`watermark`），
 * 视图层用 camelCase —— 转换只在这一处 `normalizePageAdvanced` 里做，
 * 避免每个组件各写一遍映射。
 */
export type PageAdvancedConfig = {
  access_mode: PageAccessMode
  /** 仅 access_mode === 'vip' 时有意义 */
  vip_tiers: string[]
  /** 仅 access_mode === 'password' 时有意义；6 位数字 */
  access_password: string
  /** 动态防录屏水印 */
  watermark: boolean
  schedule: PageScheduleConfig
}

export const DEFAULT_PAGE_ADVANCED: PageAdvancedConfig = {
  access_mode: 'public',
  vip_tiers: [],
  access_password: '',
  watermark: false,
  schedule: DEFAULT_PAGE_SCHEDULE,
}

export function normalizePageAdvanced(raw: any): PageAdvancedConfig {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>
  const tiers = Array.isArray(o.vip_tiers)
    ? o.vip_tiers.filter((t: unknown) => PAGE_VIP_TIERS.some((x) => x.value === t))
    : []
  const pwd = String(o.access_password || '').replace(/\D/g, '').slice(0, PAGE_PASSWORD_LENGTH)
  return {
    access_mode: isKnownPageAccessMode(o.access_mode) ? o.access_mode : 'public',
    vip_tiers: tiers,
    access_password: PAGE_PASSWORD_PATTERN.test(pwd) ? pwd : '',
    // ⚠️ 默认 false：老页面没这个字段 = 不加水印，
    // 若默认 true 会让所有存量页面突然出现水印（属破坏性变更）
    watermark: o.watermark === true,
    schedule: normalizePageSchedule(o.schedule),
  }
}
