/**
 * 登录页模板库（仿 mineTemplates.ts）
 *
 * 设计口径（与 types/miniapp.ts 的分工）：
 * - **皮肤（外观）**：warm 暖阁 / brand 品牌焦点 / minimal 极简 / wechat 微信原生，
 *   由 applyLoginPageStylePreset 写入 themeColor + 装饰开关。
 * - **模板（组合）**：一套 = 默认皮肤 + 文案 + 开关组合。用户先挑模板，再单独微调皮肤。
 * - 登录页是原生页 /pages/login/login，不进装修器；模板仅切皮肤与文案。
 *
 * 第一套 warm 即「现在搭建的登录页」默认态（用户口径：当前登录页也要作为模板）。
 */
import {
  DEFAULT_LOGIN_PAGE_CONFIG,
  applyLoginPageStylePreset,
  type LoginPageConfig,
  type LoginPageStyleKey,
} from '@/types/miniapp'

/** 模板元信息 + 组合定义 */
export interface LoginTemplatePreset {
  key: string
  name: string
  desc: string
  /** 适用业态，用于卡片副标 */
  scene: string
  /** 卡片封面渐变 */
  cover: string
  styleKey: LoginPageStyleKey
  heroTitle: string
  heroSubtitle: string
  loginButtonText: string
  skipButtonText: string
  sheetTitle: string
  sheetSubtitle: string
  securityBadgeText: string
  privacyNoteText: string
  showDecorOrbs: boolean
  showSecurityBadge: boolean
  showBackButton: boolean
}

export const LOGIN_TEMPLATES: LoginTemplatePreset[] = [
  {
    key: 'warm',
    name: '暖阁纸感',
    desc: '默认款，砖橘渐变 + 装饰光斑',
    scene: '内容社群 · 知识付费',
    cover: 'linear-gradient(145deg, #f6ddbf 0%, #d97706 48%, #7c2d12 100%)',
    styleKey: 'warm',
    heroTitle: '欢迎回来',
    heroSubtitle: '登录后同步收藏、预约与阅读记录',
    loginButtonText: '手机号快捷登录',
    skipButtonText: '暂不登录',
    sheetTitle: '手机号快捷登录',
    sheetSubtitle: '使用授权信息快速登录',
    securityBadgeText: '安全登录',
    privacyNoteText: '未登录也可浏览资讯；手机号仅用于登录，不会公开展示',
    showDecorOrbs: true,
    showSecurityBadge: true,
    showBackButton: true,
  },
  {
    key: 'brand',
    name: '品牌焦点',
    desc: '品牌色渐变，Logo 居中突出',
    scene: '品牌官网 · 商城',
    cover: 'linear-gradient(145deg, #5B7FEA 0%, #6B6FE8 55%, #4338CA 100%)',
    styleKey: 'brand',
    heroTitle: '欢迎来到品牌名',
    heroSubtitle: '登录后享受会员价、订单跟踪与售后',
    loginButtonText: '一键登录',
    skipButtonText: '先逛逛',
    sheetTitle: '登录 / 注册',
    sheetSubtitle: '手机号一键登录，新用户自动注册',
    securityBadgeText: '官方安全登录',
    privacyNoteText: '手机号仅用于登录身份核验，不会用于营销推送',
    showDecorOrbs: true,
    showSecurityBadge: true,
    showBackButton: true,
  },
  {
    key: 'minimal',
    name: '极简卡片',
    desc: '纯白卡片 + 主色按钮，最克制',
    scene: '工具类 · 极简风',
    cover: 'linear-gradient(145deg, #fafaf9 0%, #f5f5f4 55%, #e7e5e4 100%)',
    styleKey: 'minimal',
    heroTitle: '登录',
    heroSubtitle: '',
    loginButtonText: '继续',
    skipButtonText: '取消',
    sheetTitle: '',
    sheetSubtitle: '',
    securityBadgeText: '',
    privacyNoteText: '登录即表示同意隐私政策',
    showDecorOrbs: false,
    showSecurityBadge: false,
    showBackButton: true,
  },
  {
    key: 'wechat',
    name: '微信原生',
    desc: '微信绿主按钮，贴合原生体验',
    scene: '轻量小程序 · 工具型',
    cover: 'linear-gradient(145deg, #07C160 0%, #06AD56 55%, #04924A 100%)',
    styleKey: 'wechat',
    heroTitle: '微信授权登录',
    heroSubtitle: '使用微信账号一键登录',
    loginButtonText: '允许微信登录',
    skipButtonText: '暂不登录',
    sheetTitle: '微信授权',
    sheetSubtitle: '将获取你的微信昵称与头像',
    securityBadgeText: '微信安全',
    privacyNoteText: '仅获取必要信息，不会读取你的聊天记录',
    showDecorOrbs: false,
    showSecurityBadge: true,
    showBackButton: false,
  },
]

const TEMPLATE_MAP = new Map(LOGIN_TEMPLATES.map((t) => [t.key, t]))

export function getLoginTemplate(key?: string | null): LoginTemplatePreset | undefined {
  if (!key) return undefined
  return TEMPLATE_MAP.get(String(key).trim().toLowerCase())
}

/** 由模板 key 构造一份完整 LoginPageConfig */
export function buildLoginTemplateConfig(key: string): LoginPageConfig {
  const tpl = getLoginTemplate(key) || LOGIN_TEMPLATES[0]
  const cfg: Record<string, unknown> = {
    heroTitle: tpl.heroTitle,
    heroSubtitle: tpl.heroSubtitle,
    loginButtonText: tpl.loginButtonText,
    skipButtonText: tpl.skipButtonText,
    sheetTitle: tpl.sheetTitle,
    sheetSubtitle: tpl.sheetSubtitle,
    securityBadgeText: tpl.securityBadgeText,
    privacyNoteText: tpl.privacyNoteText,
    showDecorOrbs: tpl.showDecorOrbs,
    showSecurityBadge: tpl.showSecurityBadge,
    showBackButton: tpl.showBackButton,
  }
  applyLoginPageStylePreset(cfg, tpl.styleKey)
  return cfg as unknown as LoginPageConfig
}

/** 由已保存配置反推模板 key（用于显示「使用中」徽标） */
export function resolveLoginTemplateKey(cfg?: Partial<LoginPageConfig> | null): string {
  if (!cfg) return ''
  const ts = String(cfg.templateStyle || '').trim().toLowerCase()
  if (ts && TEMPLATE_MAP.has(ts)) return ts
  // 显式值匹配不上时，靠组合特征兜底匹配
  const hero = String(cfg.heroTitle || '')
  for (const tpl of LOGIN_TEMPLATES) {
    if (tpl.heroTitle === hero && tpl.loginButtonText === cfg.loginButtonText) return tpl.key
  }
  return ''
}

/** 当前生效的模板名（无匹配时给「自定义组合」） */
export function resolveLoginTemplateName(cfg?: Partial<LoginPageConfig> | null): string {
  const key = resolveLoginTemplateKey(cfg)
  if (key) return getLoginTemplate(key)?.name || key
  if (cfg && (cfg.heroTitle || cfg.loginButtonText)) return '自定义组合'
  return '默认配置'
}
