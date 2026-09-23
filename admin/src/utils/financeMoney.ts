/** 金额展示：后端元字段 + 分字段 */
export function formatYuan(v: number | string | null | undefined): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return '0.00'
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatYuanShort(v: number | null | undefined): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return '¥0'
  if (Math.abs(n) >= 10000) return `¥${(n / 10000).toFixed(1)}万`
  return `¥${formatYuan(n)}`
}

export function yuanToCents(yuan: number): number {
  return Math.round(yuan * 100)
}

export function centsToYuan(cents: number): number {
  return cents / 100
}
