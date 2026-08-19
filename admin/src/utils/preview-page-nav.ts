import { getPageDetail, getPageList } from '@/api/page'
import type { ComponentInstance, PageDSL, PageRecord } from '@/types/page'
import { hydratePreviewDsl, loadHydratedComponent } from '@/utils/preview-datasource'

export type PreviewPageFrame = {
  path: string
  title: string
  bg: string
  components: ComponentInstance[]
}

let cachedPages: PageRecord[] | null = null

export function normalizePreviewPath(path?: string) {
  return String(path || '').trim().replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase()
}

async function getCachedPageList() {
  if (cachedPages) return cachedPages
  const all: PageRecord[] = []
  const pageSize = 100
  let current = 1
  while (current <= 10) {
    const res = await getPageList({ current, size: pageSize })
    const data = (res as any)?.data
    const records = data?.records || data?.list || (Array.isArray(data) ? data : [])
    const batch = Array.isArray(records) ? records : []
    all.push(...batch)
    const total = Number(data?.total ?? data?.totalCount ?? 0)
    if (batch.length < pageSize || (total > 0 && all.length >= total)) break
    current += 1
  }
  cachedPages = all
  return cachedPages
}

async function loadPageRecordById(id: string | number): Promise<PageRecord | null> {
  try {
    const detailRes = await getPageDetail(id, { silent: true })
    const page = ((detailRes as any)?.data || detailRes) as PageRecord
    return page?.id != null ? page : null
  } catch {
    return null
  }
}

function hasDslContent(record: PageRecord) {
  return !!(record.draftDslContent || (record as any).dslContent)
}

export function clearPreviewPageCache() {
  cachedPages = null
}

export async function findPageRecordByPath(path: string): Promise<PageRecord | null> {
  const needle = normalizePreviewPath(path)
  if (!needle) return null

  const list = await getCachedPageList()
  let found = list.find((page) => normalizePreviewPath(page.path) === needle)
  if (!found) {
    found = list.find((page) => {
      const pagePath = normalizePreviewPath(page.path)
      return pagePath.endsWith(needle) || needle.endsWith(pagePath)
    })
  }
  if (!found) return null

  if (hasDslContent(found)) return found
  return (await loadPageRecordById(found.id)) || found
}

function demoProductItems(limit = 2) {
  return [
    { id: 'demo-1', name: '跨境通用知识库', price: '199.00', sales: 128, image: '' },
    { id: 'demo-2', name: '跨境财税知识库', price: '299.00', sales: 86, image: '' },
  ].slice(0, limit)
}

async function hydratePageComponents(
  components: ComponentInstance[],
  mode: 'real' | 'demo',
): Promise<ComponentInstance[]> {
  if (mode === 'demo') {
    return components.map((component) => {
      const type = String(component.type)
      if (type === 'product_list') {
        const limit = Math.max(Number(component.props?.limit || 4), 1)
        return {
          ...component,
          props: {
            ...component.props,
            items: demoProductItems(limit),
            _previewDataFailed: false,
          },
        }
      }
      if (type === 'article_list' || type === 'article_feed' || type === 'hot_news') {
        const items = [
          { title: '品牌故事', meta: '2026-05-10 10:30', cover: '' },
          { title: '选品指南', meta: '2026-05-12 14:20', cover: '' },
        ]
        return { ...component, props: { ...component.props, items, _previewDataFailed: false } }
      }
      return component
    })
  }

  return Promise.all(
    components.map(async (component) => {
      const type = String(component.type)
      if (type === 'product_list' || type === 'article_list' || type === 'article_feed' || type === 'hot_news') {
        try {
          return await loadHydratedComponent(component)
        } catch {
          return component
        }
      }
      return component
    }),
  )
}

export async function loadPagePreviewByPath(
  path: string,
  mode: 'real' | 'demo' = 'real',
): Promise<PreviewPageFrame | null> {
  const record = await findPageRecordByPath(path)
  if (!record) return null

  let raw = record.draftDslContent || (record as any).dslContent
  if (!raw && record.id != null) {
    const detail = await loadPageRecordById(record.id)
    raw = detail?.draftDslContent || (detail as any)?.dslContent
  }
  if (!raw) return null

  const dsl = (typeof raw === 'string' ? JSON.parse(raw) : raw) as PageDSL
  const { dsl: hydrated } = await hydratePreviewDsl(dsl)
  const components = await hydratePageComponents(
    Array.isArray(hydrated.components) ? hydrated.components : [],
    mode,
  )

  return {
    path: record.path || path,
    title: hydrated.page?.name || record.name || '页面预览',
    bg: hydrated.page?.background_color || '#f6f8fb',
    components,
  }
}
