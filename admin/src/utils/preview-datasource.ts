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
    return { type: fallbackType, params: { status: 'published' } } as ComponentDataSource
  }

  const config = raw.config || {}
  const params = { ...(raw.params || {}), ...(config.params || {}) }

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
    ...(dataSource.params || {}),
  })

  const response = await fetch(`${apiPath}?${params.toString()}`)
  const payload = await response.json()
  if (payload.code !== 200) {
    throw new Error(payload.message || '接口请求失败')
  }
  return pickList(payload.data)
}

function formatArticleMeta(item: Record<string, any>): string {
  const summary = stripHtml(item.summary || item.description || item.meta)
  if (summary) return summary.length > 48 ? `${summary.slice(0, 48)}…` : summary
  const date = item.publishedAt || item.createTime || item.createdAt || item.created_at
  if (date) return String(date).slice(0, 10)
  return '品牌内容'
}

function mapArticleItems(list: any[], limit: number) {
  return list.slice(0, limit).map((item, index) => ({
    id: item.id || index + 1,
    title: item.title || item.name || '文章标题',
    meta: formatArticleMeta(item),
    cover: item.coverUrl || item.coverImage || item.cover || item.image || '',
  }))
}

function mapProductItems(list: any[], limit: number) {
  return list.slice(0, limit).map((item, index) => ({
    id: item.id || index + 1,
    name: item.name || item.title || '商品名称',
    price: String(item.price ?? '0.00'),
    image: item.coverUrl || item.coverImage || item.image || item.mainImage || '',
    sales: item.sales || item.salesCount || 0,
  }))
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

  try {
    const list = await fetchDataSourceList(dataSource, limit)
    if (!list.length) {
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
      return {
        ...component,
        props: {
          ...component.props,
          items: mapProductItems(list, limit),
          _previewDataFailed: false,
        },
      }
    }
  } catch (error: any) {
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

export async function hydratePreviewDsl(dsl: PageDSL): Promise<HydratePreviewResult> {
  if (!dsl?.components?.length) {
    return { dsl, warnings: [] }
  }

  const warnings: string[] = []
  const components = await Promise.all(dsl.components.map((comp) => hydrateComponent(comp, warnings)))
  return { dsl: { ...dsl, components }, warnings }
}
