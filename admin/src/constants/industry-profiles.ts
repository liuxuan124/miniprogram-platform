/**
 * 业态包（Industry Profile）— 先不做多租户 UI 也能卖：
 * 一份 JSON = plugins + glossary + tab + theme + 展示名 + 组件白名单 + Agent 角色
 */
import type { IndustryCode } from '@/types/page'

export interface IndustryProfile {
  code: string
  name: string
  plugins: Record<string, boolean>
  glossary: Record<string, string>
  displayNames: {
    planet: string
    member: string
    shop: string
  }
  theme: {
    primaryColor: string
    tabBarActiveColor: string
    pageBgColor: string
  }
  tabbar: Array<{ text: string; tabRoute: string }>
  /** 空数组 = 不限制（全量）；有值则只允许这些组件 type */
  componentAllowlist: string[]
  /** 允许的 Agent 角色 key */
  agentRoles: string[]
  /** 侧栏 featureModule 白名单；空 = 跟 plugins */
  sidebarModules?: string[]
}

const BASE_LAYOUT = [
  'banner', 'nav', 'image', 'search', 'rich_text', 'section_title', 'divider', 'spacer',
  'float_button', 'brand_header', 'brand_intro', 'container',
]

/** 暖阁专用积木：仅内容 IP 业态默认放开，避免其它租户组件库噪音 */
const WARM_LAYOUT = [
  'warm_greet', 'warm_authors', 'warm_feature', 'warm_columns', 'warm_planet_rec', 'warm_feed',
  'warm_home', 'warm_discover', 'warm_planet', 'warm_shop', 'warm_mine',
]

export const INDUSTRY_PROFILES: Record<string, IndustryProfile> = {
  content_ip: {
    code: 'content_ip',
    name: '内容 IP',
    plugins: {
      product: true, member: true, planet: true, order: true, content: true, comment: true,
      activity: true, form: false, qa: true, appointment: false, coupon: false, agent: true,
    },
    glossary: {
      content: '内容', product: '商城', file: '资料库', knowledge: 'AI 语料库',
      planet: '星球', member: '会员',
    },
    displayNames: { planet: '创作者星球', member: '会员中心', shop: '商城' },
    theme: { primaryColor: '#C2410C', tabBarActiveColor: '#C2410C', pageBgColor: '#FDF6EC' },
    tabbar: [
      { text: '首页', tabRoute: '/pages/index/index' },
      { text: '发现', tabRoute: '/pages/discover/discover' },
      { text: '星球', tabRoute: '/pages/planet/planet' },
      { text: '商城', tabRoute: '/pages/shop/shop' },
      { text: '我的', tabRoute: '/pages/mine/mine' },
    ],
    componentAllowlist: [
      ...BASE_LAYOUT,
      ...WARM_LAYOUT,
      'article_list', 'article_feed', 'note_feed', 'moments_feed', 'hot_news', 'content_tabs',
      'planet_hero', 'planet_topics', 'planet_feed',
      'product_list', 'member_card', 'join_group', 'ai_entry', 'image_cube', 'video', 'float_button',
    ],
    agentRoles: ['service', 'content_ops'],
  },
  knowledge_pay: {
    code: 'knowledge_pay',
    name: '知识付费',
    plugins: {
      product: true, member: true, planet: true, order: true, content: true, comment: true,
      activity: false, form: false, qa: true, appointment: true, coupon: true, agent: true,
    },
    glossary: {
      content: '课程内容', product: '课程商品', file: '资料库', knowledge: 'AI 语料库',
      planet: '学员社群', member: '学员会员',
    },
    displayNames: { planet: '学员星球', member: '学员中心', shop: '课程商城' },
    theme: { primaryColor: '#0d9488', tabBarActiveColor: '#0d9488', pageBgColor: '#F0FDFA' },
    tabbar: [
      { text: '首页', tabRoute: '/pages/index/index' },
      { text: '发现', tabRoute: '/pages/discover/discover' },
      { text: '社群', tabRoute: '/pages/planet/planet' },
      { text: '课程', tabRoute: '/pages/shop/shop' },
      { text: '我的', tabRoute: '/pages/mine/mine' },
    ],
    componentAllowlist: [
      ...BASE_LAYOUT,
      'article_list', 'article_feed', 'note_feed', 'product_list', 'flash_sale',
      'planet_hero', 'planet_topics', 'planet_feed',
      'member_card', 'coupon', 'appointment_service', 'join_group', 'ai_entry', 'video', 'float_button',
    ],
    agentRoles: ['service', 'content_ops'],
  },
  local_life: {
    code: 'local_life',
    name: '本地生活',
    plugins: {
      product: true, member: true, planet: false, order: true, content: true, comment: true,
      activity: true, form: true, qa: false, appointment: true, coupon: true, agent: true,
    },
    glossary: {
      content: '门店动态', product: '到店商品', file: '门店资料', knowledge: 'AI 语料库',
      planet: '社群', member: '会员',
    },
    displayNames: { planet: '社群', member: '会员卡', shop: '到店优选' },
    theme: { primaryColor: '#ea580c', tabBarActiveColor: '#ea580c', pageBgColor: '#FFF7ED' },
    tabbar: [
      { text: '首页', tabRoute: '/pages/index/index' },
      { text: '发现', tabRoute: '/pages/discover/discover' },
      { text: '商城', tabRoute: '/pages/shop/shop' },
      { text: '我的', tabRoute: '/pages/mine/mine' },
    ],
    componentAllowlist: [
      ...BASE_LAYOUT,
      'product_list', 'flash_sale', 'coupon', 'appointment_service', 'activity_entry', 'activity_list',
      'contact_info', 'form_entry', 'member_card', 'countdown', 'notice_bar', 'category_nav',
    ],
    agentRoles: ['service'],
  },
  education: {
    code: 'education',
    name: '教育培训',
    plugins: {
      product: true, member: true, planet: false, order: true, content: true, comment: true,
      activity: true, form: true, qa: true, appointment: true, coupon: false, agent: true,
    },
    glossary: {
      content: '课程资讯', product: '课程', file: '学习资料', knowledge: 'AI 语料库',
      planet: '班级', member: '学员',
    },
    displayNames: { planet: '班级群', member: '学员中心', shop: '选课中心' },
    theme: { primaryColor: '#2563eb', tabBarActiveColor: '#2563eb', pageBgColor: '#EFF6FF' },
    tabbar: [
      { text: '首页', tabRoute: '/pages/index/index' },
      { text: '资讯', tabRoute: '/pages/discover/discover' },
      { text: '选课', tabRoute: '/pages/shop/shop' },
      { text: '我的', tabRoute: '/pages/mine/mine' },
    ],
    componentAllowlist: [
      ...BASE_LAYOUT,
      'article_list', 'article_feed', 'product_list', 'video', 'appointment_service',
      'form_entry', 'member_card', 'activity_list', 'ai_entry', 'certificate',
    ],
    agentRoles: ['service', 'content_ops'],
  },
}

/** 零售等业态：偏商城，组件更全 */
export function getRetailishProfile(code: string, name: string, primary: string): IndustryProfile {
  return {
    code,
    name,
    plugins: {
      product: true, member: true, planet: false, order: true, content: true, comment: true,
      activity: true, form: false, qa: false, appointment: false, coupon: true, agent: true,
    },
    glossary: {
      content: '资讯', product: '商品', file: '资料', knowledge: 'AI 语料库',
      planet: '社群', member: '会员',
    },
    displayNames: { planet: '社群', member: '会员中心', shop: '商城' },
    theme: { primaryColor: primary, tabBarActiveColor: primary, pageBgColor: '#FFFFFF' },
    tabbar: [
      { text: '首页', tabRoute: '/pages/index/index' },
      { text: '发现', tabRoute: '/pages/discover/discover' },
      { text: '商城', tabRoute: '/pages/shop/shop' },
      { text: '我的', tabRoute: '/pages/mine/mine' },
    ],
    componentAllowlist: [], // 空 = 全量（仅受 plugins 约束）
    agentRoles: ['service', 'content_ops'],
  }
}

const RETAIL_FALLBACKS: Record<string, IndustryProfile> = {
  clothing: getRetailishProfile('clothing', '服装鞋包', '#e11d48'),
  food: getRetailishProfile('food', '食品饮料', '#f97316'),
  digital: getRetailishProfile('digital', '数码家电', '#2563eb'),
  home: getRetailishProfile('home', '家居日用', '#78716c'),
  beauty: getRetailishProfile('beauty', '美妆护肤', '#d946ef'),
  sports: getRetailishProfile('sports', '运动户外', '#16a34a'),
  travel: getRetailishProfile('travel', '旅游出行', '#0ea5e9'),
  furniture: getRetailishProfile('furniture', '家装建材', '#a16207'),
  medical: getRetailishProfile('medical', '医疗健康', '#0891b2'),
  wedding: getRetailishProfile('wedding', '婚庆服务', '#f43f5e'),
  pet: getRetailishProfile('pet', '宠物生活', '#f59e0b'),
}

export function resolveIndustryProfile(code?: string | null): IndustryProfile {
  const key = String(code || 'content_ip')
  return INDUSTRY_PROFILES[key] || RETAIL_FALLBACKS[key] || INDUSTRY_PROFILES.content_ip
}

export function listIndustryProfileOptions(): Array<{ code: string; name: string }> {
  const primary = Object.values(INDUSTRY_PROFILES).map((p) => ({ code: p.code, name: p.name }))
  const retail = Object.values(RETAIL_FALLBACKS).map((p) => ({ code: p.code, name: p.name }))
  return [...primary, ...retail]
}

export type { IndustryCode }
