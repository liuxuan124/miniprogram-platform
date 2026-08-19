export type PriceFilterMode =
  | 'all'
  | 'free_only'
  | 'exclude_free'
  | 'above_1'
  | 'above_99'
  | 'custom'

export type PriceFilterConfig = {
  mode: PriceFilterMode
  price_min?: number | string | null
  price_max?: number | string | null
}

export const PRICE_FILTER_OPTIONS: Array<{ value: PriceFilterMode; label: string; hint: string }> = [
  { value: 'all', label: '全部价格', hint: '不按价格过滤' },
  { value: 'free_only', label: '仅免费（¥0）', hint: '适合「领取工具」等免费区' },
  { value: 'exclude_free', label: '排除免费（> ¥0）', hint: '隐藏免费商品，展示付费内容' },
  { value: 'above_1', label: '1元以上（> ¥1）', hint: '排除 0 元与 1 元测试价' },
  { value: 'above_99', label: '99元及以上', hint: '主力知识库/高客单' },
  { value: 'custom', label: '自定义区间', hint: '自行设定最低价/最高价' },
]

export function resolveProductNumericPrice(item: Record<string, unknown>): number {
  const raw = item.price ?? item.min_price ?? item.minPrice ?? (item.skus as any)?.[0]?.price ?? 0
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

export function resolvePriceFilterConfig(source: Record<string, unknown> | null | undefined): PriceFilterConfig {
  const ds = (source?.data_source || {}) as Record<string, unknown>
  const query = {
    ...((ds.query as Record<string, unknown>) || {}),
    ...((ds.params as Record<string, unknown>) || {}),
    ...(((ds.config as Record<string, unknown>)?.params as Record<string, unknown>) || {}),
  }
  const modeRaw = String(query.price_filter ?? source?.price_filter ?? 'all').trim() as PriceFilterMode
  const mode = PRICE_FILTER_OPTIONS.some((o) => o.value === modeRaw) ? modeRaw : 'all'
  return {
    mode,
    price_min: query.price_min ?? source?.price_min,
    price_max: query.price_max ?? source?.price_max,
  }
}

export function matchesPriceFilter(item: Record<string, unknown>, config: PriceFilterConfig): boolean {
  const price = resolveProductNumericPrice(item)
  switch (config.mode) {
    case 'free_only':
      return price === 0
    case 'exclude_free':
      return price > 0
    case 'above_1':
      return price > 1
    case 'above_99':
      return price >= 99
    case 'custom': {
      const minRaw = config.price_min
      const maxRaw = config.price_max
      const min = minRaw != null && minRaw !== '' ? Number(minRaw) : null
      const max = maxRaw != null && maxRaw !== '' ? Number(maxRaw) : null
      if (min != null && Number.isFinite(min) && price < min) return false
      if (max != null && Number.isFinite(max) && price > max) return false
      return true
    }
    default:
      return true
  }
}

export function filterProductsByPrice<T extends Record<string, unknown>>(
  items: T[],
  config: PriceFilterConfig,
): T[] {
  if (!Array.isArray(items) || config.mode === 'all') return items
  return items.filter((item) => matchesPriceFilter(item, config))
}

export function priceFilterNeedsWideFetch(config: PriceFilterConfig): boolean {
  return config.mode !== 'all'
}
