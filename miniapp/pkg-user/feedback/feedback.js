const { post } = require('../../utils/request')
const { AuthUtil } = require('../../utils/auth')

Page({
  data: {
    types: ['功能建议', '内容问题', '支付订单', '咨询预约', '其他'],
    type: '功能建议',
    content: '',
    loading: false,
  },

  onType(e) {
    this.setData({ type: e.currentTarget.dataset.type })
  },

  onInput(e) {
    this.setData({ content: e.detail.value || '' })
  },

  onSubmit() {
    const content = (this.data.content || '').trim()
    if (!content) {
      wx.showToast({ title: '请填写反馈内容', icon: 'none' })
      return
    }
    if (!AuthUtil.isLoggedIn()) {
      AuthUtil.requireLoginForAction('提交反馈', { silent: true })
      return
    }
    this.setData({ loading: true })
    post('/api/v1/mp/feedback', {
      category: this.data.type,
      content,
    }, { auth: true, showError: true })
      .then(() => {
        this.setData({ loading: false, content: '' })
        wx.showToast({ title: '已提交，感谢反馈', icon: 'success' })
      })
      .catch((err) => {
        this.setData({ loading: false })
        wx.showToast({ title: (err && err.message) || '提交失败', icon: 'none' })
      })
  },

  goService() {
    wx.navigateTo({ url: '/pkg-user/service-chat/service-chat' })
  },
})
