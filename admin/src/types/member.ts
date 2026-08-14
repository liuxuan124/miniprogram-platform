/**
 * 会员相关类型定义
 */

/** 固定权益码 */
export enum MemberBenefitCode {
  MemberDiscount = 'member_discount',
  PointsBoost = 'points_boost',
  ExclusiveCoupon = 'exclusive_coupon',
  BirthdayGift = 'birthday_gift',
}

export const MemberBenefitLabels: Record<MemberBenefitCode, string> = {
  [MemberBenefitCode.MemberDiscount]: '会员折扣',
  [MemberBenefitCode.PointsBoost]: '积分加速',
  [MemberBenefitCode.ExclusiveCoupon]: '专属优惠券',
  [MemberBenefitCode.BirthdayGift]: '生日礼包',
}

export const MemberBenefitHints: Record<MemberBenefitCode, string> = {
  [MemberBenefitCode.MemberDiscount]: '使用下方折扣率；下单折扣另开任务落地',
  [MemberBenefitCode.PointsBoost]: '获得积分时按倍率计算（倍率字段）',
  [MemberBenefitCode.ExclusiveCoupon]: '可被优惠券「指定等级领取」选中',
  [MemberBenefitCode.BirthdayGift]: '生日当天可领取绑定的优惠券',
}

/** 会员等级 */
export interface MemberLevel {
  id: number
  name: string
  level: number
  icon?: string
  min_points: number
  max_points: number
  points_rate: number
  discount_rate: number
  benefits: string[]
  birthday_coupon_id?: number | null
  legacy_rights?: string[]
  status: number
  member_count?: number
  created_at: string
  updated_at: string
}

/** 创建会员等级参数 */
export interface CreateMemberLevelParams {
  name: string
  level: number
  icon?: string
  min_points: number
  max_points?: number
  points_rate?: number
  discount_rate?: number
  benefits?: string[]
  birthday_coupon_id?: number | null
  status?: number
}

/** 更新会员等级参数 */
export interface UpdateMemberLevelParams {
  name?: string
  level?: number
  icon?: string
  min_points?: number
  max_points?: number
  points_rate?: number
  discount_rate?: number
  benefits?: string[]
  birthday_coupon_id?: number | null
  status?: number
}

export const MemberLevelStatusLabels: Record<number, string> = {
  1: '启用',
  0: '禁用',
}

export const MemberLevelStatusTagType: Record<number, string> = {
  1: 'success',
  0: 'danger',
}

export enum PointsChangeType {
  Earn = 'earn',
  Consume = 'consume',
  AdminAdjust = 'admin_adjust',
  Expired = 'expired',
  SignUp = 'sign_up',
  OrderReward = 'order_reward',
}

export const PointsChangeTypeLabels: Record<string, string> = {
  sign_in: '每日签到',
  exchange: '积分兑换',
  admin: '后台调整',
  consume: '消费赠送',
  [PointsChangeType.Earn]: '获取',
  [PointsChangeType.Consume]: '消耗',
  [PointsChangeType.AdminAdjust]: '管理员调整',
  [PointsChangeType.Expired]: '过期',
  [PointsChangeType.SignUp]: '注册赠送',
  [PointsChangeType.OrderReward]: '下单奖励',
}

export const PointsChangeTypeTagType: Record<string, string> = {
  sign_in: 'success',
  exchange: 'warning',
  admin: '',
  consume: 'success',
}

export interface MemberPointsLog {
  id: number
  user_id: number
  user_nickname: string
  user_avatar?: string
  type: string
  points: number
  balance: number
  source: string
  order_no?: string
  remark?: string
  created_at: string
}

export interface MemberPointsLogParams {
  page?: number
  page_size?: number
  keyword?: string
  type?: string
  user_id?: number
  start_date?: string
  end_date?: string
}

export interface AdjustPointsParams {
  user_id: number
  points: number
  remark: string
}
