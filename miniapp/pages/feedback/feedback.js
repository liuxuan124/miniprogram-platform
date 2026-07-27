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
    this.setData({ loading: true })
    // 先本地记录，后续可接后台反馈接口
    try {
      const key = 'feedback_drafts'
      const list = wx.getStorageSync(key) || []
      list.unshift({
        type: this.data.type,
        content,
        createdAt: Date.now(),
      })
      wx.setStorageSync(key, list.slice(0, 20))
    } catch (_) {}
    setTimeout(() => {
      this.setData({ loading: false, content: '' })
      wx.showToast({ title: '已提交，感谢反馈', icon: 'success' })
    }, 400)
  },

  goService() {
    wx.navigateTo({ url: '/pages/service-chat/service-chat' })
  },
})
