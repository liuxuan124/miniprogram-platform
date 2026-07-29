const { AuthService } = require('../../services/auth')
const { AuthUtil } = require('../../utils/auth')
const { upload } = require('../../utils/request')

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
    showAvatarOptions: false,
    nicknameEditing: false,
    nicknameFocused: false,
  },

  lifetimes: {
    detached() {
      this._restoreTabBar()
    },
  },

  methods: {
    show(options = {}) {
      if (this.data.loading) return
      this._onLoginSuccess = typeof options.onSuccess === 'function'
        ? options.onSuccess
        : null
      this.setData({
        mounted: true,
        visible: false,
        interceptAction: options.action || '',
      }, () => {
        this._setCustomTabBarHidden(true)
        wx.hideTabBar({
          animation: false,
          success: () => {
            this._tabBarHiddenBySheet = true
          },
          fail() {},
        })
        wx.nextTick(() => this.setData({ visible: true }))
      })
    },

    hide() {
      if (this.data.loading || !this.data.mounted) return
      this.setData({
        visible: false,
        showAvatarOptions: false,
        nicknameFocused: false,
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
      if (!this._tabBarHiddenBySheet) return
      this._tabBarHiddenBySheet = false
      wx.showTabBar({ animation: false, fail() {} })
    },

    _setCustomTabBarHidden(hidden) {
      try {
        const pages = getCurrentPages()
        const currentPage = pages[pages.length - 1]
        const tabBar = currentPage && typeof currentPage.getTabBar === 'function'
          ? currentPage.getTabBar()
          : null
        if (tabBar) {
          tabBar.setData({ hidden })
        }
      } catch (e) {
        console.warn('[LoginSheet] 切换底部导航显示状态失败:', e)
      }
    },

    noop() {},

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
            console.warn('[LoginSheet] 选择头像失败:', err)
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
        console.warn('[LoginSheet] 用户未授权手机号:', errMsg)
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
            console.warn('[LoginSheet] 头像上传失败，继续完成登录:', uploadErr)
          }
        }

        const phone = await AuthService.bindPhone(code, {
          nickname: nickName,
          avatarUrl: avatarRemoteUrl,
        })
        AuthService.completeLogin({
          phone,
          nickName: nickName || (loginResult.userInfo && loginResult.userInfo.nickName) || '',
          avatarUrl: avatarRemoteUrl || (loginResult.userInfo && loginResult.userInfo.avatarUrl) || '',
        })

        AuthUtil.clearLoginInterceptInfo()
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
        AuthService.logout({ redirectToLogin: false, manual: false })
        wx.showToast({
          title: (err && err.message) || '登录失败，请重试',
          icon: 'none',
        })
        this.setData({ loading: false })
      }
    },

    onViewPrivacy() {
      wx.navigateTo({ url: '/pages/agreement/agreement?type=privacy' })
    },

    onViewTerms() {
      wx.navigateTo({ url: '/pages/agreement/agreement?type=terms' })
    },
  },
})
