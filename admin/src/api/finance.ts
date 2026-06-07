/**
 * 财务管理 API
 */
import request from './request'
import service from './request'
import type { PaginatedResponse } from '@/types/global'
import type {
  FinanceDashboard,
  FinanceTrendItem,
  CategorySummary,
  TransactionRecord,
  TransactionListParams,
  TransactionFormData,
  TransactionCategory,
  ReportQueryParams,
  ProfitLossData,
  CashFlowData,
  CategoryAnalysisItem,
  BudgetRecord,
  BudgetFormData,
  BudgetAlert,
  InvoiceRecord,
  InvoiceListParams,
  InvoiceFormData,
  TaxCalcResult,
  FinanceRole,
  FinancePermission,
  PermissionAssignParams,
  SyncStatus,
  SyncConfig,
} from '@/types/finance'

const BASE = '/api/v1/admin/finance'

// ==================== 财务概览 ====================

/** 获取财务概览数据 */
export function getFinanceDashboard() {
  return request.get<FinanceDashboard>(`${BASE}/dashboard`)
}

/** 获取收支趋势 */
export function getFinanceTrend(params: { startDate: string; endDate: string; granularity?: string }) {
  return request.get<FinanceTrendItem[]>(`${BASE}/trend`, { params })
}

/** 获取收入分类汇总 */
export function getIncomeCategorySummary(params: { startDate: string; endDate: string }) {
  return request.get<CategorySummary[]>(`${BASE}/income-category-summary`, { params })
}

/** 获取支出分类汇总 */
export function getExpenseCategorySummary(params: { startDate: string; endDate: string }) {
  return request.get<CategorySummary[]>(`${BASE}/expense-category-summary`, { params })
}

// ==================== 收支明细 ====================

/** 获取收支记录列表 */
export function getTransactionList(params?: TransactionListParams) {
  return request.get<PaginatedResponse<TransactionRecord>>(`${BASE}/transactions`, { params })
}

/** 获取收支记录详情 */
export function getTransaction(id: number) {
  return request.get<TransactionRecord>(`${BASE}/transactions/${id}`)
}

/** 创建收支记录 */
export function createTransaction(data: TransactionFormData) {
  return request.post<TransactionRecord>(`${BASE}/transactions`, data)
}

/** 更新收支记录 */
export function updateTransaction(id: number, data: TransactionFormData) {
  return request.put<TransactionRecord>(`${BASE}/transactions/${id}`, data)
}

/** 删除收支记录 */
export function deleteTransaction(id: number) {
  return request.delete(`${BASE}/transactions/${id}`)
}

/** 审批收支记录 */
export function approveTransaction(id: number, status: 'approved' | 'rejected', reason?: string) {
  return request.put(`${BASE}/transactions/${id}/approve`, { approvalStatus: status, reason })
}

/** 批量导入收支记录 */
export function importTransactions(data: FormData) {
  return request.post(`${BASE}/transactions/import`, data)
}

/** 导出收支记录 */
export function exportTransactions(params?: TransactionListParams) {
  return service.get(`${BASE}/transactions/export`, {
    params,
    responseType: 'blob',
  })
}

/** 获取收支分类列表 */
export function getTransactionCategories(type?: string) {
  return request.get<TransactionCategory[]>(`${BASE}/transaction-categories`, { params: { type } })
}

// ==================== 财务报表 ====================

/** 获取利润表 */
export function getProfitLossReport(params: ReportQueryParams) {
  return request.get<ProfitLossData>(`${BASE}/reports/profit-loss`, { params })
}

/** 获取现金流报表 */
export function getCashFlowReport(params: ReportQueryParams) {
  return request.get<CashFlowData>(`${BASE}/reports/cash-flow`, { params })
}

/** 获取分类分析报表 */
export function getCategoryAnalysisReport(params: ReportQueryParams) {
  return request.get<CategoryAnalysisItem[]>(`${BASE}/reports/category-analysis`, { params })
}

/** 导出报表 */
export function exportReport(params: ReportQueryParams) {
  return service.get(`${BASE}/reports/export`, {
    params,
    responseType: 'blob',
  })
}

// ==================== 预算管理 ====================

/** 获取预算列表 */
export function getBudgetList(params?: { page?: number; pageSize?: number; status?: string; keyword?: string }) {
  return request.get<PaginatedResponse<BudgetRecord>>(`${BASE}/budgets`, { params })
}

/** 获取预算详情 */
export function getBudget(id: number) {
  return request.get<BudgetRecord>(`${BASE}/budgets/${id}`)
}

/** 创建预算 */
export function createBudget(data: BudgetFormData) {
  return request.post<BudgetRecord>(`${BASE}/budgets`, data)
}

/** 更新预算 */
export function updateBudget(id: number, data: BudgetFormData) {
  return request.put<BudgetRecord>(`${BASE}/budgets/${id}`, data)
}

/** 删除预算 */
export function deleteBudget(id: number) {
  return request.delete(`${BASE}/budgets/${id}`)
}

/** 启用预算 */
export function activateBudget(id: number) {
  return request.put<BudgetRecord>(`${BASE}/budgets/${id}/activate`)
}

/** 获取预算预警列表 */
export function getBudgetAlerts(params?: { handled?: boolean }) {
  return request.get<BudgetAlert[]>(`${BASE}/budgets/alerts`, { params })
}

/** 处理预算预警 */
export function handleBudgetAlert(id: number, note: string) {
  return request.put(`${BASE}/budgets/alerts/${id}/handle`, { note })
}

// ==================== 发票管理 ====================

/** 获取发票列表 */
export function getInvoiceList(params?: InvoiceListParams) {
  return request.get<PaginatedResponse<InvoiceRecord>>(`${BASE}/invoices`, { params })
}

/** 获取发票详情 */
export function getInvoice(id: number) {
  return request.get<InvoiceRecord>(`${BASE}/invoices/${id}`)
}

/** 创建发票 */
export function createInvoice(data: InvoiceFormData) {
  return request.post<InvoiceRecord>(`${BASE}/invoices`, data)
}

/** 更新发票 */
export function updateInvoice(id: number, data: InvoiceFormData) {
  return request.put<InvoiceRecord>(`${BASE}/invoices/${id}`, data)
}

/** 删除发票 */
export function deleteInvoice(id: number) {
  return request.delete(`${BASE}/invoices/${id}`)
}

/** 核验发票 */
export function verifyInvoice(id: number) {
  return request.put(`${BASE}/invoices/${id}/verify`)
}

/** 作废发票 */
export function cancelInvoice(id: number, reason: string) {
  return request.put(`${BASE}/invoices/${id}/cancel`, { reason })
}

/** 税务计算 */
export function calculateTax(data: { amount: number; taxRate: number; type: string }) {
  return request.post<TaxCalcResult>(`${BASE}/tax/calculate`, data)
}

// ==================== 财务权限 ====================

/** 获取财务角色列表 */
export function getFinanceRoles() {
  return request.get<FinanceRole[]>(`${BASE}/roles`)
}

/** 创建/更新财务角色 */
export function saveFinanceRole(data: Partial<FinanceRole> & { id?: number }) {
  return data.id
    ? request.put<FinanceRole>(`${BASE}/roles/${data.id}`, data)
    : request.post<FinanceRole>(`${BASE}/roles`, data)
}

/** 删除财务角色 */
export function deleteFinanceRole(id: number) {
  return request.delete(`${BASE}/roles/${id}`)
}

/** 获取财务权限列表 */
export function getFinancePermissions(params?: { roleId?: number }) {
  return request.get<FinancePermission[]>(`${BASE}/permissions`, { params })
}

/** 分配财务权限 */
export function assignPermission(data: PermissionAssignParams) {
  return request.post(`${BASE}/permissions`, data)
}

/** 更新财务权限 */
export function updatePermission(id: number, data: PermissionAssignParams) {
  return request.put(`${BASE}/permissions/${id}`, data)
}

/** 移除财务权限 */
export function removePermission(id: number) {
  return request.delete(`${BASE}/permissions/${id}`)
}

// ==================== 数据同步 ====================

/** 获取同步状态 */
export function getSyncStatus() {
  return request.get<SyncStatus>(`${BASE}/sync/status`)
}

/** 触发手动同步 */
export function triggerSync(source?: string) {
  return request.post(`${BASE}/sync/trigger`, { source })
}

/** 获取同步配置列表 */
export function getSyncConfigs() {
  return request.get<SyncConfig[]>(`${BASE}/sync/configs`)
}

/** 更新同步配置 */
export function updateSyncConfig(id: number, data: Partial<SyncConfig>) {
  return request.put(`${BASE}/sync/configs/${id}`, data)
}
