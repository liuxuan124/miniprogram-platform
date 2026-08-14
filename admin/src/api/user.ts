import { get } from './request'
import service from './request'

/** 用户列表 */
export function getUserList(params?: Record<string, any>) {
  return get('/api/v1/admin/users', params)
}

/** 用户详情画像 */
export function getUserDetail(id: number | string) {
  return get(`/api/v1/admin/users/${id}`)
}

/** 用户概览统计 */
export function getUserStats() {
  return get('/api/v1/admin/users/stats')
}

/** 导出用户为 CSV（返回 { data: Blob, headers }） */
export function exportUsers(params?: Record<string, any>) {
  return service.get('/api/v1/admin/users/export', {
    params,
    responseType: 'blob',
  })
}
