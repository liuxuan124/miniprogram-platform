/** 商品价格为 0 时的展示方式 */
export type ZeroPriceDisplay = 'amount' | 'free'

export function isZeroProductPrice(price: unknown): boolean {
  const n = Number(price)
  return Number.isFinite(n) && n === 0
}

/** 列表/卡片上展示用的价格文案（含是否带 ¥ 前缀） */
export function formatProductPriceLabel(
  price: unknown,
  zeroPriceDisplay: unknown,
  freeText = '免费领取',
): { text: string; withYuan: boolean } {
  const mode = zeroPriceDisplay === 'free' ? 'free' : 'amount'
  if (isZeroProductPrice(price) && mode === 'free') {
    return { text: freeText, withYuan: false }
  }
  const n = Number(price)
  const amount = Number.isFinite(n) ? n.toFixed(2) : String(price ?? '0.00')
  return { text: amount, withYuan: true }
}

/** 销量/已领文案：免费商品（售价 0）显示「已领」，其余显示「已售」，数据均来自 sales */
export function formatProductSalesLabel(price: unknown, sales: unknown): string {
  const count = Number(sales)
  const n = Number.isFinite(count) ? count : 0
  return `${isZeroProductPrice(price) ? '已领' : '已售'}${n}`
}
