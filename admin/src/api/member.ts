/**
 * 会员相关 API
 * 严格遵循接口契约
 */
import { get, post, put, del } from './request'
import type {
  MemberLevel,
  CreateMemberLevelParams,
  UpdateMemberLevelParams,
  MemberPointsLog,
  MemberPointsLogParams,
  AdjustPointsParams,
} from '@/types/member'
import type { PageResult } from '@/types/global'

const BASE_URL = '/api/v1/admin'

function normalizeLevel(row: any): MemberLevel {
  const rights = row.rights || row.benefits || []
  const benefits = Array.isArray(rights)
    ? rights
    : Array.isArray(rights?.benefits)
      ? rights.benefits
      : Object.values(rights || {}).map(String)

  return {
    id: row.id,
    name: row.name,
    level: Number(row.sortOrder ?? row.level ?? row.id ?? 1),
    icon: row.icon,
    min_points: Number(row.minPoints ?? row.min_points ?? 0),
    max_points: Number(row.maxPoints ?? row.max_points ?? -1),
    points_rate: Number(row.pointsRate ?? row.points_rate ?? 1),
    discount_rate: Number(row.discountRate ?? row.discount_rate ?? 1),
    benefits,
    status: Number(row.status ?? 1),
    member_count: Number(row.memberCount ?? row.member_count ?? 0),
    created_at: row.createdAt ?? row.created_at ?? '',
    updated_at: row.updatedAt ?? row.updated_at ?? '',
  }
}

function toLevelPayload(data: CreateMemberLevelParams | UpdateMemberLevelParams) {
  return {
    name: data.name,
    icon: data.icon,
    minPoints: data.min_points,
    discountRate: data.discount_rate,
    rights: data.benefits,
    sortOrder: data.level,
    status: data.status,
  }
}

function normalizePointsLog(row: any): MemberPointsLog {
  return {
    id: row.id,
    user_id: row.userId ?? row.user_id,
    user_nickname: row.userNickname ?? row.user_nickname ?? `用户${row.userId ?? row.user_id ?? ''}`,
    user_avatar: row.userAvatar ?? row.user_avatar,
    type: row.type,
    points: Number(row.points || 0),
    balance: Number(row.balance || 0),
    source: row.description ?? row.source ?? '-',
    order_no: row.orderNo ?? row.order_no,
    remark: row.remark,
    created_at: row.createdAt ?? row.created_at ?? '',
  }
}

// ==================== 会员等级 ====================

/** 获取会员等级列表 */
export function getMemberLevelList() {
  return get<any[]>(`${BASE_URL}/member-levels`).then((res: any) => ({
    ...res,
    data: (res.data || []).map(normalizeLevel),
  }))
}

/** 创建会员等级 */
export function createMemberLevel(data: CreateMemberLevelParams) {
  return post<any>(`${BASE_URL}/member-levels`, toLevelPayload(data)).then((res: any) => ({
    ...res,
    data: normalizeLevel(res.data),
  }))
}

/** 更新会员等级 */
export function updateMemberLevel(id: number, data: UpdateMemberLevelParams) {
  return put<any>(`${BASE_URL}/member-levels/${id}`, toLevelPayload(data)).then((res: any) => ({
    ...res,
    data: normalizeLevel(res.data),
  }))
}

/** 删除会员等级 */
export function deleteMemberLevel(id: number) {
  return del<void>(`${BASE_URL}/member-levels/${id}`)
}

// ==================== 积分管理 ====================

/** 获取积分日志列表 */
export function getMemberPointsLog(params?: MemberPointsLogParams) {
  const query = {
    page: params?.page,
    size: params?.page_size,
    userId: params?.user_id,
    type: params?.type,
  }
  return get<PageResult<any>>(`${BASE_URL}/member-points`, query as Record<string, unknown>).then((res: any) => {
    const page = res.data || {}
    return {
      ...res,
      data: {
        ...page,
        list: (page.records || page.list || []).map(normalizePointsLog),
      },
    }
  })
}

/** 手动调整积分 */
export function adjustMemberPoints(data: AdjustPointsParams) {
  return post<void>(`${BASE_URL}/member-points`, {
    userId: data.user_id,
    points: data.points,
    remark: data.remark,
  })
}
