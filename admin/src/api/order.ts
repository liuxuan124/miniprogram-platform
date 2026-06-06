/**
 * 订单与退款相关 API
 */
import request from './request'
import type {
  OrderRecord,
  OrderListParams,
  ShipParams,
  RefundApproveParams,
  RefundRecord,
  RefundListParams,
} from '@/types/order'
import type { PaginatedResponse } from '@/types/global'

const BASE = '/api/v1/admin'

// ==================== 订单 ====================

/** 获取订单列表 */
export function getOrderList(params?: OrderListParams) {
  return request.get<PaginatedResponse<OrderRecord>>(`${BASE}/orders`, { params })
}

/** 获取订单详情 */
export function getOrder(id: number) {
  return request.get<OrderRecord>(`${BASE}/orders/${id}`)
}

/** 发货 */
export function shipOrder(id: number, data: ShipParams) {
  return request.put(`${BASE}/orders/${id}/ship`, data)
}

/** 退款审批 */
export function refundApprove(id: number, data: RefundApproveParams) {
  return request.put(`${BASE}/orders/${id}/refund-approve`, data)
}

// ==================== 退款 ====================

/** 获取退款列表 */
export function getRefundList(params?: RefundListParams) {
  return request.get<PaginatedResponse<RefundRecord>>(`${BASE}/refunds`, { params })
}
