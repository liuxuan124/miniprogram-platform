// services/auth.js — 登录服务
// 封装微信登录完整流程：wx.login → 后端换 token → 绑定手机号 → 本地存储

const { post, put } = require('../utils/request')
const { AuthUtil } = require('../utils/auth')

/** 预取的 wx.login code（微信 code 一次性，5 分钟内有效） */
let prefetchedLoginCode = ''
let prefetchedAt = 0
const PREFETCH_CODE_TTL_MS = 4 * 60 * 1000

/**
 * 认证服务
 */
const AuthService = {
  /**
   * 预取 wx.login code，缩短用户点击登录后的等待。
   *
   * 该方法是纯优化项，任何失败都必须静默——历史上它被 onLoad 直接调用，
   * 一旦抛错会中断整个页面初始化（品牌 Logo/名称/皮肤全部停在本地兜底值）。
   * 因此对外只暴露 `prefetchLoginCodeSafely`，内部 `prefetchLoginCode` 亦不外抛。
   */
  prefetchLoginCode() {
    if (prefetchedLoginCode && Date.now() - prefetchedAt < PREFETCH_CODE_TTL_MS) {
      return Promise.resolve(prefetchedLoginCode)
    }
    return new Promise((resolve) => {
      wx.login({
        success(res) {
          if (res && res.code) {
            prefetchedLoginCode = res.code
            prefetchedAt = Date.now()
            resolve(prefetchedLoginCode)
          } else {
            resolve('')
          }
        },
        fail() {
          resolve('')
        },
      })
    })
  },

  /** 安全版预取：永不 reject、永不抛异常 */
  prefetchLoginCodeSafely() {
    try {
      const ret = AuthService.prefetchLoginCode()
      if (ret && typeof ret.catch === 'function') ret.catch(() => {})
    } catch (e) {
      console.warn('[AuthService] prefetchLoginCode 失败（忽略）:', e && e.message)
    }
  },

  /**
   * 取出并消费预取的 code（没有则回退实时 wx.login）
   * @returns {string}
   */
  takePrefetchedLoginCode() {
    if (prefetchedLoginCode && Date.now() - prefetchedAt < PREFETCH_CODE_TTL_MS) {
      const code = prefetchedLoginCode
      prefetchedLoginCode = ''
      prefetchedAt = 0
      return code
    }
    return ''
  },

  /**
   * 微信登录完整流程
   * @param {Object} [profile]
   * @param {string} [profile.nickname]
   * @param {string} [profile.avatarUrl]
   * @returns {Promise<{ token: string, userInfo: Object }>}
   */
  wxLogin(profile = {}) {
    return new Promise((resolve, reject) => {
      // 优先消费预取的 code，省掉一次 wx.login 往返
      const cachedCode = AuthService.takePrefetchedLoginCode()
      if (cachedCode) {
        AuthService.loginWithCode(cachedCode, profile)
          .then((data) => {
            const app = getApp()
            if (app) {
              app.setAuthState({ token: data.accessToken, userInfo: data.userInfo })
              try {
                const inviterId = app.globalData.inviterId || require('../utils/storage').StorageUtil.get('inviterId')
                if (inviterId) {
                  require('../utils/request').post('/api/v1/mp/invite/bind', {
                    inviterId: Number(inviterId) || inviterId,
                    scene: 'share',
                  }, { showError: false }).catch(() => {})
                }
              } catch (e) {}
            } else {
              AuthUtil.setToken(data.accessToken)
              AuthUtil.setUserInfo(data.userInfo)
              if (data.userInfo && data.userInfo.phoneBound) {
                AuthUtil.clearManualLogout()
              }
            }
            resolve(data)
          })
          // 预取 code 失效（过期/已用）时静默回退到实时 wx.login
          .catch(() => AuthService.wxLogin(profile).then(resolve, reject))
        return
      }
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
                  try {
                    const inviterId = app.globalData.inviterId || require('../utils/storage').StorageUtil.get('inviterId')
                    if (inviterId) {
                      require('../utils/request').post('/api/v1/mp/invite/bind', {
                        inviterId: Number(inviterId) || inviterId,
                        scene: 'share',
                      }, { showError: false }).catch(() => {})
                    }
                  } catch (e) {}
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
   *
   * V119：后端返回的是对象而非裸字符串 —— { phone, userId, merged }。
   * merged=true 表示这个手机号此前已属于另一个账号，本次已并入，
   * 端上需要重新 wxLogin 换一张属于主账号的 token（见 login-flow.js）。
   * 兼容处理：若后端仍是旧版返回字符串，就包成 { phone }。
   *
   * @param {string} code
   * @param {Object} [profile]
   * @returns {Promise<{phone: string, userId?: number, merged: boolean}>}
   */
  bindPhone(code, profile = {}) {
    const payload = { code }
    if (profile.nickname) payload.nickname = profile.nickname
    if (profile.avatarUrl) payload.avatarUrl = profile.avatarUrl
    return post('/api/v1/mp/auth/phone', payload).then((res) => {
      if (res && typeof res === 'object') {
        return { phone: res.phone, userId: res.userId, merged: !!res.merged }
      }
      return { phone: res, merged: false }
    })
  },

  /**
   * 更新资料：同步后端并本地持久化（拒绝把 wxfile 当作最终头像）
   * @param {{ nickname?: string, avatarUrl?: string, phone?: string, email?: string }} profile
   * @param {{ showError?: boolean }} [options]
   */
  updateProfile(profile = {}, options = {}) {
    const current = AuthUtil.getUserInfo() || {}
    const nickName =
      profile.nickname != null
        ? String(profile.nickname)
        : (current.nickName || current.nickname || '')
    let avatarUrl =
      profile.avatarUrl != null
        ? String(profile.avatarUrl)
        : (current.avatarUrl || '')
    {
      const { isTempLocalAvatar, isPersistedMediaUrl } = require('../utils/image-fallback')
      if (avatarUrl && (isTempLocalAvatar(avatarUrl) || !isPersistedMediaUrl(avatarUrl))) {
        avatarUrl = ''
      }
    }
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

    const payload = {}
    if (profile.nickname != null) payload.nickname = nickName
    if (profile.avatarUrl != null && avatarUrl) payload.avatarUrl = avatarUrl

    const persistLocal = () => {
      const nextUserInfo = {
        ...current,
        nickName,
        nickname: nickName,
        avatarUrl: avatarUrl || current.avatarUrl || '',
        phone,
        phoneBound: !!String(phone).trim(),
        email,
      }
      // 若本次显式传入头像字段，以规范化后的值为准（可为空：清掉临时路径）
      if (profile.avatarUrl != null) {
        nextUserInfo.avatarUrl = avatarUrl
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
      AuthUtil.rememberLoginProfile({ nickName, avatarUrl: nextUserInfo.avatarUrl })
      return nextUserInfo
    }

    // 昵称/头像需同步后端；仅改手机号/邮箱时本地持久化（后端 profile 暂无此二字段）
    if (!payload.nickname && !payload.avatarUrl) {
      if (!String(nickName).trim()) {
        return Promise.reject({ code: -1, message: '请输入昵称' })
      }
      return Promise.resolve(persistLocal())
    }

    return put('/api/v1/mp/auth/profile', payload, {
      showError: options.showError !== false,
    }).then(() => persistLocal())
  },


  /**
   * 完成正式登录（绑定手机号后）
   */
  completeLogin({ phone, nickName, avatarUrl }) {
    const app = getApp()
    const current = (app && app.globalData && app.globalData.userInfo) || AuthUtil.getUserInfo() || {}
    const token = (app && app.globalData && app.globalData.token) || AuthUtil.getToken()
    const { isTempLocalAvatar, isPersistedMediaUrl } = require('../utils/image-fallback')
    let nextAvatar = avatarUrl || current.avatarUrl || ''
    if (isTempLocalAvatar(nextAvatar) || !isPersistedMediaUrl(nextAvatar)) {
      // 临时路径不进会话持久字段；空则保留已有远程头像
      nextAvatar = isPersistedMediaUrl(current.avatarUrl) ? current.avatarUrl : ''
    }
    const nextUserInfo = {
      ...current,
      phone,
      phoneBound: true,
      nickName: nickName || current.nickName || '',
      avatarUrl: nextAvatar,
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
