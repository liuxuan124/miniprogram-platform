import { get } from './request'

/** 用户列表 */
export function getUserList(params?: Record<string, any>) {
  return get('/api/v1/admin/users', params)
}
