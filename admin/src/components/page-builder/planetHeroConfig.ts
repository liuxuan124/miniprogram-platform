/**
 * 星球顶栏（PlanetHeader）的配置契约 + 编辑期预览数据。
 *
 * ## 为什么要有这个文件
 *
 * 该组件的字段散在三处且此前完全无约束：渲染器里写死「切换」按钮、面板里没有对应开关、
 * 端上又按自己的口径判身份。三处各写一份必然走偏（改一处漏两处）。
 * 这里作为单一真相源，渲染器 / 属性面板 / 端上（人工同步注释）都从这里取默认值与元信息。
 *
 * ## 身份互斥是这个组件的核心约束
 *
 * 「加入按钮」（游客该看的）和「有效期条」（会员才该看的）**业务上互斥**。
 * 装修器画布此前两个都无条件渲染 —— 截图里同时出现「加入」和「剩余 185 天」，
 * 运营无法判断这个组件上线后长什么样。
 * 真机端已有身份判定（planetActive），画布要补上对应的预览开关。
 */

export type PreviewIdentity = 'guest' | 'member'
export type PlanetDataSource = 'auto' | 'manual'
export type PlanetLogoMode = 'emoji' | 'image'
export type GroupActionType = 'link' | 'qrcode'
export type PlanetBgType = 'preset' | 'gradient' | 'image'

export interface PlanetKpiItem {
  /** 数值，如 "3,241" */
  value: string
  /** 指标标签，如 "球友" */
  label: string
  /** 单位/后缀，可空 */
  suffix?: string
}

/** 背景渐变预设（需求指定三套风格） */
export const PLANET_BG_PRESETS = [
  {
    value: 'warm',
    label: '轻奢暖棕金',
    css: 'linear-gradient(150deg,#7c2d12 0%,#b45309 55%,#d97706 100%)',
    swatch: ['#7c2d12', '#b45309', '#d97706'],
  },
  {
    value: 'tech',
    label: '科技深蓝',
    css: 'linear-gradient(150deg,#0c1e3d 0%,#153a6b 55%,#1e5aa8 100%)',
    swatch: ['#0c1e3d', '#153a6b', '#1e5aa8'],
  },
  {
    value: 'dark',
    label: '黑金暗黑',
    css: 'linear-gradient(150deg,#1c1917 0%,#3f2f1d 55%,#78551f 100%)',
    swatch: ['#1c1917', '#3f2f1d', '#78551f'],
  },
] as const

/** KPI 卡片样式 */
export const PLANET_KPI_STYLES = [
  { value: 'glass', label: '纯色微透' },
  { value: 'plain', label: '无底色极简' },
] as const

export interface PlanetHeaderContentProps {
  /** 预览身份：未加入（游客）/ 已加入（会员）。**仅装修器生效**，真机按真实会员态。 */
  preview_identity: PreviewIdentity
  /** 数据来源：auto 走星球 OpenAPI，manual 全部读本地配置 */
  source_mode: PlanetDataSource

  /** 图标模式：emoji 文本 / image 素材库图片 */
  logo_mode: PlanetLogoMode
  /** logo_mode=emoji 时是 emoji 文本；=image 时是图片 URL（/uploads/ 开头） */
  logo_value: string
  title: string
  subtitle: string

  /** 加入按钮（游客态主 CTA） */
  show_join_btn: boolean
  join_text: string
  join_link: string

  /** 切换主星球按钮 —— 端上是 planet-switch-sheet 半屏，不跳页 */
  show_switch_btn: boolean
  switch_btn_text: string
  /** switch_action=link 时生效；默认走端上半屏切换，传链接则直接跳页 */
  switch_btn_link: string
  switch_action: 'sheet' | 'link'

  /** 有效期与权益（会员态） */
  show_expire_notice: boolean
  /**
   * 有效期模板，支持变量：{expire_date} 到期日 / {days_left} 剩余天数 / {renew} 续费文案
   * 动态模板而非静态文本 —— 剩余天数每天都在变，写死必然过期。
   */
  expire_text: string
  show_renew_btn: boolean
  renew_text: string
  renew_link: string

  /** 社群引导条 */
  show_group_notice: boolean
  join_row_text: string
  join_row_go: string
  group_action_type: GroupActionType
  /** group_action_type=link 时的跳转目标 */
  group_link: string
  /** group_action_type=qrcode 时弹窗里的二维码图片 */
  group_qr_image: string
  group_modal_title: string
  group_modal_desc: string

  /** KPI 卡片，2~4 项 */
  kpis: PlanetKpiItem[]
}

export interface PlanetHeaderStyleProps {
  /** 背景类型：预设渐变 / 自定义渐变 / 背景图 */
  bg_type: PlanetBgType
  /** bg_type=preset 时取预设 key；=gradient 时取 bg_gradient */
  bg_preset: string
  bg_gradient: string
  /** bg_type=image 时取图片 URL */
  bg_image: string
  /** 毛玻璃 */
  glass: boolean
  /** 容器圆角 0-24 */
  radius: number
  /** 内边距 12-24 */
  padding: number
  /** KPI 卡片样式 */
  kpi_style: 'glass' | 'plain'
}

export const PLANET_CONTENT_DEFAULTS: PlanetHeaderContentProps = {
  preview_identity: 'guest',
  source_mode: 'auto',

  logo_mode: 'emoji',
  logo_value: '🪐',
  title: '跨境墨太白 · 知识星球',
  subtitle: '深度问答、资料与同路人',

  show_join_btn: true,
  join_text: '加入',
  join_link: '/pkg-user/member-center/member-center',

  show_switch_btn: false,
  switch_btn_text: '切换',
  switch_btn_link: '',
  switch_action: 'sheet',

  show_expire_notice: false,
  expire_text: '会员有效期至 {expire_date} · 剩余 {days_left} 天',
  show_renew_btn: false,
  renew_text: '续费 8 折',
  renew_link: '/pkg-user/member-center/member-center',

  show_group_notice: true,
  join_row_text: '👥 加入球友微信群，第一时间收到更新通知',
  join_row_go: '去加入 ›',
  group_action_type: 'link',
  group_link: '/pkg-content/join/join',
  group_qr_image: '',
  group_modal_title: '扫码加入球友群',
  group_modal_desc: '长按识别二维码，第一时间收到更新通知',

  kpis: [
    { value: '3,241', label: '球友', suffix: '' },
    { value: '1.2万', label: '沉淀内容', suffix: '' },
    { value: '27', label: '今日新增', suffix: '' },
    { value: '8', label: '持续草', suffix: '折' },
  ],
}

export const PLANET_STYLE_DEFAULTS: PlanetHeaderStyleProps = {
  bg_type: 'preset',
  bg_preset: 'warm',
  bg_gradient: 'linear-gradient(150deg,#7c2d12 0%,#b45309 55%,#d97706 100%)',
  bg_image: '',
  glass: true,
  radius: 0,
  padding: 18,
  kpi_style: 'glass',
}

/** KPI 数量限制：需求规定 2~4 项，渲染器按 4 列布局，超出会挤成 5 列 */
export const PLANET_KPI_MIN = 2
export const PLANET_KPI_MAX = 4

/** 旧字段 → 新字段映射（老 DSL 无需重配） */
export const PLANET_LEGACY_KEYS = {
  /** 老字段 logo_emoji 是 emoji 文本 */
  logo: 'logo_emoji',
  /** 老字段里「切换」没有开关，等于永远开启 */
  switchAlwaysOn: true,
}

/**
 * 取 logo_mode：老 DSL 只写了 logo_emoji，值以 / 或 http 开头才当图片，
 * 否则一律按 emoji 处理（避免把图片 URL 塞进 emoji 框里）。
 */
export function resolveLogoMode(value: unknown): PlanetLogoMode {
  const s = String(value ?? '').trim()
  if (!s) return 'emoji'
  return s.startsWith('/uploads/') || /^https?:\/\//i.test(s) ? 'image' : 'emoji'
}

/** 取背景 CSS：按 bg_type 分派，未知值回落暖色预设 */
export function resolveBgCss(style: Partial<PlanetHeaderStyleProps> | undefined): string {
  const s = style || {}
  if (s.bg_type === 'gradient' && String(s.bg_gradient || '').trim()) {
    return String(s.bg_gradient).trim()
  }
  if (s.bg_type === 'image' && String(s.bg_image || '').trim()) {
    return `url(${s.bg_image}) center/cover no-repeat, linear-gradient(150deg,#7c2d12,#b45309)`
  }
  const preset = PLANET_BG_PRESETS.find((p) => p.value === s.bg_preset)
  return preset ? preset.css : PLANET_BG_PRESETS[0].css
}

/**
 * 有效期模板渲染：把 {expire_date} / {days_left} / {renew} 换成实际值。
 *
 * 编辑期预览时给的是示例值（2027-03-18 / 185），让运营看到「剩余 185 天」的效果；
 * 真机上这些值由星球接口下发。
 */
export function renderExpireTemplate(
  template: string,
  vars: { expire_date?: string; days_left?: number | string; renew?: string } = {},
): string {
  const defaults = { expire_date: '2027-03-18', days_left: 185, renew: '续费 8 折' }
  const v = { ...defaults, ...vars }
  return String(template || '')
    .replace(/\{expire_date\}/g, v.expire_date)
    .replace(/\{days_left\}/g, String(v.days_left))
    .replace(/\{renew\}/g, v.renew)
}
