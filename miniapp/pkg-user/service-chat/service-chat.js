const { StorageUtil } = require('../../utils/storage')
const { post } = require('../../utils/request')
const { AuthUtil } = require('../../utils/auth')

const HISTORY_KEY = 'service_chat_history'
const MAX_MESSAGES = 80
const WELCOME = {
  id: 1,
  role: 'service',
  text: '你好，这里是出海笔记客服中心。你可以先查看常见问题，也可以直接输入问题或联系人工客服。',
}

const QUICK_REPLY = {
  '商品咨询': '商品详情页包含规格、交付方式和售后说明。如需确认具体商品信息，请点击下方“联系人工客服”。',
  '订单问题': '你可以在「我的－全部订单」查看订单状态、支付记录和发货通知。',
  '发货进度': '订单发货后会更新状态并发送通知，发货说明会显示在订单详情中。',
  '退款售后': '请先在订单详情查看售后规则。需要人工处理时，点击下方按钮并提供订单号即可。',
}

function loadHistory() {
  const raw = StorageUtil.get(HISTORY_KEY)
  if (!raw || typeof raw !== 'object') return null
  const messages = Array.isArray(raw.messages) ? raw.messages : null
  if (!messages || !messages.length) return null
  return {
    messages: messages.slice(-MAX_MESSAGES),
    nextId: Math.max(2, Number(raw.nextId) || messages.length + 1),
    sessionId: raw.sessionId || '',
  }
}

function saveHistory(messages, nextId, sessionId) {
  StorageUtil.set(HISTORY_KEY, {
    messages: (messages || []).slice(-MAX_MESSAGES),
    nextId: nextId || 2,
    sessionId: sessionId || '',
    updatedAt: Date.now(),
  })
}

Page({
  data: {
    messages: [WELCOME],
    quick: ['商品咨询', '订单问题', '发货进度', '退款售后'],
    scrollInto: 'm1',
    nextId: 2,
    inputText: '',
    sending: false,
    sessionId: '',
  },

  onLoad() {
    this._restore()
  },

  onShow() {
    if (!this._restoredOnce) this._restore()
  },

  _restore() {
    const saved = loadHistory()
    this._restoredOnce = true
    if (!saved) {
      this.setData({ messages: [WELCOME], nextId: 2, scrollInto: 'm1', sessionId: '' })
      saveHistory([WELCOME], 2, '')
      return
    }
    const last = saved.messages[saved.messages.length - 1]
    this.setData({
      messages: saved.messages,
      nextId: saved.nextId,
      sessionId: saved.sessionId || '',
      scrollInto: last ? ('m' + last.id) : 'm1',
    })
  },

  onInput(e) {
    this.setData({ inputText: (e.detail && e.detail.value) || '' })
  },

  onQuick(e) {
    const q = e.currentTarget.dataset.q
    if (!q) return
    this._ask(q)
  },

  onSend() {
    const q = (this.data.inputText || '').trim()
    if (!q || this.data.sending) return
    this.setData({ inputText: '' })
    this._ask(q)
  },

  async _ask(question) {
    this._push('me', question)
    this.setData({ sending: true })
    try {
      if (!AuthUtil.isLoggedIn()) {
        throw new Error('need_login')
      }
      const res = await post('/api/v1/mp/ai/chat', {
        question,
        sessionId: this.data.sessionId || undefined,
      }, { showError: false })
      const answer = (res && res.answer) || ''
      const sessionId = (res && res.sessionId) || this.data.sessionId
      if (sessionId) this.setData({ sessionId })
      let text = answer || QUICK_REPLY[question] || '已收到，如需进一步帮助可联系人工客服。'
      if (res && res.action && res.action.type) {
        const tip = res.action.confirmRequired
          ? '\n\n（该操作需你自行确认，系统不会自动执行）'
          : ''
        text += tip
      }
      this._push('service', text, sessionId)
    } catch (e) {
      const fallback = QUICK_REPLY[question] || '暂时无法连接智能客服，请稍后再试或联系人工客服。'
      this._push('service', fallback)
    } finally {
      this.setData({ sending: false })
    }
  },

  onClearHistory() {
    wx.showModal({
      title: '清空记录',
      content: '确定清空本页咨询记录吗？微信官方客服会话不受影响。',
      success: (res) => {
        if (!res.confirm) return
        StorageUtil.remove(HISTORY_KEY)
        this.setData({ messages: [WELCOME], nextId: 2, scrollInto: 'm1', sessionId: '' })
        saveHistory([WELCOME], 2, '')
      },
    })
  },

  _push(role, text, sessionId) {
    const id = this.data.nextId
    const messages = this.data.messages.concat([{ id, role, text, ts: Date.now() }])
    const nextId = id + 1
    const sid = sessionId != null ? sessionId : this.data.sessionId
    this.setData({ messages, nextId, scrollInto: 'm' + id, sessionId: sid })
    saveHistory(messages, nextId, sid)
  },
})
