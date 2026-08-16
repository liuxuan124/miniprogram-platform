// pages/login/login.js — 手机号快捷登录
const { AuthService } = require('../../services/auth')
const { AuthUtil } = require('../../utils/auth')
const privacyHelper = require('../../utils/privacy')
const {
  runOneTapLogin,
  computeCanSubmit,
  applyRememberedProfile,
} = require('../../utils/login-flow')

Page({
  data: {
    loading: false,
    redirectUrl: '',
    agreePrivacy: false,
    interceptAction: '',
    avatarUrl: '',
    avatarLocalPath: '',
    nickName: '',
    phoneMasked: '',
    canSubmit: false,
    avatarError: false,
    nicknameError: false,
    privacyError: false,
    formHint: '',
    showPrivacyPopup: false,
    nicknameFocused: false,
    pickingAvatar: false,
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
        formHint: '请先同意隐私协议，再选择头像或填写昵称',
      })
      return true
    })

    applyRememberedProfile((patch) => {
      this.setData(patch, () => this._refreshCanSubmit())
    })
    AuthService.prefetchLoginCode()
    this._ensurePrivacyReady()
  },

  onUnload() {
    if (this._unsubscribePrivacy) {
      this._unsubscribePrivacy()
      this._unsubscribePrivacy = null
    }
    clearTimeout(this._avatarPickTimer)
  },

  noop() {},

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

  _maskPhone(phone) {
    const raw = String(phone || '')
    if (raw.length < 7) return raw
    return raw.slice(0, 3) + '****' + raw.slice(-4)
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
      nicknameFocused: false,
    }, () => this._refreshCanSubmit())
    AuthService.prefetchLoginCode()
  },

  /** 点头像时先收起键盘并锁住昵称，避免抢焦点导致「先出昵称再出头像」 */
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
      console.warn('[LoginPage] chooseAvatar empty detail:', e)
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

  /** 一键获取手机号并完成登录 */
  async onOneTapLogin(e) {
    if (this.data.loading) return

    const { code, errMsg } = e.detail || {}
    const privacyError = !this.data.agreePrivacy
    const avatarError = !(this.data.avatarLocalPath || this.data.avatarUrl)
    const nicknameError = !(this.data.nickName && this.data.nickName.trim())

    // 协议未勾选：立刻拦住，避免继续消耗登录链路
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
      console.warn('[LoginPage] 用户未授权手机号:', errMsg)
      wx.showToast({ title: '需要授权手机号才能登录', icon: 'none' })
      return
    }

    this.setData({ loading: true })
    try {
      const result = await runOneTapLogin({
        phoneCode: code,
        nickName: this.data.nickName,
        localAvatar: this.data.avatarLocalPath || this.data.avatarUrl || '',
      })

      this.setData({ phoneMasked: this._maskPhone(result.phone) })
      wx.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => this._navigateAfterLogin(), 800)
    } catch (err) {
      console.error('[LoginPage] 一键登录失败:', err)
      if (err && err.code === 'PROFILE_REQUIRED') {
        this.setData({
          avatarError: !(this.data.avatarLocalPath || this.data.avatarUrl),
          nicknameError: !(this.data.nickName && this.data.nickName.trim()),
          formHint: '新用户请先选择头像并填写昵称',
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
      } else {
        // 已登录却走到异常：按成功收尾，避免「失败但仍已登录」
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
