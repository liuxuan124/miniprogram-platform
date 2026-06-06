/**
 * 用户状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { loginApi, getUserInfoApi, logoutApi } from '@/api/auth'
import { getToken, setToken, setRefreshToken, removeToken } from '@/utils/auth'
import type { UserInfo, LoginParams } from '@/types/global'

export const useUserStore = defineStore('user', () => {
  /** 用户信息 */
  const userInfo = ref<UserInfo | null>(null)
  /** 是否已登录 */
  const isLoggedIn = ref(!!getToken())

  /** 登录 */
  async function login(params: LoginParams) {
    const res = await loginApi(params)
    const { accessToken, token, refreshToken } = res.data
    const loginToken = accessToken || token
    if (!loginToken) {
      throw new Error('登录响应缺少访问令牌')
    }
    setToken(loginToken)
    setRefreshToken(refreshToken)
    isLoggedIn.value = true
  }

  /** 获取用户信息 */
  async function fetchUserInfo() {
    const res = await getUserInfoApi()
    const raw = res.data as any
    const normalized: UserInfo = {
      id: raw.id,
      username: raw.username,
      nickname: raw.nickname || raw.realName || raw.username,
      avatar: raw.avatar || raw.avatarUrl || '',
      roles: raw.roles || [raw.roleCode || 'admin'],
      permissions: raw.permissions || [],
    }
    userInfo.value = normalized
    return normalized
  }

  /** 登出 */
  async function logout() {
    try {
      await logoutApi()
    } catch {
      // 即使接口失败也要清理本地状态
    } finally {
      userInfo.value = null
      isLoggedIn.value = false
      removeToken()
    }
  }

  /** 重置状态 */
  function resetState() {
    userInfo.value = null
    isLoggedIn.value = false
    removeToken()
  }

  return {
    userInfo,
    isLoggedIn,
    login,
    fetchUserInfo,
    logout,
    resetState,
  }
})
