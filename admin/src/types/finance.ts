/**
 * 财务管理模块类型定义
 */

// ==================== 财务概览 ====================

/** 财务概览数据 */
export interface FinanceDashboard {
  totalIncome: number
  totalExpense: number
  netProfit: number
  pendingInvoiceCount: number
  budgetUsageRate: number
  incomeChange: number
  expenseChange: number
  profitChange: number
}

/** 收支趋势项 */
export interface FinanceTrendItem {
  date: string
  income: number
  expense: number
  profit: number
}

/** 收支分类汇总 */
export interface CategorySummary {
  category: string
  amount: number
  percentage: number
}

// ==================== 收支明细 ====================

/** 收支类型枚举 */
export type TransactionType = 'income' | 'expense'

/** 收支记录 */
export interface TransactionRecord {
  id: number
  type: TransactionType
  amount: number
  category: string
  subCategory: string
  description: string
  transactionDate: string
  paymentMethod: string
  counterparty: string
  invoiceStatus: 'none' | 'pending' | 'received' | 'issued'
  approvalStatus: 'pending' | 'approved' | 'rejected'
  createdBy: string
  createdAt: string
  updatedAt: string
}

/** 收支列表查询参数 */
export interface TransactionListParams {
  page?: number
  pageSize?: number
  keyword?: string
  type?: TransactionType
  category?: string
  startDate?: string
  endDate?: string
  approvalStatus?: string
  invoiceStatus?: string
}

/** 创建/编辑收支记录参数 */
export interface TransactionFormData {
  id?: number
  type: TransactionType
  amount: number
  category: string
  subCategory: string
  description: string
  transactionDate: string
  paymentMethod: string
  counterparty: string
  invoiceStatus?: string
}

/** 收支分类 */
export interface TransactionCategory {
  id: number
  name: string
  type: TransactionType
  parentId: number | null
  children?: TransactionCategory[]
}

// ==================== 财务报表 ====================

/** 报表类型 */
export type ReportType = 'income_expense' | 'profit_loss' | 'cash_flow' | 'category_analysis'

/** 报表查询参数 */
export interface ReportQueryParams {
  reportType: ReportType
  startDate: string
  endDate: string
  granularity?: 'day' | 'week' | 'month' | 'quarter' | 'year'
  category?: string
  department?: string
}

/** 利润表数据 */
export interface ProfitLossData {
  revenue: number
  costOfGoods: number
  grossProfit: number
  operatingExpenses: number
  operatingIncome: number
  otherIncome: number
  otherExpense: number
  profitBeforeTax: number
  incomeTax: number
  netProfit: number
}

/** 现金流数据 */
export interface CashFlowData {
  operatingInflow: number
  operatingOutflow: number
  operatingNet: number
  investingInflow: number
  investingOutflow: number
  investingNet: number
  financingInflow: number
  financingOutflow: number
  financingNet: number
  totalNetCashFlow: number
  beginningBalance: number
  endingBalance: number
}

/** 分类分析数据 */
export interface CategoryAnalysisItem {
  category: string
  currentAmount: number
  previousAmount: number
  changeRate: number
  percentage: number
}

// ==================== 预算管理 ====================

/** 预算状态 */
export type BudgetStatus = 'draft' | 'active' | 'completed' | 'overdue'

/** 预算记录 */
export interface BudgetRecord {
  id: number
  name: string
  period: string
  startDate: string
  endDate: string
  totalBudget: number
  usedAmount: number
  remainingAmount: number
  usageRate: number
  status: BudgetStatus
  departments: string[]
  items: BudgetItem[] | string
  createdBy: string
  createdAt: string
  updatedAt: string
}

/** 预算科目项 */
export interface BudgetItem {
  id: number
  category: string
  budgetAmount: number
  usedAmount: number
  remainingAmount: number
  alertThreshold: number
  isAlert: boolean
}

/** 预算预警 */
export interface BudgetAlert {
  id: number
  budgetId: number
  budgetName: string
  category: string
  budgetAmount: number
  usedAmount: number
  usageRate: number
  alertThreshold: number
  alertTime: string
  level: 'warning' | 'danger'
  handled: boolean
}

/** 创建/编辑预算参数 */
export interface BudgetFormData {
  id?: number
  name: string
  period: string
  startDate: string
  endDate: string
  totalBudget: number
  departments: string[]
  items: Omit<BudgetItem, 'id' | 'usedAmount' | 'remainingAmount' | 'isAlert'>[]
}

// ==================== 发票管理 ====================

/** 发票类型 */
export type InvoiceType = 'vat_special' | 'vat_normal' | 'receipt'

/** 发票状态 */
export type InvoiceStatus = 'draft' | 'pending' | 'issued' | 'received' | 'verified' | 'cancelled'

/** 发票记录 */
export interface InvoiceRecord {
  id: number
  invoiceNumber: string
  invoiceType: InvoiceType
  invoiceStatus: InvoiceStatus
  amount: number
  taxAmount: number
  totalAmount: number
  taxRate: number
  issuer: string
  receiver: string
  issueDate: string
  dueDate: string
  transactionId: number | null
  description: string
  attachmentUrl: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

/** 发票列表查询参数 */
export interface InvoiceListParams {
  page?: number
  pageSize?: number
  keyword?: string
  invoiceType?: InvoiceType
  invoiceStatus?: InvoiceStatus
  startDate?: string
  endDate?: string
}

/** 创建/编辑发票参数 */
export interface InvoiceFormData {
  id?: number
  invoiceNumber: string
  invoiceType: InvoiceType
  amount: number
  taxRate: number
  issuer: string
  receiver: string
  issueDate: string
  dueDate: string
  transactionId?: number | null
  description: string
}

/** 税务计算结果 */
export interface TaxCalcResult {
  taxableIncome: number
  vatAmount: number
  surcharge: number
  incomeTax: number
  totalTax: number
  afterTaxIncome: number
}

// ==================== 财务权限 ====================

/** 权限级别 */
export type PermissionLevel = 'viewer' | 'editor' | 'approver' | 'admin'

/** 财务角色 */
export interface FinanceRole {
  id: number
  name: string
  level: PermissionLevel
  description: string
  permissions: string[]
  memberCount: number
  createdAt: string
}

/** 财务权限记录 */
export interface FinancePermission {
  id: number
  userId: number
  username: string
  realName: string
  role: FinanceRole
  scope: string[]
  dataRange: 'self' | 'department' | 'all'
  createdAt: string
  updatedAt: string
}

/** 权限分配参数 */
export interface PermissionAssignParams {
  userId: number
  roleId: number
  scope: string[]
  dataRange: 'self' | 'department' | 'all'
}

// ==================== 数据同步 ====================

/** 同步状态 */
export interface SyncStatus {
  lastSyncTime: string
  syncSource: string
  syncStatus: 'idle' | 'syncing' | 'success' | 'failed'
  recordCount: number
  errorMessage?: string
}

/** 同步配置 */
export interface SyncConfig {
  id: number
  source: string
  sourceName: string
  enabled: boolean
  syncInterval: number
  lastSyncTime: string
  autoSync: boolean
}

// ==================== 枚举标签映射 ====================

export const TransactionTypeLabels: Record<TransactionType, string> = {
  income: '收入',
  expense: '支出',
}

export const InvoiceTypeLabels: Record<InvoiceType, string> = {
  vat_special: '增值税专用发票',
  vat_normal: '增值税普通发票',
  receipt: '收据',
}

export const InvoiceStatusLabels: Record<InvoiceStatus, string> = {
  draft: '草稿',
  pending: '待开具',
  issued: '已开具',
  received: '已收到',
  verified: '已核验',
  cancelled: '已作废',
}

export const BudgetStatusLabels: Record<BudgetStatus, string> = {
  draft: '草稿',
  active: '执行中',
  completed: '已完成',
  overdue: '已逾期',
}

export const PermissionLevelLabels: Record<PermissionLevel, string> = {
  viewer: '查看者',
  editor: '编辑者',
  approver: '审批者',
  admin: '管理员',
}

export const ApprovalStatusLabels: Record<string, string> = {
  pending: '待审批',
  approved: '已审批',
  rejected: '已驳回',
}

export const PaymentMethodLabels: Record<string, string> = {
  bank_transfer: '银行转账',
  alipay: '支付宝',
  wechat: '微信支付',
  cash: '现金',
  check: '支票',
  other: '其他',
}
