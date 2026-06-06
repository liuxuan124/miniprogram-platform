export interface DashboardData {
  todayOrderCount: number
  todayOrderAmount: number
  todayNewUsers: number
  todayPageViews: number
  yesterdayOrderCount: number
  yesterdayOrderAmount: number
  yesterdayNewUsers: number
  yesterdayPageViews: number
  orderCountChange: number
  orderAmountChange: number
  newUserChange: number
  pageViewChange: number
}

export interface SalesTrendItem {
  date: string
  orderCount: number
  orderAmount: number
}

export interface ProductRankingItem {
  productId: number
  productName: string
  mainImage: string
  salesCount: number
  salesAmount: number
}

export interface UserGrowthItem {
  date: string
  newUsers: number
  totalUsers: number
}

export interface PageAccessItem {
  pagePath: string
  visitCount: number
}