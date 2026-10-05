/**
 * 「我的」页模板库
 *
 * 设计口径（与 types/miniapp.ts 的分工）：
 * - **皮肤（外观）**：warm / basic / member 三套，由 applyMineStylePreset 负责写入主题色。
 * - **模板（组合）**：一套 = 默认皮肤 + 文案 + 开关 + 菜单组合。用户先挑模板，再单独微调皮肤。
 * - 菜单路径必须真实存在于 miniapp（对照 pages/mine/mine.js 的 onGoXxx 跳转），
 *   否则小程序端会 navigateTo 失败。新增种子前请先确认路由存在。
 */

import {
  DEFAULT_ORDER_QUICK_ACCESS,
  DEFAULT_USER_PROFILE,
} from '@/types/miniapp'
import type { MineMenuItem, MinePageConfig, MineStyleKey } from '@/types/miniapp'

/** 菜单种子：后台可选的最小单位 */
export interface MineMenuSeed {
  key: string
  icon: string
  title: string
  url: string
  needLogin?: boolean
  group: string
}

/**
 * 可用菜单库 —— 全部为小程序端已存在的能力，
 * needLogin 决定点击前是否要求登录。
 */
export const MINE_MENU_LIBRARY: MineMenuSeed[] = [
  { key: 'ask', icon: 'line:check', title: '我的提问与打卡', url: '/pkg-content/question-ask/question-ask', needLogin: true, group: '内容与订单' },
  { key: 'contribute', icon: 'line:pencil', title: '成为创作者', url: '/pkg-content/contribute/contribute', needLogin: false, group: '内容与订单' },
  { key: 'orders', icon: 'line:document', title: '我的订单', url: '/pkg-trade/order-list/order-list', needLogin: true, group: '内容与订单' },
  { key: 'library', icon: 'line:books', title: '我的资料库', url: '/pkg-content/resources/resources', needLogin: false, group: '内容与订单' },
  { key: 'invoice', icon: 'line:clipboard', title: '发票管理', url: '/pkg-trade/order-list/order-list', needLogin: true, group: '内容与订单' },
  { key: 'coupons', icon: 'line:coupon', title: '优惠券', url: '/pkg-user/coupon-list/coupon-list', needLogin: true, group: '内容与订单' },
  { key: 'buyed', icon: 'line:bag', title: '已购内容', url: '/pkg-user/my-library/my-library', needLogin: true, group: '内容与订单' },
  { key: 'favorites', icon: 'line:star', title: '我的收藏', url: '/pkg-user/favorites/favorites', needLogin: true, group: '内容与订单' },
  { key: 'history', icon: 'line:list', title: '浏览历史', url: '/pkg-content/content-list/content-list', needLogin: false, group: '内容与订单' },
  { key: 'notice', icon: 'line:bell', title: '消息通知', url: '/pkg-user/notices/notices', needLogin: true, group: '内容与订单' },
  { key: 'member', icon: 'line:crown', title: '会员中心', url: '/pkg-user/member-center/member-center', needLogin: true, group: '会员与服务' },
  { key: 'planet', icon: 'line:sun', title: '我的星球', url: '/pages/planet/planet', needLogin: false, group: '会员与服务' },
  { key: 'templates', icon: 'line:grid', title: '整店模版', url: '/pkg-templates/list/list', needLogin: false, group: '会员与服务' },
  { key: 'join', icon: 'line:user', title: '加入读者群', url: '/pkg-content/join/join', needLogin: false, group: '会员与服务' },
  { key: 'service', icon: 'line:chat', title: '联系客服', url: '/pkg-user/service-chat/service-chat', needLogin: false, group: '会员与服务' },
  { key: 'feedback', icon: 'line:mail', title: '意见反馈', url: '/pkg-user/feedback/feedback', needLogin: false, group: '会员与服务' },
  { key: 'invite', icon: 'line:share', title: '邀请好友', url: '/pkg-content/share/share', needLogin: false, group: '会员与服务' },
  { key: 'settings', icon: 'line:gear', title: '设置', url: '/pkg-user/settings/settings', needLogin: false, group: '会员与服务' },
]

const MENU_SEED_MAP = new Map(MINE_MENU_LIBRARY.map((s) => [s.key, s]))

/** 模板元信息 + 组合定义 */
export interface MineTemplatePreset {
  key: string
  name: string
  desc: string
  /** 适用业态，用于卡片副标 */
  scene: string
  /** 卡片封面渐变 */
  cover: string
  styleKey: MineStyleKey
  loginTitle: string
  loginSubtitle: string
  loginButtonText: string
  memberCardTitle: string
  showMemberCard: boolean
  showDecorBackground: boolean
  showMenuIcons: boolean
  showOrderTabs: boolean
  menuKeys: string[]
}

export const MINE_TEMPLATES: MineTemplatePreset[] = [
  {
    key: 'warm',
    name: '暖阁纸感',
    desc: '默认款，菜单最全',
    scene: '内容社群 · 知识付费',
    cover: 'linear-gradient(145deg, #f6ddbf 0%, #d97706 48%, #7c2d12 100%)',
    styleKey: 'warm',
    loginTitle: '点击登录，同步阅读偏好',
    loginSubtitle: '收藏文章、接收内容更新提醒',
    loginButtonText: '登录',
    memberCardTitle: '会员中心',
    showMemberCard: true,
    showDecorBackground: true,
    showMenuIcons: true,
    showOrderTabs: true,
    menuKeys: ['ask', 'contribute', 'orders', 'library', 'invoice', 'coupons', 'invite', 'templates', 'join', 'service', 'feedback', 'settings'],
  },
  {
    key: 'basic',
    name: '经典蓝',
    desc: '通用清爽，少而准',
    scene: '商务展示 · 品牌官网',
    cover: 'linear-gradient(145deg, #7BA3F7 0%, #5B7FEA 55%, #6B6FE8 100%)',
    styleKey: 'basic',
    loginTitle: '点击登录',
    loginSubtitle: '登录后查看订单、优惠券与收藏',
    loginButtonText: '立即登录',
    memberCardTitle: '我的会员',
    showMemberCard: true,
    showDecorBackground: true,
    showMenuIcons: true,
    showOrderTabs: true,
    menuKeys: ['orders', 'coupons', 'history', 'favorites', 'service', 'feedback', 'settings'],
  },
  {
    key: 'member',
    name: '会员铂金',
    desc: '会员权益优先展示',
    scene: '会员制 · 订阅服务',
    cover: 'linear-gradient(145deg, #E8EEF8 0%, #C5D8F0 55%, #9BBFE8 100%)',
    styleKey: 'member',
    loginTitle: '登录查看我的会员权益',
    loginSubtitle: '专属折扣 · 积分加速 · 优先预约',
    loginButtonText: '登录 / 注册',
    memberCardTitle: '我的会员卡',
    showMemberCard: true,
    showDecorBackground: true,
    showMenuIcons: true,
    showOrderTabs: true,
    menuKeys: ['member', 'planet', 'orders', 'buyed', 'coupons', 'invoice', 'service', 'settings'],
  },
  {
    key: 'commerce',
    name: '交易版',
    desc: '订单与售后优先',
    scene: '电商商城 · 实物/虚拟商品',
    cover: 'linear-gradient(145deg, #FFE9D6 0%, #E8833A 55%, #B8490F 100%)',
    styleKey: 'basic',
    loginTitle: '登录后查看订单与物流',
    loginSubtitle: '订单状态、优惠券、发票一站管理',
    loginButtonText: '登录',
    memberCardTitle: '会员中心',
    showMemberCard: true,
    showDecorBackground: true,
    showMenuIcons: true,
    showOrderTabs: true,
    menuKeys: ['orders', 'invoice', 'coupons', 'buyed', 'favorites', 'service', 'feedback', 'settings'],
  },
  {
    key: 'creator',
    name: '创作者版',
    desc: '产出与互动居中',
    scene: 'UGC 社区 · 达人孵化',
    cover: 'linear-gradient(145deg, #E6DEFF 0%, #8B7BE8 55%, #4B3AA8 100%)',
    styleKey: 'warm',
    loginTitle: '登录后同步创作数据',
    loginSubtitle: '查看投稿、资料与粉丝互动',
    loginButtonText: '登录',
    memberCardTitle: '创作者中心',
    showMemberCard: true,
    showDecorBackground: true,
    showMenuIcons: true,
    showOrderTabs: false,
    menuKeys: ['ask', 'contribute', 'library', 'history', 'notice', 'invite', 'feedback', 'settings'],
  },
  {
    key: 'minimal',
    name: '极简版',
    desc: '去装饰，只留必要项',
    scene: '工具型 · 低频入口',
    cover: 'linear-gradient(145deg, #F5F6F8 0%, #D9DDE6 55%, #A8B0C0 100%)',
    styleKey: 'basic',
    loginTitle: '点击登录',
    loginSubtitle: '登录后同步数据',
    loginButtonText: '登录',
    memberCardTitle: '会员',
    showMemberCard: false,
    showDecorBackground: false,
    showMenuIcons: false,
    showOrderTabs: false,
    menuKeys: ['favorites', 'history', 'orders', 'service', 'settings'],
  },
]

export function getMineTemplate(key: string): MineTemplatePreset | undefined {
  return MINE_TEMPLATES.find((t) => t.key === key)
}

/** 按模板定义生成完整 mineConfig（深拷贝，避免多套模板共享同一份菜单对象） */
export function buildTemplateConfig(key: string): MinePageConfig {
  const tpl = getMineTemplate(key) || MINE_TEMPLATES[0]
  const seeds = tpl.menuKeys
    .map((k) => MENU_SEED_MAP.get(k))
    .filter((s): s is MineMenuSeed => !!s)
  return {
    loginTitle: tpl.loginTitle,
    loginSubtitle: tpl.loginSubtitle,
    loginButtonText: tpl.loginButtonText,
    memberCardTitle: tpl.memberCardTitle,
    previewNickname: '微信用户',
    previewAvatar: '',
    previewPhone: '',
    previewEmail: '',
    showMenuIcons: tpl.showMenuIcons,
    showDecorBackground: tpl.showDecorBackground,
    showMemberCard: tpl.showMemberCard,
    templateStyle: tpl.styleKey,
    style: 'gradient',
    menuItems: seeds.map((s, i) => ({
      id: `mine-${i + 1}`,
      icon: s.icon,
      title: s.title,
      url: s.url,
      needLogin: s.needLogin === true,
      enabled: true,
      group: s.group,
    })),
    orderQuickAccess: {
      ...DEFAULT_ORDER_QUICK_ACCESS,
      showOrderTabs: tpl.showOrderTabs,
      tabLabels: { ...DEFAULT_ORDER_QUICK_ACCESS.tabLabels },
    },
    userProfile: { ...DEFAULT_USER_PROFILE },
  }
}

/** 菜单种子 → 菜单项（供「添加菜单」按库插入） */
export function seedToMenuItem(seed: MineMenuSeed, index: number): MineMenuItem {
  return {
    id: `mine-${Date.now()}-${index}`,
    icon: seed.icon,
    title: seed.title,
    url: seed.url,
    needLogin: seed.needLogin === true,
    enabled: true,
    group: seed.group,
  }
}

/**
 * 反推当前配置属于哪套模板（按菜单标题序列签名匹配）。
 * 用户在模板之上改过菜单/文案时标签会消失，属预期行为。
 */
export function resolveTemplateKey(mine?: Pick<MinePageConfig, 'menuItems'> | null): string {
  const signature = (mine?.menuItems || [])
    .filter((m) => m.enabled)
    .map((m) => m.title)
    .join('|')
  if (!signature) return ''
  for (const tpl of MINE_TEMPLATES) {
    const tplSignature = tpl.menuKeys
      .map((k) => MENU_SEED_MAP.get(k)?.title)
      .filter(Boolean)
      .join('|')
    if (tplSignature === signature) return tpl.key
  }
  return ''
}
