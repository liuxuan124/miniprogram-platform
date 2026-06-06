import request from './request'

// 数据统计
export function getDashboard() {
  return request.get('/api/v1/admin/statistics/dashboard')
}

export function getSalesTrend(params: { start_date: string; end_date: string; granularity: string }) {
  return request.get('/api/v1/admin/statistics/sales-trend', { params })
}

export function getProductRanking(type: string = 'sales', limit: number = 10) {
  return request.get('/api/v1/admin/statistics/product-ranking', { params: { type, limit } })
}

export function getUserGrowth(start_date: string, end_date: string) {
  return request.get('/api/v1/admin/statistics/user-growth', { params: { start_date, end_date } })
}

export function getPageAccess(start_date: string, end_date: string) {
  return request.get('/api/v1/admin/statistics/page-access', { params: { start_date, end_date } })
}