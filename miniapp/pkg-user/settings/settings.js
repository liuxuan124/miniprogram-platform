const { AuthUtil } = require('../../utils/auth')
const { AuthService } = require('../../services/auth')
const { upload } = require('../../utils/request')

function maskPhone(phone) {
  const p = String(phone || '').replace(/\D/g, '')
  if (p.length >= 11) return `${p.slice(0, 3)}****${p.slice(-4)}`
  if (p.length >= 7) return `${p.slice(0, 3)}****${p.slice(-2)}`
  return p || '未绑定'
}

function isRemoteUrl(url) {
  return !!(url && /^https?:\/\//i.test(String(url)))
}

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    editNickName: '',
    phoneMasked: '未绑定',
    phoneBound: false,
    savingProfile: false,
    version: '1.10.22',
  },

  onShow() {
    this._refresh()
  },

  _refresh() {
    const isLoggedIn = !!AuthUtil.isLoggedIn()
    const userInfo = isLoggedIn ? (AuthUtil.getUserInfo() || {}) : null
    this.setData({
      isLoggedIn,
      userInfo,
      editNickName: (userInfo && (userInfo.nickName || userInfo.nickname)) || '',
      phoneMasked: maskPhone(userInfo && userInfo.phone),
      phoneBound: !!(userInfo && (userInfo.phoneBound || userInfo.phone)),
    })
  },

  onLoginTap() {
    AuthUtil.openLoginSheet({
      onSuccess: () => this._refresh(),
    })
  },

  onChooseAvatar(e) {
    if (!this.data.isLoggedIn) return
    const localPath = (e.detail && e.detail.avatarUrl) || ''
    if (!localPath) {
      wx.showToast({ title: '未获取到头像', icon: 'none' })
      return
    }
    const nick = this.data.editNickName || (this.data.userInfo && this.data.userInfo.nickName) || ''
    const phone = (this.data.userInfo && this.data.userInfo.phone) || ''
    wx.showLoading({ title: '上传中', mask: true })
    const finish = (remoteUrl) => {
      wx.hideLoading()
      if (!remoteUrl) {
        wx.showToast({ title: '头像上传失败', icon: 'none' })
        return
      }
      AuthService.updateProfile({ nickname: nick || undefined, avatarUrl: remoteUrl })
        .then(() => {
          AuthService.completeLogin({ phone, nickName: nick, avatarUrl: remoteUrl })
          AuthUtil.rememberLoginProfile({ nickName: nick, avatarUrl: remoteUrl })
          this._refresh()
          wx.showToast({ title: '头像已更新', icon: 'success' })
        })
        .catch(() => wx.showToast({ title: '头像保存失败', icon: 'none' }))
    }
    if (isRemoteUrl(localPath)) {
      finish(localPath)
      return
    }
    upload(localPath, {
      name: 'file',
      url: '/api/v1/mp/upload',
      formData: { subDir: 'avatar' },
      showError: false,
    }).then((uploaded) => {
      finish((uploaded && (uploaded.url || uploaded.fileUrl)) || '')
    }).catch(() => {
      wx.hideLoading()
      wx.showToast({ title: '头像上传失败', icon: 'none' })
    })
  },

  onNickInput(e) {
    this.setData({ editNickName: (e.detail && e.detail.value) || '' })
  },

  onNickBlur(e) {
    if (!this.data.isLoggedIn || this.data.savingProfile) return
    const nick = String((e.detail && e.detail.value) || this.data.editNickName || '').trim()
    const current = (this.data.userInfo && (this.data.userInfo.nickName || this.data.userInfo.nickname)) || ''
    if (!nick || nick === current) return
    this.setData({ savingProfile: true, editNickName: nick })
    const phone = (this.data.userInfo && this.data.userInfo.phone) || ''
    const avatarUrl = (this.data.userInfo && this.data.userInfo.avatarUrl) || ''
    AuthService.updateProfile({ nickname: nick, avatarUrl: avatarUrl || undefined })
      .then(() => {
        AuthService.completeLogin({ phone, nickName: nick, avatarUrl })
        AuthUtil.rememberLoginProfile({ nickName: nick, avatarUrl })
        this._refresh()
        wx.showToast({ title: '昵称已更新', icon: 'success' })
      })
      .catch(() => wx.showToast({ title: '昵称保存失败', icon: 'none' }))
      .finally(() => this.setData({ savingProfile: false }))
  },

  onBindPhone(e) {
    if (!this.data.isLoggedIn) return
    const detail = (e && e.detail) || {}
    if (!detail.code) {
      wx.showToast({ title: '未授权手机号', icon: 'none' })
      return
    }
    const nick = this.data.editNickName || (this.data.userInfo && this.data.userInfo.nickName) || ''
    const avatarUrl = (this.data.userInfo && this.data.userInfo.avatarUrl) || ''
    wx.showLoading({ title: '绑定中', mask: true })
    AuthService.bindPhone(detail.code, {
      nickname: nick || undefined,
      avatarUrl: isRemoteUrl(avatarUrl) ? avatarUrl : undefined,
    })
      .then((phone) => {
        AuthService.completeLogin({ phone, nickName: nick, avatarUrl })
        this._refresh()
        wx.showToast({ title: '手机号已绑定', icon: 'success' })
      })
      .catch(() => wx.showToast({ title: '绑定失败，请重试', icon: 'none' }))
      .finally(() => wx.hideLoading())
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
