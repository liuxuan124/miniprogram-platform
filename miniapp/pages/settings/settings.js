const { AuthUtil } = require('../../utils/auth')
const { AuthService } = require('../../services/auth')

Page({
  data: {
    isLoggedIn: false,
    version: '1.5.1',
  },

  onShow() {
    this.setData({ isLoggedIn: !!AuthUtil.isLoggedIn() })
  },

  goTerms() {
    wx.navigateTo({
      url: '/pages/agreement/agreement?type=terms',
      fail: () => wx.showToast({ title: '协议页打开失败', icon: 'none' }),
    })
  },

  goPrivacy() {
    wx.navigateTo({
      url: '/pages/agreement/agreement?type=privacy',
      fail: () => wx.showToast({ title: '隐私页打开失败', icon: 'none' }),
    })
  },

  goFeedback() {
    wx.navigateTo({
      url: '/pages/feedback/feedback',
      fail: () => wx.navigateTo({ url: '/pages/service-chat/service-chat' }),
    })
  },

  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定退出登录吗？',
      success: (res) => {
        if (!res.confirm) return
        AuthService.logout({ manual: true, redirectToLogin: false })
        this.setData({ isLoggedIn: false })
        wx.showToast({ title: '已退出登录', icon: 'success' })
        setTimeout(() => {
          wx.switchTab({ url: '/pages/mine/mine' })
        }, 500)
      },
    })
  },
})
