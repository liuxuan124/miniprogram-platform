import { get, post, put, del } from './request'

/** 活动列表 */
export function getActivityList(params?: Record<string, any>) {
  return get('/api/v1/admin/activities', params)
}

/** 创建活动 */
export function createActivity(data: Record<string, any>) {
  return post('/api/v1/admin/activities', data)
}

/** 更新活动 */
export function updateActivity(id: number, data: Record<string, any>) {
  return put(`/api/v1/admin/activities/${id}`, data)
}

/** 删除活动 */
export function deleteActivity(id: number) {
  return del(`/api/v1/admin/activities/${id}`)
}

/** 更新活动状态 */
export function updateActivityStatus(id: number, status: number) {
  return put(`/api/v1/admin/activities/${id}/status`, undefined, { params: { status } })
}

/** 获取活动报名列表 */
export function getActivitySignups(activityId: number, params?: Record<string, any>) {
  return get(`/api/v1/admin/activities/${activityId}/signups`, params)
}

/** 审核报名 */
export function approveSignup(signupId: number, approved: boolean) {
  return put(`/api/v1/admin/activities/signups/${signupId}/approve`, undefined, { params: { approved } })
}

/** 获取签到统计 */
export function getCheckinStats(activityId: number) {
  return get(`/api/v1/admin/activity-check-ins/${activityId}/stats`)
}

/** 获取签到记录 */
export function getCheckinList(params?: Record<string, any>) {
  return get('/api/v1/admin/activity-check-ins', params)
}

/** 核验签到 */
export function verifyCheckin(checkInId: number, verifyMethod: string = 'manual') {
  return post('/api/v1/admin/activity-check-ins/verify', undefined, {
    params: { checkInId, verifyMethod, verifiedBy: 1 },
  })
}
