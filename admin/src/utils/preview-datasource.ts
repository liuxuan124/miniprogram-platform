import type { ComponentDataSource, ComponentInstance, PageDSL } from '@/types/page'

type DataSourceType = ComponentDataSource['type']

export interface HydratePreviewResult {
  dsl: PageDSL
  warnings: string[]
}

const COMPONENT_LABELS: Record<string, string> = {
  article_list: '文章列表',
  product_list: '商品列表',
  activity_list: '活动列表',
  activity_entry: '活动入口',
  coupon: '优惠券',
  appointment_service: '预约服务',
}

const DS_API_MAP: Partial<Record<DataSourceType, string>> = {
  product: '/api/v1/mp/products',
  content: '/api/v1/mp/contents',
  activity: '/api/v1/mp/activities',
  coupon: '/api/v1/mp/coupons',
  appointment_service: '/api/v1/mp/appointment-services',
}

const DS_COMPONENT_DEFAULT_TYPE: Partial<Record<string, DataSourceType>> = {
  product_list: 'product',
  article_list: 'content',
  activity_list: 'activity',
  activity_entry: 'activity',
  appointment_service: 'appointment_service',
  coupon: 'coupon',
}

const HYDRATE_COMPONENT_TYPES = new Set(Object.keys(DS_COMPONENT_DEFAULT_TYPE))

export function stripHtml(value: unknown): string {
  if (value == null) return ''
  return String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function pickList(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []
  const data = payload as Record<string, unknown>
  if (Array.isArray(data.records)) return data.records
  if (Array.isArray(data.list)) return data.list
  if (Array.isArray(data.items)) return data.items
  if (Array.isArray(data.data)) return data.data
  return []
}

function resolveDataSource(component: ComponentInstance): ComponentDataSource | null {
  const raw = component.data_source || component.props?.data_source
  if (!raw || !raw.type) {
    const fallbackType = DS_COMPONENT_DEFAULT_TYPE[component.type]
    if (!fallbackType) return null
    const status = fallbackType === 'product' ? 'on_sale' : 'published'
    return { type: fallbackType, params: { status } } as ComponentDataSource
  }

  const config = raw.config || {}
  const params = { ...(raw.query || {}), ...(raw.params || {}), ...(config.params || {}) }
  Object.keys(params).forEach((key) => {
    if (params[key] === '' || params[key] === null || params[key] === undefined) delete params[key]
  })

  if (raw.type !== 'api') {
    return { ...raw, params }
  }

  const api = String(config.api || raw.api || '').trim()
  if (api.startsWith('/api/v1/mp/')) {
    return { type: 'api', params, config: { ...config, api } }
  }
  if (api.includes('/articles') || api.includes('/contents')) {
    return { type: 'content', params }
  }
  if (api.includes('/products')) {
    return { type: 'product', params }
  }
  if (api.includes('/activities')) {
    return { type: 'activity', params }
  }
  if (api.includes('/coupons')) {
    return { type: 'coupon', params }
  }
  if (api.includes('/appointment-services')) {
    return { type: 'appointment_service', params }
  }

  const mappedType = DS_COMPONENT_DEFAULT_TYPE[component.type]
  if (mappedType) {
    return { type: mappedType, params } as ComponentDataSource
  }

  return { ...raw, params }
}

async function fetchDataSourceList(dataSource: ComponentDataSource, limit: number): Promise<any[]> {
  let apiPath = ''
  if (dataSource.type === 'api' && dataSource.config?.api?.startsWith('/api/v1/mp/')) {
    apiPath = dataSource.config.api
  } else {
    apiPath = DS_API_MAP[dataSource.type] || ''
  }

  if (!apiPath) return []

  const params = new URLSearchParams({
    current: '1',
    size: String(Math.max(limit, 6)),
    page: '1',
    page_size: String(Math.max(limit, 6)),
  })
  Object.entries(dataSource.params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'all') return
    params.set(key, String(value))
  })

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller ? window.setTimeout(() => controller.abort(), 6000) : 0
  let response: Response
  try {
    response = await fetch(`${apiPath}?${params.toString()}`, controller ? { signal: controller.signal } : undefined)
  } finally {
    if (timer) window.clearTimeout(timer)
  }
  const payload = await response.json()
  if (payload.code !== 200) {
    throw new Error(payload.message || '接口请求失败')
  }
  return pickList(payload.data)
}

function formatPublishDateTime(value: unknown): string {
  if (value == null || value === '') return ''
  const raw = String(value).trim()
  const matched = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/)
  if (matched) return `${matched[1]} ${matched[2]}`
  const normalized = raw.includes('T') || raw.includes('-')
    ? raw.replace(/-/g, '/')
    : raw
  const d = new Date(normalized)
  if (Number.isNaN(d.getTime())) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw} 00:00`
    return ''
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatArticleMeta(item: Record<string, any>): string {
  const date = item.publishedAt
    || item.publishTime
    || item.publish_time
    || item.createTime
    || item.createdAt
    || item.created_at
  return formatPublishDateTime(date) || ''
}

function mapArticleItems(list: any[], limit: number) {
  return list.slice(0, limit).map((item, index) => ({
    id: item.id || index + 1,
    title: item.title || item.name || '文章标题',
    meta: formatArticleMeta(item),
    cover: item.coverUrl || item.coverImage || item.cover || item.image || '',
  }))
}

function mapProductItems(list: any[], limit: number, sortKey?: string) {
  let rows = list.filter((item) => item && String(item.status || 'on_sale') === 'on_sale')
  const sort = String(sortKey || '')
  if (sort.includes('sales')) {
    rows = [...rows].sort((a, b) => Number(b.sales ?? 0) - Number(a.sales ?? 0))
  } else if (sort.includes('price') && sort.includes('asc')) {
    rows = [...rows].sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0))
  } else if (sort.includes('price')) {
    rows = [...rows].sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0))
  }
  return rows.slice(0, limit).map((item, index) => ({
    id: item.id || index + 1,
    name: item.name || item.title || '商品名称',
    price: String(item.price ?? '0.00'),
    image: item.coverUrl || item.coverImage || item.image || item.mainImage || '',
    sales: Number(item.sales ?? item.salesCount ?? 0) || 0,
  }))
}

function demoProductItems(limit = 2) {
  return [
    { id: 'demo-1', name: '跨境通用知识库', title: '跨境通用知识库', price: '199.00', sales: 128, image: '' },
    { id: 'demo-2', name: '跨境财税知识库', title: '跨境财税知识库', price: '299.00', sales: 86, image: '' },
  ].slice(0, Math.max(limit, 1))
}

function resolveProductIds(component: ComponentInstance): string[] {
  const raw = component.props?.product_ids
  if (Array.isArray(raw) && raw.length) return raw.map((id: any) => String(id))
  const ds = component.data_source || component.props?.data_source || {}
  const fromDs = ds.params?.ids ?? ds.query?.ids
  if (typeof fromDs === 'string' && fromDs.trim()) {
    return fromDs.split(',').map((s: string) => s.trim()).filter(Boolean)
  }
  if (Array.isArray(fromDs)) return fromDs.map((id: any) => String(id))
  return []
}

function pickProductsByIds(list: any[], ids: string[], limit: number) {
  if (!ids.length) return mapProductItems(list, limit)
  const map = new Map(list.map((item) => [String(item.id), item]))
  const ordered = ids.map((id) => map.get(id)).filter(Boolean)
  if (!ordered.length) {
    // 接口无匹配时，优先用组件内已保存的 items
    return []
  }
  return mapProductItems(ordered as any[], limit)
}

function manualProductItems(component: ComponentInstance, limit: number) {
  const ids = resolveProductIds(component)
  const saved = Array.isArray(component.props?.items) ? component.props.items : []
  if (ids.length && saved.length) {
    const map = new Map(saved.map((item: any) => [String(item.id), item]))
    const ordered = ids.map((id) => map.get(id)).filter(Boolean)
    if (ordered.length) return mapProductItems(ordered as any[], limit)
  }
  if (saved.length) return mapProductItems(saved, limit)
  if (ids.length) {
    return mapProductItems(
      demoProductItems(20).filter((item) => ids.includes(String(item.id))),
      limit,
    )
  }
  return demoProductItems(Math.min(limit, 2))
}

async function hydrateComponent(
  component: ComponentInstance,
  warnings: string[],
): Promise<ComponentInstance> {
  if (!HYDRATE_COMPONENT_TYPES.has(component.type)) {
    return component
  }

  const label = COMPONENT_LABELS[component.type] || component.type
  const dataSource = resolveDataSource(component)
  if (!dataSource) return component

  const limit = Math.max(Number(component.props?.limit || 6), 1)
  const isManualProduct = component.type === 'product_list'
    && (component.props?.source_mode === 'manual' || resolveProductIds(component).length > 0)

  // 手动选品：优先用已保存 items，避免依赖可能失败的列表接口
  if (isManualProduct) {
    const items = manualProductItems(component, limit)
    if (items.length) {
      return {
        ...component,
        props: {
          ...component.props,
          items,
          _previewDataFailed: false,
          _previewDataDemo: items.some((x) => String(x.id).startsWith('demo-')),
        },
      }
    }
  }

  try {
    const list = await fetchDataSourceList(dataSource, Math.max(limit, 50))
    if (!list.length) {
      if (component.type === 'product_list') {
        const items = isManualProduct
          ? manualProductItems(component, limit)
          : demoProductItems(Math.min(limit, 2))
        warnings.push(`${label}：暂无真实商品，已用预览占位数据`)
        return {
          ...component,
          props: {
            ...component.props,
            items,
            _previewDataFailed: false,
            _previewDataDemo: true,
          },
        }
      }
      warnings.push(`${label}：接口未返回数据，请确认内容已发布`)
      return {
        ...component,
        props: {
          ...component.props,
          items: [],
          _previewDataFailed: true,
        },
      }
    }

    if (component.type === 'article_list') {
      return {
        ...component,
        props: {
          ...component.props,
          items: mapArticleItems(list, limit),
          _previewDataFailed: false,
        },
      }
    }

    if (component.type === 'product_list') {
      const ids = resolveProductIds(component)
      const sortKey = String(
        component.props?.sort
        || component.props?.sort_by
        || dataSource.params?.sort
        || '',
      )
      let items = ids.length
        ? pickProductsByIds(list, ids, limit)
        : mapProductItems(list, limit, sortKey)
      if (!items.length && isManualProduct) {
        items = manualProductItems(component, limit)
      }
      return {
        ...component,
        props: {
          ...component.props,
          items,
          _previewDataFailed: false,
        },
      }
    }
  } catch (error: any) {
    if (component.type === 'product_list') {
      const items = isManualProduct
        ? manualProductItems(component, limit)
        : demoProductItems(Math.min(limit, 2))
      warnings.push(`${label}：接口不可用，已用预览/已选商品数据`)
      return {
        ...component,
        props: {
          ...component.props,
          items,
          _previewDataFailed: false,
          _previewDataDemo: items.some((x) => String(x.id).startsWith('demo-')),
        },
      }
    }
    warnings.push(`${label}：${error?.message || '数据加载失败'}`)
    return {
      ...component,
      props: {
        ...component.props,
        items: [],
        _previewDataFailed: true,
      },
    }
  }

  return component
}

export async function loadHydratedComponent(component: ComponentInstance): Promise<ComponentInstance> {
  return hydrateComponent(component, [])
}

export async function hydratePreviewDsl(dsl: PageDSL): Promise<HydratePreviewResult> {
  if (!dsl?.components?.length) {
    return { dsl, warnings: [] }
  }

  const warnings: string[] = []
  const components = await Promise.all(dsl.components.map((comp) => hydrateComponent(comp, warnings)))
  return { dsl: { ...dsl, components }, warnings }
}
