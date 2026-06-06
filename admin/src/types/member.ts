/**
 * 会员相关类型定义
 */

/** 会员等级 */
export interface MemberLevel {
  id: number
  name: string
  level: number // 等级序号，数字越大等级越高
  icon?: string
  min_points: number // 达到该等级所需最低积分
  max_points: number // 达到该等级所需最高积分（-1 表示无上限）
  points_rate: number // 积分倍率，如 1.5 表示 1.5 倍积分
  discount_rate: number // 折扣率，如 0.95 表示 95 折
  benefits: string[] // 权益描述列表
  status: number // 1=启用 0=禁用
  member_count?: number // 该等级会员数
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
  status?: number
}

/** 会员等级状态标签 */
export const MemberLevelStatusLabels: Record<number, string> = {
  1: '启用',
  0: '禁用',
}

/** 会员等级状态标签类型 */
export const MemberLevelStatusTagType: Record<number, string> = {
  1: 'success',
  0: 'danger',
}

/** 积分日志 */
export interface MemberPointsLog {
  id: number
  user_id: number
  user_nickname: string
  user_avatar?: string
  type: PointsChangeType // 积分变动类型
  points: number // 变动积分（正为增加，负为减少）
  balance: number // 变动后余额
  source: string // 来源描述
  order_no?: string // 关联订单号
  remark?: string
  created_at: string
}

/** 积分变动类型 */
export enum PointsChangeType {
  Earn = 'earn', // 获取
  Consume = 'consume', // 消耗
  AdminAdjust = 'admin_adjust', // 管理员调整
  Expired = 'expired', // 过期
  SignUp = 'sign_up', // 注册赠送
  OrderReward = 'order_reward', // 下单奖励
}

/** 积分变动类型标签 */
export const PointsChangeTypeLabels: Record<PointsChangeType, string> = {
  [PointsChangeType.Earn]: '获取',
  [PointsChangeType.Consume]: '消耗',
  [PointsChangeType.AdminAdjust]: '管理员调整',
  [PointsChangeType.Expired]: '过期',
  [PointsChangeType.SignUp]: '注册赠送',
  [PointsChangeType.OrderReward]: '下单奖励',
}

/** 积分变动类型标签颜色 */
export const PointsChangeTypeTagType: Record<PointsChangeType, string> = {
  [PointsChangeType.Earn]: 'success',
  [PointsChangeType.Consume]: 'warning',
  [PointsChangeType.AdminAdjust]: '',
  [PointsChangeType.Expired]: 'info',
  [PointsChangeType.SignUp]: 'success',
  [PointsChangeType.OrderReward]: 'success',
}

/** 积分日志查询参数 */
export interface MemberPointsLogParams {
  page?: number
  page_size?: number
  keyword?: string
  type?: string
  user_id?: number
  start_date?: string
  end_date?: string
}

/** 手动调整积分参数 */
export interface AdjustPointsParams {
  user_id: number
  points: number // 正数为增加，负数为扣减
  remark: string
}
