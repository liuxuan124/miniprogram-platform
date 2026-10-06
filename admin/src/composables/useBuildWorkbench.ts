/**
 * 搭建工作流 · 环节状态机（单一真相源）
 *
 * 为什么要有这个文件：
 * 工作台、品牌信息、系统配置、导航配置、预览检查五个页面都要回答同一个问题——
 * 「这个环节到底完成了没有，还差什么，下一步点哪里」。
 * 如果每个页面各写一套判断，口径一定会漂移（同一个缺项在A页显示待处理、在B页显示已完成）。
 * 所以统一在这里算，页面只负责渲染。
 *
 * 🔴 铁律：完成状态必须来自真实配置与真实校验结果，禁止写死。
 * 每一条判定都要能指到具体的数据来源（哪个接口的哪个字段），
 * 拿不到数据就报「无法确认」，不猜、不乐观默认成「已完成」。
 */
import { computed, ref } from 'vue'
import { getMiniSite, getPendingChanges, type MiniSiteVO } from '@/api/miniSite'
import { getPublishPreflight, getLatestRelease } from '@/api/version'
import { getConfigsSilent } from '@/api/system'
import { resolvePageStatus, type MiniPageStatus } from '@/utils/pageStatus'
import { normalizeTabBarItems } from '@/utils/tabbar'
import {
  loadAllPages,
  pageKey,
  pagePathKey,
  isBuiltinShellPath,
} from '@/composables/usePageCatalog'
import { releaseNoFromSemver } from '@/utils/version-semantics'
import type { PageRecord } from '@/types/page'

/** 环节标识。与路由 path 一一对应，改路由时这里要同步。 */
export type BuildStageKey =
  | 'brand'
  | 'system'
  | 'pages'
  | 'pageConfig'
  | 'navigation'
  | 'preview'
  | 'publish'

export type StageStatus = 'done' | 'partial' | 'todo' | 'unknown'

export type StageIssue = {
  /** 阻断 = 不处理就不该发布；提醒 = 可以先发布 */
  level: 'blocking' | 'warning'
  text: string
  /** 直接修复入口。null 表示没有可跳转的处理入口 */
  action?: { label: string; to?: string; event?: string }
  /**
   * 问题来自哪个环节。判定时不必填（judgeX 不知道自己在哪个环节的上下文里），
   * 由 judgeStages 汇总时统一补上。页面用它告诉用户「这是导航环节的问题」。
   */
  stage?: string
}

export type BuildStage = {
  key: BuildStageKey
  /** 1~7 的展示序号 */
  order: number
  title: string
  /** 一句话说清这个环节管什么 */
  summary: string
  status: StageStatus
  /** 已完成的具体条目，用于卡片里逐条打勾 */
  doneItems: string[]
  issues: StageIssue[]
  /** 主操作入口 */
  entry: { label: string; to?: string; event?: string }
  /** 兜底详情（点开看依据），避免状态只有一句「已完成」而无从核对 */
  evidence: string[]
}

/** 环节顺序定义：工作台按这个顺序渲染，侧栏也按它排序 */
export const BUILD_STAGES: Array<{
  key: BuildStageKey
  order: number
  title: string
  summary: string
  to: string
  entryLabel: string
}> = [
  {
    key: 'brand',
    order: 1,
    title: '品牌信息',
    summary: '小程序名称、Logo、品牌色、默认分享信息',
    to: '/mini/workbench?tab=brand',
    entryLabel: '配置品牌信息',
  },
  {
    key: 'system',
    order: 2,
    title: '系统配置',
    summary: '登录页、我的页、功能开关、客服与协议',
    to: '/mini/workbench?tab=flags',
    entryLabel: '配置系统功能',
  },
  {
    key: 'pages',
    order: 3,
    title: '页面搭建',
    summary: '空白创建、模板创建、AI 创建',
    to: '/mini/pages',
    entryLabel: '管理页面',
  },
  {
    key: 'pageConfig',
    order: 4,
    title: '页面配置',
    summary: '标题、路径、分享信息、分组、入口到期与上下线',
    to: '/mini/pages',
    entryLabel: '配置页面',
  },
  {
    key: 'navigation',
    order: 5,
    title: '导航配置',
    summary: '底部 Tab 名称、图标、排序与页面绑定',
    to: '/mini/workbench?tab=nav',
    entryLabel: '配置导航',
  },
  {
    key: 'preview',
    order: 6,
    title: '预览检查',
    summary: '草稿预览、线上预览与发布前检查',
    to: '/mini/versions',
    entryLabel: '预览与检查',
  },
  {
    key: 'publish',
    order: 7,
    title: '发布与版本',
    summary: '保存草稿、发布配置、微信代码包与版本存档',
    to: '/mini/versions',
    entryLabel: '去发布',
  },
]

/** 原始数据快照。判定的每一项都从这里取，页面不自己再发请求。 */
export type BuildFacts = {
  site: MiniSiteVO
  pages: PageRecord[]
  /**
   * 🔴 页面列表的可信状态（2026-10-06 事故引入）。
   * 'loading' / 'error' 时 pages 可能为空，**不代表真的没有页面**，
   * 判定必须先看这个字段再下结论。
   */
  pagesStatus: 'loading' | 'ready' | 'error'
  /** 是否已拉完所有分页 */
  pagesComplete: boolean
  pageTotal: number
  pendingCount: number
  /** 后端 preflight 拿不到时为 null，不要用空数组冒充「检查通过」 */
  preflight: { canPublish?: boolean; blocking: string[]; warnings: string[] } | null
  /**
   * 🔴 5 种版本必须分开存，页面不要自己从某个字段里猜哪个是「版本」。
   * 2026-10-06 事故：把 semver 全串数字当序号（"1.12.0"→1120）、
   * 又把记录 id 当序号（可能 1200），导致四处显示四个数。
   */
  liveReleaseNo: number | null
  /** 内容版本号，形如 1.12.0 */
  liveSemver: string | null
  /** 发布记录表主键，仅用于定位记录 */
  liveReleaseRecordId: number | null
  liveReleaseAt: string | null
  /** 系统配置行（品牌/登录/我的/开关），来自 mp_system_config */
  configMap: Record<string, unknown>
  /** 关键接口是否取数失败 */
  loadErrors: string[]
}

export function emptyFacts(): BuildFacts {
  return {
    site: {},
    pages: [],
    pagesStatus: 'loading',
    pagesComplete: false,
    pageTotal: 0,
    pendingCount: 0,
    preflight: null,
    liveReleaseNo: null,
    liveSemver: null,
    liveReleaseRecordId: null,
    liveReleaseAt: null,
    configMap: {},
    loadErrors: [],
  }
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
}

function str(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v.trim()
  return String(v).trim()
}

/** 宽松转整数：拿不到就 null，绝不用 0 冒充（0 会被显示成「第 0 次」） */
function toIntLoose(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function isFilled(v: unknown): boolean {
  const s = str(v)
  return s.length > 0 && s !== '0'
}

/**
 * 把 /system/configs 的返回摊平成 { 配置键: 值 }。
 *
 * 🔴 这个接口有两种返回形状（types/system.ts:21 的 ConfigGroupData[] 与
 * types/system.ts:29 的 SystemConfigRecord[]），后端哪个都能返。
 * 只认其中一种会让另一个的判定永远落到「未读到」——所以两种都摊平。
 */
export function flattenConfigs(payload: any): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const d = payload?.data ?? payload
  const rows: any[] = Array.isArray(d) ? d : (d?.configs ? d.configs : [])
  for (const row of rows) {
    // 分组形状：{ group, configs: ConfigItem[] } → 下钻一层
    if (row && Array.isArray(row.configs) && !row.configKey) {
      for (const item of row.configs) {
        const k = str(item?.configKey ?? item?.key)
        if (k) out[k] = item?.configValue ?? item?.value
      }
      continue
    }
    // 扁平形状
    const k = str(row?.configKey ?? row?.key)
    if (k) out[k] = row?.configValue ?? row?.value
  }
  return out
}

/** 配置值常是 JSON 字符串，取的时候顺手解一次；解不了就原样返回字符串 */
export function configJson(map: Record<string, unknown>, key: string): unknown {
  const raw = map?.[key]
  if (raw == null) return null
  if (typeof raw !== 'string') return raw
  const s = raw.trim()
  if (!s.startsWith('{') && !s.startsWith('[')) return s
  try { return JSON.parse(s) } catch { return s }
}

/**
 * 🔴 内置壳页判定已上移到 usePageCatalog（isBuiltinShellPath）。
 * 原来这里有一份私有副本，导航配置页又写第三份 —— 三处各判各的必然漂移。
 */

/** 一次性把工作台需要的真实数据取齐。
 * 单个接口失败只记进 loadErrors，不让整页挂掉——
 * 取不到的部分在 UI 上显示「无法确认」，而不是假装已完成。
 */
export async function loadBuildFacts(): Promise<BuildFacts> {
  const facts = emptyFacts()
  const errors: string[] = []

  const [siteRes, pendingRes, catalog, preflightRes, releaseRes, configRes] = await Promise.allSettled([
    getMiniSite('draft'),
    getPendingChanges(),
    // 🔴 统一走 loadAllPages：自动分页且 size≤100。
    // 原来这里写 size:200 → 后端 normalize() 抛 100101 → 响应结构看不懂 →
    // 被 `d?.records || d?.list || []` 降级成空数组 → 工作台误判「没有任何可用页面」。
    loadAllPages(),
    getPublishPreflight(),
    getLatestRelease(),
    getConfigsSilent(),
  ])

  if (siteRes.status === 'fulfilled') {
    facts.site = siteRes.value || {}
  } else {
    errors.push('站点配置读取失败')
  }

  if (pendingRes.status === 'fulfilled') {
    const p = pendingRes.value
    facts.pendingCount = Number(p?.pendingCount ?? p?.total ?? (p?.items || []).length ?? 0) || 0
  } else {
    errors.push('待发布改动读取失败')
  }

  if (catalog.status === 'fulfilled') {
    const cat = catalog.value
    facts.pages = cat.pages
    facts.pageTotal = cat.total
    // 🔴 读取失败必须标出来。下游判定看到 pagesStatus='error' 时
    // 只能说「无法确认」，绝不能把空列表当成「真的没有页面」。
    facts.pagesStatus = cat.status
    facts.pagesComplete = cat.complete
    if (cat.status === 'error') {
      errors.push(`页面列表读取失败：${cat.error}`)
    }
  } else {
    facts.pagesStatus = 'error'
    errors.push('页面列表读取失败')
  }

  if (preflightRes.status === 'fulfilled') {
    const d = (preflightRes.value as any)?.data ?? preflightRes.value
    facts.preflight = {
      canPublish: d?.canPublish,
      blocking: Array.isArray(d?.blocking) ? d.blocking : [],
      warnings: Array.isArray(d?.warnings) ? d.warnings : [],
    }
  } else {
    // 拿不到就是拿不到，不给空数组
    facts.preflight = null
  }

  if (releaseRes.status === 'fulfilled') {
    const r = (releaseRes.value as any)?.data ?? releaseRes.value
    const semver = str(r?.semver)
    // 🔴 2026-10-06 修复「工作台显示第 33 版 / 发布页显示版本 1200」：
    // 原来 `semver.replace(/\D/g,'')` 会把 "1.12.0" 变成 "1120"（全串数字拼接），
    // 取不到时又退到 r.id（发布记录表自增主键，可能已到 1200）——
    // 两个都不是「配置发布序号」。现在按 version-semantics 的统一口径取值。
    facts.liveReleaseNo = releaseNoFromSemver(r?.semver)
    facts.liveSemver = str(r?.semver) || null
    facts.liveReleaseRecordId = toIntLoose(r?.id)
    facts.liveReleaseAt = str(r?.publishedAt || r?.createTime) || null
  }

  if (configRes.status === 'fulfilled') {
    facts.configMap = flattenConfigs(configRes.value as any)
  } else {
    errors.push('系统配置读取失败')
  }

  facts.loadErrors = errors
  return facts
}

/* ------------------------------------------------------------------ */
/* 各环节判定                                                          */
/* 每个函数只依赖 facts，不发请求 —— 保证多处渲染口径一致。            */
/* ------------------------------------------------------------------ */

function judgeBrand(facts: BuildFacts): BuildStage {
  const doneItems: string[] = []
  const issues: StageIssue[] = []

  const site = facts.site || {}
  const brand = asRecord(site.brand)
  const theme = asRecord(site.theme)
  const cfg = facts.configMap || {}

  // 品牌色：theme.primaryColor，或 miniappThemeConfig 里任一色值
  const themeRaw = asRecord(configJson(cfg, 'miniappThemeConfig'))
  const primary = str(theme.primaryColor || theme.theme || theme.color)
    || str(themeRaw.primaryColor || themeRaw.color || themeRaw.primary)
  if (primary) doneItems.push(`品牌色 ${primary}`)
  else {
    issues.push({
      level: 'blocking',
      text: '未设置品牌主色，导航选中态与强调组件会退回默认样式',
      action: { label: '去设置品牌色', to: '/mini/workbench?tab=brand' },
    })
  }

  // 名称：site.name 或 brand.appName
  const appName = str(brand.appName || site.name || cfg.miniappName)
  if (appName) doneItems.push(`小程序名称「${appName}」`)
  else {
    issues.push({
      level: 'blocking',
      text: '未填写小程序名称',
      action: { label: '去填写', to: '/mini/workbench?tab=brand' },
    })
  }

  // Logo
  const logo = str(brand.logoUrl || brand.logo)
  if (logo) doneItems.push('已设置品牌 Logo')
  else {
    issues.push({
      level: 'warning',
      text: '未上传品牌 Logo，分享卡片与个人中心头部会用占位图',
      action: { label: '去上传', to: '/mini/workbench?tab=brand' },
    })
  }

  // 品牌介绍 / 分享标题
  const eyebrow = str(brand.brandEyebrow)
  const tagline = str(brand.loginTagline)
  if (eyebrow || tagline) doneItems.push('已填写品牌文案')
  else {
    issues.push({
      level: 'warning',
      text: '品牌眉题与登录副标题为空，登录页缺少品牌感',
      action: { label: '去补充', to: '/mini/workbench?tab=brand' },
    })
  }

  const shareTitle = str(cfg.miniappShareTitle || site.slogan)
  if (shareTitle) doneItems.push('默认分享标题已设置')
  else {
    issues.push({
      level: 'warning',
      text: '未设置默认分享标题，转发时将回落到页面标题',
      action: { label: '去设置', to: '/mini/workbench?tab=brand' },
    })
  }

  return {
    key: 'brand',
    order: 1,
    title: '品牌信息',
    summary: '小程序名称、Logo、品牌色、默认分享信息',
    status: issues.some((i) => i.level === 'blocking')
      ? (doneItems.length ? 'partial' : 'todo')
      : (issues.length ? 'partial' : 'done'),
    doneItems,
    issues,
    entry: { label: '配置品牌信息', to: '/mini/workbench?tab=brand' },
    evidence: [
      '品牌色来源：站点 theme / 系统配置 miniappThemeConfig',
      '名称与 Logo 来源：站点 brand 配置',
      '分享标题来源：系统配置 miniappShareTitle',
    ],
  }
}

function judgeSystem(facts: BuildFacts): BuildStage {
  const doneItems: string[] = []
  const issues: StageIssue[] = []
  const cfg = facts.configMap || {}

  // 登录页配置
  const loginCfg = asRecord(configJson(cfg, 'loginPageConfig'))
  const hasLogin = Object.keys(loginCfg).length > 0
  if (hasLogin) doneItems.push('登录页文案与开关已配置')
  else {
    issues.push({
      level: 'warning',
      text: '登录页配置为空，将使用小程序内置默认文案',
      action: { label: '配置登录页', to: '/page-builder/login' },
    })
  }

  // 我的页配置
  const mineCfg = Object.keys(asRecord(configJson(cfg, 'minePageConfig'))).length
    ? asRecord(configJson(cfg, 'minePageConfig'))
    : asRecord(facts.site?.minePageConfig)
  if (Object.keys(mineCfg).length > 0) doneItems.push('个人中心配置已填写')
  else {
    issues.push({
      level: 'warning',
      text: '个人中心配置为空',
      action: { label: '配置我的页', to: '/page-builder/mine' },
    })
  }

  // 功能开关：读 plugins / featureFlags
  const flagsRaw = configJson(cfg, 'plugins') ?? configJson(cfg, 'featureFlags') ?? configJson(cfg, 'miniappFeatures')
  let flagCount = 0
  const parsed = flagsRaw
  if (Array.isArray(parsed)) flagCount = parsed.filter(Boolean).length
  else if (parsed && typeof parsed === 'object') {
    flagCount = Object.values(parsed).filter((v) => v === true || (v as any)?.enabled === true).length
  }
  if (flagCount > 0) doneItems.push(`功能开关 ${flagCount} 项已启用`)
  else {
    issues.push({
      level: 'warning',
      text: '未读取到功能开关配置，无法确认各功能是否按预期开放',
      action: { label: '查看开关', to: '/mini/workbench?tab=flags' },
    })
  }

  // 客服与协议：本系统无独立配置项，如实说明，不假装有
  const hasSupport = isFilled(cfg.customerServiceUrl || cfg.supportPhone || cfg.customerService)
  const hasProtocol = isFilled(cfg.privacyProtocol || cfg.userAgreement || cfg.protocolUrl)
  if (hasSupport) doneItems.push('客服入口已配置')
  else {
    issues.push({
      level: 'warning',
      text: '未找到客服配置项。当前系统未提供客服配置入口，客服能力请在「用户管理›客服中心」维护',
      action: { label: '去客服中心', to: '/member/support' },
    })
  }
  if (hasProtocol) doneItems.push('协议已配置')
  else {
    issues.push({
      level: 'warning',
      text: '未找到用户协议/隐私政策地址。当前系统未提供协议配置入口，需在代码或微信后台维护',
    })
  }

  return {
    key: 'system',
    order: 2,
    title: '系统配置',
    summary: '登录页、我的页、功能开关、客服与协议',
    status: doneItems.length && !issues.some((i) => i.level === 'blocking')
      ? (issues.length ? 'partial' : 'done')
      : 'partial',
    doneItems,
    issues,
    entry: { label: '配置系统功能', to: '/mini/workbench?tab=flags' },
    evidence: [
      '登录页来源：系统配置 loginPageConfig',
      '我的页来源：系统配置 minePageConfig',
      '功能开关来源：系统配置 plugins / featureFlags',
      '客服与协议：本系统无对应配置键，已如实标注限制',
    ],
  }
}

function judgePages(facts: BuildFacts): BuildStage {
  const doneItems: string[] = []
  const issues: StageIssue[] = []
  const pages = facts.pages || []

  // 🔴 数据不可信时，绝不能下「没有页面」的结论。
  // 2026-10-06 事故：size=200 被后端拒绝 → 列表空 → 这里报「没有任何可用页面」，
  // 而线上其实有 42 个页面、首页预览也正常。读取失败要说「无法确认」。
  if (facts.pagesStatus === 'error') {
    return {
      key: 'pages',
      order: 3,
      title: '页面搭建',
      summary: '空白创建、模板创建、AI 创建',
      status: 'unknown',
      doneItems,
      issues: [{
        level: 'blocking',
        text: `页面列表读取失败，无法确认是否存在可用页面：${facts.loadErrors.find((e) => e.includes('页面列表')) || '未知原因'}`,
        action: { label: '重新加载', event: 'reload' },
      }],
      entry: { label: '管理页面', to: '/mini/pages' },
      evidence: ['页面列表接口读取失败，判定结果不可信，请先修复数据读取'],
    }
  }

  if (facts.pagesStatus === 'loading') {
    return {
      key: 'pages',
      order: 3,
      title: '页面搭建',
      summary: '空白创建、模板创建、AI 创建',
      status: 'unknown',
      doneItems: ['正在读取页面列表…'],
      issues: [],
      entry: { label: '管理页面', to: '/mini/pages' },
      evidence: ['页面列表加载中'],
    }
  }

  const decorate = pages.filter((p) => {
    const st = resolvePageStatus(p as any)
    return st !== 'archived' && st !== 'offline'
  })

  const live = decorate.filter((p) => resolvePageStatus(p as any) === 'live')
  const draft = decorate.filter((p) => resolvePageStatus(p as any) === 'draft')
  const pending = decorate.filter((p) => resolvePageStatus(p as any) === 'pending')

  if (pages.length) doneItems.push(`页面总数 ${pages.length} 个`)
  if (live.length) doneItems.push(`${live.length} 个页面已上线`)
  if (pending.length) doneItems.push(`${pending.length} 个页面有未上线改动`)
  if (draft.length) doneItems.push(`${draft.length} 个页面仍是草稿`)

  if (!decorate.length) {
    issues.push({
      level: 'blocking',
      text: pages.length
        ? '所有页面都已归档或下线，小程序将无可展示内容'
        : '还没有任何可用页面，小程序打开会是空白',
      action: { label: '去创建页面', to: '/mini/pages?create=1' },
    })
  } else if (!live.length) {
    issues.push({
      level: 'blocking',
      text: '所有页面都还没上线，发布配置后小程序仍无内容可展示',
      action: { label: '去发布配置', to: '/mini/versions' },
    })
  }

  return {
    key: 'pages',
    order: 3,
    title: '页面搭建',
    summary: '空白创建、模板创建、AI 创建',
    status: issues.some((i) => i.level === 'blocking')
      ? (doneItems.length ? 'partial' : 'todo')
      : (doneItems.length ? 'done' : 'todo'),
    doneItems,
    issues,
    entry: { label: '管理页面', to: '/mini/pages' },
    evidence: [
      `页面总数 ${pages.length}（含归档），可用 ${decorate.length}`,
      `分页是否读全：${facts.pagesComplete ? '是' : '否'}（后端报告 ${facts.pageTotal} 条）`,
      '状态口径与页面管理页一致：归档 > 下线 > 草稿 > 待上线 > 已上线',
    ],
  }
}

function judgePageConfig(facts: BuildFacts): BuildStage {
  const doneItems: string[] = []
  const issues: StageIssue[] = []
  const pages = facts.pages || []

  // 访问控制 / 测试页 / 到期时间：这些是 mp_page 上的独立列
  const withEntryExpire = pages.filter((p: any) => p?.entryExpireAt)
  const testPages = pages.filter((p: any) => Number(p?.isTest) === 1 && Number(p?.deleted) === 0)

  // 有 title 的比例（path 必有，name 是标题）
  const named = pages.filter((p: any) => str(p?.name))
  const pathOk = pages.filter((p: any) => str(p?.path))
  if (named.length && named.length >= pathOk.length) doneItems.push('全部页面已填写名称')

  const untitled = pathOk.length - named.length
  if (untitled > 0) {
    issues.push({
      level: 'warning',
      text: `${untitled} 个页面缺少名称，会在导航与列表里显示为空白`,
      action: { label: '去补名称', to: '/mini/pages' },
    })
  }

  // 分享信息：页面级分享属装修器范畴，这里只提示覆盖率无法从列表接口确认
  if (withEntryExpire.length) doneItems.push(`${withEntryExpire.length} 个页面设置了入口到期时间`)
  if (testPages.length) {
    issues.push({
      level: 'warning',
      text: `${testPages.length} 个页面被标记为测试页，线上用户可能看不到`,
      action: { label: '查看测试页', to: '/mini/page-config?filter=test' },
    })
  }

  if (!pages.length) {
    issues.push({
      level: 'blocking',
      text: '还没有页面可配置',
      action: { label: '去创建页面', to: '/mini/pages?create=1' },
    })
  }

  return {
    key: 'pageConfig',
    order: 4,
    title: '页面配置',
    summary: '标题、路径、分享信息、分组、入口到期与上下线',
    status: issues.some((i) => i.level === 'blocking')
      ? 'todo'
      : (issues.length ? 'partial' : (doneItems.length ? 'done' : 'partial')),
    doneItems,
    issues,
    entry: { label: '配置页面', to: '/mini/pages' },
    evidence: [
      `共 ${pages.length} 个页面参与配置检查`,
      '名称/路径来自 mp_page；测试页标记来自 is_test',
    ],
  }
}

function judgeNavigation(facts: BuildFacts): BuildStage {
  const doneItems: string[] = []
  const issues: StageIssue[] = []

  const rawTabs = Array.isArray(facts.site?.tabBar) ? facts.site.tabBar : []
  const tabs = normalizeTabBarItems(rawTabs as any)

  if (!rawTabs.length) {
    issues.push({
      level: 'blocking',
      text: '未配置底部导航，小程序将不显示 Tab 栏',
      action: { label: '去配置导航', to: '/mini/workbench?tab=nav' },
    })
    return {
      key: 'navigation',
      order: 5,
      title: '导航配置',
      summary: '底部 Tab 名称、图标、排序与页面绑定',
      status: 'todo',
      doneItems,
      issues,
      entry: { label: '配置导航', to: '/mini/workbench?tab=nav' },
      evidence: ['导航配置来源：站点 tabBar'],
    }
  }

  doneItems.push(`已配置 ${tabs.length} 个导航入口`)

  // 未命名
  const unnamed = tabs.filter((t: any) => !str(t.text))
  if (unnamed.length) {
    issues.push({
      level: 'warning',
      text: `${unnamed.length} 个导航没有名称，小程序 Tab 会显示空文字`,
      action: { label: '去补名称', to: '/mini/workbench?tab=nav' },
    })
  }

  // 未绑定页面
  const unbound = tabs.filter((t: any) => !str(t.pageId) && !str(t.pagePath))
  if (unbound.length) {
    issues.push({
      level: 'blocking',
      text: `${unbound.length} 个导航没有绑定页面，点进去会跳到空页`,
      action: { label: '去绑定页面', to: '/mini/workbench?tab=nav' },
    })
  }

  // 绑定目标是否存在（用页面列表核对，导航可以先规划后建页）
  // 🔴 列表不可信时只能报「无法确认」，不能报「不存在」——2026-10-06 事故根因。
  const knownPaths = new Set(
    (facts.pages || []).map((p: any) => pagePathKey(p.path)),
  )
  const missingTargets: string[] = []
  let unverifiable = 0
  if (facts.pagesStatus === 'ready') {
    for (const t of tabs as any[]) {
      const label = str(t.text) || '未命名导航'
      const path = pagePathKey(t.pagePath)
      if (!path && !str(t.pageId)) {
        missingTargets.push(`${label}（未绑定）`)
        continue
      }
      const idHit = str(t.pageId)
        ? (facts.pages || []).some((p: any) => pageKey(p.id) === str(t.pageId))
        : false
      if (idHit) continue
      if (path && knownPaths.has(path)) continue
      // 内置系统壳页（如 /pages/mine/mine）本来就不在 mp_page 里，不算缺失
      if (path.startsWith('pages/') && isBuiltinShellPath(path)) continue
      missingTargets.push(`${label} → ${path || `#${t.pageId}`}`)
    }
    if (unverifiable) { /* reserved */ }
  } else {
    unverifiable = tabs.length
  }

  if (missingTargets.length) {
    issues.push({
      level: 'blocking',
      text: `${missingTargets.length} 个导航指向的页面不存在：${missingTargets.slice(0, 3).join('、')}`,
      action: { label: '去修复绑定', to: '/mini/workbench?tab=nav' },
    })
  } else if (unverifiable) {
    issues.push({
      level: 'warning',
      text: '页面列表读取失败，暂时无法核对导航绑定是否有效',
      action: { label: '重新加载', event: 'reload' },
    })
  } else {
    doneItems.push('全部导航绑定均指向存在的页面')
  }

  // 导航页是否已上线
  const offlineTargets = tabs.filter((t: any) => {
    const pid = str(t.pageId)
    if (!pid) return false
    const hit = (facts.pages || []).find((p: any) => String(p?.id) === pid)
    if (!hit) return false
    return resolvePageStatus(hit as any) !== 'live'
  })
  if (offlineTargets.length) {
    issues.push({
      level: 'warning',
      text: `${offlineTargets.length} 个导航指向的页面还没上线，发布后 Tab 会打开空页`,
      action: { label: '去发布页面', to: '/mini/versions' },
    })
  }

  if (tabs.length < 2) {
    issues.push({
      level: 'warning',
      text: `当前只有 ${tabs.length} 个导航，小程序要求 2~5 个`,
      action: { label: '去添加', to: '/mini/workbench?tab=nav' },
    })
  }

  return {
    key: 'navigation',
    order: 5,
    title: '导航配置',
    summary: '底部 Tab 名称、图标、排序与页面绑定',
    status: issues.some((i) => i.level === 'blocking')
      ? 'partial'
      : (issues.length ? 'partial' : 'done'),
    doneItems,
    issues,
    entry: { label: '配置导航', to: '/mini/workbench?tab=nav' },
    evidence: [
      `导航共 ${tabs.length} 个（微信上限 5，下限 2）`,
      '绑定目标核对方式：拿 pageId 与页面列表逐一对账',
    ],
  }
}

function judgePreview(facts: BuildFacts): BuildStage {
  const doneItems: string[] = []
  const issues: StageIssue[] = []
  const pre = facts.preflight

  if (!pre) {
    issues.push({
      level: 'warning',
      text: '发布前检查接口未能返回结果，无法确认当前配置是否可发布',
      action: { label: '重试检查', to: '/mini/versions' },
    })
  } else {
    doneItems.push('已通过发布前检查')
    for (const b of pre.blocking || []) {
      issues.push({ level: 'blocking', text: b, action: { label: '去处理', to: '/mini/versions' } })
    }
    for (const w of pre.warnings || []) {
      issues.push({ level: 'warning', text: w, action: { label: '查看', to: '/mini/versions' } })
    }
    if (pre.canPublish === false && !(pre.blocking || []).length) {
      issues.push({
        level: 'warning',
        text: '后台判定不能发布但未给出阻断项，通常意味着当前没有待发布的改动',
        action: { label: '查看待发布改动', to: '/mini/versions' },
      })
    }
  }

  // 死链兜底：导航或页面里的空内容
  const emptyPages = (facts.pages || []).filter((p: any) => {
    const st = resolvePageStatus(p as any)
    return st === 'live' && !str(p?.name)
  })
  if (emptyPages.length) {
    issues.push({
      level: 'warning',
      text: `${emptyPages.length} 个已上线页面没有名称，用户点击后难以辨识`,
      action: { label: '去补名称', to: '/mini/pages' },
    })
  }

  return {
    key: 'preview',
    order: 6,
    title: '预览检查',
    summary: '草稿预览、线上预览与发布前检查',
    status: issues.some((i) => i.level === 'blocking')
      ? 'partial'
      : (issues.length ? 'partial' : 'done'),
    doneItems,
    issues,
    entry: { label: '预览与检查', to: '/mini/versions' },
    evidence: [
      pre ? '检查结果来自后端 preflight 接口' : 'preflight 接口本次未返回结果',
      '预览能力：草稿预览 / 线上预览 / 微信扫码真机',
    ],
  }
}

function judgePublish(facts: BuildFacts): BuildStage {
  const doneItems: string[] = []
  const issues: StageIssue[] = []

  if (facts.liveReleaseNo != null) {
    doneItems.push(`线上配置版本 ${facts.liveReleaseNo}`)
    if (facts.liveReleaseAt) doneItems.push(`发布时间 ${facts.liveReleaseAt.slice(0, 16).replace('T', ' ')}`)
  } else {
    issues.push({
      level: 'warning',
      text: '尚未查到线上配置发布记录',
      action: { label: '查看发布记录', to: '/mini/versions' },
    })
  }

  if (facts.pendingCount > 0) {
    issues.push({
      level: 'warning',
      text: `有 ${facts.pendingCount} 项改动已存草稿但未发布到线上`,
      action: { label: '去发布配置', to: '/mini/versions' },
    })
  } else {
    doneItems.push('没有待发布的草稿改动')
  }

  return {
    key: 'publish',
    order: 7,
    title: '发布与版本',
    summary: '保存草稿、发布配置、微信代码包与版本存档',
    // 这一环永远不该是「阻断搭建」，只是提醒还有没发的东西
    status: facts.liveReleaseNo == null ? 'todo' : (issues.length ? 'partial' : 'done'),
    doneItems,
    issues,
    entry: { label: '去发布', to: '/mini/versions' },
    evidence: [
      '配置发布与微信代码包是两件事，此处只跟踪配置发布',
      '版本快照由发布时自动捕获，覆盖页面 DSL 与系统配置',
    ],
  }
}

/** 一次性算出 7 个环节的状态。纯函数，便于测试与多处复用。 */
export function judgeStages(facts: BuildFacts): BuildStage[] {
  const judges: Record<BuildStageKey, (f: BuildFacts) => BuildStage> = {
    brand: judgeBrand,
    system: judgeSystem,
    pages: judgePages,
    pageConfig: judgePageConfig,
    navigation: judgeNavigation,
    preview: judgePreview,
    publish: judgePublish,
  }
  return BUILD_STAGES
    .map((s) => judges[s.key](facts))
    .sort((a, b) => a.order - b.order)
    // 🔴 统一在这里给每个 issue 打上环节名：judgeX 里不用各自填，
    // 避免新增环节时漏标，页面就能显示「这是哪个环节的问题」。
    .map((stage) => ({
      ...stage,
      issues: (stage.issues || []).map((i) => ({ ...i, stage: stage.title })),
    }))
}

/* ------------------------------------------------------------------ */
/* 工作台状态（带缓存与刷新）                                          */
/* ------------------------------------------------------------------ */

const factsRef = ref<BuildFacts>(emptyFacts())
const loadingRef = ref(false)
const loadedRef = ref(false)
const errorRef = ref('')

export function useBuildWorkbench() {
  async function refresh(force = false) {
    if (loadingRef.value) return
    // 已加载过且非强制刷新时不重复打接口（切页回来能秒开）
    if (loadedRef.value && !force) return
    loadingRef.value = true
    errorRef.value = ''
    try {
      factsRef.value = await loadBuildFacts()
      loadedRef.value = true
    } catch (e: unknown) {
      errorRef.value = e instanceof Error ? e.message : '搭建状态读取失败'
    } finally {
      loadingRef.value = false
    }
  }

  const stages = computed(() => judgeStages(factsRef.value))

  /** 汇总：完成了几个、还差几个、下一步该做什么 */
  const summary = computed(() => {
    const list = stages.value
    const done = list.filter((s) => s.status === 'done').length
    const partial = list.filter((s) => s.status === 'partial').length
    const todo = list.filter((s) => s.status === 'todo').length
    const blocking = list.flatMap((s) => s.issues).filter((i) => i.level === 'blocking')
    // 下一步：优先第一个没完成的环节。日常维护允许直接进任意环节，这里只做「建议」。
    const next = list.find((s) => s.status !== 'done') || null
    return {
      total: list.length,
      done,
      partial,
      todo,
      blockingCount: blocking.length,
      blockingIssues: blocking,
      next,
      /** 首次搭建：线上从未发布过任何配置 */
      isFirstRun: factsRef.value.liveReleaseNo == null && factsRef.value.liveReleaseAt == null,
    }
  })

  return {
    facts: factsRef,
    stages,
    summary,
    loading: loadingRef,
    loaded: loadedRef,
    error: errorRef,
    refresh,
    statusLabel: (s: StageStatus) =>
      s === 'done' ? '已完成' : s === 'partial' ? '待完善' : s === 'todo' ? '未开始' : '无法确认',
  }
}

/** 各状态对应的样式类，与 mini-workbench.scss 的 tag 体系对齐 */
export function stageTagClass(status: StageStatus): string {
  return status === 'done' ? 't-live' : status === 'partial' ? 't-pending' : status === 'todo' ? 't-slot' : 't-draft'
}

export type { MiniPageStatus }