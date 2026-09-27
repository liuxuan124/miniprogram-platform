const qaService = require('../../services/qa')
const { AuthUtil } = require('../../utils/auth')
const { getQaEnabledSync } = require('../../utils/qa-module-gate')

Page({
  data: {
    moduleEnabled: false,
    submitLabel: '提交问题',
    body: '',
    submitting: false,
  },

  onLoad() {
    const enabled = getQaEnabledSync()
    this.setData({ moduleEnabled: enabled })
  },

  onInput(e) {
    this.setData({ body: e.detail.value })
  },

  onSubmit() {
    if (!getQaEnabledSync()) return
    if (!AuthUtil.requireLoginForAction('向博主提问')) return
    const body = String(this.data.body || '').trim()
    if (!body) {
      wx.showToast({ title: '请输入问题', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    qaService.createQuestion({ body })
      .then(() => {
        wx.showToast({ title: '提交成功', icon: 'success' })
        setTimeout(() => wx.navigateBack({ delta: 1 }), 800)
      })
      .catch(() => {})
      .finally(() => this.setData({ submitting: false }))
  },
})
