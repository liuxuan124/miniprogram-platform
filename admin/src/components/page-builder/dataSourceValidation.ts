/** 需要 data_source.type + query 的列表类组件。activity_entry 支持静态图文入口，数据源可选。 */
const DATA_SOURCE_EXPECTED_TYPE: Record<string, string> = {
  product_list: 'product',
  article_list: 'content',
  activity_list: 'activity',
  coupon: 'coupon',
  appointment_service: 'appointment',
}

export function needsDataSourceBinding(type: string): boolean {
  return type in DATA_SOURCE_EXPECTED_TYPE
}

export function getDataSourceBinding(comp: { type: string; props?: Record<string, any> }) {
  if (!needsDataSourceBinding(comp.type)) return null
  const ds = comp.props?.data_source
  const type = ds?.type ? String(ds.type) : ''
  const query = ds?.query
  const queryOk = query && typeof query === 'object' && Object.keys(query).length > 0
  return {
    expectedType: DATA_SOURCE_EXPECTED_TYPE[comp.type],
    type,
    typeOk: Boolean(type),
    query,
    queryOk,
    queryKeyCount: queryOk ? Object.keys(query as object).length : 0,
    issues: [
      ...(type ? [] : ['数据源 type 为必填']),
      ...(queryOk ? [] : ['数据源 query 为必填']),
    ],
  }
}

export function collectDataSourceIssues(components: Array<{ type: string; props?: Record<string, any> }>): string[] {
  const issues: string[] = []
  components.forEach((comp) => {
    const binding = getDataSourceBinding(comp)
    if (!binding) return
    const label = comp.type
    binding.issues.forEach((msg) => issues.push(`${label}：${msg}`))
  })
  return issues
}
