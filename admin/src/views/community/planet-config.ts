/**
 * 社区模块共享逻辑（/community/*）
 * 星球配置存于 system_config planetConfig.communities，后端 parseCommunities 认：
 * id / title / subtitle / cover / emoji / intro / ctaText / joinHint / highlights
 * / enabled / primary / sortOrder —— 写回时必须用这套键，
 * 不要再用 name/sub/btn/on/main（后端不识别，改动会丢）。
 */
import { get, put } from '@/api/request'

export const COMMUNITY_TONES = ['#F3D9A4', '#FCEBDD', '#E6EEFA', '#E3F3EA', '#EFE6DA', '#F3DDE6']

export interface CommCard {
  id: string
  name: string
  sub?: string
  intro?: string
  cover?: string
  emoji?: string
  btn?: string
  /** 展示中（enabled） */
  on: boolean
  /** 主社区（primary） */
  main: boolean
  memberCount?: number
  raw?: Record<string, any>
}

export async function fetchPlanetConfig(): Promise<any> {
  const res: any = await get('/api/v1/admin/planet/config')
  return res?.data ?? res ?? {}
}

export async function putPlanetConfig(payload: any): Promise<void> {
  await put('/api/v1/admin/planet/config', payload)
}

export function normalizeCommunities(cfg: any): CommCard[] {
  const list = cfg?.communities || cfg?.planets || cfg?.items
  if (Array.isArray(list) && list.length) {
    return list.map((c: any, i: number) => ({
      id: String(c.id || c.planetId || `c${i}`),
      name: c.title || c.name || '',
      sub: c.subtitle || c.sub || '',
      intro: c.intro || c.description || '',
      cover: c.cover || c.coverColor || COMMUNITY_TONES[i % COMMUNITY_TONES.length],
      emoji: c.emoji || '🪐',
      btn: c.ctaText || c.btn || '加入星球',
      on: c.enabled !== false && c.on !== false && c.status !== 0,
      main: !!(c.primary || c.main || c.isMain || i === 0),
      memberCount: c.memberCount,
      raw: c,
    }))
  }
  // 兼容单星球配置
  if (cfg && (cfg.title || cfg.name || cfg.planetName)) {
    return [{
      id: String(cfg.planetId || cfg.id || 'main'),
      name: cfg.title || cfg.name || cfg.planetName || '主星球',
      sub: cfg.subtitle || cfg.sub || '',
      intro: cfg.intro || cfg.description || '',
      cover: cfg.cover || COMMUNITY_TONES[0],
      emoji: cfg.emoji || '🪐',
      btn: cfg.ctaText || cfg.btn || '加入星球',
      on: true,
      main: true,
      raw: cfg,
    }]
  }
  return []
}

/** CommCard → 配置数组条目（保留 raw 里的 feedUrl/introUrl/highlights 等字段） */
export function commToConfigEntry(c: CommCard): Record<string, any> {
  return {
    ...(c.raw || {}),
    id: c.id,
    title: c.name,
    subtitle: c.sub || '',
    intro: c.intro || '',
    cover: c.cover || '',
    emoji: c.emoji || '🪐',
    ctaText: c.btn || '加入星球',
    enabled: c.on,
    primary: c.main,
  }
}

/** 组装保存 payload：只替换 communities，其余配置原样带回 */
export function buildPlanetSavePayload(config: any, cards: CommCard[]): Record<string, any> {
  return {
    ...config,
    communities: cards.map(commToConfigEntry),
  }
}

export function newCommunityId(): string {
  return `c${Date.now().toString(36)}`
}

/** 判断是否今日 */
export function isToday(s?: string): boolean {
  if (!s) return false
  const d = new Date(s.length === 10 ? s + 'T00:00:00' : s)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

/** 判断是否本周（最近 7 天） */
export function isThisWeek(s?: string): boolean {
  if (!s) return false
  const t = new Date(s.length === 10 ? s + 'T00:00:00' : s).getTime()
  return Date.now() - t < 7 * 864e5
}

/** 社区卡片聚合统计 */
export interface CommStats {
  postCount: number
  essenceCount: number
  todayCount: number
  weekCount: number
}

export function statsFor(posts: { communityId?: string; createTime?: string; essence?: number | boolean }[], id: string): CommStats {
  const mine = posts.filter((p) => (p.communityId || 'main') === id)
  return {
    postCount: mine.length,
    essenceCount: mine.filter((p) => p.essence).length,
    todayCount: mine.filter((p) => isToday(p.createTime)).length,
    weekCount: mine.filter((p) => isThisWeek(p.createTime)).length,
  }
}

/** 话题聚合（从 posts 反算热门话题） */
export interface TopicStat {
  topic: string
  count: number
  likes: number
  comments: number
  lastActive?: string
}

export function aggregateTopics(posts: { topic?: string; likes?: number; comments?: number; createTime?: string }[]): TopicStat[] {
  const map = new Map<string, TopicStat>()
  for (const p of posts) {
    const t = (p.topic || '').trim()
    if (!t) continue
    const cur = map.get(t) || { topic: t, count: 0, likes: 0, comments: 0, lastActive: undefined }
    cur.count += 1
    cur.likes += Number(p.likes || 0)
    cur.comments += Number(p.comments || 0)
    if (p.createTime && (!cur.lastActive || p.createTime > cur.lastActive)) cur.lastActive = p.createTime
    map.set(t, cur)
  }
  return Array.from(map.values()).sort((a, b) => (b.likes + b.comments * 2) - (a.likes + a.comments * 2))
}

export interface Highlight {
  icon?: string
  title: string
  desc?: string
}

/** 从 raw 里取 highlights（后端 parseHighlights 认 List<Map>） */
export function readHighlights(raw: any): Highlight[] {
  const v = raw?.highlights
  if (!Array.isArray(v)) return []
  return v.map((it: any) => ({
    icon: String(it?.icon || it?.emoji || '✦'),
    title: String(it?.title || ''),
    desc: String(it?.desc || it?.description || ''),
  })).filter((it) => it.title)
}

export const HIGHLIGHT_ICON_PRESETS = ['✦', '✪', '⭐', '🔥', '💡', '🎯', '📚', '🎁', '🚀', '💎', '✅', '🌟']

/* ─────────────────────────────────────────────
 * 发布身份（预设身份）—— 用于运营以指定身份发帖填充前期内容
 * 存 localStorage（key: community_personas），不污染后端数据。
 * 发帖时 persona.name 映射到 createCommunityPost.authorName。
 * ───────────────────────────────────────────── */
export interface Persona {
  id: string
  name: string
  /** 头像底色（不填则取 COMMUNITY_TONES 循环） */
  color?: string
  /** 身份标签：星主 / 运营 / 嘉宾 / 资深会员 / 普通会员 / 匿名球友 等 */
  tag?: string
  /** 一句话简介 */
  desc?: string
}

const PERSONAS_KEY = 'community_personas'

export const DEFAULT_PERSONAS: Persona[] = [
  { id: 'p_star', name: '星主·墨太白', tag: '星主', color: '#C08E6E', desc: '社区主理人，发布官方公告与精选导读' },
  { id: 'p_ops', name: '运营小助手', tag: '运营', color: '#5B8FF9', desc: '社区运营，发布活动通知与打卡引导' },
  { id: 'p_guest', name: '嘉宾·跨境老兵', tag: '嘉宾', color: '#EF9F27', desc: '受邀分享的行业资深嘉宾' },
  { id: 'p_senior', name: '资深球友·阿May', tag: '资深会员', color: '#5AD8A6', desc: '活跃老会员，常发起话题讨论' },
  { id: 'p_member', name: '球友·小明', tag: '普通会员', color: '#F08BB4', desc: '普通会员视角提问与分享' },
  { id: 'p_anon', name: '匿名球友', tag: '匿名', color: '#999999', desc: '匿名身份，用于匿名提问场景' },
]

export const PERSONA_TAG_OPTIONS = ['星主', '运营', '嘉宾', '资深会员', '普通会员', 'VIP会员', '匿名', '官方']

/** 读取本地预设身份列表（无则初始化默认列表并写回） */
export function loadPersonas(): Persona[] {
  try {
    const raw = localStorage.getItem(PERSONAS_KEY)
    if (!raw) {
      savePersonas(DEFAULT_PERSONAS)
      return [...DEFAULT_PERSONAS]
    }
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr) || !arr.length) return [...DEFAULT_PERSONAS]
    return arr
  } catch {
    return [...DEFAULT_PERSONAS]
  }
}

/** 保存预设身份列表到 localStorage */
export function savePersonas(list: Persona[]): void {
  try { localStorage.setItem(PERSONAS_KEY, JSON.stringify(list)) } catch { /* 隐私模式忽略 */ }
}

export function newPersonaId(): string {
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
}

/** 根据 authorName 反查 persona（用于帖子卡片显示标签等） */
export function matchPersonaByName(list: Persona[], name?: string): Persona | undefined {
  if (!name) return undefined
  return list.find((p) => p.name === name)
}

/* ─────────────────────────────────────────────
 * 社区资深会员体系（Membership Tier System）
 * 纯前端本地存储，按社区 ID 隔离。
 * 后端 MembershipPlan 是正式付费档 CRUD（scope=planet），
 * 这里是多档递进体系配置（体验/普通/资深/VIP），含价格周期 + 结构化资源权益。
 * ───────────────────────────────────────────── */

/** 资源权益类型（12 类可勾选） */
export interface ResourceRight {
  key: string
  label: string
  icon: string
  desc: string
}

export const RESOURCE_RIGHTS: ResourceRight[] = [
  { key: 'library', label: '资料库访问', icon: '📚', desc: '查看社区全部资料文件' },
  { key: 'replay', label: '直播回放', icon: '🎥', desc: '观看往期直播录像' },
  { key: 'exclusive', label: '专属内容', icon: '📝', desc: '会员专属文章/专栏' },
  { key: 'consult', label: '1v1 咨询', icon: '💬', desc: '每月 1 次一对一咨询' },
  { key: 'discount', label: '商城折扣', icon: '🏷', desc: '商城购物享折扣' },
  { key: 'gift', label: '生日礼包', icon: '🎁', desc: '生日当月领取礼包' },
  { key: 'badge', label: '专属角标', icon: '⭐', desc: '展示会员身份角标' },
  { key: 'daily', label: '每日早报', icon: '📅', desc: '每日推送行业早报' },
  { key: 'priority', label: '优先答疑', icon: '🔥', desc: '提问优先回复' },
  { key: 'growth', label: '成长加速', icon: '🏆', desc: '积分/成长值加倍' },
  { key: 'offline', label: '线下活动', icon: '🤝', desc: '参加线下沙龙/聚会' },
  { key: 'cert', label: '联合认证', icon: '🎖', desc: '颁发联合认证证书' },
]

/** 价格周期 */
export interface PriceTier {
  period: 'month' | 'quarter' | 'year' | 'lifetime' | 'free'
  label: string
  price: number
  originalPrice?: number
}

/** 会员档（资深会员体系） */
export interface MembershipTier {
  id: string
  /** 档位名称：体验会员/普通会员/资深会员/VIP 会员 */
  name: string
  /** 档位等级 1-5，数字越大等级越高 */
  level: number
  /** 主题色 */
  color: string
  /** 一句话描述 */
  desc: string
  /** 是否推荐档（前端高亮） */
  recommended?: boolean
  /** 价格周期列表 */
  prices: PriceTier[]
  /** 已勾选的资源权益 key 列表 */
  rights: string[]
  /** 自定义权益文案（额外补充，非结构化） */
  customRights?: string[]
  /** 是否启用 */
  enabled: boolean
  /** 排序 */
  sortOrder: number
}

export const TIER_COLORS = ['#E6F1FB', '#EAF3DE', '#FAEEDA', '#FBEAF0', '#EEEDFE']

export const DEFAULT_TIERS: MembershipTier[] = [
  {
    id: 'tier_trial', name: '体验会员', level: 1, color: '#E6F1FB',
    desc: '入门尝鲜，7 天免费体验社区基础功能',
    prices: [{ period: 'free', label: '免费', price: 0 }],
    rights: ['library', 'daily'],
    enabled: true, sortOrder: 1,
  },
  {
    id: 'tier_normal', name: '普通会员', level: 2, color: '#EAF3DE',
    desc: '日常参与，解锁社区核心资源',
    prices: [
      { period: 'quarter', label: '季度', price: 99, originalPrice: 120 },
      { period: 'year', label: '年度', price: 299, originalPrice: 396 },
    ],
    rights: ['library', 'replay', 'exclusive', 'daily', 'priority', 'growth'],
    recommended: true,
    enabled: true, sortOrder: 2,
  },
  {
    id: 'tier_senior', name: '资深会员', level: 3, color: '#FAEEDA',
    desc: '深度共建，享专属角标与全部资源',
    prices: [
      { period: 'quarter', label: '季度', price: 199, originalPrice: 240 },
      { period: 'year', label: '年度', price: 599, originalPrice: 796 },
    ],
    rights: ['library', 'replay', 'exclusive', 'consult', 'discount', 'gift', 'badge', 'daily', 'priority'],
    enabled: true, sortOrder: 3,
  },
  {
    id: 'tier_vip', name: 'VIP 会员', level: 4, color: '#FBEAF0',
    desc: '尊享专属，1v1 咨询 + 全资源 + 线下活动',
    prices: [
      { period: 'year', label: '年度', price: 999, originalPrice: 1200 },
      { period: 'lifetime', label: '终身', price: 2999 },
    ],
    rights: ['library', 'replay', 'exclusive', 'consult', 'discount', 'gift', 'badge', 'daily', 'priority', 'growth', 'offline', 'cert'],
    enabled: true, sortOrder: 4,
  },
]

const TIERS_KEY_PREFIX = 'community_tiers_'

function tiersKey(communityId: string): string {
  return `${TIERS_KEY_PREFIX}${communityId}`
}

/** 读取指定社区的会员体系配置（无则初始化默认四档） */
export function loadMembershipTiers(communityId: string): MembershipTier[] {
  try {
    const raw = localStorage.getItem(tiersKey(communityId))
    if (!raw) {
      saveMembershipTiers(communityId, DEFAULT_TIERS)
      return JSON.parse(JSON.stringify(DEFAULT_TIERS))
    }
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr) || !arr.length) return JSON.parse(JSON.stringify(DEFAULT_TIERS))
    return arr
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_TIERS))
  }
}

/** 保存会员体系配置到本地存储 */
export function saveMembershipTiers(communityId: string, tiers: MembershipTier[]): void {
  try { localStorage.setItem(tiersKey(communityId), JSON.stringify(tiers)) } catch { /* ignore */ }
}

export function newTierId(): string {
  return `tier_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
}

/** 根据 rights key 数组反查资源权益详情 */
export function resolveRights(keys: string[]): ResourceRight[] {
  return keys.map((k) => RESOURCE_RIGHTS.find((r) => r.key === k)).filter(Boolean) as ResourceRight[]
}

/** 统计某档已勾选权益数 */
export function rightsCount(tier: MembershipTier): number {
  return tier.rights.length + (tier.customRights?.length || 0)
}
