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
  text?: string
  pagePath?: string
  pageId?: string | number
  pageName?: string
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

export type PendingChangeItem = {
  id?: number | string
  type?: 'site' | 'page' | string
  name?: string
  path?: string
  status?: MiniPageStatus | string
  summary?: string
  pageId?: number | string
}

export type PendingChangesVO = {
  items?: PendingChangeItem[]
  siteDirty?: boolean
  pendingCount?: number
}

export type MiniPublishResultVO = {
  liveReleaseNo?: number
  liveReleaseAt?: string
  publishedPageCount?: number
  publishedPages?: number
  message?: string
}

export type MiniContentReleaseVO = {
  id?: number
  releaseNo?: number
  note?: string
  publishedAt?: string
  publisherId?: number
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

/** POST 发布（递增 live_release_no；支持 pageIds / includeSite 勾选） */
export async function publishMiniSite(payload?: {
  notes?: string
  pageId?: number | string
  pageIds?: Array<number | string>
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
    return { message: '已通过旧通道上线到小程序', liveReleaseNo: undefined }
  }
}

/** GET 内容发布时间线 */
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
