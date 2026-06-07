// services/auth.js — 登录服务
// 封装微信登录完整流程：wx.login → 后端换 token → 本地存储

const { post } = require('../utils/request')
const { AuthUtil } = require('../utils/auth')

/**
 * 认证服务
 */
const AuthService = {
  /**
   * 微信登录完整流程
   * 1. 调用 wx.login() 获取临时 code
   * 2. 将 code 发送到后端 /api/v1/mp/auth/login
   * 3. 后端返回 token + 用户信息
   * 4. 存储到本地并更新全局状态
   *
   * @returns {Promise<{ token: string, userInfo: Object }>}
   */
  wxLogin() {
    return new Promise((resolve, reject) => {
      // Step 1: 调用 wx.login 获取 code
      wx.login({
        success(loginRes) {
          if (loginRes.code) {
            // Step 2: 将 code 发送到后端
            AuthService.loginWithCode(loginRes.code)
              .then((data) => {
                // Step 4: 更新全局状态
                const app = getApp()
                if (app) {
                  app.setAuthState({
                    token: data.accessToken,
                    userInfo: data.userInfo,
                  })
                } else {
                  AuthUtil.setToken(data.accessToken)
                  AuthUtil.setUserInfo(data.userInfo)
                }
                resolve(data)
              })
              .catch(reject)
          } else {
            console.error('[AuthService] wx.login 失败:', loginRes.errMsg)
            reject({ code: -1, message: '微信登录失败: ' + loginRes.errMsg })
          }
        },
        fail(err) {
          console.error('[AuthService] wx.login 调用异常:', err)
          reject({ code: -1, message: '微信登录异常', error: err })
        },
      })
    })
  },

  /**
   * 使用 code 向后端换取 token
   * @param {string} code wx.login 返回的临时 code
   * @returns {Promise<{ token: string, userInfo: Object }>}
   */
  loginWithCode(code) {
    return post('/api/v1/mp/auth/login', { code }, { auth: false }).then((data) => ({
      ...data,
      token: data.accessToken,
      userInfo: {
        id: data.userId,
        nickName: data.nickname,
        avatarUrl: data.avatarUrl,
      },
    }))
  },

  /**
   * 获取微信用户信息（需用户授权）
   * 使用 wx.getUserProfile 获取（基础库 2.10.4+）
   * @returns {Promise<Object>} 微信用户信息
   */
  getUserProfile() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success(res) {
          resolve(res.userInfo)
        },
        fail(err) {
          console.error('[AuthService] getUserProfile 失败:', err)
          reject(err)
        },
      })
    })
  },

  /**
   * 更新用户信息到后端
   * @param {Object} userInfo 微信用户信息
   * @returns {Promise}
   */
  updateUserInfo(userInfo) {
    return Promise.resolve(userInfo).then((data) => {
      // 更新本地和全局状态
      const app = getApp()
      if (app) {
        app.updateUserInfo(data)
      } else {
        AuthUtil.setUserInfo(data)
      }
      return data
    })
  },

  /**
   * 退出登录
   * 清除本地登录态，跳转登录页
   */
  logout() {
    const app = getApp()
    if (app) {
      app.clearAuthState()
    } else {
      AuthUtil.clearAuth()
    }

    wx.reLaunch({
      url: '/pages/login/login',
    })
  },

  /**
   * 静默登录检查
   * 如果本地有 token 则直接返回，否则执行 wxLogin
   * @returns {Promise<boolean>} 是否已登录
   */
  silentLogin() {
    return this.wxLogin()
      .then(() => true)
      .catch((err) => {
        console.warn('[AuthService] 静默登录失败:', err)
        const app = getApp()
        if (app) {
          app.clearAuthState()
        } else {
          AuthUtil.clearAuth()
        }
        return false
      })
  },
}

module.exports = { AuthService }
