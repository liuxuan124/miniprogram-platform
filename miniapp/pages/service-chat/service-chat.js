Page({
  data: {
    messages: [
      { id: 1, role: 'service', text: '你好，这里是出海笔记客服中心。你可以先查看常见问题，也可以直接联系人工客服。' },
    ],
    quick: ['商品咨询', '订单问题', '发货进度', '退款售后'],
    scrollInto: 'm1',
    nextId: 2,
  },

  onQuick(e) {
    const q = e.currentTarget.dataset.q
    if (!q) return
    this._push('me', q)
    const map = {
      '商品咨询': '商品详情页包含规格、交付方式和售后说明。如需确认具体商品信息，请点击下方“联系人工客服”。',
      '订单问题': '你可以在「我的－全部订单」查看订单状态、支付记录和发货通知。',
      '发货进度': '订单发货后会更新状态并发送通知，发货说明会显示在订单详情中。',
      '退款售后': '请先在订单详情查看售后规则。需要人工处理时，点击下方按钮并提供订单号即可。',
    }
    setTimeout(() => this._push('service', map[q] || '请联系人工客服进一步处理。'), 220)
  },

  _push(role, text) {
    const id = this.data.nextId
    const messages = this.data.messages.concat([{ id, role, text }])
    this.setData({ messages, nextId: id + 1, scrollInto: 'm' + id })
  },
})
