/**
 * 订单与退款相关类型定义
 */

/** 订单状态 */
export enum OrderStatus {
  PendingPayment = 'pending_payment',
  Paid = 'paid',
  Shipped = 'shipped',
  Completed = 'completed',
  Closed = 'closed',
  Refunding = 'refunding',
  Refunded = 'refunded',
}

/** 订单状态标签 */
export const OrderStatusLabels: Record<OrderStatus, string> = {
  [OrderStatus.PendingPayment]: '待付款',
  [OrderStatus.Paid]: '已付款',
  [OrderStatus.Shipped]: '已发货',
  [OrderStatus.Completed]: '已完成',
  [OrderStatus.Closed]: '已关闭',
  [OrderStatus.Refunding]: '退款中',
  [OrderStatus.Refunded]: '已退款',
}

/** 订单状态标签类型 */
export const OrderStatusTagType: Record<OrderStatus, string> = {
  [OrderStatus.PendingPayment]: 'warning',
  [OrderStatus.Paid]: 'primary',
  [OrderStatus.Shipped]: '',
  [OrderStatus.Completed]: 'success',
  [OrderStatus.Closed]: 'info',
  [OrderStatus.Refunding]: 'danger',
  [OrderStatus.Refunded]: 'success',
}

/** 订单商品项 */
export interface OrderItem {
  id: number
  product_id: number
  product_name: string
  sku_id: number
  sku_specs?: string
  sku_image?: string
  price: number
  quantity: number
  subtotal: number
}

/** 订单记录（列表项） */
export interface OrderRecord {
  id: number
  order_no: string
  user_id: number
  user_nickname?: string
  user_avatar?: string
  items: OrderItem[]
  total_amount: number
  pay_amount: number
  freight_amount: number
  discount_amount: number
  status: OrderStatus | string
  remark?: string
  payment_method?: string
  payment_time?: string
  shipping_company?: string
  shipping_no?: string
  shipping_time?: string
  confirm_time?: string
  close_time?: string
  refund_status?: string
  created_at: string
  updated_at: string
}

/** 订单列表查询参数 */
export interface OrderListParams {
  page?: number
  page_size?: number
  keyword?: string
  status?: string
  start_date?: string
  end_date?: string
}

/** 发货参数 */
export interface ShipParams {
  shipping_company: string
  shipping_no: string
}

/** 退款审批参数 */
export interface RefundApproveParams {
  approved: boolean
  reason?: string
}

/** 退款状态 */
export enum RefundStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
  Completed = 'completed',
}

/** 退款状态标签 */
export const RefundStatusLabels: Record<RefundStatus, string> = {
  [RefundStatus.Pending]: '待审批',
  [RefundStatus.Approved]: '已同意',
  [RefundStatus.Rejected]: '已拒绝',
  [RefundStatus.Completed]: '已退款',
}

/** 退款状态标签类型 */
export const RefundStatusTagType: Record<RefundStatus, string> = {
  [RefundStatus.Pending]: 'warning',
  [RefundStatus.Approved]: 'success',
  [RefundStatus.Rejected]: 'danger',
  [RefundStatus.Completed]: 'info',
}

/** 退款记录 */
export interface RefundRecord {
  id: number
  refund_no: string
  order_id: number
  order_no: string
  user_id: number
  user_nickname?: string
  user_phone?: string
  product_name?: string
  product_type?: string
  amount: number
  reason: string
  status: RefundStatus | string
  images?: string[]
  approved_by?: string
  approved_at?: string
  reject_reason?: string
  created_at: string
  updated_at: string
}

/** 退款列表查询参数 */
export interface RefundListParams {
  page?: number
  page_size?: number
  keyword?: string
  status?: string
  start_date?: string
  end_date?: string
}
