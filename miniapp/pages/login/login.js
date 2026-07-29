// pages/login/login.js — 手机号快捷登录
const { AuthService } = require('../../services/auth')
const { AuthUtil } = require('../../utils/auth')
const { upload } = require('../../utils/request')

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
    showAvatarOptions: false,
    nicknameEditing: false,
    nicknameFocused: false,
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
  },

  _maskPhone(phone) {
    const raw = String(phone || '')
    if (raw.length < 7) return raw
    return raw.slice(0, 3) + '****' + raw.slice(-4)
  },

  _setAvatar(avatarUrl) {
    if (!avatarUrl) {
      wx.showToast({ title: '未获取到头像', icon: 'none' })
      return
    }
    this.setData({
      avatarLocalPath: avatarUrl,
      avatarUrl,
      avatarError: false,
      formHint: '',
    }, () => this._refreshCanSubmit())
  },

  onChooseAvatarTap() {
    this.setData({ showAvatarOptions: true })
  },

  onCloseAvatarOptions() {
    this.setData({ showAvatarOptions: false })
  },

  onChooseAvatar(e) {
    const avatarUrl = (e.detail && e.detail.avatarUrl) || ''
    this._setAvatar(avatarUrl)
    if (avatarUrl) {
      this.setData({ showAvatarOptions: false })
    }
  },

  onChooseMediaSource(e) {
    const sourceType = (e.currentTarget.dataset && e.currentTarget.dataset.source) || 'album'
    this.setData({ showAvatarOptions: false })
    setTimeout(() => {
      this._chooseAvatarMedia(sourceType)
    }, 180)
  },

  onNicknameOptionsTap() {
    if (this.data.nicknameEditing) return
    wx.showActionSheet({
      itemList: ['使用微信昵称', '手动填写'],
      success: (res) => {
        this._focusNickname(res.tapIndex === 0)
      },
      fail() {},
    })
  },

  _focusNickname(useSystemNickname) {
    this.setData({
      nicknameEditing: true,
      nicknameFocused: false,
    }, () => {
      setTimeout(() => {
        this.setData({ nicknameFocused: true })
        if (useSystemNickname) {
          wx.showToast({
            title: '请从键盘上方选择昵称',
            icon: 'none',
            duration: 1800,
          })
        }
      }, 180)
    })
  },

  onNicknameInputFocus() {
    this.setData({ nicknameFocused: true })
  },

  _chooseAvatarMedia(sourceType) {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: [sourceType],
      sizeType: ['compressed'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0]
        this._setAvatar(file && file.tempFilePath)
      },
      fail: (err) => {
        if (!err || !String(err.errMsg || '').includes('cancel')) {
          console.warn('[LoginPage] 选择头像失败:', err)
          wx.showToast({ title: '头像选择失败，请重试', icon: 'none' })
        }
      },
    })
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
    const { agreePrivacy, avatarLocalPath, avatarUrl, nickName } = this.data
    this.setData({
      canSubmit: !!(
        agreePrivacy
        && (avatarLocalPath || avatarUrl)
        && nickName
        && nickName.trim()
      ),
    })
  },

  onTogglePrivacy() {
    this.setData({
      agreePrivacy: !this.data.agreePrivacy,
      privacyError: false,
      formHint: '',
    }, () => this._refreshCanSubmit())
  },

  onPrecheckLogin() {
    const avatarError = !(this.data.avatarLocalPath || this.data.avatarUrl)
    const nicknameError = !(this.data.nickName && this.data.nickName.trim())
    const privacyError = !this.data.agreePrivacy
    const missing = []
    if (avatarError) missing.push('头像')
    if (nicknameError) missing.push('昵称')
    if (privacyError) missing.push('协议')
    this.setData({
      avatarError,
      nicknameError,
      privacyError,
      formHint: missing.length ? '请先完成：' + missing.join('、') : '',
    })
  },

  /** 一键获取手机号并完成登录 */
  async onOneTapLogin(e) {
    if (this.data.loading) return

    if (!this.data.agreePrivacy) {
      wx.showToast({ title: '请先同意隐私协议', icon: 'none' })
      return
    }
    if (!(this.data.avatarLocalPath || this.data.avatarUrl)) {
      wx.showToast({ title: '请先选择头像', icon: 'none' })
      return
    }
    const nickName = (this.data.nickName || '').trim()
    if (!nickName) {
      wx.showToast({ title: '请先填写昵称', icon: 'none' })
      return
    }
    const { code, errMsg } = e.detail || {}
    if (!code) {
      console.warn('[LoginPage] 用户未授权手机号:', errMsg)
      wx.showToast({ title: '需要授权手机号才能登录', icon: 'none' })
      return
    }

    this.setData({ loading: true })
    try {
      const loginResult = await AuthService.wxLogin({ nickname: nickName })

      let avatarRemoteUrl = ''
      if (this.data.avatarLocalPath) {
        try {
          const uploaded = await upload(this.data.avatarLocalPath, {
            name: 'file',
            url: '/api/v1/mp/upload',
            formData: { subDir: 'avatar' },
          })
          avatarRemoteUrl = (uploaded && (uploaded.url || uploaded.fileUrl)) || ''
        } catch (uploadErr) {
          console.warn('[LoginPage] 头像上传失败，继续完成登录:', uploadErr)
        }
      }

      const phone = await AuthService.bindPhone(code, {
        nickname: nickName,
        avatarUrl: avatarRemoteUrl,
      })

      this.setData({ phoneMasked: this._maskPhone(phone) })

      AuthService.completeLogin({
        phone,
        nickName: nickName || (loginResult.userInfo && loginResult.userInfo.nickName) || '',
        avatarUrl: avatarRemoteUrl || (loginResult.userInfo && loginResult.userInfo.avatarUrl) || '',
      })

      wx.showToast({ title: '登录成功', icon: 'success' })
      AuthUtil.clearLoginInterceptInfo()
      setTimeout(() => this._navigateAfterLogin(), 800)
    } catch (err) {
      console.error('[LoginPage] 一键登录失败:', err)
      AuthService.logout({ redirectToLogin: false, manual: false })
      wx.showToast({
        title: (err && err.message) || '登录失败，请重试',
        icon: 'none',
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  onViewPrivacy() {
    wx.navigateTo({ url: '/pages/agreement/agreement?type=privacy' })
  },

  onViewTerms() {
    wx.navigateTo({ url: '/pages/agreement/agreement?type=terms' })
  },

  _navigateAfterLogin() {
    if (this.data.redirectUrl) {
      const redirect = this.data.redirectUrl
      const tabPages = [
        '/pages/index/index',
        '/pages/content-list/content-list',
        '/pages/product-list/product-list',
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
