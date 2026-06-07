// pages/login/login.js — 登录页
const { AuthService } = require('../../services/auth')
const { AuthUtil } = require('../../utils/auth')

Page({
  data: {
    loading: false,
    redirectUrl: '',
    agreePrivacy: false,
    interceptAction: '',  // 拦截提示文案
  },

  onLoad(options) {
    if (options.redirect) {
      this.setData({
        redirectUrl: decodeURIComponent(options.redirect),
      })
    }

    // 读取登录拦截信息（业务动作触发登录时写入）
    const interceptInfo = AuthUtil.getLoginInterceptInfo()
    if (interceptInfo && interceptInfo.action) {
      this.setData({
        interceptAction: interceptInfo.action,
      })
    }
  },

  /** 微信一键登录 */
  async onWxLogin() {
    if (this.data.loading) return

    // 检查隐私协议
    if (!this.data.agreePrivacy) {
      wx.showToast({ title: '请先同意隐私协议', icon: 'none' })
      return
    }

    this.setData({ loading: true })

    try {
      // Step 1: 微信登录获取 token
      await AuthService.wxLogin()

      // Step 2: 获取用户资料（可选）
      try {
        const userProfile = await AuthService.getUserProfile()
        await AuthService.updateUserInfo(userProfile)
      } catch (profileErr) {
        // 用户拒绝授权资料不影响登录
        console.warn('[LoginPage] 用户拒绝授权资料:', profileErr)
      }

      wx.showToast({ title: '登录成功', icon: 'success' })

      // 清除拦截信息
      AuthUtil.clearLoginInterceptInfo()

      setTimeout(() => {
        this._navigateAfterLogin()
      }, 1000)
    } catch (err) {
      console.error('[LoginPage] 登录失败:', err)
      wx.showToast({
        title: err.message || '登录失败，请重试',
        icon: 'none',
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  /** 切换隐私协议同意状态 */
  onTogglePrivacy() {
    this.setData({
      agreePrivacy: !this.data.agreePrivacy,
    })
  },

  /** 查看隐私协议 */
  onViewPrivacy() {
    wx.navigateTo({ url: '/pages/agreement/agreement?type=privacy' })
  },

  /** 查看用户协议 */
  onViewTerms() {
    wx.navigateTo({ url: '/pages/agreement/agreement?type=terms' })
  },

  /** 登录成功后跳转 */
  _navigateAfterLogin() {
    if (this.data.redirectUrl) {
      // 有回跳地址
      const redirect = this.data.redirectUrl
      // TabBar 页面用 switchTab，非 TabBar 用 reLaunch
      const tabPages = ['/pages/index/index', '/pages/category/category', '/pages/mine/mine']
      if (tabPages.includes(redirect)) {
        wx.switchTab({ url: redirect })
      } else {
        wx.reLaunch({ url: redirect })
      }
    } else {
      // 默认跳转首页
      wx.switchTab({ url: '/pages/index/index' })
    }
  },

  /** 返回 */
  onBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      wx.switchTab({ url: '/pages/index/index' })
    }
  },
})
