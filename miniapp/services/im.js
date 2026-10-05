const { get, post } = require('../utils/request')

/**
 * 客服 IM。
 *
 * ⚠️ 为什么是 HTTP 轮询而不是 SSE：wx.request 不支持 text/event-stream，
 * 端上用 3s 间隔的增量拉取（带 lastSeq 游标，只取新消息，带宽与 SSE 等效）。
 * 切后台时 stopPolling，进前台 startPolling 并立刻补拉一次。
 */

let lastSeq = 0
let conversationId = 0
let timer = null

function openConversation(options) {
  const opts = options || {}
  lastSeq = 0
  return post('/api/v1/mp/im/conversation', {
    source: opts.source || 'chat',
    sourceRef: opts.sourceRef || '',
  }).then((d) => {
    conversationId = (d && d.id) || 0
    const rows = (d && d.messages) || []
    lastSeq = rows.length ? (rows[rows.length - 1].seq || 0) : 0
    return d
  })
}

function currentConversation(source) {
  return get('/api/v1/mp/im/conversation', { source: source || 'chat' }).then((d) => {
    conversationId = (d && d.id) || conversationId
    return d
  })
}

/** 增量拉取。返回 { messages, agentTyping } */
function pullMessages() {
  if (!conversationId) return Promise.resolve({ messages: [], agentTyping: false })
  return get(`/api/v1/mp/im/conversation/${conversationId}/messages`, {
    afterSeq: lastSeq,
    limit: 50,
  }).then((d) => {
    const rows = (d && d.messages) || []
    if (rows.length) {
      lastSeq = rows[rows.length - 1].seq || lastSeq
    }
    return { messages: rows, agentTyping: !!(d && d.agentTyping) }
  })
}

function sendText(text) {
  return post(`/api/v1/mp/im/conversation/${conversationId}/messages`, {
    msgType: 'text',
    text: String(text || '').trim(),
  })
}

function sendImage(imageUrl) {
  return post(`/api/v1/mp/im/conversation/${conversationId}/messages`, {
    msgType: 'image',
    imageUrl,
  })
}

function closeConversation() {
  if (!conversationId) return Promise.resolve(null)
  return post(`/api/v1/mp/im/conversation/${conversationId}/close`, {})
}

function getConversationId() {
  return conversationId
}

/** 前台轮询：3s 一次。SSE 在小程序端不可用，这是唯一的实时通道。 */
function startPolling(onMessage, interval) {
  stopPolling()
  const gap = interval || 3000
  const tick = () => {
    pullMessages()
      .then((d) => {
        if (d && d.messages && d.messages.length && typeof onMessage === 'function') {
          onMessage(d.messages, d.agentTyping)
        } else if (typeof onMessage === 'function') {
          onMessage([], d ? d.agentTyping : false)
        }
      })
      .catch(() => {})
  }
  tick()
  timer = setInterval(tick, gap)
}

function stopPolling() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function reset() {
  stopPolling()
  lastSeq = 0
  conversationId = 0
}

module.exports = {
  openConversation,
  currentConversation,
  pullMessages,
  sendText,
  sendImage,
  closeConversation,
  getConversationId,
  startPolling,
  stopPolling,
  reset,
}
