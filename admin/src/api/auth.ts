/**
 * 认证相关 API
 */
import { post, get } from './request'
import type { LoginParams, LoginResult, UserInfo } from '@/types/global'

/** 用户登录 */
export function loginApi(data: LoginParams) {
  return post<LoginResult>('/api/v1/admin/auth/login', data)
}

/** 获取当前用户信息 */
export function getUserInfoApi() {
  return get<UserInfo>('/api/v1/admin/auth/profile')
}

/** 用户登出 */
export function logoutApi() {
  return post<null>('/api/v1/admin/auth/logout')
}

/** 刷新 Token */
export function refreshTokenApi(refreshToken: string) {
  return post<LoginResult>('/api/v1/admin/auth/refresh', { refreshToken })
}
