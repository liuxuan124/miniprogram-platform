/**
 * 优惠券相关 API
 * 严格遵循接口契约
 */
import { get, post, put, del } from './request'
import type {
  CouponRecord,
  CreateCouponParams,
  UpdateCouponParams,
  CouponListParams,
  UserCouponRecord,
} from '@/types/coupon'
import type { PageResult } from '@/types/global'

const BASE_URL = '/api/v1/admin'

// ==================== 优惠券管理 ====================

/** 获取优惠券列表 */
export function getCouponList(params?: CouponListParams) {
  const query = params
    ? {
        page: params.page,
        size: params.page_size,
        status: params.status,
      }
    : undefined
  return get<PageResult<CouponRecord>>(`${BASE_URL}/coupons`, query as Record<string, unknown>)
}

/** 获取优惠券详情 */
export function getCouponDetail(id: number) {
  return get<CouponRecord>(`${BASE_URL}/coupons/${id}`)
}

/** 创建优惠券 */
export function createCoupon(data: CreateCouponParams) {
  return post<CouponRecord>(`${BASE_URL}/coupons`, data as unknown as Record<string, unknown>)
}

/** 更新优惠券 */
export function updateCoupon(id: number, data: UpdateCouponParams) {
  return put<CouponRecord>(`${BASE_URL}/coupons/${id}`, data as unknown as Record<string, unknown>)
}

/** 删除优惠券 */
export function deleteCoupon(id: number) {
  return del<void>(`${BASE_URL}/coupons/${id}`)
}

/** 发布优惠券 */
export function publishCoupon(id: number) {
  return put<CouponRecord>(`${BASE_URL}/coupons/${id}/publish`)
}

/** 停用优惠券 */
export function disableCoupon(id: number) {
  return put<CouponRecord>(`${BASE_URL}/coupons/${id}/disable`)
}

// ==================== 用户优惠券 ====================

/** 获取用户优惠券列表 */
export function getUserCouponList(params?: {
  page?: number
  page_size?: number
  keyword?: string
  status?: string
  coupon_id?: number
}) {
  const query = params
    ? {
        page: params.page,
        size: params.page_size,
        status: params.status,
      }
    : undefined
  return get<PageResult<UserCouponRecord>>(`${BASE_URL}/user-coupons`, query as Record<string, unknown>)
}
