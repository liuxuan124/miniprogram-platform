/** 商品列表按售价筛选（与 admin product-price-filter.ts 保持一致） */

function resolveProductNumericPrice(item) {
  if (!item) return 0
  const raw = item.price ?? item.min_price ?? item.minPrice ?? (item.skus && item.skus[0] && item.skus[0].price) ?? 0
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

function resolvePriceFilterConfig(source) {
  const props = source || {}
  const ds = props.data_source || props.dataSource || {}
  const query = Object.assign({}, ds.query || {}, ds.params || {}, (ds.config && ds.config.params) || {})
  const modeRaw = String(query.price_filter || props.price_filter || 'all').trim()
  const allowed = ['all', 'free_only', 'exclude_free', 'above_1', 'above_99', 'custom']
  const mode = allowed.indexOf(modeRaw) >= 0 ? modeRaw : 'all'
  return {
    mode,
    price_min: query.price_min != null ? query.price_min : props.price_min,
    price_max: query.price_max != null ? query.price_max : props.price_max,
  }
}

function matchesPriceFilter(item, config) {
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

function filterProductsByPrice(items, config) {
  if (!Array.isArray(items) || !config || config.mode === 'all') return items || []
  return items.filter(function (item) { return matchesPriceFilter(item, config) })
}

function priceFilterNeedsWideFetch(config) {
  return config && config.mode !== 'all'
}

module.exports = {
  resolveProductNumericPrice,
  resolvePriceFilterConfig,
  matchesPriceFilter,
  filterProductsByPrice,
  priceFilterNeedsWideFetch,
}
