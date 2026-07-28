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
  OrderStatistics,
} from '@/types/order'
import type { PaginatedResponse } from '@/types/global'

const BASE = '/api/v1/admin'

function normalizeOrder(raw: any): OrderRecord {
  const items = (raw?.items || []).map((item: any) => ({
    ...item,
    product_id: item.product_id ?? item.productId,
    product_name: item.product_name ?? item.productName,
    sku_id: item.sku_id ?? item.skuId,
    sku_specs: item.sku_specs ?? item.skuName,
    sku_image: item.sku_image ?? item.productImage,
  }))
  return {
    ...raw,
    order_no: raw?.order_no ?? raw?.orderNo,
    user_id: raw?.user_id ?? raw?.userId,
    total_amount: raw?.total_amount ?? raw?.totalAmount,
    pay_amount: raw?.pay_amount ?? raw?.payAmount,
    freight_amount: raw?.freight_amount ?? raw?.freightAmount,
    discount_amount: raw?.discount_amount ?? raw?.discountAmount,
    fulfillment_type: raw?.fulfillment_type ?? raw?.fulfillmentType,
    virtual_delivery_content: raw?.virtual_delivery_content ?? raw?.virtualDeliveryContent,
    shipping_company: raw?.shipping_company ?? raw?.logisticsCompany,
    shipping_no: raw?.shipping_no ?? raw?.logisticsNo,
    payment_time: raw?.payment_time ?? raw?.paidAt,
    shipping_time: raw?.shipping_time ?? raw?.shippedAt,
    created_at: raw?.created_at ?? raw?.createdAt,
    updated_at: raw?.updated_at ?? raw?.updatedAt,
    items,
  } as OrderRecord
}

// ==================== 订单 ====================

/** 获取订单列表 */
export async function getOrderList(params?: OrderListParams) {
  const response = await request.get<PaginatedResponse<OrderRecord>>(`${BASE}/orders`, {
    params: {
      current: params?.page,
      size: params?.page_size,
      orderNo: params?.keyword,
      status: params?.status,
    },
  })
  const records = (response.data?.records || response.data?.items || []).map(normalizeOrder)
  response.data = { ...response.data, records, items: records }
  return response
}

/** 获取订单详情 */
export async function getOrder(id: number) {
  const response = await request.get<OrderRecord>(`${BASE}/orders/${id}`)
  response.data = normalizeOrder(response.data)
  return response
}

/** 发货 */
export function shipOrder(id: number, data: ShipParams) {
  return request.put(`${BASE}/orders/${id}/ship`, data)
}

/** 退款审批 */
export function refundApprove(id: number, data: RefundApproveParams) {
  return request.put(`${BASE}/orders/${id}/refund-approve`, data)
}

/** 订单统计（真实数据） */
export function getOrderStatistics() {
  return request.get<OrderStatistics>(`${BASE}/orders/statistics`)
}

// ==================== 退款 ====================

/** 获取退款列表 */
export function getRefundList(params?: RefundListParams) {
  return request.get<PaginatedResponse<RefundRecord>>(`${BASE}/refunds`, { params })
}
