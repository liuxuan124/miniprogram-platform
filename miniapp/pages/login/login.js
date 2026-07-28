// pages/login/login.js — 头像 + 昵称 + 手机号快捷登录
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

  _refreshCanSubmit() {
    const { agreePrivacy, avatarLocalPath, avatarUrl, nickName } = this.data
    const hasAvatar = !!(avatarLocalPath || avatarUrl)
    const hasNickname = !!(nickName && nickName.trim())
    this.setData({
      canSubmit: !!(agreePrivacy && hasAvatar && hasNickname),
    })
  },

  onChooseAvatar(e) {
    const avatarUrl = (e.detail && e.detail.avatarUrl) || ''
    if (!avatarUrl) {
      wx.showToast({ title: '未获取到头像', icon: 'none' })
      return
    }
    this.setData({
      avatarLocalPath: avatarUrl,
      avatarUrl,
    }, () => this._refreshCanSubmit())
  },

  onNicknameInput(e) {
    this.setData({
      nickName: (e.detail && e.detail.value) || '',
    }, () => this._refreshCanSubmit())
  },

  onNicknameBlur(e) {
    const value = ((e.detail && e.detail.value) || '').trim()
    this.setData({ nickName: value }, () => this._refreshCanSubmit())
  },

  onNicknameFocus() {
    if (!this.data.nickName && !this._nicknameHintShown) {
      this._nicknameHintShown = true
      wx.showToast({
        title: '请在输入框填写昵称',
        icon: 'none',
        duration: 2200,
      })
    }
  },

  onNicknameReview(e) {
    // 昵称内容安全回调：pass / fail
    const pass = !e.detail || e.detail.pass !== false
    if (!pass) {
      this.setData({ nickName: '' }, () => this._refreshCanSubmit())
      wx.showToast({ title: '昵称未通过安全检测', icon: 'none' })
    }
  },

  onTogglePrivacy() {
    this.setData({
      agreePrivacy: !this.data.agreePrivacy,
    }, () => this._refreshCanSubmit())
  },

  onPrecheckLogin() {
    if (!this.data.agreePrivacy) {
      wx.showToast({ title: '请先同意隐私协议', icon: 'none' })
      return
    }
    if (!(this.data.avatarLocalPath || this.data.avatarUrl)) {
      wx.showToast({ title: '请先选择头像', icon: 'none' })
      return
    }
    if (!(this.data.nickName && this.data.nickName.trim())) {
      wx.showToast({ title: '请先填写昵称', icon: 'none' })
      return
    }
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
      await AuthService.wxLogin({ nickname: nickName })

      let avatarRemoteUrl = this.data.avatarUrl
      if (this.data.avatarLocalPath) {
        try {
          const uploaded = await upload(this.data.avatarLocalPath, {
            name: 'file',
            url: '/api/v1/mp/upload',
            formData: { subDir: 'avatar' },
          })
          avatarRemoteUrl = (uploaded && (uploaded.url || uploaded.fileUrl)) || avatarRemoteUrl
        } catch (uploadErr) {
          console.warn('[LoginPage] 头像上传失败，继续绑定手机号:', uploadErr)
        }
      }

      const phone = await AuthService.bindPhone(code, {
        nickname: nickName,
        avatarUrl: avatarRemoteUrl,
      })

      this.setData({ phoneMasked: this._maskPhone(phone) })

      AuthService.completeLogin({
        phone,
        nickName,
        avatarUrl: avatarRemoteUrl,
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
