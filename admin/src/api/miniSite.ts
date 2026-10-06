/**
 * 小程序站点聚合 API（一期重设计）
 * 真实路径优先；404 / 网络失败时回退到既有接口拼装，便于前后端并行开发。
 */
import { get, put, post } from './request'
import { getPageList } from './page'
import {
  getStoreTemplates,
  getLatestRelease,
  publishContentToMiniapp,
  getPublishPreflight,
} from './version'
import { getConfigByGroupSilent } from './system'
import { CONFIG_KEYS } from '@/types/miniapp'
import { resolvePageStatus, type MiniPageStatus } from '@/utils/pageStatus'
import type { PageRecord } from '@/types/page'

const BASE = '/api/v1/admin/mini'

export type MiniTabBarItem = {
  /** 稳定业务 id，不随排序变化 */
  id?: string
  tabRoute?: string
  text?: string
  pagePath?: string
  pageId?: string | number
  pageName?: string
  /**
   * 是否在小程序中显示。缺省视为 true。
   * 老配置没有这个字段，判空时不要当成隐藏（否则上线即空 Tab 栏）。
   */
  enabled?: boolean
  /** 兼容后端/快照字段 */
  icon?: string
  selectedIcon?: string
  iconPath?: string
  selectedIconPath?: string
}

export type MiniSiteVO = {
  name?: string
  slogan?: string
  templateId?: number | null
  templateName?: string | null
  theme?: Record<string, unknown> | null
  tabBar?: MiniTabBarItem[]
  liveReleaseNo?: number | null
  liveReleaseAt?: string | null
  livePublisherName?: string | null
  miniappHomePageId?: number | null
  wechatCodeVersion?: string | null
  pendingCount?: number
  minePageConfig?: Record<string, unknown> | null
  brand?: Record<string, unknown> | null
}

export type ContentPreflight = {
  canPublish?: boolean
  blocking?: string[]
  warnings?: string[]
  items?: Array<{
    changeId?: string
    status?: string
    category?: string
    blockerReason?: string
  }>
}

export type PendingChangeItem = {
  id?: number | string
  changeId?: string
  type?: 'site' | 'page' | string
  name?: string
  path?: string
  status?: MiniPageStatus | string
  summary?: string
  pageId?: number | string
}

export type PendingChangesVO = {
  items?: PendingChangeItem[]
  /** 旧字段名，保留兼容 */
  siteDirty?: boolean
  /** 后端 /mini/pending-changes 实际返回的字段 */
  siteDraftChanged?: boolean
  pendingCount?: number
  total?: number
}

export type MiniPublishResultVO = {
  liveReleaseNo?: number
  liveReleaseAt?: string
  publishedPageCount?: number
  publishedPages?: number
  /** 站点草稿是否真的被提升为线上配置；false 表示这次发布什么都没做 */
  siteConfigPromoted?: boolean
  /** 去重命中：同一批改动在防重复窗口内重复提交，后端幂等返回、未重复写入 */
  deduplicated?: boolean
  message?: string
}

export type MiniContentReleaseVO = {
  id?: number
  /**
   * 🔴 `releaseNo` 不可信：后端 VO 有这个字段但**从未 `setReleaseNo()` 赋值**，
   *    而且 `MiniSiteServiceImpl:816` 证明它等价于 `patch`（semver 第三段），
   *    不是"发布次数"。2026-10-06 线上因此出现「顶部第 33 次 / 列表最新 c.0.28」。
   *    展示请优先用 `semver`，没有才退回 `id`。
   */
  releaseNo?: number
  /**
   * 快照自身的版本号（线上真实存在，如 `c.0.28` / `1.3.0`）。
   * 后端 `mp_miniapp_release.semver`。**这是唯一可靠的版本标识。**
   */
  semver?: string
  /** 快照记录的记录 id（VO 里叫 `note`，与"发布说明"同名不同义，易混） */
  note?: string
  publishedAt?: string
  publisherId?: number
  /**
   * 操作人姓名。后端当前**没有这个字段**（表 `mp_miniapp_release` 无 create_by），
   * 所以前端拿不到就完全不显示 —— 绝不用 id 冒充人名。
   */
  publisherName?: string
  currentLive?: boolean
  hasSnapshot?: boolean
  pageCount?: number
  rollback?: boolean
  rollbackToReleaseNo?: number
}

export type MiniRollbackResultVO = {
  pagesRestored?: number
  siteDraftUpdated?: boolean
  fromReleaseNo?: number
  restorePageNames?: string[]
  message?: string
}

export type MiniRollbackPreviewVO = {
  fromReleaseNo?: number
  restorePageNames?: string[]
  hasSiteConfig?: boolean
  currentPendingCount?: number
  currentPendingSummaries?: string[]
  hasSnapshot?: boolean
}

export type MiniSiteUpdatePayload = {
  name?: string
  slogan?: string
  theme?: Record<string, unknown>
  tabBar?: MiniTabBarItem[]
  minePageConfig?: Record<string, unknown>
  brandConfig?: Record<string, unknown>
}

function unwrap<T>(res: any): T {
  return (res?.data ?? res) as T
}

function isMissingEndpoint(err: any): boolean {
  const status = err?.response?.status ?? err?.status
  const msg = String(err?.message || err?.response?.data?.message || '')
  return status === 404 || /not found|不存在|No static resource|NoResourceFound/i.test(msg)
}

/** GET 站点概览 */
export async function getMiniSite(view: 'draft' | 'live' = 'draft'): Promise<MiniSiteVO> {
  try {
    const res = await get<MiniSiteVO>(`${BASE}/site`, { view }, { showError: false })
    return unwrap<MiniSiteVO>(res) || {}
  } catch (err) {
    if (!isMissingEndpoint(err)) throw err
    return buildSiteFallback()
  }
}

/** PUT 站点草稿（导航/主题等，不直接改 live） */
export async function updateMiniSite(payload: MiniSiteUpdatePayload): Promise<MiniSiteVO> {
  try {
    const res = await put<MiniSiteVO>(`${BASE}/site`, payload as Record<string, unknown>, { showError: false })
    return unwrap<MiniSiteVO>(res) || {}
  } catch (err) {
    if (!isMissingEndpoint(err)) throw err
    throw new Error('站点草稿接口尚未就绪，请稍后再试或走品牌导航保存')
  }
}

/** GET 待发布变更 */
export async function getPendingChanges(): Promise<PendingChangesVO> {
  try {
    const res = await get<PendingChangesVO>(`${BASE}/pending-changes`, undefined, { showError: false })
    return unwrap<PendingChangesVO>(res) || { items: [], pendingCount: 0 }
  } catch (err) {
    if (!isMissingEndpoint(err)) throw err
    return buildPendingFallback()
  }
}

/** POST 内容发布预检（勾选 change_id） */
export async function postContentPreflight(changeIds: string[]): Promise<ContentPreflight> {
  try {
    const res = await post<ContentPreflight>(
      `${BASE}/preflight`,
      { changeIds },
      { showError: false },
    )
    return unwrap<ContentPreflight>(res) || {}
  } catch (err) {
    if (!isMissingEndpoint(err)) throw err
    const pre = await getPublishPreflight()
    const data = (pre as any)?.data ?? pre
    return {
      canPublish: data?.canPublish,
      blocking: data?.blocking || [],
      warnings: data?.warnings || [],
    }
  }
}

export async function createMiniPreviewToken(withWxQr = true): Promise<{
  token?: string
  jti?: string
  expiresAt?: string
  launchQuery?: string
  scene?: string
  pagePath?: string
  wxQrcodeBase64?: string
}> {
  const qs = withWxQr ? '?withWxQr=true' : '?withWxQr=false'
  const res = await post(`${BASE}/preview-tokens${qs}`, {}, { showError: false })
  return unwrap(res) || {}
}

/** POST 发布（递增 live_release_no；支持 pageIds / includeSite 勾选） */
export async function publishMiniSite(payload?: {
  notes?: string
  pageId?: number | string
  pageIds?: Array<number | string>
  changeIds?: string[]
  /** false=不提升站点草稿；默认 true */
  includeSite?: boolean
  clientRequestId?: string
}): Promise<MiniPublishResultVO> {
  try {
    const res = await post<MiniPublishResultVO>(
      `${BASE}/publish`,
      (payload || {}) as Record<string, unknown>,
      { showError: false },
    )
    return unwrap<MiniPublishResultVO>(res) || {}
  } catch (err) {
    if (!isMissingEndpoint(err)) throw err
    await publishContentToMiniapp()
    return { message: '已通过旧通道发布配置（发布序号未更新）', liveReleaseNo: undefined }
  }
}

/** GET 内容发布时间线 */
/**
 * 紧急线上回滚：把线上配置直接指回某个历史快照。
 *
 * 🔴 与「还原为草稿」的区别（这是两件事，不能混）：
 *   · 还原为草稿 = 只改编辑态，**不影响线上**，要再走一次发布
 *   · 紧急回滚   = **立刻改变线上**，用于线上白屏/样式崩坏时1 秒止血
 * 后端能力本来就存在（`MiniappReleaseController#rollbackRelease`），
 * 之前前端没接 —— 于是只剩"还原草稿 → 重新发布"这条MTTR 很长的路。
 *
 * 契约来自后端 `RollbackDTO`：
 *   targetSemver      目标快照的 semver（如 c.0.28）—— **必填，不是 releaseNo**
 *   reason            回滚原因（会写进操作日志，排查时要看）
 *   offlineExtraPages 是否下线回滚后多出来的页面，默认 true
 * 权限：`page:publish`
 */
export async function rollbackToSemver(params: {
  targetSemver: string
  reason?: string
  offlineExtraPages?: boolean
}) {
  return post<MiniRollbackResultVO>(
    '/miniapp-releases/rollback',
    { offlineExtraPages: true, ...params } as Record<string, unknown>,
  )
}

export async function listMiniContentReleases(): Promise<MiniContentReleaseVO[]> {
  try {
    const res = await get<MiniContentReleaseVO[]>(`${BASE}/releases`, undefined, { showError: false })
    const data = unwrap<MiniContentReleaseVO[] | { records?: MiniContentReleaseVO[] }>(res)
    if (Array.isArray(data)) return data
    return (data as any)?.records || []
  } catch (err) {
    if (!isMissingEndpoint(err)) throw err
    return []
  }
}

/** GET 回滚影响预览（只读） */
export async function previewMiniRollback(releaseId: number | string): Promise<MiniRollbackPreviewVO> {
  const res = await get<MiniRollbackPreviewVO>(
    `${BASE}/releases/${releaseId}/rollback-preview`,
    undefined,
    { showError: false },
  )
  return unwrap<MiniRollbackPreviewVO>(res) || {}
}

/** POST 回滚为待发布草稿（不直接改线上） */
export async function prepareMiniRollback(releaseId: number | string): Promise<MiniRollbackResultVO> {
  const res = await post<MiniRollbackResultVO>(
    `${BASE}/releases/${releaseId}/prepare-rollback`,
    {},
    { showError: false },
  )
  return unwrap<MiniRollbackResultVO>(res) || {}
}

async function buildSiteFallback(): Promise<MiniSiteVO> {
  const [basicRes, templatesRes, latestRes, pending] = await Promise.all([
    getConfigByGroupSilent('basic').catch(() => null),
    getStoreTemplates().catch(() => null),
    getLatestRelease().catch(() => null),
    buildPendingFallback().catch(() => ({ items: [], pendingCount: 0 } as PendingChangesVO)),
  ])

  const configs = (basicRes as any)?.data?.configs || (basicRes as any)?.data || []
  const map = Array.isArray(configs)
    ? Object.fromEntries(configs.map((c: any) => [c.configKey || c.key, c.configValue ?? c.value]))
    : {}

  let tabBar: MiniTabBarItem[] = []
  try {
    const raw = map[CONFIG_KEYS.TABBAR_ITEMS] || map.tabBar || map.tab_bar
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (Array.isArray(parsed)) tabBar = parsed
    else if (Array.isArray(parsed?.list)) tabBar = parsed.list
  } catch { /* ignore */ }

  const list = ((templatesRes as any)?.data || []) as any[]
  const current = list.find((r) => r.isCurrent === 1 || r.isCurrent === true)
  const latest = (latestRes as any)?.data || null

  return {
    name: map[CONFIG_KEYS.SHARE_TITLE] || map.miniappName || map.appName || '小程序',
    slogan: map.slogan || '',
    templateId: current?.id ?? null,
    templateName: current?.templateName || current?.releaseNotes || null,
    theme: null,
    tabBar,
    liveReleaseNo: latest?.id ? Number(String(latest.semver || '').replace(/\D/g, '')) || null : null,
    liveReleaseAt: latest?.publishedAt || latest?.createTime || null,
    wechatCodeVersion: null,
    pendingCount: pending.pendingCount || 0,
  }
}

async function buildPendingFallback(): Promise<PendingChangesVO> {
  const items: PendingChangeItem[] = []
  try {
    const pre = await getPublishPreflight()
    const pages = unwrap<any>(pre)?.pages || []
    for (const p of pages) {
      if (p.action === 'publish') {
        items.push({
          id: p.id,
          pageId: p.id,
          type: 'page',
          name: p.name,
          path: p.path,
          status: 'pending',
          summary: '页面有未上线改动',
        })
      }
    }
  } catch { /* ignore */ }

  if (!items.length) {
    try {
      const res = await getPageList({ current: 1, size: 100 })
      const records = ((res as any)?.data?.records || (res as any)?.data?.list || []) as PageRecord[]
      for (const row of records) {
        const st = resolvePageStatus(row)
        if (st === 'pending' || st === 'draft') {
          items.push({
            id: row.id,
            pageId: row.id,
            type: 'page',
            name: row.name,
            path: row.path,
            status: st,
            summary: st === 'pending' ? '有未上线改动' : '尚未上线',
          })
        }
      }
    } catch { /* ignore */ }
  }

  return { items, pendingCount: items.length, siteDirty: false }
}
