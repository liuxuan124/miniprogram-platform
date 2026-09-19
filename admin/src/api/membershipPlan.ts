/**
 * 付费会员档 API（平台 / 星球）
 */
import { get, post, put, del } from './request'

const BASE_URL = '/api/v1/admin/membership-plans'

export type MembershipPlanScope = 'platform' | 'planet'

export interface MembershipPlan {
  id: number
  scope: MembershipPlanScope
  planetId?: string | null
  name: string
  icon?: string
  description?: string
  rights?: string[]
  discountRate?: number | null
  giftPlanetId?: string | null
  giftPlanetDays?: number
  /** 1=显示会员角标 */
  showBadge?: number
  /** 到期前提醒天数；0=关闭 */
  expireRemindDays?: number
  sortOrder?: number
  status: number
  createdAt?: string
  updatedAt?: string
}

export interface MembershipPlanPayload {
  scope: MembershipPlanScope
  planetId?: string | null
  name: string
  icon?: string
  description?: string
  rights?: string[]
  discountRate?: number | null
  giftPlanetId?: string | null
  giftPlanetDays?: number
  showBadge?: number
  expireRemindDays?: number
  sortOrder?: number
  status?: number
}

function normalizePlan(row: any): MembershipPlan {
  return {
    id: Number(row.id),
    scope: (row.scope || 'platform') as MembershipPlanScope,
    planetId: row.planetId ?? row.planet_id ?? null,
    name: row.name || '',
    icon: row.icon,
    description: row.description,
    rights: Array.isArray(row.rights) ? row.rights.map(String) : [],
    discountRate: row.discountRate ?? row.discount_rate ?? null,
    giftPlanetId: row.giftPlanetId ?? row.gift_planet_id ?? null,
    giftPlanetDays: Number(row.giftPlanetDays ?? row.gift_planet_days ?? 0),
    showBadge: Number(row.showBadge ?? row.show_badge ?? 0),
    expireRemindDays: Number(row.expireRemindDays ?? row.expire_remind_days ?? 0),
    sortOrder: Number(row.sortOrder ?? row.sort_order ?? 0),
    status: Number(row.status ?? 1),
    createdAt: row.createdAt ?? row.created_at,
    updatedAt: row.updatedAt ?? row.updated_at,
  }
}

export function getMembershipPlanList(params?: { scope?: MembershipPlanScope; planetId?: string }) {
  return get<any[]>(BASE_URL, params as Record<string, unknown>).then((res: any) => ({
    ...res,
    data: (res.data || []).map(normalizePlan),
  }))
}

export function createMembershipPlan(data: MembershipPlanPayload) {
  return post<any>(BASE_URL, data).then((res: any) => ({
    ...res,
    data: normalizePlan(res.data),
  }))
}

export function updateMembershipPlan(id: number, data: MembershipPlanPayload) {
  return put<any>(`${BASE_URL}/${id}`, data).then((res: any) => ({
    ...res,
    data: normalizePlan(res.data),
  }))
}

export function deleteMembershipPlan(id: number) {
  return del<void>(`${BASE_URL}/${id}`)
}
