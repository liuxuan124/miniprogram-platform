import { get } from './request'
import service from './request'

/** 用户列表 */
export function getUserList(params?: Record<string, any>) {
  return get('/api/v1/admin/users', params)
}

/** 导出用户为 CSV（返回 Blob） */
export function exportUsers(params?: Record<string, any>) {
  return service.get('/api/v1/admin/users/export', {
    params,
    responseType: 'blob',
  })
}
