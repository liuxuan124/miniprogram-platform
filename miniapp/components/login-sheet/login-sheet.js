const { AuthService } = require('../../services/auth')
const { AuthUtil } = require('../../utils/auth')
const privacyHelper = require('../../utils/privacy')
const SystemService = require('../../services/system')
const {
  DEFAULT_MINIAPP_BRAND_CONFIG,
  normalizeBrandConfig,
  resolveLoginTagline,
} = require('../../utils/brand-config')
const {
  runOneTapLogin,
  computeCanSubmit,
  applyRememberedProfile,
} = require('../../utils/login-flow')

Component({
  data: {
    mounted: false,
    visible: false,
    loading: false,
    interceptAction: '',
    agreePrivacy: false,
    avatarUrl: '',
    avatarLocalPath: '',
    nickName: '',
    canSubmit: false,
    avatarError: false,
    nicknameError: false,
    privacyError: false,
    formHint: '',
    showPrivacyPopup: false,
    nicknameFocused: false,
    pickingAvatar: false,
    brandName: DEFAULT_MINIAPP_BRAND_CONFIG.appName,
    brandMark: DEFAULT_MINIAPP_BRAND_CONFIG.logoMark,
    brandLogoUrl: '',
    brandTagline: DEFAULT_MINIAPP_BRAND_CONFIG.loginTagline,
  },

  lifetimes: {
    detached() {
      this._unsubPrivacy()
      this._restoreTabBar()
      clearTimeout(this._avatarPickTimer)
    },
  },

  methods: {
    _unsubPrivacy() {
      if (this._unsubscribePrivacy) {
        this._unsubscribePrivacy()
        this._unsubscribePrivacy = null
      }
    },

    show(options = {}) {
      if (this.data.loading) return
      this._onLoginSuccess = typeof options.onSuccess === 'function'
        ? options.onSuccess
        : null
      this._unsubPrivacy()
      this._unsubscribePrivacy = privacyHelper.subscribe(() => {
        if (!this.data.mounted) return false
        this.setData({
          showPrivacyPopup: true,
          formHint: '请先同意隐私协议，再选择头像或填写昵称',
        })
        return true
      })
      this.setData({
        mounted: true,
        visible: true,
        interceptAction: options.action || '',
        showPrivacyPopup: false,
        nicknameFocused: false,
        pickingAvatar: false,
        agreePrivacy: false,
        avatarUrl: '',
        avatarLocalPath: '',
        nickName: '',
        canSubmit: false,
        avatarError: false,
        nicknameError: false,
        privacyError: false,
        formHint: '',
        loading: false,
      }, () => {
        applyRememberedProfile((patch) => {
          this.setData(patch, () => this._refreshCanSubmit())
        })
        this._loadBrandConfig(options.action || '')
        AuthService.prefetchLoginCode()
        this._setCustomTabBarHidden(true)
        this._ensurePrivacyReady()
      })
    },

    hide() {
      if (this.data.loading || !this.data.mounted) return
      this._unsubPrivacy()
      this.setData({
        visible: false,
        showPrivacyPopup: false,
      })
      setTimeout(() => {
        if (!this.data.visible) {
          this.setData({ mounted: false })
          this._restoreTabBar()
        }
      }, 280)
    },

    _restoreTabBar() {
      this._setCustomTabBarHidden(false)
    },

    _setCustomTabBarHidden(hidden) {
      try {
        const pages = getCurrentPages()
        const currentPage = pages[pages.length - 1]
        const tabBar = currentPage && typeof currentPage.getTabBar === 'function'
          ? currentPage.getTabBar()
          : null
        if (tabBar) {
          tabBar.setData({ hidden: !!hidden })
        }
      } catch (e) {
        console.warn('[LoginSheet] 切换底部导航显示状态失败:', e)
      }
    },

    noop() {},

    _readBrandFromApp() {
      try {
        const app = getApp()
        const cfg = app && app.globalData && app.globalData.miniappBrandConfig
        return normalizeBrandConfig(cfg)
      } catch (e) {
        return normalizeBrandConfig(null)
      }
    },

    _applyBrandPatch(brand, interceptAction) {
      const normalized = normalizeBrandConfig(brand)
      this.setData({
        brandName: normalized.appName,
        brandMark: normalized.logoMark,
        brandLogoUrl: normalized.logoUrl,
        brandTagline: resolveLoginTagline(normalized, interceptAction),
      })
    },

    async _loadBrandConfig(interceptAction) {
      const cached = this._readBrandFromApp()
      this._applyBrandPatch(cached, interceptAction)
      try {
        const brand = await SystemService.fetchBrandConfig(true)
        const app = getApp()
        if (app && app.globalData) {
          app.globalData.miniappBrandConfig = brand
        }
        this._applyBrandPatch(brand, interceptAction)
      } catch (e) {
        console.warn('[LoginSheet] 加载品牌配置失败，使用默认值:', e)
      }
    },

    /** 仅在需要时弹出微信隐私授权；协议勾选始终默认未选，需用户手动勾选 */
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

    _setAvatar(avatarUrl) {
      if (!avatarUrl) {
        wx.showToast({ title: '未获取到头像', icon: 'none' })
        this.setData({ pickingAvatar: false, nicknameFocused: false })
        return
      }
      this.setData({
        avatarLocalPath: avatarUrl,
        avatarUrl,
        avatarError: false,
        formHint: '',
        showPrivacyPopup: false,
        pickingAvatar: false,
        nicknameFocused: true,
      }, () => this._refreshCanSubmit())
      AuthService.prefetchLoginCode()
    },

    onAvatarTap() {
      try { wx.hideKeyboard() } catch (e) {}
      this.setData({
        pickingAvatar: true,
        nicknameFocused: false,
      })
      clearTimeout(this._avatarPickTimer)
      this._avatarPickTimer = setTimeout(() => {
        if (this.data.pickingAvatar) {
          this.setData({ pickingAvatar: false })
        }
      }, 5000)
    },

    onChooseAvatar(e) {
      clearTimeout(this._avatarPickTimer)
      const avatarUrl = (e.detail && e.detail.avatarUrl) || ''
      if (!avatarUrl) {
        console.warn('[LoginSheet] chooseAvatar empty detail:', e)
        this.setData({ pickingAvatar: false, nicknameFocused: false })
        if (privacyHelper.hasPending() || !this.data.agreePrivacy) {
          this.setData({
            showPrivacyPopup: true,
            formHint: '请先同意隐私协议后再选择头像',
          })
          return
        }
        this.setData({
          formHint: '头像权限未声明：请到公众平台→设置→服务内容声明→用户隐私保护指引，勾选「微信头像」「微信昵称」并保存，约5分钟后生效',
          avatarError: true,
        })
        wx.showToast({ title: '请先在公众平台声明头像权限', icon: 'none', duration: 3000 })
        return
      }
      this._setAvatar(avatarUrl)
    },

    onAgreePrivacyAuthorization(e) {
      const buttonId = (e && e.currentTarget && e.currentTarget.id) || 'privacy-agree-btn'
      privacyHelper.agree(buttonId)
      this.setData({
        agreePrivacy: true,
        privacyError: false,
        formHint: '',
        showPrivacyPopup: false,
        nicknameFocused: false,
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
      clearTimeout(this._avatarPickTimer)
      privacyHelper.refuse()
      this.setData({
        showPrivacyPopup: false,
        agreePrivacy: false,
        pickingAvatar: false,
        nicknameFocused: false,
        formHint: '需同意隐私协议后才能选择头像和昵称',
        privacyError: true,
      }, () => this._refreshCanSubmit())
    },

    onNicknameInput(e) {
      this.setData({
        nickName: (e.detail && e.detail.value) || '',
        nicknameError: false,
        formHint: '',
      }, () => this._refreshCanSubmit())
    },

    onNicknameBlur(e) {
      this.setData({
        nickName: ((e.detail && e.detail.value) || '').trim(),
        nicknameError: false,
        nicknameFocused: false,
      }, () => this._refreshCanSubmit())
    },

    onNicknameReview(e) {
      const pass = !e.detail || e.detail.pass !== false
      if (!pass) {
        this.setData({ nickName: '' }, () => this._refreshCanSubmit())
        wx.showToast({ title: '昵称未通过安全检测', icon: 'none' })
      }
    },

    _refreshCanSubmit() {
      this.setData({
        canSubmit: computeCanSubmit(this.data),
      })
    },

    onPhoneRowTap() {
      if (this.data.loading) return
      try { wx.hideKeyboard() } catch (e) {}
      this.setData({
        privacyError: true,
        formHint: '请先勾选同意用户协议与隐私政策',
      })
      wx.showToast({ title: '请先勾选协议', icon: 'none' })
    },

    async onOneTapLogin(e) {
      if (this.data.loading) return

      const { code, errMsg } = e.detail || {}
      const privacyError = !this.data.agreePrivacy
      const avatarError = !(this.data.avatarLocalPath || this.data.avatarUrl)
      const nicknameError = !(this.data.nickName && this.data.nickName.trim())

      if (privacyError) {
        this.setData({
          privacyError: true,
          avatarError,
          nicknameError,
          formHint: '请先勾选同意用户协议与隐私政策',
          showPrivacyPopup: true,
        })
        wx.showToast({ title: '请先勾选协议', icon: 'none' })
        return
      }

      if (!code) {
        console.warn('[LoginSheet] 用户未授权手机号:', errMsg)
        wx.showToast({ title: '需要授权手机号才能登录', icon: 'none' })
        return
      }

      this.setData({ loading: true })
      try {
        await runOneTapLogin({
          phoneCode: code,
          nickName: this.data.nickName,
          localAvatar: this.data.avatarLocalPath || this.data.avatarUrl || '',
        })

        wx.showToast({ title: '登录成功', icon: 'success' })
        const onSuccess = this._onLoginSuccess
        this._onLoginSuccess = null
        this.setData({ loading: false })
        this.hide()
        this.triggerEvent('success')
        if (onSuccess) {
          setTimeout(() => onSuccess(), 280)
        }
      } catch (err) {
        console.error('[LoginSheet] 一键登录失败:', err)
        if (err && err.code === 'PROFILE_REQUIRED') {
          this.setData({
            avatarError: !(this.data.avatarLocalPath || this.data.avatarUrl),
            nicknameError: !(this.data.nickName && this.data.nickName.trim()),
            formHint: '新用户请先选择头像并填写昵称',
            loading: false,
          })
          wx.showModal({
            title: '请先完善资料',
            content: '首次登录请先选择头像并填写昵称，然后再授权手机号。',
            showCancel: false,
          })
        } else if (!AuthUtil.isLoggedIn()) {
          AuthService.logout({ redirectToLogin: false, manual: false })
          wx.showToast({
            title: (err && err.message) || '登录失败，请重试',
            icon: 'none',
          })
          this.setData({ loading: false })
        } else {
          wx.showToast({ title: '登录成功', icon: 'success' })
          const onSuccess = this._onLoginSuccess
          this._onLoginSuccess = null
          this.setData({ loading: false })
          this.hide()
          this.triggerEvent('success')
          if (onSuccess) {
            setTimeout(() => onSuccess(), 280)
          }
        }
      }
    },

    onViewPrivacy() {
      wx.navigateTo({ url: '/pkg-user/agreement/agreement?type=privacy' })
    },

    onViewTerms() {
      wx.navigateTo({ url: '/pkg-user/agreement/agreement?type=terms' })
    },
  },
})
