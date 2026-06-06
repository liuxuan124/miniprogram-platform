/**
 * 优惠券相关类型定义
 */

/** 优惠券类型 */
export enum CouponType {
  Fixed = 'fixed', // 满减券
  Percent = 'percent', // 折扣券
}

/** 优惠券类型标签 */
export const CouponTypeLabels: Record<CouponType, string> = {
  [CouponType.Fixed]: '满减券',
  [CouponType.Percent]: '折扣券',
}

/** 优惠券状态 */
export enum CouponStatus {
  Draft = 'draft', // 草稿
  Published = 'published', // 已发布
  Disabled = 'disabled', // 已停用
  Expired = 'expired', // 已过期
}

/** 优惠券状态标签 */
export const CouponStatusLabels: Record<CouponStatus, string> = {
  [CouponStatus.Draft]: '草稿',
  [CouponStatus.Published]: '已发布',
  [CouponStatus.Disabled]: '已停用',
  [CouponStatus.Expired]: '已过期',
}

/** 优惠券状态标签类型 */
export const CouponStatusTagType: Record<CouponStatus, string> = {
  [CouponStatus.Draft]: 'info',
  [CouponStatus.Published]: 'success',
  [CouponStatus.Disabled]: 'danger',
  [CouponStatus.Expired]: 'warning',
}

/** 适用范围 */
export enum CouponScope {
  All = 'all', // 全场通用
  Category = 'category', // 指定分类
  Product = 'product', // 指定商品
}

/** 适用范围标签 */
export const CouponScopeLabels: Record<CouponScope, string> = {
  [CouponScope.All]: '全场通用',
  [CouponScope.Category]: '指定分类',
  [CouponScope.Product]: '指定商品',
}

/** 优惠券记录 */
export interface CouponRecord {
  id: number
  name: string
  type: CouponType
  status: CouponStatus
  scope: CouponScope
  scopeIds?: number[] // 适用分类/商品 ID 列表
  value: number // 优惠金额（满减）或折扣率（折扣，如 85 表示 8.5 折）
  minOrderAmount: number // 最低消费金额
  totalCount: number // 发放总量，-1 表示不限量
  usedCount: number // 已使用数量
  perUserLimit: number // 每人限领数量
  startTime: string // 生效开始时间
  endTime: string // 生效结束时间
  validDays?: number // 领取后有效天数（与固定时间二选一）
  description?: string
  createdAt: string
  updatedAt: string
}

/** 创建优惠券参数 */
export interface CreateCouponParams {
  name: string
  type: CouponType
  scope?: CouponScope
  scopeIds?: number[]
  value: number
  minOrderAmount?: number
  totalCount?: number
  perUserLimit?: number
  startTime?: string
  endTime?: string
  validDays?: number
  description?: string
}

/** 更新优惠券参数 */
export interface UpdateCouponParams {
  name?: string
  type?: CouponType
  scope?: CouponScope
  scopeIds?: number[]
  value?: number
  minOrderAmount?: number
  totalCount?: number
  perUserLimit?: number
  startTime?: string
  endTime?: string
  validDays?: number
  description?: string
}

/** 优惠券列表查询参数 */
export interface CouponListParams {
  page?: number
  page_size?: number
  keyword?: string
  type?: string
  status?: string
}

/** 用户优惠券记录 */
export interface UserCouponRecord {
  id: number
  user_id: number
  user_nickname: string
  user_avatar?: string
  coupon_id: number
  coupon_name: string
  coupon_type: CouponType
  discount_value: number
  min_amount: number
  status: 'unused' | 'used' | 'expired'
  claimed_at: string
  used_at?: string
  expired_at: string
  order_no?: string
}

/** 用户优惠券状态标签 */
export const UserCouponStatusLabels: Record<string, string> = {
  unused: '未使用',
  used: '已使用',
  expired: '已过期',
}

/** 用户优惠券状态标签类型 */
export const UserCouponStatusTagType: Record<string, string> = {
  unused: 'success',
  used: 'info',
  expired: 'warning',
}
