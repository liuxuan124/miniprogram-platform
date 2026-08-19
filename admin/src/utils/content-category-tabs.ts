import { getCategoryList } from '@/api/content'
import { get } from '@/api/request'

export type ContentCategoryTab = { id: string; name: string }

function isEnabled(node: Record<string, unknown>) {
  const status = node.status
  if (status === undefined || status === null) return true
  if (status === 'enabled') return true
  return Number(status) === 1
}

function isTopLevel(node: Record<string, unknown>) {
  const parentId = node.parentId ?? node.parent_id
  return parentId == null || Number(parentId) === 0
}

function sortTabs(tabs: ContentCategoryTab[], source: Record<string, unknown>[]) {
  const order = new Map<string, number>()
  source.forEach((n, index) => {
    if (n.id != null) {
      const sort = Number(n.sortOrder ?? n.sort_order ?? n.sort)
      order.set(String(n.id), Number.isFinite(sort) ? sort : index)
    }
  })
  return tabs.sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999))
}

/** 提取已启用的顶级内容分类（与发文下拉、小程序 Tab 一致） */
export function extractTopContentCategoryTabs(source: unknown[]): ContentCategoryTab[] {
  if (!Array.isArray(source) || !source.length) return []

  const roots: Record<string, unknown>[] = []
  const flat: Record<string, unknown>[] = []

  for (const item of source) {
    if (!item || typeof item !== 'object') continue
    const node = item as Record<string, unknown>
    if (Array.isArray(node.children) && node.children.length) {
      roots.push(node)
    } else {
      flat.push(node)
    }
  }

  const pickFrom = (nodes: Record<string, unknown>[]) => {
    const tabs: ContentCategoryTab[] = []
    for (const node of nodes) {
      if (!isEnabled(node) || !isTopLevel(node) || !node.name) continue
      tabs.push({ id: String(node.id), name: String(node.name) })
    }
    return sortTabs(tabs, nodes)
  }

  if (roots.length) return pickFrom(roots)
  return pickFrom(flat)
}

export function withAllCategoryTab(tabs: ContentCategoryTab[]): ContentCategoryTab[] {
  if (!tabs.length) return [{ id: '', name: '全部' }]
  return [{ id: '', name: '全部' }, ...tabs]
}

/** 后台树 + 小程序公开接口双通道，保证 Tab 与发文分类一致 */
export async function fetchTopContentCategoryTabs(): Promise<ContentCategoryTab[]> {
  try {
    const res = await getCategoryList()
    const tree = (res as { data?: unknown[] })?.data
    const tabs = extractTopContentCategoryTabs(Array.isArray(tree) ? tree : [])
    if (tabs.length) return tabs
  } catch {
    /* admin 接口失败时走 mp 公开接口 */
  }

  try {
    const res = await get<unknown[]>('/api/v1/mp/content-categories', undefined, { showError: false })
    const list = (res as { data?: unknown[] })?.data
    return extractTopContentCategoryTabs(Array.isArray(list) ? list : [])
  } catch {
    return []
  }
}
