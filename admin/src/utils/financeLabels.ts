const PERIOD: Record<string, string> = {
  yearly: '年度',
  year: '年度',
  quarterly: '季度',
  quarter: '季度',
  monthly: '月度',
  month: '月度',
}

const BUDGET_STATUS: Record<string, string> = {
  draft: '草稿',
  active: '启用中',
  completed: '已结束',
  overdue: '已逾期',
}

const INVOICE_STATUS: Record<string, string> = {
  draft: '草稿',
  pending: '待开',
  issued: '已开具',
  received: '已收到',
  verified: '已核验',
  cancelled: '已作废',
}

const INVOICE_TYPE: Record<string, string> = {
  vat_special: '增值税专用发票',
  vat_normal: '增值税普通发票',
  receipt: '收据',
}

export function labelBudgetPeriod(raw?: string): string {
  if (!raw) return '—'
  return PERIOD[raw.toLowerCase()] || raw
}

export function labelBudgetStatus(raw?: string): string {
  if (!raw) return '—'
  return BUDGET_STATUS[raw] || raw
}

export function labelInvoiceStatus(raw?: string): string {
  if (!raw) return '—'
  return INVOICE_STATUS[raw] || raw
}

export function labelInvoiceType(raw?: string): string {
  if (!raw) return '—'
  return INVOICE_TYPE[raw] || raw
}

export const INCOME_CATEGORIES = ['会员', '资料', '课程', '实物', '服务/咨询'] as const
export const EXPENSE_CATEGORIES = ['服务器与域名', '软件订阅', '外包与协作', '推广投放', '内容采购', '其他'] as const
