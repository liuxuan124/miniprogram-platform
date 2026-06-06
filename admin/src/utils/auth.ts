/** Token 管理工具 */

const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

/** 获取 AccessToken */
export function getToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

/** 设置 AccessToken */
export function setToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

/** 获取 RefreshToken */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

/** 设置 RefreshToken */
export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token)
}

/** 移除所有 Token */
export function removeToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

/** 判断是否已登录（Token 是否存在） */
export function isAuthenticated(): boolean {
  return !!getToken()
}
