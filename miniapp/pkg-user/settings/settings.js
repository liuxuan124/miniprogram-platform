const { AuthUtil } = require('../../utils/auth')
const { AuthService } = require('../../services/auth')
const { upload } = require('../../utils/request')
const {
  DEFAULT_AVATAR,
  pickDisplayAvatarUrl,
  isTempLocalAvatar,
  isPersistedMediaUrl,
} = require('../../utils/image-fallback')
const { resolveMediaUrl } = require('../../utils/media-url')

const NICKNAME_MAX_LEN = 10

const isRemoteUrl = isPersistedMediaUrl

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
    version: '1.30.3',
  },

  onShow() {
    // 选图过程中 Android 常触发 onShow；勿打断待上传本地头像
    if (this._avatarPicking) return
    this._refresh()
  },

  _getPendingAvatar() {
    return this._pendingAvatarLocal || this.data.pendingAvatarLocal || ''
  },

  _setPendingAvatar(localPath) {
    const pending = localPath && !isRemoteUrl(localPath) ? localPath : ''
    // 同步实例字段：避免 setData 未落盘时 onShow/_refresh 读到空 pending
    this._pendingAvatarLocal = pending
    this.setData({
      editAvatarUrl: localPath || this.data.editAvatarUrl,
      pendingAvatarLocal: pending,
    })
  },

  _clearPendingAvatar() {
    this._pendingAvatarLocal = ''
  },

  _refresh() {
    const isLoggedIn = !!AuthUtil.isLoggedIn()
    const userInfo = isLoggedIn ? (AuthUtil.getUserInfo() || {}) : null
    const editNickName = (userInfo && (userInfo.nickName || userInfo.nickname)) || ''
    // 同步源优先，挡住 setData 竞态把 pending 冲掉
    const pendingAvatarLocal = isLoggedIn ? this._getPendingAvatar() : ''
    if (!isLoggedIn) this._clearPendingAvatar()
    const serverAvatar = (userInfo && userInfo.avatarUrl) || ''
    const editAvatarUrl = pendingAvatarLocal
      || pickDisplayAvatarUrl(serverAvatar)
    const editPhone = (userInfo && userInfo.phone) || ''
    const editEmail = (userInfo && userInfo.email) || ''
    this.setData({
      isLoggedIn,
      userInfo,
      editNickName,
      editAvatarUrl,
      editPhone,
      editEmail,
      pendingAvatarLocal,
      nicknameError: String(editNickName).length > NICKNAME_MAX_LEN,
      phoneSoftTip: softPhoneTip(editPhone),
      emailSoftTip: softEmailTip(editEmail),
      canSave: calcCanSave(editNickName),
    })
  },

  onAvatarError() {
    if (isTempLocalAvatar(this.data.editAvatarUrl)) return
    if (this._getPendingAvatar()) return
    if (this.data.editAvatarUrl === DEFAULT_AVATAR) return
    this.setData({ editAvatarUrl: DEFAULT_AVATAR })
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
      this._setPendingAvatar(localPath)
    }

    this._avatarPicking = true
    if (this._avatarPickTimer) clearTimeout(this._avatarPickTimer)
    // 兜底：部分机型 complete 丢失时避免永久跳过 onShow
    this._avatarPickTimer = setTimeout(() => {
      this._avatarPicking = false
    }, 60000)

    const donePicking = () => {
      this._avatarPicking = false
      if (this._avatarPickTimer) {
        clearTimeout(this._avatarPickTimer)
        this._avatarPickTimer = null
      }
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
        complete: donePicking,
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
      complete: donePicking,
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
      const fallback = (
        (this.data.userInfo && (this.data.userInfo.nickName || this.data.userInfo.nickname))
        || ''
      ).trim()
      this.setData({
        editNickName: fallback,
        nicknameError: false,
        canSave: calcCanSave(fallback),
      })
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
    const local = this._getPendingAvatar()
    if (!local) {
      // 无新头像：不回传展示用本地默认图，避免污染 profile
      return Promise.resolve('')
    }
    if (isRemoteUrl(local)) {
      return Promise.resolve(local)
    }
    return upload(local, {
      name: 'file',
      url: '/api/v1/mp/upload',
      formData: { subDir: 'avatar' },
      showError: false,
    }).then((uploaded) => {
      const raw = (uploaded && (uploaded.url || uploaded.fileUrl)) || ''
      return resolveMediaUrl(raw) || raw
    })
  },

  onSaveProfile() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    if (this.data.savingProfile || this._savingLock) return

    const nick = String(this.data.editNickName || '').trim()
    if (!nick) {
      this.setData({ canSave: false })
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
    const hadPendingAvatar = !!this._getPendingAvatar()
    this._savingLock = true
    this.setData({ savingProfile: true, editNickName: nick, nicknameError: false, canSave: true })

    const finish = () => {
      this._savingLock = false
      this.setData({ savingProfile: false })
    }

    this._uploadAvatarIfNeeded()
      .then((avatarUrl) => {
        const finalAvatar = resolveMediaUrl(avatarUrl)
          || (isRemoteUrl(avatarUrl) ? avatarUrl : '')
          || ''
        if (hadPendingAvatar && !finalAvatar) {
          throw new Error('avatar_upload_failed')
        }
        const payload = {
          nickname: nick,
          phone,
          email,
        }
        if (finalAvatar) payload.avatarUrl = finalAvatar
        return AuthService.updateProfile(payload).then((userInfo) => ({ userInfo, finalAvatar }))
      })
      .then(({ userInfo, finalAvatar }) => {
        const persistAvatar = isRemoteUrl(finalAvatar)
          ? finalAvatar
          : ((userInfo && userInfo.avatarUrl) || '')
        this._clearPendingAvatar()
        AuthUtil.rememberLoginProfile({
          nickName: nick,
          avatarUrl: isRemoteUrl(persistAvatar) ? persistAvatar : '',
        })
        this.setData({
          pendingAvatarLocal: '',
          editAvatarUrl: pickDisplayAvatarUrl(persistAvatar, finalAvatar),
          canSave: calcCanSave(nick),
        })
        this._refresh()
        wx.showToast({ title: '已保存', icon: 'success' })
      })
      .catch((err) => {
        const msg =
          (err && err.message === 'avatar_upload_failed')
            ? '头像上传失败，请重试'
            : ((err && (err.message || err.msg)) || '保存失败，请重试')
        wx.showToast({ title: String(msg).slice(0, 40), icon: 'none' })
      })
      .then(finish, finish)
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
        this._clearPendingAvatar()
        this._refresh()
        wx.showToast({ title: '已退出登录', icon: 'success' })
        setTimeout(() => wx.switchTab({ url: '/pages/mine/mine' }), 400)
      },
    })
  },
})
