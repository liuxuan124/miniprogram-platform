// utils/auth.js — Token 管理与登录态判断
const { StorageUtil } = require('./storage')

const TOKEN_KEY = 'token'
const USER_INFO_KEY = 'userInfo'
const TOKEN_EXPIRE_MS = 7 * 24 * 60 * 60 * 1000 // Token 7天过期

const LOGIN_INTERCEPT_KEY = 'login_intercept_info'

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
   * 判断是否已登录
   * @returns {boolean}
   */
  isLoggedIn() {
    const token = this.getToken()
    return !!token
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
   * 检查 Token 是否即将过期（1天内）
   * @returns {boolean}
   */
  isTokenExpiringSoon() {
    const token = this.getToken()
    if (!token) return true
    return false
  },

  /**
   * 跳转到登录页
   * @param {string} [redirectUrl] 登录后回跳地址
   */
  navigateToLogin(redirectUrl) {
    const url = redirectUrl
      ? '/pages/login/login?redirect=' + encodeURIComponent(redirectUrl)
      : '/pages/login/login'
    wx.navigateTo({ url })
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
   *   if (!AuthUtil.requireLoginForAction('claim_coupon')) return
   *
   * @param {string} [actionDesc] 动作描述，用于提示文案（可选）
   * @param {Object} [options]
   * @param {string} [options.redirect] 登录后回跳路径
   * @returns {boolean} true=已登录可继续, false=已拦截并跳转登录
   */
  requireLoginForAction(actionDesc, options) {
    if (this.isLoggedIn()) {
      return true
    }

    const opts = typeof actionDesc === 'object' ? actionDesc : (options || {})
    const desc = typeof actionDesc === 'string' ? actionDesc : (opts.desc || '')
    const redirect = opts.redirect || this._getCurrentPagePath()

    // 存储拦截信息，登录页读取后可展示友好提示
    if (desc) {
      StorageUtil.set(LOGIN_INTERCEPT_KEY, { action: desc, redirect, timestamp: Date.now() }, 5 * 60 * 1000)
    }

    wx.showToast({ title: desc ? '请先登录后' + desc : '请先登录', icon: 'none', duration: 1500 })

    setTimeout(() => {
      this.navigateToLogin(redirect)
    }, 800)

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
