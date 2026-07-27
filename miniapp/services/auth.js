// services/auth.js — 登录服务
// 封装微信登录完整流程：wx.login → 后端换 token → 绑定手机号 → 本地存储

const { post } = require('../utils/request')
const { AuthUtil } = require('../utils/auth')

/**
 * 认证服务
 */
const AuthService = {
  /**
   * 微信登录完整流程
   * @param {Object} [profile]
   * @param {string} [profile.nickname]
   * @param {string} [profile.avatarUrl]
   * @returns {Promise<{ token: string, userInfo: Object }>}
   */
  wxLogin(profile = {}) {
    return new Promise((resolve, reject) => {
      wx.login({
        success(loginRes) {
          if (loginRes.code) {
            AuthService.loginWithCode(loginRes.code, profile)
              .then((data) => {
                // 未绑定手机号时仅保留临时 token（供绑定/上传），不算正式登录
                const app = getApp()
                if (app) {
                  app.setAuthState({
                    token: data.accessToken,
                    userInfo: data.userInfo,
                  })
                } else {
                  AuthUtil.setToken(data.accessToken)
                  AuthUtil.setUserInfo(data.userInfo)
                  if (data.userInfo && data.userInfo.phoneBound) {
                    AuthUtil.clearManualLogout()
                  }
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
   * @param {string} code
   * @param {Object} [profile]
   */
  loginWithCode(code, profile = {}) {
    const payload = { code }
    if (profile.nickname) payload.nickname = profile.nickname
    if (profile.avatarUrl) payload.avatarUrl = profile.avatarUrl

    return post('/api/v1/mp/auth/login', payload, { auth: false }).then((data) => ({
      ...data,
      token: data.accessToken,
      userInfo: {
        id: data.userId,
        nickName: data.nickname || profile.nickname || '',
        avatarUrl: data.avatarUrl || profile.avatarUrl || '',
        phone: data.phone,
        phoneBound: !!data.phoneBound,
      },
    }))
  },

  /**
   * 绑定手机号（可同步昵称/头像）
   * @param {string} code
   * @param {Object} [profile]
   * @returns {Promise<string>}
   */
  bindPhone(code, profile = {}) {
    const payload = { code }
    if (profile.nickname) payload.nickname = profile.nickname
    if (profile.avatarUrl) payload.avatarUrl = profile.avatarUrl
    return post('/api/v1/mp/auth/phone', payload).then((phone) => phone)
  },

  /**
   * 完成正式登录（绑定手机号后）
   */
  completeLogin({ phone, nickName, avatarUrl }) {
    const app = getApp()
    const current = (app && app.globalData && app.globalData.userInfo) || AuthUtil.getUserInfo() || {}
    const token = (app && app.globalData && app.globalData.token) || AuthUtil.getToken()
    const nextUserInfo = {
      ...current,
      phone,
      phoneBound: true,
      nickName: nickName || current.nickName || '',
      avatarUrl: avatarUrl || current.avatarUrl || '',
    }

    if (app) {
      app.setAuthState({ token, userInfo: nextUserInfo })
    } else {
      AuthUtil.setToken(token)
      AuthUtil.setUserInfo(nextUserInfo)
      AuthUtil.clearManualLogout()
    }
  },

  /**
   * 获取微信用户信息（旧接口，保留兼容）
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

  updateUserInfo(userInfo) {
    return Promise.resolve(userInfo).then((data) => {
      const app = getApp()
      if (app) {
        app.updateUserInfo(data)
      } else {
        AuthUtil.setUserInfo(data)
      }
      return data
    })
  },

  updateUserPhone(phone) {
    this.completeLogin({ phone })
  },

  logout(options = {}) {
    const { redirectToLogin = true, manual = true } = options
    const app = getApp()
    if (manual) {
      AuthUtil.markManualLogout()
    }
    if (app) {
      app.clearAuthState()
    } else {
      AuthUtil.clearAuth()
    }

    if (redirectToLogin) {
      wx.reLaunch({
        url: '/pages/login/login',
      })
    }
  },

  /**
   * 静默登录：仅恢复已完成登录态，不自动 wxLogin
   */
  silentLogin(options = {}) {
    const { ignoreManualLogout = false, clearIncomplete = true } = options

    if (AuthUtil.isLoggedIn()) {
      return Promise.resolve(true)
    }

    if (clearIncomplete && AuthUtil.getToken() && !AuthUtil.hasPhoneBound()) {
      const app = getApp()
      if (app) {
        app.clearAuthState()
      } else {
        AuthUtil.clearAuth()
      }
    }

    if (!ignoreManualLogout && AuthUtil.isManualLoggedOut()) {
      return Promise.resolve(false)
    }

    return Promise.resolve(false)
  },
}

module.exports = { AuthService }
