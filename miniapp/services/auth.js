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

    try {
      const app = getApp()
      const channel =
        (profile && profile.sourceChannel) ||
        (app && app.globalData && app.globalData.sourceChannel) ||
        null
      if (channel) payload.sourceChannel = channel
    } catch (e) {
      /* ignore */
    }

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
   * 更新资料（后端暂无专用资料接口时，本地持久化）
   * @param {{ nickname?: string, avatarUrl?: string, phone?: string, email?: string }} profile
   */
  updateProfile(profile = {}) {
    const current = AuthUtil.getUserInfo() || {}
    const nickName =
      profile.nickname != null
        ? String(profile.nickname)
        : (current.nickName || current.nickname || '')
    const avatarUrl =
      profile.avatarUrl != null
        ? String(profile.avatarUrl)
        : (current.avatarUrl || '')
    const phone =
      profile.phone != null
        ? String(profile.phone)
        : (current.phone || '')
    const email =
      profile.email != null
        ? String(profile.email)
        : (current.email || '')

    if (String(nickName).length > 10) {
      return Promise.reject({ code: -1, message: '昵称不能超过10个字' })
    }

    const nextUserInfo = {
      ...current,
      nickName,
      nickname: nickName,
      avatarUrl,
      phone,
      phoneBound: !!String(phone).trim(),
      email,
    }

    const app = getApp()
    if (app && typeof app.setAuthState === 'function') {
      const token = (app.globalData && app.globalData.token) || AuthUtil.getToken()
      app.setAuthState({ token, userInfo: nextUserInfo })
    } else if (app && typeof app.updateUserInfo === 'function') {
      app.updateUserInfo(nextUserInfo)
    } else {
      AuthUtil.setUserInfo(nextUserInfo)
    }
    AuthUtil.rememberLoginProfile({ nickName, avatarUrl })
    return Promise.resolve(nextUserInfo)
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
