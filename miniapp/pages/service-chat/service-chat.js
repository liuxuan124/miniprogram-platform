Page({
  data: {
    messages: [
      { id: 1, role: 'service', text: '你好，这里是出海笔记客服中心。你可以先查看常见问题，也可以直接联系人工客服。' },
    ],
    quick: ['内容咨询', '功能使用', '合作联系', '意见反馈'],
    scrollInto: 'm1',
    nextId: 2,
  },

  onQuick(e) {
    const q = e.currentTarget.dataset.q
    if (!q) return
    this._push('me', q)
    const map = {
      '内容咨询': '你可以在首页和内容页浏览跨境资讯与干货文章，点击文章卡片即可查看详情。',
      '功能使用': '底部 Tab 可切换首页、内容与我的；收藏和客服功能登录后在我的页面使用。',
      '合作联系': '如需商务合作或定制服务，请点击下方「联系人工客服」留下联系方式。',
      '意见反馈': '欢迎通过「我的－意见反馈」提交建议，我们会尽快处理。',
    }
    setTimeout(() => this._push('service', map[q] || '请联系人工客服进一步处理。'), 220)
  },

  _push(role, text) {
    const id = this.data.nextId
    const messages = this.data.messages.concat([{ id, role, text }])
    this.setData({ messages, nextId: id + 1, scrollInto: 'm' + id })
  },
})
