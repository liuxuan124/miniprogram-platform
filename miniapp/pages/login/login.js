// pages/login/login.js — 手机号快捷登录（登录信息页）
const { AuthService } = require('../../services/auth')
const { AuthUtil } = require('../../utils/auth')
const privacyHelper = require('../../utils/privacy')
const {
  runOneTapLogin,
  computeCanSubmit,
} = require('../../utils/login-flow')
const SystemService = require('../../services/system')
const {
  DEFAULT_MINIAPP_BRAND_CONFIG,
  normalizeBrandConfig,
} = require('../../utils/brand-config')

Page({
  data: {
    loading: false,
    redirectUrl: '',
    agreePrivacy: false,
    interceptAction: '',
    phoneMasked: '',
    canSubmit: false,
    privacyError: false,
    formHint: '',
    showPrivacyPopup: false,
    brandName: DEFAULT_MINIAPP_BRAND_CONFIG.appName,
    brandMark: DEFAULT_MINIAPP_BRAND_CONFIG.logoMark,
    brandLogoUrl: '',
    brandEyebrow: DEFAULT_MINIAPP_BRAND_CONFIG.brandEyebrow,
  },

  onLoad(options) {
    if (options.redirect) {
      this.setData({
        redirectUrl: decodeURIComponent(options.redirect),
      })
    }

    const interceptInfo = AuthUtil.getLoginInterceptInfo()
    if (interceptInfo && interceptInfo.action) {
      this.setData({
        interceptAction: interceptInfo.action,
      })
    }

    this._unsubscribePrivacy = privacyHelper.subscribe(() => {
      this.setData({
        showPrivacyPopup: true,
        formHint: '请先同意隐私协议后再登录',
      })
      return true
    })

    AuthService.prefetchLoginCode()
    this._ensurePrivacyReady()
    this._refreshCanSubmit()
    this._loadBrandConfig()
  },

  async _loadBrandConfig() {
    try {
      const app = getApp()
      const cached = app && app.globalData && app.globalData.miniappBrandConfig
      const brand = normalizeBrandConfig(cached || await SystemService.fetchBrandConfig(false))
      if (app && app.globalData) {
        app.globalData.miniappBrandConfig = brand
      }
      this.setData({
        brandName: brand.appName,
        brandMark: brand.logoMark,
        brandLogoUrl: brand.logoUrl,
        brandEyebrow: brand.brandEyebrow,
      })
    } catch (e) {
      console.warn('[LoginPage] 加载品牌配置失败:', e)
    }
  },

  onUnload() {
    if (this._unsubscribePrivacy) {
      this._unsubscribePrivacy()
      this._unsubscribePrivacy = null
    }
  },

  noop() {},

  _ensurePrivacyReady() {
    if (typeof wx.getPrivacySetting !== 'function') return
    wx.getPrivacySetting({
      success: (res) => {
        if (res && res.needAuthorization) {
          this.setData({ showPrivacyPopup: true })
        }
      },
    })
  },

  _maskPhone(phone) {
    const raw = String(phone || '')
    if (raw.length < 7) return raw
    return raw.slice(0, 3) + '****' + raw.slice(-4)
  },

  onAgreePrivacyAuthorization(e) {
    const buttonId = (e && e.currentTarget && e.currentTarget.id) || 'privacy-agree-btn'
    privacyHelper.agree(buttonId)
    this.setData({
      agreePrivacy: true,
      privacyError: false,
      formHint: '',
      showPrivacyPopup: false,
    }, () => this._refreshCanSubmit())
    AuthService.prefetchLoginCode()
  },

  onUncheckPrivacy() {
    this.setData({
      agreePrivacy: false,
      formHint: '',
    }, () => this._refreshCanSubmit())
  },

  onRefusePrivacy() {
    privacyHelper.refuse()
    this.setData({
      showPrivacyPopup: false,
      agreePrivacy: false,
      formHint: '需同意隐私协议后才能登录',
      privacyError: true,
    }, () => this._refreshCanSubmit())
  },

  _refreshCanSubmit() {
    this.setData({
      canSubmit: computeCanSubmit(this.data),
    })
  },

  async onOneTapLogin(e) {
    if (this.data.loading) return

    const { code, errMsg } = e.detail || {}
    if (!this.data.agreePrivacy) {
      this.setData({
        privacyError: true,
        formHint: '请先勾选同意用户协议与隐私政策',
        showPrivacyPopup: true,
      })
      wx.showToast({ title: '请先勾选协议', icon: 'none' })
      return
    }

    if (!code) {
      console.warn('[LoginPage] 用户未授权手机号:', errMsg)
      wx.showToast({ title: '需要授权手机号才能登录', icon: 'none' })
      return
    }

    this.setData({ loading: true })
    try {
      const result = await runOneTapLogin({
        phoneCode: code,
        nickName: '',
        localAvatar: '',
      })
      this.setData({ phoneMasked: this._maskPhone(result.phone) })
      wx.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => this._navigateAfterLogin(), 800)
    } catch (err) {
      console.error('[LoginPage] 一键登录失败:', err)
      if (!AuthUtil.isLoggedIn()) {
        AuthService.logout({ redirectToLogin: false, manual: false })
        wx.showToast({
          title: (err && err.message) || '登录失败，请重试',
          icon: 'none',
        })
      } else {
        wx.showToast({ title: '登录成功', icon: 'success' })
        setTimeout(() => this._navigateAfterLogin(), 800)
      }
    } finally {
      this.setData({ loading: false })
    }
  },

  onViewPrivacy() {
    wx.navigateTo({ url: '/pkg-user/agreement/agreement?type=privacy' })
  },

  onViewTerms() {
    wx.navigateTo({ url: '/pkg-user/agreement/agreement?type=terms' })
  },

  _navigateAfterLogin() {
    if (this.data.redirectUrl) {
      const redirect = this.data.redirectUrl
      const tabPages = [
        '/pages/index/index',
        '/pages/content-list/content-list',
        '/pages/mine/mine',
      ]
      if (tabPages.includes(redirect.split('?')[0])) {
        wx.switchTab({ url: redirect.split('?')[0] })
      } else {
        wx.reLaunch({ url: redirect })
      }
    } else {
      wx.switchTab({ url: '/pages/mine/mine' })
    }
  },

  onBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      wx.switchTab({ url: '/pages/index/index' })
    }
  },
})
