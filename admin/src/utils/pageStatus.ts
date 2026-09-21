/**
 * 小程序页面统一展示状态（与后端 PageStatusCalculator 对齐）
 * draft / pending / live / offline / archived
 */

export type MiniPageStatus = 'draft' | 'pending' | 'live' | 'offline' | 'archived'

export const MINI_PAGE_STATUS_LABELS: Record<MiniPageStatus, string> = {
  draft: '草稿',
  pending: '待发布',
  live: '已上线',
  offline: '已下架',
  archived: '已归档',
}

/** 陶土暖色体系标签色（非 Element 默认紫） */
export const MINI_PAGE_STATUS_COLORS: Record<MiniPageStatus, { bg: string; text: string; border: string }> = {
  draft: { bg: '#F0EBE3', text: '#6B5E52', border: '#D9CFC3' },
  pending: { bg: '#FDF0E6', text: '#B4430F', border: '#E8C4A8' },
  live: { bg: '#E8F2E9', text: '#2F6B3A', border: '#B7D4BC' },
  offline: { bg: '#F5F0EA', text: '#8A7A6C', border: '#D4C8BC' },
  archived: { bg: '#EEEAE4', text: '#7A6E64', border: '#CDC4BA' },
}

export type PageStatusInput = {
  status?: string | number | null
  currentVersion?: number | null
  latestVersion?: number | null
  version?: number | null
  hasUnpublishedChanges?: boolean | null
  archived?: boolean | number | null
  displayStatus?: string | null
}

/**
 * 从未发布过 = draft；已发布且有未上线改动 = pending；
 * 已上线一致 = live；下架 = offline；归档 = archived
 */
export function resolvePageStatus(row: PageStatusInput): MiniPageStatus {
  if (row.displayStatus && isMiniPageStatus(row.displayStatus)) {
    return row.displayStatus
  }
  if (row.archived === true || row.archived === 1) return 'archived'

  const status = normalizeLegacyStatus(row.status)
  const current = Number(row.currentVersion ?? row.version ?? 0)
  const latest = Number(row.latestVersion ?? row.version ?? 0)
  const dirty =
    row.hasUnpublishedChanges === true
    || (status === 'published' && latest > current)

  if (status === 'unpublished' || status === 'offline') return 'offline'
  if (status === 'published' || status === 'live') {
    return dirty ? 'pending' : 'live'
  }
  return 'draft'
}

export function isMiniPageStatus(v: string): v is MiniPageStatus {
  return v === 'draft' || v === 'pending' || v === 'live' || v === 'offline' || v === 'archived'
}

function normalizeLegacyStatus(raw: string | number | null | undefined): string {
  if (raw == null || raw === '') return 'draft'
  if (typeof raw === 'number') {
    if (raw === 1) return 'published'
    if (raw === 2) return 'unpublished'
    return 'draft'
  }
  const s = String(raw).toLowerCase()
  if (s === '1' || s === 'published' || s === 'live') return 'published'
  if (s === '2' || s === 'unpublished' || s === 'offline') return 'unpublished'
  return 'draft'
}

export type PageGroup = 'tab' | 'activity' | 'content' | 'archived'

export const PAGE_GROUP_LABELS: Record<PageGroup, string> = {
  tab: '底部导航页',
  activity: '活动与专题',
  content: '内容页',
  archived: '归档',
}

export const PAGE_GROUP_SUB: Record<PageGroup, string> = {
  tab: '顺序与真机底部一致',
  activity: '',
  content: '',
  archived: '被替换或不再使用的页面，可随时恢复',
}

/** 无后端 pageGroup 时按类型 / 路径推断分组 */
export function inferPageGroup(row: {
  pageGroup?: string | null
  page_group?: string | null
  archived?: boolean | number | null
  type?: string | number | null
  path?: string | null
  name?: string | null
}): PageGroup {
  const explicit = String(row.pageGroup || row.page_group || '').toLowerCase()
  if (explicit === 'tab' || explicit === 'activity' || explicit === 'content' || explicit === 'archived') {
    return explicit
  }
  if (row.archived === true || row.archived === 1) return 'archived'
  const path = String(row.path || '')
  const type = String(row.type ?? '')
  if (path.includes('/pages/mine/mine') || path.includes('/pages/index/index') || type === '1' || type === 'home') {
    return 'tab'
  }
  if (type === 'activity' || path.includes('/activity')) return 'activity'
  return 'content'
}
