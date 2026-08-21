const { AuthUtil } = require('../../utils/auth')
const { AuthService } = require('../../services/auth')
const { upload } = require('../../utils/request')

const NICKNAME_MAX_LEN = 10

function isRemoteUrl(url) {
  return !!(url && /^https?:\/\//i.test(String(url)))
}

function softPhoneTip(phone) {
  const p = String(phone || '').trim()
  if (!p) return ''
  const digits = p.replace(/\D/g, '')
  if (/[a-zA-Z]/.test(p) || digits.length < 7 || digits.length > 15) {
    return '手机号格式可能不正确'
  }
  return ''
}

function softEmailTip(email) {
  const e = String(email || '').trim()
  if (!e) return ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
    return '邮箱格式可能不正确'
  }
  return ''
}

function calcCanSave(nick) {
  const n = String(nick || '').trim()
  return n.length > 0 && n.length <= NICKNAME_MAX_LEN
}

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    editNickName: '',
    editAvatarUrl: '',
    editPhone: '',
    editEmail: '',
    pendingAvatarLocal: '',
    nicknameError: false,
    phoneSoftTip: '',
    emailSoftTip: '',
    canSave: false,
    savingProfile: false,
    version: '1.10.22',
  },

  onShow() {
    this._refresh()
  },

  _refresh() {
    const isLoggedIn = !!AuthUtil.isLoggedIn()
    const userInfo = isLoggedIn ? (AuthUtil.getUserInfo() || {}) : null
    const editNickName = (userInfo && (userInfo.nickName || userInfo.nickname)) || ''
    const editAvatarUrl = (userInfo && userInfo.avatarUrl) || ''
    const editPhone = (userInfo && userInfo.phone) || ''
    const editEmail = (userInfo && userInfo.email) || ''
    this.setData({
      isLoggedIn,
      userInfo,
      editNickName,
      editAvatarUrl,
      editPhone,
      editEmail,
      pendingAvatarLocal: '',
      nicknameError: String(editNickName).length > NICKNAME_MAX_LEN,
      phoneSoftTip: softPhoneTip(editPhone),
      emailSoftTip: softEmailTip(editEmail),
      canSave: calcCanSave(editNickName),
    })
  },

  onLoginTap() {
    AuthUtil.openLoginSheet({
      onSuccess: () => this._refresh(),
    })
  },

  onChooseAvatar() {
    if (!this.data.isLoggedIn) return
    const applyLocal = (localPath) => {
      if (!localPath) {
        wx.showToast({ title: '未获取到头像', icon: 'none' })
        return
      }
      this.setData({
        editAvatarUrl: localPath,
        pendingAvatarLocal: isRemoteUrl(localPath) ? '' : localPath,
      })
    }

    if (typeof wx.chooseMedia === 'function') {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const file = (res.tempFiles && res.tempFiles[0]) || null
          applyLocal((file && file.tempFilePath) || '')
        },
        fail: () => wx.showToast({ title: '取消选择', icon: 'none' }),
      })
      return
    }

    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        applyLocal((res.tempFilePaths && res.tempFilePaths[0]) || '')
      },
      fail: () => wx.showToast({ title: '取消选择', icon: 'none' }),
    })
  },

  onNickInput(e) {
    const value = (e.detail && e.detail.value) || ''
    this.setData({
      editNickName: value,
      nicknameError: String(value).length > NICKNAME_MAX_LEN,
      canSave: calcCanSave(value),
    })
  },

  onNicknameReview(e) {
    const pass = !e.detail || e.detail.pass !== false
    if (!pass) {
      this.setData({ editNickName: '', nicknameError: false, canSave: false })
      wx.showToast({ title: '昵称未通过安全检测', icon: 'none' })
    }
  },

  onPhoneInput(e) {
    const value = (e.detail && e.detail.value) || ''
    this.setData({
      editPhone: value,
      phoneSoftTip: softPhoneTip(value),
    })
  },

  onEmailInput(e) {
    const value = (e.detail && e.detail.value) || ''
    this.setData({
      editEmail: value,
      emailSoftTip: softEmailTip(value),
    })
  },

  _uploadAvatarIfNeeded() {
    const local = this.data.pendingAvatarLocal
    if (!local) {
      return Promise.resolve(this.data.editAvatarUrl || '')
    }
    if (isRemoteUrl(local)) {
      return Promise.resolve(local)
    }
    return upload(local, {
      name: 'file',
      url: '/api/v1/mp/upload',
      formData: { subDir: 'avatar' },
      showError: false,
    }).then((uploaded) => (uploaded && (uploaded.url || uploaded.fileUrl)) || '')
  },

  onSaveProfile() {
    if (!this.data.isLoggedIn || this.data.savingProfile) return
    const nick = String(this.data.editNickName || '').trim()
    if (!nick) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    if (nick.length > NICKNAME_MAX_LEN) {
      this.setData({ nicknameError: true, canSave: false })
      wx.showToast({ title: '昵称不能超过10个字', icon: 'none' })
      return
    }

    const phone = String(this.data.editPhone || '').trim()
    const email = String(this.data.editEmail || '').trim()
    this.setData({ savingProfile: true, editNickName: nick, nicknameError: false })

    this._uploadAvatarIfNeeded()
      .then((avatarUrl) => {
        if (!avatarUrl && this.data.pendingAvatarLocal) {
          throw new Error('avatar_upload_failed')
        }
        const finalAvatar = avatarUrl || this.data.editAvatarUrl || ''
        return AuthService.updateProfile({
          nickname: nick,
          avatarUrl: finalAvatar || undefined,
          phone,
          email,
        }).then((userInfo) => ({ userInfo, finalAvatar }))
      })
      .then(({ finalAvatar }) => {
        AuthUtil.rememberLoginProfile({ nickName: nick, avatarUrl: finalAvatar })
        this.setData({ pendingAvatarLocal: '', editAvatarUrl: finalAvatar || this.data.editAvatarUrl })
        this._refresh()
        wx.showToast({ title: '已保存', icon: 'success' })
      })
      .catch((err) => {
        const msg =
          (err && err.message === 'avatar_upload_failed')
            ? '头像上传失败'
            : ((err && err.message) || '保存失败')
        wx.showToast({ title: msg, icon: 'none' })
      })
      .finally(() => this.setData({ savingProfile: false }))
  },

  goAddress() {
    if (!AuthUtil.requireLoginForAction('管理收货地址')) return
    wx.navigateTo({ url: '/pkg-user/address-list/address-list' })
  },

  goTerms() {
    wx.navigateTo({ url: '/pkg-user/agreement/agreement?type=terms' })
  },

  goPrivacy() {
    wx.navigateTo({ url: '/pkg-user/agreement/agreement?type=privacy' })
  },

  goFeedback() {
    wx.navigateTo({
      url: '/pkg-user/feedback/feedback',
      fail: () => wx.navigateTo({ url: '/pkg-user/service-chat/service-chat' }),
    })
  },

  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定退出登录吗？',
      success: (res) => {
        if (!res.confirm) return
        AuthService.logout({ manual: true, redirectToLogin: false })
        this._refresh()
        wx.showToast({ title: '已退出登录', icon: 'success' })
        setTimeout(() => wx.switchTab({ url: '/pages/mine/mine' }), 400)
      },
    })
  },
})
