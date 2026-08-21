const qaService = require('../../services/qa')
const { createSharePageConfig } = require('../../utils/share')

function stripHtml(html) {
  return String(html || '').replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n').trim()
}

Page({
  ...createSharePageConfig(),
  data: {
    loading: true,
    question: null,
    answerHtml: '',
    answerPlain: '',
  },

  onLoad(options) {
    this._questionId = options.id
    if (!this._questionId) return
    this._loadDetail(this._questionId)
  },

  onShareAppMessage() {
    const q = this.data.question || {}
    return {
      title: (q.body || '问答详情').slice(0, 30),
      path: `/pages/question-detail/question-detail?id=${this._questionId}`,
    }
  },

  onShareTimeline() {
    const q = this.data.question || {}
    return {
      title: (q.body || '问答详情').slice(0, 30),
      query: `id=${this._questionId}`,
    }
  },

  onGoAsk() {
    wx.navigateTo({ url: '/pages/question-ask/question-ask' })
  },

  _loadDetail(id) {
    this.setData({ loading: true })
    qaService.getQuestionDetail(id)
      .then((data) => {
        const answer = data.answer || {}
        this.setData({
          loading: false,
          question: {
            id: data.id,
            body: data.body,
            userNickname: data.userNickname || '用户',
            createTime: String(data.createTime || '').slice(0, 16).replace('T', ' '),
            adminName: answer.adminName || '博主',
          },
          answerHtml: answer.content || '',
          answerPlain: stripHtml(answer.content || ''),
        })
      })
      .catch(() => {
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },
})
