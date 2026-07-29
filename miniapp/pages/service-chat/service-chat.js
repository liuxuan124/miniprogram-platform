Page({
  data: {
    messages: [
      { id: 1, role: 'bot', text: '你好，这里是出海笔记客服。常见问题可以直接点下面的快捷入口，人工客服工作日 10:00–19:00 在线。' },
    ],
    quick: ['申请退款', '开发票', '咨询改期', '转人工'],
    input: '',
    scrollInto: 'm1',
    nextId: 2,
  },

  onInput(e) {
    this.setData({ input: e.detail.value })
  },

  onQuick(e) {
    this._push('me', e.currentTarget.dataset.q)
    const map = {
      '申请退款': '订单待发货时可在订单详情申请退款；已经发货或完成的订单将按商品售后说明处理。',
      '开发票': '请提供抬头、税号与邮箱，我帮你提交开票申请，1–3 个工作日发送到邮箱。',
      '咨询改期': '服务开始前 24 小时可免费改期。请到「我的预约」选择新的时段，或直接告诉我期望时间。',
      '转人工': '已为你接入人工队列，请稍候；高峰期可能需要排队。',
    }
    const q = e.currentTarget.dataset.q
    setTimeout(() => this._push('bot', map[q] || '收到，正在为你处理。'), 400)
  },

  onSend() {
    const text = (this.data.input || '').trim()
    if (!text) return
    this.setData({ input: '' })
    this._push('me', text)
    setTimeout(() => this._push('bot', '已收到你的问题，客服会尽快回复。你也可以先点快捷入口自助处理。'), 450)
  },

  _push(role, text) {
    const id = this.data.nextId
    const messages = this.data.messages.concat([{ id, role, text }])
    this.setData({ messages, nextId: id + 1, scrollInto: 'm' + id })
  },
})
