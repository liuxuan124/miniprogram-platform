// utils/auth.js — Token 管理与登录态判断
const { StorageUtil } = require('./storage')

const TOKEN_KEY = 'token'
const USER_INFO_KEY = 'userInfo'
const TOKEN_EXPIRE_MS = 7 * 24 * 60 * 60 * 1000 // Token 7天过期

const LOGIN_INTERCEPT_KEY = 'login_intercept_info'
const MANUAL_LOGOUT_KEY = 'manual_logout'
const LOGIN_PROFILE_CACHE_KEY = 'login_profile_cache'

/**
 * 认证工具类
 * - 管理 JWT Token 的存取与过期
 * - 提供登录态判断
 * - 关键业务动作登录拦截
 * - 获取用户信息
 */
const AuthUtil = {
  /**
   * 获取本地 Token
   * @returns {string|null}
   */
  getToken() {
    return StorageUtil.get(TOKEN_KEY)
  },

  /**
   * 设置 Token
   * @param {string} token
   */
  setToken(token) {
    StorageUtil.set(TOKEN_KEY, token, TOKEN_EXPIRE_MS)
  },

  /**
   * 移除 Token
   */
  removeToken() {
    StorageUtil.remove(TOKEN_KEY)
  },

  /**
   * 是否已绑定手机号
   * @returns {boolean}
   */
  hasPhoneBound() {
    const userInfo = this.getUserInfo()
    return !!(userInfo && userInfo.phoneBound)
  },

  /**
   * 判断是否已登录（需完成微信授权 + 手机号绑定）
   * @returns {boolean}
   */
  isLoggedIn() {
    return !!this.getToken() && this.hasPhoneBound()
  },

  /**
   * 获取用户信息
   * @returns {Object|null}
   */
  getUserInfo() {
    return StorageUtil.get(USER_INFO_KEY)
  },

  /**
   * 设置用户信息
   * @param {Object} userInfo
   */
  setUserInfo(userInfo) {
    StorageUtil.set(USER_INFO_KEY, userInfo, TOKEN_EXPIRE_MS)
  },

  /**
   * 清除所有认证信息
   */
  clearAuth() {
    StorageUtil.remove(TOKEN_KEY)
    StorageUtil.remove(USER_INFO_KEY)
    StorageUtil.remove(LOGIN_INTERCEPT_KEY)
  },

  /**
   * 记住上次登录头像/昵称，方便回访用户少填一轮
   */
  rememberLoginProfile(profile = {}) {
    const nickName = (profile.nickName || profile.nickname || '').trim()
    const avatarUrl = profile.avatarUrl || ''
    if (!nickName && !avatarUrl) return
    const prev = this.getRememberedLoginProfile() || {}
    StorageUtil.set(LOGIN_PROFILE_CACHE_KEY, {
      nickName: nickName || prev.nickName || '',
      avatarUrl: (avatarUrl && /^https?:\/\//i.test(avatarUrl))
        ? avatarUrl
        : (prev.avatarUrl || ''),
    })
  },

  getRememberedLoginProfile() {
    return StorageUtil.get(LOGIN_PROFILE_CACHE_KEY)
  },

  /**
   * 标记用户手动退出（用于禁止自动静默登录）
   */
  markManualLogout() {
    StorageUtil.set(MANUAL_LOGOUT_KEY, true, TOKEN_EXPIRE_MS)
  },

  /**
   * 清除手动退出标记
   */
  clearManualLogout() {
    StorageUtil.remove(MANUAL_LOGOUT_KEY)
  },

  /**
   * 是否处于手动退出状态
   * @returns {boolean}
   */
  isManualLoggedOut() {
    return !!StorageUtil.get(MANUAL_LOGOUT_KEY)
  },

  /**
   * 检查 Token 是否即将过期（1天内）
   * @returns {boolean}
   */
  isTokenExpiringSoon() {
    const token = this.getToken()
    if (!token) return true
    return false
  },

  /**
   * 在当前页面唤起底部登录面板；仅在组件尚未挂载时回退到登录页。
   * @param {string} [redirectUrl] 登录后继续使用的当前地址
   * @param {Object} [options]
   */
  navigateToLogin(redirectUrl, options = {}) {
    this.openLoginSheet({
      ...options,
      redirect: redirectUrl || options.redirect || this._getCurrentPagePath(),
    })
  },

  openLoginSheet(options = {}) {
    const goLoginPage = () => {
      const redirect = options.redirect || this._getCurrentPagePath() || ''
      const url = redirect
        ? '/pages/login/login?redirect=' + encodeURIComponent(redirect)
        : '/pages/login/login'
      wx.navigateTo({
        url,
        fail: () => {
          wx.reLaunch({ url: '/pages/login/login' })
        },
      })
    }

    if (options.preferPage) {
      goLoginPage()
      return
    }

    const tryOpen = (attempt) => {
      try {
        const pages = getCurrentPages()
        const currentPage = pages[pages.length - 1]
        const sheet = currentPage && typeof currentPage.selectComponent === 'function'
          ? currentPage.selectComponent('#global-login-sheet')
          : null
        if (sheet && typeof sheet.show === 'function') {
          sheet.show(options)
          return
        }
      } catch (e) {
        console.warn('[AuthUtil] 打开登录面板失败:', e)
      }

      if (attempt < 4) {
        setTimeout(() => tryOpen(attempt + 1), 80 * (attempt + 1))
        return
      }

      wx.showToast({ title: '无法打开登录面板', icon: 'none' })
      goLoginPage()
    }

    tryOpen(0)
  },

  /**
   * 确保已登录，未登录则跳转登录页
   * 适用于页面 onLoad 时拦截
   * @param {Object} pageInstance 页面实例（用于获取当前路由）
   * @returns {boolean} 是否已登录
   */
  ensureLogin(pageInstance) {
    if (this.isLoggedIn()) {
      return true
    }
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    const redirect = currentPage
      ? '/' + currentPage.route
      : ''

    this.navigateToLogin(redirect)
    return false
  },

  /**
   * 业务动作登录拦截 — 核心方法
   * 用于"加入购物车、立即购买、报名活动、预约服务、领取优惠券"等关键业务动作
   *
   * 用法:
   *   if (!AuthUtil.requireLoginForAction('加入购物车')) return
   *
   * @param {string} [actionDesc] 动作描述，用于提示文案（可选）
   * @param {Object} [options]
   * @param {string} [options.redirect] 登录后回跳路径
   * @param {boolean} [options.silent] 为 true 时不弹确认框，直接去登录
   * @returns {boolean} true=已登录可继续, false=已拦截并引导登录
   */
  requireLoginForAction(actionDesc, options) {
    if (this.isLoggedIn()) {
      return true
    }

    const opts = typeof actionDesc === 'object' ? actionDesc : (options || {})
    const desc = typeof actionDesc === 'string' ? actionDesc : (opts.desc || opts.action || '')
    const redirect = opts.redirect || this._getCurrentPagePath()

    if (desc) {
      StorageUtil.set(LOGIN_INTERCEPT_KEY, { action: desc, redirect, timestamp: Date.now() }, 5 * 60 * 1000)
    }

    const goLogin = () => {
      this.openLoginSheet({
        ...opts,
        action: desc,
        redirect,
      })
    }

    if (opts.silent) {
      goLogin()
      return false
    }

    wx.showModal({
      title: '请先登录',
      content: desc ? `登录后即可${desc}` : '登录后即可使用该功能',
      confirmText: '去登录',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          goLogin()
        }
      },
    })

    return false
  },

  /**
   * 获取当前页面完整路径（含参数）
   * @returns {string}
   */
  _getCurrentPagePath() {
    try {
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      if (!currentPage) return ''
      let path = '/' + currentPage.route
      if (currentPage.options && Object.keys(currentPage.options).length > 0) {
        const query = Object.keys(currentPage.options)
          .map(k => k + '=' + encodeURIComponent(currentPage.options[k]))
          .join('&')
        if (query) path += '?' + query
      }
      return path
    } catch (e) {
      return ''
    }
  },

  /**
   * 获取登录拦截暂存信息
   * 登录页读取后调用 clearLoginInterceptInfo 清除
   * @returns {Object|null}
   */
  getLoginInterceptInfo() {
    return StorageUtil.get(LOGIN_INTERCEPT_KEY)
  },

  /**
   * 清除登录拦截暂存信息
   */
  clearLoginInterceptInfo() {
    StorageUtil.remove(LOGIN_INTERCEPT_KEY)
  },
}

module.exports = { AuthUtil }
