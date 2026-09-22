/**
 * 商业变现运营台 API（/api/v1/admin/commerce-ops）
 */
import { get, post, put, del } from './request'

const BASE = '/api/v1/admin/commerce-ops'

export interface CommerceOverview {
  tiles?: Array<{ label: string; value: number | string; hint?: string }>
  todos?: Array<{ key: string; title: string; count: number; hint?: string; path?: string }>
  funnel?: Array<{ label: string; value: number }>
  productRank?: Array<{ productId?: number; name: string; revenue: number; orders?: number }>
  subtitle?: string
}

export interface RecallOrdersBody {
  orderIds?: number[]
  couponId?: number
  title?: string
  content?: string
}

export interface FlashPrice {
  id: number
  productId: number
  productName?: string
  originalPrice?: number
  flashPrice: number
  endAt: string
  status?: number | string
}

export interface CommerceSettings {
  mallTitle?: string
  mallIntro?: string
  mallGuarantees?: string
  showMallHeader?: boolean
  subscribeOrderStatus?: boolean
  subscribeShip?: boolean
  subscribeCouponExpire?: boolean
  subscribeRecall?: boolean
  autoCloseMinutes?: number
  virtualRefundRule?: string
  invoiceEnabled?: boolean
  invoiceNote?: string
  testAccounts?: string[]
}

export interface CommerceHealthIssue {
  key?: string
  tag?: string
  level?: string
  message: string
  actionLabel?: string
  actionPath?: string
}

export interface CommerceHealth {
  issues?: CommerceHealthIssue[]
  issueCount?: number
  notes?: string[]
}

/** 概览 */
export function getCommerceOverview() {
  return get<CommerceOverview>(`${BASE}/overview`)
}

/** 未付款召回 */
export function recallOrders(body: RecallOrdersBody) {
  return post<any>(`${BASE}/orders/recall`, body as unknown as Record<string, unknown>)
}

/** 商品测试标记 */
export function setProductTestFlag(id: number, isTest: boolean) {
  return put<void>(`${BASE}/products/${id}/test-flag`, { isTest } as unknown as Record<string, unknown>)
}

/** 订单测试标记 */
export function setOrderTestFlag(id: number, isTest: boolean) {
  return put<void>(`${BASE}/orders/${id}/test-flag`, { isTest } as unknown as Record<string, unknown>)
}

/** 限时价 */
export function listFlashPrices() {
  return get<FlashPrice[]>(`${BASE}/flash-prices`)
}

export function createFlashPrice(data: Partial<FlashPrice>) {
  return post<FlashPrice>(`${BASE}/flash-prices`, data as Record<string, unknown>)
}

export function updateFlashPrice(id: number, data: Partial<FlashPrice>) {
  return put<FlashPrice>(`${BASE}/flash-prices/${id}`, data as Record<string, unknown>)
}

export function deleteFlashPrice(id: number) {
  return del<void>(`${BASE}/flash-prices/${id}`)
}

/** 交易设置 */
export function getCommerceSettings() {
  return get<CommerceSettings>(`${BASE}/settings`)
}

export function putCommerceSettings(data: CommerceSettings) {
  return put<CommerceSettings>(`${BASE}/settings`, data as unknown as Record<string, unknown>)
}

/** 数据健康 */
export function getCommerceHealth() {
  return get<CommerceHealth>(`${BASE}/health`)
}
