/**
 * 优惠券折扣展示：兼容 0.9（倍率）与 9 / 8.5（折）两种存法。
 */
export function formatPercentDiscount(value: number | string | null | undefined): string {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return '—'
  // 0 < n <= 1 视为倍率（0.9 = 九折）；>1 视为直接「折」
  const zhe = n > 0 && n <= 1 ? n * 10 : n
  const text = Number.isInteger(zhe)
    ? String(zhe)
    : String(Number(zhe.toFixed(1))).replace(/\.0$/, '')
  return `${text}折`
}
