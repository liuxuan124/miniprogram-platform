const { get, post } = require('../utils/request')

/** 发起在线咨询（建单 / 追加到已有开放工单） */
function createTicket(content, options) {
  const opts = options || {}
  return post('/api/v1/mp/support/tickets', {
    content: String(content || '').trim(),
    source: opts.source || 'chat',
    orderId: opts.orderId || '',
  })
}

/** 我的咨询会话（含消息） */
function myTickets() {
  return get('/api/v1/mp/support/tickets')
}

module.exports = { createTicket, myTickets }
