/** 需要 data_source.type + query 的列表类组件。activity_entry 支持静态图文入口，数据源可选。 */
const DATA_SOURCE_EXPECTED_TYPE: Record<string, string> = {
  product_list: 'product',
  article_list: 'content',
  hot_news: 'content',
  activity_list: 'activity',
  coupon: 'coupon',
  appointment_service: 'appointment',
}

/**
 * 🔴 优惠券：手动自选模式下 data_source 毫无意义（券由面板手选、不发请求）。
 *   继续对它做「query 必填」校验，发布前会拦下一条**无法在界面上修复**的报错 ——
 *   运营看不到、也补不了（旧 data_source 还在 defaultProps 里，但新页面可能没有）。
 *   故手动模式直接跳过绑定校验；自动模式仍校验（端上要靠它取数）。
 */
function skipBindingCheck(type: string, props?: Record<string, any>): boolean {
  if (type !== 'coupon') return false
  return String(props?.data_mode || 'auto') === 'manual'
}

export function needsDataSourceBinding(type: string): boolean {
  return type in DATA_SOURCE_EXPECTED_TYPE
}

export function getDataSourceBinding(comp: { type: string; props?: Record<string, any> }) {
  if (!needsDataSourceBinding(comp.type)) return null
  if (skipBindingCheck(comp.type, comp.props)) return null
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
