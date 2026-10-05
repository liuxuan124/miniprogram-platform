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
const {
  DEFAULT_BRAND_LOGO,
  resolveDisplayLogoUrl,
} = require('../../utils/image-fallback')

/**
 * 7 个内容模块的兜底显隐。
 * 🔴 全部 true —— 与线上 login.wxml 的无条件渲染一致。
 * 拉到后台配置后由 _loadLoginPageConfig 用 resolveLoginModules 的结果覆盖。
 *
 * 🔴 协议勾选 / 隐私弹窗 / 登录主按钮**不在**这里：它们是合规项与页面唯一入口，
 * 不接受任何界面开关，onOneTapLogin 的 agreePrivacy 校验也永远生效。
 */
const DEFAULT_LOGIN_MODULES = {
  brandIdentity: true,
  heroTitle: true,
  interceptTip: true,
  sheetHeading: true,
  formHint: true,
  skipButton: true,
  privacyNote: true,
}

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
    brandLogoUrl: DEFAULT_BRAND_LOGO,
    brandEyebrow: DEFAULT_MINIAPP_BRAND_CONFIG.brandEyebrow,
    // 登录页模板配置（后台 loginPageConfig）
    loginPageConfig: null,
    styleKey: 'warm',
    heroTitle: '欢迎回来',
    heroSubtitle: '登录后同步收藏、预约与阅读记录',
    loginButtonText: '手机号快捷登录',
    skipButtonText: '暂不登录',
    sheetTitle: '手机号快捷登录',
    sheetSubtitle: '使用授权信息快速登录',
    securityBadgeText: '安全登录',
    privacyNoteText: '未登录也可浏览资讯；手机号仅用于登录，不会公开展示',
    showDecorOrbs: true,
    showSecurityBadge: true,
    showBackButton: true,
    // 7 个内容模块显隐；缺省全显示 = 线上现状
    modules: { ...DEFAULT_LOGIN_MODULES },
    // 顶部样式 gradient | solid
    headerStyle: 'gradient',
    // 卡片样式 shadow | flat | outline
    cardStyle: 'shadow',
    // 页面级背景色；空串 = 跟随 login.wxss 默认底色
    loginPageBg: '',
    // 生效主题色的 inline CSS 变量（--lg-brand/--lg-brand-2）。
    // 空串 = 用 login.wxss 里各皮肤自带的默认变量（= 线上现状）。
    loginThemeStyle: '',
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

    AuthService.prefetchLoginCodeSafely()
    this._ensurePrivacyReady()
    this._refreshCanSubmit()
    // 品牌/登录页配置必须在可能抛错的调用之前发出，否则一次异常就中断整个 onLoad，
    // 页面永远停在本地兜底品牌（图标/名称/皮肤都不跟平台同步）。
    this._loadBrandConfig()
    this._loadLoginPageConfig()
  },

  /**
   * 拉取登录页配置（后台 loginPageConfig）
   *
   * 🔴 theme 由 system.js 的 resolveLoginEffectiveTheme 算好：
   * themeSource=inherit → 全局品牌色；=page 且填了 themeColor → 页面色。
   * 这里只负责把结果转成 inline CSS 变量注入，login.wxss 的
   * lg-page--themed 段负责在页面覆盖时接管掉皮肤写死的按钮色。
   */
  async _loadLoginPageConfig() {
    try {
      const cfg = await SystemService.fetchLoginPageConfig()
      if (!cfg) return
      const modules = cfg.modules && typeof cfg.modules === 'object'
        ? Object.assign({}, DEFAULT_LOGIN_MODULES, cfg.modules)
        : { ...DEFAULT_LOGIN_MODULES }
      this.setData({
        loginPageConfig: cfg,
        styleKey: cfg.styleKey || 'warm',
        heroTitle: cfg.heroTitle || '欢迎回来',
        heroSubtitle: cfg.heroSubtitle || '',
        loginButtonText: cfg.loginButtonText || '手机号快捷登录',
        skipButtonText: cfg.skipButtonText || '暂不登录',
        sheetTitle: cfg.sheetTitle || '手机号快捷登录',
        sheetSubtitle: cfg.sheetSubtitle || '使用授权信息快速登录',
        securityBadgeText: cfg.securityBadgeText || '安全登录',
        privacyNoteText: cfg.privacyNoteText || '未登录也可浏览资讯；手机号仅用于登录，不会公开展示',
        showDecorOrbs: cfg.showDecorOrbs !== false,
        showSecurityBadge: cfg.showSecurityBadge !== false,
        showBackButton: cfg.showBackButton !== false,
        modules,
        headerStyle: cfg.headerStyle || 'gradient',
        cardStyle: cfg.cardStyle || 'shadow',
        loginPageBg: cfg.pageBackgroundColor || '',
      })
      const theme = cfg.theme
      // 🔴 全局主题为空时不要注入空变量，否则会把各皮肤自带的兜底色顶掉
      if (theme && theme.primary) {
        this.setData({
          loginThemeStyle: [
            `--lg-brand:${theme.primary}`,
            `--lg-brand-2:${theme.secondary || theme.primary}`,
          ].join(';') + ';',
        })
      }
    } catch (e) {
      console.warn('[LoginPage] 加载登录页配置失败:', e)
    }
  },

  async _loadBrandConfig() {
    try {
      const app = getApp()
      const cached = app && app.globalData && app.globalData.miniappBrandConfig
      const brand = normalizeBrandConfig(cached || await SystemService.fetchBrandConfig(true))
      if (app && app.globalData) {
        app.globalData.miniappBrandConfig = brand
      }
      this.setData({
        brandName: brand.appName,
        brandMark: brand.logoMark,
        brandLogoUrl: resolveDisplayLogoUrl(brand.logoUrl) || DEFAULT_BRAND_LOGO,
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

  onBrandLogoError() {
    const current = String(this.data.brandLogoUrl || '')
    if (current && current !== DEFAULT_BRAND_LOGO) {
      this.setData({ brandLogoUrl: DEFAULT_BRAND_LOGO })
      return
    }
    this.setData({ brandLogoUrl: '' })
  },

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
    AuthService.prefetchLoginCodeSafely()
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
      wx.showToast({ title: '已取消登录，可继续浏览', icon: 'none' })
      setTimeout(() => this.onBack(), 400)
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
        '/pkg-content/content-list/content-list',
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
